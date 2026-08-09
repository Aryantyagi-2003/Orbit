// Local-dev-only Upstash REST API shim, backed by a real local `redis-server`.
// Not used in production — production points UPSTASH_REDIS_REST_URL at real
// Upstash. This exists because Docker isn't available in this environment;
// it speaks just enough of the Upstash HTTP protocol (single command + the
// SDK's pipeline batching) for @upstash/redis and @upstash/ratelimit to work
// against a genuine Redis for local testing.
import { createServer } from "node:http";
import Redis from "ioredis";

const PORT = 8079;
const TOKEN = "local_dev_token";
const redis = new Redis({ port: 6379, host: "127.0.0.1" });

async function runCommand(command) {
  const [name, ...args] = command;
  try {
    const result = await redis.call(name, ...args);
    return { result: result ?? null };
  } catch (error) {
    return { error: String(error?.message ?? error) };
  }
}

const server = createServer(async (req, res) => {
  const auth = req.headers.authorization ?? "";
  if (auth !== `Bearer ${TOKEN}`) {
    res.writeHead(401, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "unauthorized" }));
    return;
  }

  let raw = "";
  for await (const chunk of req) raw += chunk;
  const body = raw ? JSON.parse(raw) : null;

  const isPipeline = req.url === "/pipeline" || req.url === "/multi-exec";

  if (isPipeline) {
    const results = [];
    for (const command of body) {
      results.push(await runCommand(command));
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(results));
    return;
  }

  const { result, error } = await runCommand(body);
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ result, error }));
});

server.listen(PORT, () => {
  console.log(`[dev-redis-http-shim] listening on http://localhost:${PORT}`);
});
