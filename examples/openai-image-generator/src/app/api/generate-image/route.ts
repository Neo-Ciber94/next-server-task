import { TaskError } from "next-server-task";
import { createTask } from "next-server-task/server";
import { OpenAI } from "openai";

export const runtime = "edge";

const generateImage = createTask("/api/generate-image").withAction(
  async ({ prompt }: { prompt: string }) => {
    console.log(`🕑 Generating image for: ${prompt}\n`);

    const openAPI = new OpenAI();
    const results = await openAPI.images.generate({
      prompt,
      n: 1,
      size: "512x512",
    });

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
