import dns from 'node:dns';
import mongoose from 'mongoose';
import { env } from './env.js';

// Setup DNS fallback resolvers (Google and Cloudflare) to ensure MongoDB Atlas SRV resolution on Windows/ISPs
try {
  dns.setServers([
    '8.8.8.8',
    '8.8.4.4',
    '1.1.1.1',
    '1.0.0.1'
  ]);
} catch (err) {
  console.warn('[Database] Could not override DNS servers:', err.message);
}

let cachedConnection = null;

export const connectDB = async (customUri = null) => {
  const uri = customUri || env.MONGODB_URI;

  if (!uri) {
    console.error('\n❌ [Database Error] MONGODB_URI is not defined.');
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw new Error('MONGODB_URI is required');
  }

  // Reuse existing connection if ready in serverless environments (e.g. Vercel)
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  if (cachedConnection) {
    return cachedConnection;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      bufferCommands: false
    });
    cachedConnection = conn;
    console.log(`[Database] MongoDB Connected successfully: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`\n❌ [Database Error] Failed to connect to MongoDB: ${error.message}`);
    if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
      process.exit(1);
    }
    throw error;
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    cachedConnection = null;
    console.log('[Database] MongoDB disconnected cleanly.');
  } catch (err) {
    console.error('[Database Error] Disconnect failed:', err.message);
  }
};
