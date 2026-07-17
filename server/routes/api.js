import express from 'express';
import AuthController from '../controllers/AuthController.js';
import ProjectController from '../controllers/ProjectController.js';
import ProjectTaskController from '../controllers/ProjectTaskController.js';
import { createAuthenticate } from '../middleware/authenticate.js';
import ProjectRepository from '../repositories/projectRepository.js';
import TaskRepository from '../repositories/taskRepository.js';
import UserRepository from '../repositories/userRepository.js';
import { createAuthRouter } from './auth.js';
import { createProjectRouter } from './projects.js';

export function createApiRouter({
  userRepository = new UserRepository(),
  projectRepository = new ProjectRepository(),
  taskRepository = new TaskRepository(),
  authController,
  projectController,
  projectTaskController,
  authenticate,
  aiService,
  aiRateLimitConfig,
  authRateLimitConfig,
} = {}) {
  const router = express.Router();
  const authMiddleware = authenticate || createAuthenticate({ userRepository });
  const resolvedAuthController = authController || new AuthController({
    userRepository,
  });
  const resolvedProjectController = projectController || new ProjectController(
    projectRepository,
  );
  const resolvedTaskController = projectTaskController
    || new ProjectTaskController({
      projectRepository,
      taskRepository,
      aiService,
    });

  router.use('/auth', createAuthRouter({
    authController: resolvedAuthController,
    authenticate: authMiddleware,
    rateLimitConfig: authRateLimitConfig,
  }));
  router.use('/projects', authMiddleware, createProjectRouter({
    projectController: resolvedProjectController,
    taskController: resolvedTaskController,
    rateLimitConfig: aiRateLimitConfig,
  }));

  return router;
}

export default createApiRouter;
