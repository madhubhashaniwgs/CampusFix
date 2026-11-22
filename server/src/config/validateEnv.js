const validateEnv = () => {
  const missing = [];

  if (!process.env.MONGODB_URI) {
    missing.push('MONGODB_URI');
  }

  if (!process.env.JWT_SECRET) {
    missing.push('JWT_SECRET');
  }

  if (process.env.NODE_ENV === 'production') {
    if (!process.env.CLIENT_ORIGINS) {
      missing.push('CLIENT_ORIGINS');
    }
  }

  if (missing.length > 0) {
    console.error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
    process.exit(1);
  }
};

export default validateEnv;
