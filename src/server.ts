import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { env } from './config/env';
import { connectDB } from './config/db';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';

async function bootstrap() {
  await connectDB();

  const app = express();
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN.split(',').map(s => s.trim()), credentials: true }));
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  // Static uploads
  app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR)));

  app.use('/api/v1', routes);

  app.use((_req, res) => res.status(404).json({ success: false, error: { message: 'Route not found', code: 'NOT_FOUND' } }));
  app.use(errorHandler);

  app.listen(env.PORT, () => {
    console.log(`🚀 Seva ERP API listening on http://localhost:${env.PORT}`);
    console.log(`   Environment: ${env.NODE_ENV}`);
  });
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
