"use client";

import { createClient } from "next-server-task/client";
import type { HelloTask } from "./api/task/route";

const client = createClient<HelloTask>();

export default function Home() {
  const { isMutating, mutate, data: text } = client.useTask("/api/task");

  return (
    <div className="p-10">
      <button
        className="px-8 py-4 rounded-lg bg-black text-white font-mono disabled:opacity-80"
        disabled={isMutating}
        onClick={async () => {
          await mutate();
        }}
      >
        {isMutating ? "Loading" : "Execute"}
      </button>
      {text && <p>{text}</p>}
    </div>
  );
}
