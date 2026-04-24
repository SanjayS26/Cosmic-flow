import AIService from '../services/AIService.js';

class TaskController {
  constructor() {
    this.aiService = new AIService();
  }

  async generateTasks(req, res) {
    try {
      const { goal, timeframe, teamSize, strictness } = req.body;

      if (!goal) {
        return res.status(400).json({ error: 'Goal is required to generate tasks.' });
      }

      // Delegate business logic to the AIService
      const tasks = await this.aiService.generateTasksForGoal(goal, {
        timeframe,
        teamSize,
        strictness
      });

      return res.status(200).json({
        success: true,
        message: 'Tasks generated successfully',
        data: tasks
      });

    } catch (error) {
      console.error('Error generating tasks:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate tasks using AI service.'
      });
    }
  }
}

export default TaskController;
