/**
 * encode and decode JSON data.
 */
export type Transformer = {
    /**
     * Convert the given data into a JSON string.
     * @param data The data to convert to a JSON string.
     */
    stringify: (data: unknown) => string;
  
    /**
     * Converts a JSON string into an object.
     * @param data The JSON string to parse.
     */
    parse: (data: string) => unknown;
  };
  
  /**
   * Default parser, using `JSON` global object.
   */
  export const defaultTransformer: Transformer = {
    parse: JSON.parse,
    stringify: JSON.stringify,
  };
  
  /**
   * Represents the event type of a server error.
   */
  export type EventType = "wait" | "server-error" | "internal-error" | "settle";
  
  /**
   * Types of error that can occur when processing a task.
   */
  export type TaskErrorCode =
    | "RECONNECT"
    | "NO_DATA"
    | "INTERNAL_ERROR"
    | "SERVER_ERROR"
    | "UNEXPECTED";
  
  /**
   * An error that ocurred on the client side.
   */
  export class TaskClientError extends Error {
    private readonly _code: TaskErrorCode;
  
    constructor({ message, code }: { message: string; code: TaskErrorCode }) {
      super(message);
      this._code = code;
    }
  
    get code() {
      return this._code;
    }
  }
  
  /**
   * Represents an error that occurred on a task.
   * 
   * When requiring to throw an expected error in a task prefer using this over `Error`.
   */
  export class TaskError extends Error {
    constructor(message: string) {
      super(message);
    }
  }
  