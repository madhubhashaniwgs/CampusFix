import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import authRoutes from './routes/authRoutes.js';
import notFoundMiddleware from './middleware/notFoundMiddleware.js';
import errorMiddleware from './middleware/errorMiddleware.js';
import ApiResponse from './utils/ApiResponse.js';
import issueRoutes from './routes/issueRoutes.js';
import userRoutes from './routes/userRoutes.js';

const isProduction = process.env.NODE_ENV === 'production';

const allowedOrigins = (process.env.CLIENT_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();

app.use(helmet());

// In development all origins are allowed for local convenience.
// In production only the origins listed in CLIENT_ORIGINS may connect.
app.use(
  cors(
    isProduction
      ? { origin: allowedOrigins }
      : {}
  )
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  const response = new ApiResponse(
    200,
    'CampusFix API is running successfully!',
    {
      database: 'MongoDB Atlas',
      server: 'Express',
    }
  );

  res.status(response.statusCode).json(response);
});

// Authentication routes
app.use('/api/auth', authRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/users', userRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;