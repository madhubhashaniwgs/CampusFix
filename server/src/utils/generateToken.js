import jwt from 'jsonwebtoken';

const generateToken = (userId, tokenVersion = 0) => {
  return jwt.sign(
    { id: userId, ver: tokenVersion },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    }
  );
};

export default generateToken;
