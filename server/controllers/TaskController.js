import AIService from '../services/AIService.js';
import {
  validateGenerateTasksRequest,
  validateRegenerateTaskRequest,
} from '../utils/taskValidation.js';

class TaskController {
  constructor(aiService = new AIService()) {
    this.aiService = aiService;
  }

  async generateTasks(req, res) {
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
  }

  async regenerateTask(req, res) {
    const {
      goal,
      timeframe,
      teamSize,
      strictness,
      task,
    } = validateRegenerateTaskRequest(req.body);
    const replacement = await this.aiService.regenerateTask(
      goal,
      { timeframe, teamSize, strictness },
      task,
    );

    return res.status(200).json({
      success: true,
      data: replacement,
    });
  }
}

export default TaskController;
