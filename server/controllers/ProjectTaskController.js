import ProjectRepository from '../repositories/projectRepository.js';
import TaskRepository from '../repositories/taskRepository.js';
import AIService from '../services/AIService.js';
import AppError from '../utils/AppError.js';
import { validateUuid } from '../utils/projectValidation.js';
import {
  validateCreateTaskRequest,
  validateReorderTasksRequest,
  validateUpdateTaskRequest,
} from '../utils/taskValidation.js';

class ProjectTaskController {
  constructor({
    projectRepository = new ProjectRepository(),
    taskRepository = new TaskRepository(),
    aiService = new AIService(),
  } = {}) {
    this.projectRepository = projectRepository;
    this.taskRepository = taskRepository;
    this.aiService = aiService;
  }

  async requireProject(projectId, userId) {
    const project = await this.projectRepository.findByIdForUser(
      projectId,
      userId,
    );
    if (!project) {
      throw new AppError('NOT_FOUND', 'Project not found.', 404);
    }
    return project;
  }

  async requireTask(projectId, taskId, userId) {
    const task = await this.taskRepository.findByIdForUser(
      projectId,
      taskId,
      userId,
    );
    if (!task) {
      throw new AppError('NOT_FOUND', 'Task not found.', 404);
    }
    return task;
  }

  async list(req, res) {
    const projectId = validateUuid(req.params.projectId, 'Project ID');
    await this.requireProject(projectId, req.user.id);
    const tasks = await this.taskRepository.listForProject(
      projectId,
      req.user.id,
    );
    return res.json({ success: true, data: tasks });
  }

  async create(req, res) {
    const projectId = validateUuid(req.params.projectId, 'Project ID');
    const task = validateCreateTaskRequest(req.body);
    const created = await this.taskRepository.createForProject(
      projectId,
      req.user.id,
      task,
    );
    return res.status(201).json({ success: true, data: created });
  }

  async get(req, res) {
    const projectId = validateUuid(req.params.projectId, 'Project ID');
    const taskId = validateUuid(req.params.taskId, 'Task ID');
    const task = await this.requireTask(projectId, taskId, req.user.id);
    return res.json({ success: true, data: task });
  }

  async update(req, res) {
    const projectId = validateUuid(req.params.projectId, 'Project ID');
    const taskId = validateUuid(req.params.taskId, 'Task ID');
    const changes = validateUpdateTaskRequest(req.body);
    const task = await this.taskRepository.updateForUser(
      projectId,
      taskId,
      req.user.id,
      changes,
    );

    if (!task) {
      throw new AppError('NOT_FOUND', 'Task not found.', 404);
    }

    return res.json({ success: true, data: task });
  }

  async delete(req, res) {
    const projectId = validateUuid(req.params.projectId, 'Project ID');
    const taskId = validateUuid(req.params.taskId, 'Task ID');
    const task = await this.taskRepository.deleteForUser(
      projectId,
      taskId,
      req.user.id,
    );

    if (!task) {
      throw new AppError('NOT_FOUND', 'Task not found.', 404);
    }

    return res.json({ success: true, data: { id: task.id } });
  }

  async generate(req, res) {
    const projectId = validateUuid(req.params.projectId, 'Project ID');
    const project = await this.requireProject(projectId, req.user.id);
    const generatedTasks = await this.aiService.generateTasksForGoal(
      project.goal,
      {
        timeframe: project.timeframe,
        teamSize: project.teamSize ? String(project.teamSize) : undefined,
        strictness: project.strictness,
      },
    );
    const savedTasks = await this.taskRepository.insertGeneratedForProject(
      projectId,
      req.user.id,
      generatedTasks,
    );
    return res.status(201).json({ success: true, data: savedTasks });
  }

  async regenerate(req, res) {
    const projectId = validateUuid(req.params.projectId, 'Project ID');
    const taskId = validateUuid(req.params.taskId, 'Task ID');
    const project = await this.requireProject(projectId, req.user.id);
    const task = await this.requireTask(projectId, taskId, req.user.id);
    const replacement = await this.aiService.regenerateTask(
      project.goal,
      {
        timeframe: project.timeframe,
        teamSize: project.teamSize ? String(project.teamSize) : undefined,
        strictness: project.strictness,
      },
      task,
    );
    const updated = await this.taskRepository.updateRegeneratedTask(
      projectId,
      taskId,
      req.user.id,
      replacement,
    );

    if (!updated) {
      throw new AppError('NOT_FOUND', 'Task not found.', 404);
    }

    return res.json({ success: true, data: updated });
  }

  async reorder(req, res) {
    const projectId = validateUuid(req.params.projectId, 'Project ID');
    const { tasks } = validateReorderTasksRequest(req.body);
    const reordered = await this.taskRepository.reorderForProject(
      projectId,
      req.user.id,
      tasks,
    );
    return res.json({ success: true, data: reordered });
  }
}

export default ProjectTaskController;
