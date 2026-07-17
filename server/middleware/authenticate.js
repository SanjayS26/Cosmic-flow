import UserRepository from '../repositories/userRepository.js';
import AppError from '../utils/AppError.js';
import { getAuthCookieName, verifyAuthToken } from '../utils/auth.js';

export function createAuthenticate({
  userRepository = new UserRepository(),
  verifyToken = verifyAuthToken,
  cookieName = getAuthCookieName(),
} = {}) {
  return async (req, res, next) => {
    try {
      const token = req.cookies?.[cookieName];
      if (!token) {
        throw new AppError(
          'AUTHENTICATION_REQUIRED',
          'Authentication is required.',
          401,
        );
      }

      const { userId } = verifyToken(token);
      const user = await userRepository.findById(userId);

      if (!user) {
        throw new AppError(
          'AUTHENTICATION_REQUIRED',
          'Authentication is required.',
          401,
        );
      }

      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}
