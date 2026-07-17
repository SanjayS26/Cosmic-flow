import express from 'express';
import AuthController from '../controllers/AuthController.js';
import {
  createAuthRateLimiter,
  getAuthRateLimitConfig,
} from '../middleware/rateLimit.js';

export function createAuthRouter({
  authController = new AuthController(),
  authenticate,
  rateLimitConfig = getAuthRateLimitConfig(),
} = {}) {
  const router = express.Router();
  const registerLimiter = createAuthRateLimiter(rateLimitConfig);
  const loginLimiter = createAuthRateLimiter(rateLimitConfig);

  router.post('/register', registerLimiter, (req, res) => (
    authController.register(req, res)
  ));
  router.post('/login', loginLimiter, (req, res) => (
    authController.login(req, res)
  ));
  router.get('/me', authenticate, (req, res) => authController.me(req, res));
  router.post('/logout', (req, res) => authController.logout(req, res));

  return router;
}
