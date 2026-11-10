import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.isProd ? env.clientUrl : true }));
app.use(express.json({ limit: '1mb' }));
if (!env.isProd && !env.isTest) app.use(morgan('dev'));

app.use('/api', routes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
