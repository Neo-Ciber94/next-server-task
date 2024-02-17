import { createTask } from "next-server-task/server";

export const runtime = "edge";

const helloTask = createTask("/api/task").withAction(async () => {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  return "Hello World!";
});

const { handler } = helloTask.serverHandler();

export { handler as GET };

export type HelloTask = typeof helloTask;
