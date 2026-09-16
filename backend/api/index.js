import { createApp } from '../src/app.js';
import { connectDB } from '../src/config/db.js';

let appInstance = null;

export default async function handler(req, res) {
  try {
    // Ensure DB connection is established before processing request
    await connectDB();

    if (!appInstance) {
      appInstance = createApp();
    }

    return appInstance(req, res);
  } catch (error) {
    console.error('[Vercel Serverless Error]:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error while processing request in serverless environment.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
}
