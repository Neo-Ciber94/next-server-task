import {
  type Transformer,
  defaultTransformer,
  TaskError,
  EventType,
} from "./common";

declare var EdgeRuntime: string | undefined;

function isEdgeRuntime() {
  return typeof EdgeRuntime === "string";
}

const encoder = new TextEncoder();

type RequestHandler = (
  req: Request,
  params: { params: Record<string, string | undefined> }
) => Promise<Response>;

/**
 * Context to pass to each server task.
 */
export type ServerTaskContext = {
  /**
   * The request data. The body is consumed so should not be accessed.
   */
  req: Omit<
    Request,
    "body" | "json" | "text" | "blob" | "arrayBuffer" | "formData"
  >;

  /**
   * The request params.
   */
  params: Record<string, string | undefined>;
};

/**
 * Represents a long running operation.
 */
export type ServerTask<TReturn, TInput, TRoute extends string> = {
  /**
   * The route this task will be called.
   */
  readonly route: TRoute;

  /**
   * A transformer to parse/stringify the response.
   */
  readonly transformer: Transformer;

  /**
   * Returns a handler for the requests.
   */
  serverHandler: () => {
    handler: RequestHandler;
  };
};

class ServerTaskBuilder<TRoute extends string> {
  private transformer: Transformer = defaultTransformer;

  constructor(readonly route: TRoute) {}

  /**
   * Adds a transformer for this task.
   */
  withTransformer(transformer: Transformer): this {
    this.transformer = transformer;
    return this;
  }

  /**
   * Adds the action to execute when this task is called and returns the `ServerTask`.
   */
  withAction<TReturn, TInput = undefined>(
    action: (input: TInput, ctx: ServerTaskContext) => Promise<TReturn>
  ): ServerTask<TReturn, TInput, TRoute> {
    const _route = this.route;
    const _transformer = this.transformer;

    return {
      get route() {
        return _route;
      },

      get transformer() {
        return _transformer;
      },

      serverHandler() {
        return { handler: createServerHandler(_transformer, action) };
      },
    };
  }
}

/**
 * Create a server task.
 * @param route The route to execute this task on the server.
 *
 * @example
 * ```
 * const generateImage = createTask("/api/generate-image")
 *      .withAction(async ({ prompt }: { prompt: string }) => {
 *          const openAPI = new OpenAI({ apiKey });
 *          const results = await openAPI.images.generate({ prompt });
 *          const url = results.data[0]?.url;
 *          return { url }
 *      })
 * ```
 */
export function createTask<TRoute extends string>(route: TRoute) {
  return new ServerTaskBuilder(route);
}

function createServerHandler<TReturn, TInput>(
  transformer: Transformer,
  action: (input: TInput, ctx: ServerTaskContext) => Promise<TReturn>
) {
  if (!isEdgeRuntime()) {
    throw new Error(`Server tasks can only be used in the 'edge-runtime'. To enable it, add in your api route:

    export const runtime = 'edge';
    `);
  }

  return async (
    req: Request,
    { params }: { params: Record<string, string | undefined> }
  ) => {
    try {
      const input = await getInput<TInput>(req, transformer);

      if (!input) {
        return new Response(undefined, { status: 429 });
      }

      const stream = createEventStream({
        transformer,
        input,
        action,
        req,
        params,
      });

      return new Response(stream, {
        headers: {
          Connection: "keep-alive",
          "Cache-Control": "no-store, no-transform",
          "Content-Type": "text/event-stream",
        },
      });
    } catch (err: any) {
      console.error(err);
      const message = err?.message ?? "Something went wrong";

      return new Response(JSON.stringify({ message }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }
  };
}

type EventStreamOptions<TReturn, TInput> = {
  transformer: Transformer;
  input: TInput;
  action: (args: TInput, ctx: ServerTaskContext) => Promise<TReturn>;
  waitInterval?: number;
  req: Request;
  params: Record<string, string | undefined>;
};

function createEventStream<TReturn, TInput>(
  opts: EventStreamOptions<TReturn, TInput>
) {
  const { input, action, transformer, waitInterval = 300, req, params } = opts;

  const abortController = new AbortController();
  let intervalId: number | undefined;
  let done = false;

  // Cleanup
  abortController.signal.addEventListener("abort", () => {
    done = true;
    clearInterval(intervalId);
  });

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (eventType: EventType, data = "") => {
        if (done) {
          return;
        }

        controller.enqueue(encoder.encode(`event: ${eventType}\n`));
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      // We send wait events while the task is running
      intervalId = setInterval(() => emit("wait"), waitInterval);

      // Check if the request was aborted
      req.signal.addEventListener("abort", () => {
        abortController.abort();
      });

      try {
        const ctx: ServerTaskContext = { req, params };
        const data = await action(input, ctx);
        const json = transformer.stringify(data);
        emit("settle", json);
      } catch (err: any) {
        console.error(err);

        // We only send to the client `TaskError`s
        if (err instanceof TaskError) {
          const message = JSON.stringify(err.message);
          emit("server-error", message);
        } else {
          emit("internal-error", '"Internal Error"');
        }
      } finally {
        if (done) {
          return;
        }

        abortController.abort();
        controller.close();
      }
    },
    cancel() {
      abortController.abort();
    },
  });

  return stream;
}

async function getInput<TInput>(
  req: Request,
  transformer: Transformer
): Promise<TInput | undefined> {
  if (req.method === "GET" || req.method === "HEAD") {
    const { searchParams } = new URL(req.url);
    const rawInput = searchParams.get("input");

    if (rawInput == null) {
      throw new Error("Unable to get action input from the request");
    }

    const input = transformer.parse(rawInput) as TInput;
    return input;
  } else {
    const rawInput = await req.text();
    const data = transformer.parse(rawInput) as { input?: TInput } | undefined;
    return data?.input;
  }
}
