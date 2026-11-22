import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { env } from './env.js';

let memoryServer = null;

/**
 * Connects to MongoDB. When MONGO_URI is not provided (local development),
 * an embedded MongoDB is started with data persisted to server/.data so the
 * app works out of the box without installing MongoDB.
 */
export async function connectDB(uriOverride) {
  let uri = uriOverride || env.mongoUri;

  if (!uri) {
    if (env.isProd) throw new Error('MONGO_URI must be set in production');
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const here = path.dirname(fileURLToPath(import.meta.url));
    const dbPath = path.resolve(here, '../../.data');
    fs.mkdirSync(dbPath, { recursive: true });
    console.log('[db] MONGO_URI not set — starting embedded MongoDB (data in server/.data)');
    memoryServer = await MongoMemoryServer.create({
      instance: { dbPath, storageEngine: 'wiredTiger', dbName: 'readscape' },
    });
    uri = memoryServer.getUri('readscape');
  }

  await mongoose.connect(uri);
  console.log(`[db] connected to ${mongoose.connection.name}`);
  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
}
