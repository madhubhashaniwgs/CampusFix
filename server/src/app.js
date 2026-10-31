
import express from 'express';
import cors from 'cors';
import ApiResponse from './utils/ApiResponse.js';

import notFoundMiddleware from './middleware/notFoundMiddleware.js';
import errorMiddleware from './middleware/errorMiddleware.js';

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Route
app.get('/api/health', (req, res) => {
  const response = new ApiResponse(
    200,
    'CampusFix API is running successfully!',
    {
      database: 'MongoDB Atlas',
      server: 'Express'
    }
  );

  res.status(response.statusCode).json(response);
});

// 404 Middleware
app.use(notFoundMiddleware);

// Centralized Error Handler
app.use(errorMiddleware);

export default app;
