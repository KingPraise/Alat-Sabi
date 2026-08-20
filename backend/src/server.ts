import { bootstrapApp } from './app';

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    const app = await bootstrapApp();
    app.listen(PORT, () => {
      console.log(`🚀 ALAT Sabi Engine server running at http://localhost:${PORT}`);
      console.log(`📡 Base API URL: http://localhost:${PORT}/api/v1`);
    });
  } catch (error) {
    console.error('Failed to start ALAT Sabi server:', error);
    process.exit(1);
  }
}

startServer();
