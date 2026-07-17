import express from 'express';
import ProjectController from '../controllers/ProjectController.js';
import ProjectTaskController from '../controllers/ProjectTaskController.js';
import {
  createAiRateLimiter,
  getAiRateLimitConfig,
} from '../middleware/rateLimit.js';

export function createProjectRouter({
  projectController = new ProjectController(),
  taskController = new ProjectTaskController(),
  rateLimitConfig = getAiRateLimitConfig(),
} = {}) {
  const router = express.Router();
  const generationLimiter = createAiRateLimiter(rateLimitConfig);
  const regenerationLimiter = createAiRateLimiter(rateLimitConfig);

  router.get('/', (req, res) => projectController.list(req, res));
  router.post('/', (req, res) => projectController.create(req, res));

  router.get('/:projectId', (req, res) => projectController.get(req, res));
  router.patch('/:projectId', (req, res) => projectController.update(req, res));
  router.delete('/:projectId', (req, res) => projectController.delete(req, res));

  router.get('/:projectId/tasks', (req, res) => taskController.list(req, res));
  router.post('/:projectId/tasks', (req, res) => taskController.create(req, res));
  router.patch('/:projectId/tasks/reorder', (req, res) => (
    taskController.reorder(req, res)
  ));
  router.post(
    '/:projectId/generate-tasks',
    generationLimiter,
    (req, res) => taskController.generate(req, res),
  );
  router.get('/:projectId/tasks/:taskId', (req, res) => (
    taskController.get(req, res)
  ));
  router.patch('/:projectId/tasks/:taskId', (req, res) => (
    taskController.update(req, res)
  ));
  router.delete('/:projectId/tasks/:taskId', (req, res) => (
    taskController.delete(req, res)
  ));
  router.post(
    '/:projectId/tasks/:taskId/regenerate',
    regenerationLimiter,
    (req, res) => taskController.regenerate(req, res),
  );

  return router;
}
