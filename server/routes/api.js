import express from 'express';
import TaskController from '../controllers/TaskController.js';

const router = express.Router();
const taskController = new TaskController();

// Primary AI endpoint
router.post('/generate-tasks', (req, res) => taskController.generateTasks(req, res));

export default router;
