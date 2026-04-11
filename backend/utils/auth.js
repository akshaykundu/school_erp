import jwt from 'jsonwebtoken';

const getJwtSecret = () => process.env.JWT_SECRET || 'fallback_dev_secret';

export const generateToken = (payload, expiresIn = '7d') => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn });
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (error) {
    return null;
  }
};
