"use client";

import { useCallback, useState } from "react";
import { ServerTask } from "./server";
import {
  EventType,
  TaskClientError,
  Transformer,
  defaultTransformer,
} from "./common";
import { EventSourceParserStream } from "eventsource-parser/stream";

/**
 * Options for the client.
 */
export type CreateClientOptions = {
  /**
   * A transformer to parse the result.
   */
  transformer?: Transformer;

  /**
   * Additional options to send in the request.
   */
  requestInit?: Omit<RequestInit, "method" | "body">;
};

export function createClient<T extends ServerTask<unknown, unknown, string>>(
  opts?: CreateClientOptions
) {
  type TInput = T extends ServerTask<unknown, infer U, string> ? U : never;
  type TReturn = T extends ServerTask<infer U, unknown, string> ? U : never;
  type TRoute = T extends ServerTask<unknown, unknown, infer U> ? U : never;

  const { transformer = defaultTransformer, requestInit } = opts || {};

  const receiveStream = async (route: TRoute, input: TInput) => {
    /**
     * We would like to use `POST` here instead, but when the request is aborted, we get an error:
     *    ⨯ uncaughtException: Error: aborted
     *    code: 'ECONNRESET'
     *
     * This error for some reason does not occurs with `GET`
     */
    const res = await makeRequest({
      method: "GET",
      input,
      route,
      requestInit,
    });

    if (!res.ok) {
      const message = await getResponseError(res);
      throw new Error(message ?? "Something went wrong");
    }

    const reader = res.body;

    if (reader == null) {
      throw new TaskClientError({
        message: "No data was received in the event stream",
        code: "NO_DATA",
      });
    }

    const result = parseEventStream<TReturn>(reader, transformer);
    return result;
  };

  return {
    /**
     * A hook to execute a server task.
     * @param route The route to execute the task.
     */
    useTask<R extends TRoute = TRoute>(route: R) {
      const [isMutating, setIsMutating] = useState(false);

      const mutate = useCallback(
        async (input: TInput) => {
          setIsMutating(true);

          try {
            const result = await receiveStream(route, input);
            return result;
          } finally {
            setIsMutating(false);
          }
        },
        [route]
      );

      return {
        mutate,
        isMutating,
      };
    },
  };
}

async function makeRequest<TInput>({
  input,
  method,
  route,
  requestInit,
}: {
  input: TInput;
  method: "GET" | "POST";
  route: string;
  requestInit?: Omit<RequestInit, "method" | "body">;
}) {
  const { headers: requestHeaders, ...requestInitRest } = requestInit || {};

  // prettier-ignore
  const path = method === "GET" ? `${route}?input=${JSON.stringify(input)}` : route;
  const body = method === "GET" ? undefined : JSON.stringify(input);
  const headers = new Headers(requestHeaders);

  const res = await fetch(path, {
    ...requestInitRest,
    headers,
    method,
    body,
  });

  return res;
}

async function getResponseError(res: Response) {
  if (res.headers.get("content-type") === "application/json") {
    const json = await res.json();

    if (typeof json.message === "string") {
      return json.message;
    }
  }

  return null;
}

async function parseEventStream<T>(
  streamReader: ReadableStream<Uint8Array>,
  transformer: Transformer
) {
  const eventStream = streamReader
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new EventSourceParserStream());

  const reader = eventStream.getReader();

  while (true) {
    // We ignore the `done`, value, we immediately exit on the `settle` event
    const { value: event } = await reader.read();

    if (event == null) {
      throw new TaskClientError({
        message: "Not event was received",
        code: "NO_DATA",
      });
    }

    if (event.type === "event") {
      switch (event.event as EventType) {
        case "wait": {
          break;
        }
        case "server-error": {
          const message = transformer.parse(event.data) as string;
          throw new TaskClientError({ message, code: "SERVER_ERROR" });
        }
        case "internal-error": {
          const message = transformer.parse(event.data) as string;
          throw new TaskClientError({ message, code: "INTERNAL_ERROR" });
        }
        case "settle": {
          return transformer.parse(event.data) as T;
        }
        default: {
          throw new TaskClientError({
            message: `Unknown event: ${event}`,
            code: "UNEXPECTED",
          });
        }
      }
    } else if (event.type === "reconnect-interval") {
      // We currently are ignoring reconnect events
      throw new TaskClientError({
        message: "Should reconnect",
        code: "RECONNECT",
      });
    }
  }
}
