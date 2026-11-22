import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/authRoutes.js';
import csrfProtection from './middleware/csrfMiddleware.js';
import notFoundMiddleware from './middleware/notFoundMiddleware.js';
import errorMiddleware from './middleware/errorMiddleware.js';
import ApiResponse from './utils/ApiResponse.js';
import issueRoutes from './routes/issueRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import auditRoutes from './routes/auditRoutes.js';

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
  cors({
    // Development: reflect the request origin so credentialed
    // requests from the Vite dev server are allowed. A wildcard
    // origin is invalid together with credentials.
    // Production: only CLIENT_ORIGINS entries are allowed.
    origin: isProduction ? allowedOrigins : true,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(csrfProtection);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  const response = new ApiResponse(200, 'CampusFix API is running successfully!', {
    database: 'MongoDB Atlas',
    server: 'Express',
  });

  res.status(response.statusCode).json(response);
});

// Authentication routes
app.use('/api/auth', authRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/audit-logs', auditRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
