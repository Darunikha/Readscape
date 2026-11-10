import { env } from './config/env.js';
import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';

await connectDB();

const server = app.listen(env.port, () => {
  console.log(`[api] Readscape API listening on http://localhost:${env.port}`);
});

async function shutdown() {
  server.close();
  await disconnectDB();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
