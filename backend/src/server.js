import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    const app = createApp();
    const port = env.PORT || 4000;

    app.listen(port, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 Sales & Operations Dashboard Backend Running`);
      console.log(`📡 Port:        ${port}`);
      console.log(`🌍 Environment: ${env.NODE_ENV}`);
      console.log(`⏱ Timezone:    ${env.DEFAULT_TIMEZONE}`);
      console.log(`💱 Currency:    ${env.DEFAULT_CURRENCY_CODE}`);
      console.log(`======================================================\n`);
    });
  } catch (error) {
    console.error('Fatal Server Startup Error:', error);
    process.exit(1);
  }
};

startServer();
