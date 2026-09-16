import jwt from 'jsonwebtoken';
import { ApiError } from './errorHandler.js';
import { env } from '../config/env.js';

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Authentication token required.'));
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Invalid or missing authentication token.'));
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      role: payload.role
    };
    next();
  } catch (error) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Invalid, expired, or malformed authentication token.'));
  }
};
