
import {createServer} from './api/server';


// Start server
const start = async (): Promise<void> => {
  try {
    const server = await createServer();
    await server.listen({port: Number(process.env.PORT) || 3000, host: '0.0.0.0'});
    console.log(`Server is running on port ${process.env.PORT}`);
    console.log(`Swagger documentation: http://localhost:${process.env.PORT}/documentation`);

    const shutdown = async () => {
      console.log('Shutting down server...');
      await server.close();
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {

    process.exit(1);
  }
};
start();