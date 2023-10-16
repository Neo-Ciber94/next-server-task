# next-server-task example

This is an example of the usage of `next-server-task`.

## Timeout

When deploying to vercel you may receive a timeout after `25 seconds` of running an edge function.

Using `next-server-task` you can run a long computation, and using *Server Sent Events* we send `wait` messages until the computation is `settle` and them send the result to the client.

https://github.com/Neo-Ciber94/next-server-task/assets/7119315/be4b7001-981d-47a6-83ce-b73a08553c7c


For some reason vercel return `405` on edge timeout, but in the logs it display it correctly.

![Vercel Timeout](/assets/edge-timeout.jpg)
