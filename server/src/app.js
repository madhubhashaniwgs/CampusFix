import express from 'express';
import cors from 'cors';

import authRoutes from './routes/authRoutes.js';
import notFoundMiddleware from './middleware/notFoundMiddleware.js';
import errorMiddleware from './middleware/errorMiddleware.js';
import ApiResponse from './utils/ApiResponse.js';

const app = express();

app.use(cors());
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

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;