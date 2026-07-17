import AIService from '../services/AIService.js';
import AppError from '../utils/AppError.js';
import { validateGenerateTasksRequest } from '../utils/taskValidation.js';

class TaskController {
  constructor(aiService = new AIService()) {
    this.aiService = aiService;
  }

  async generateTasks(req, res) {
    try {
      const {
        goal,
        timeframe,
        teamSize,
        strictness,
      } = validateGenerateTasksRequest(req.body);
      const tasks = await this.aiService.generateTasksForGoal(goal, {
        timeframe,
        teamSize,
        strictness,
      });

      return res.status(200).json({
        success: true,
        data: tasks,
      });
    } catch (error) {
      const isKnownError = error instanceof AppError;
      const statusCode = isKnownError ? error.statusCode : 500;
      const code = isKnownError ? error.code : 'INTERNAL_ERROR';
      const message = isKnownError
        ? error.message
        : 'An unexpected error occurred while generating tasks.';

      if (!isKnownError) {
        console.error('Task generation failed with an unexpected error.');
      }

      return res.status(statusCode).json({
        success: false,
        error: {
          code,
          message,
        },
      });
    }
  }
}

export default TaskController;
