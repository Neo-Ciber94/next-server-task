# next-server-task

Execute long running tasks on `NextJS` edge API handlers.

## Usage example

On the server:

```ts
// app/api/generate-image/route.tsx

import { TaskError } from "next-server-task";
import { createTask } from "next-server-task/server";
import { OpenAI } from "openai";

export const runtime = "edge";

const generateImage = createTask("/api/generate-image").withAction(
  async ({ prompt }: { prompt: string }) => {
    const openAPI = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const results = await openAPI.images.generate({ prompt });

    const url = results.data[0].url;

    if (url == null) {
      throw new TaskError("Failed to generate image");
    }

    return { url };
  }
);

export type GenerateImage = typeof generateImage;

const { handler } = generateImage.serverHandler();
export { handler as GET };
```

On the client

```tsx
// ImageGenerator.tsx

import React, { useState } from "react";
import Image from "next/image";
import { type GenerateImage } from "./api/generate-image/route";
import { createClient } from "next-server-task/client";

const client = createClient<GenerateImage>();

export default function ImageGenerator() {
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
        }
        catch (err: any) {
            const message = err?.message ?? "Failed to generate image";
            setError(message);
        }
    };

    return <div>
        {imageUrl && 
            <Image 
                alt={"Generated Image"} 
                src={imageUrl} 
                width={256} 
                height={256}
            />}

        <form onSubmit={handleSubmit}>
            <input placeholder="Prompt..." name="prompt"/>
            <button type="submit">Generate</button>
        </form>

        {isMutating && <p>Loading...</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
}
```
