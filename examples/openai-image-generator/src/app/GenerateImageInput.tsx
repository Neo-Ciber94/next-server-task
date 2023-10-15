"use client";

import React, { useState } from "react";
import Image from "next/image";

import { type GenerateImage } from "./api/generate-image/route";
import { createClient } from "next-server-task/client";

const client = createClient<GenerateImage>();

export default function GenerateImageInput() {
  const [imageUrl, setImageUrl] = useState<string>();
  const [error, setError] = useState<string>();
  const { mutate, isMutating } = client.useTask("/api/generate-image");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError(undefined);
    const form = new FormData(e.currentTarget);
    const prompt = form.get("prompt")?.toString() ?? "";

    try {
      const result = await mutate({ prompt });
      setImageUrl(result.url);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Something went wrong");
    }
  };

  return (
    <div className="flex flex-col items-center py-4">
      <div className="relative w-full h-[400px] rounded-xl mb-4 overflow-hidden border-2 border-gray-300/50">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt="Generated Image"
            fill
            className="w-full h-full object-contain mx-auto p-4"
          />
        ) : (
          <div className="bg-neutral-100 w-full h-full flex flex-row justify-center items-center">
            <span className="font-bold text-gray-400 text-3xl font-mono">
              Not Image
            </span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="w-full">
        <div className="mb-4">
          <textarea
            name="prompt"
            autoComplete="off"
            className="w-full p-2 border-2 rounded-lg resize-none overflow-hidden"
            placeholder="📝 Prompt"
            minLength={3}
            required
            disabled={isMutating}
            rows={1}
            onInput={(e) => {
              // resize with text
              const self = e.currentTarget;
              self.style.height = "0";
              self.style.height = self.scrollHeight + "px";
            }}
          />
        </div>

        <button
          type="submit"
          disabled={isMutating}
          className={`w-full py-2 px-4 bg-neutral-800 text-white rounded-lg transition duration-300
          ${isMutating ? "cursor-progress" : "hover:bg-black"}`}
        >
          <span className={isMutating ? "animate-pulse" : ""}>
            {isMutating ? "Loading..." : "Generate"}
          </span>
        </button>

        {error && (
          <div className="p-4 text-red-600 bg-red-100 font-mono font-bold my-4 rounded-md">
            {`❌ ${error}`}
          </div>
        )}
      </form>
    </div>
  );
}
