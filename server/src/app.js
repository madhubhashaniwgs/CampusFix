
import express from 'express';
import cors from 'cors';

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CampusFix API is running successfully!',
  });
});

export default app;
