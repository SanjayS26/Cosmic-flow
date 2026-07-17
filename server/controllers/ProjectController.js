import ProjectRepository from '../repositories/projectRepository.js';
import AppError from '../utils/AppError.js';
import {
  validateCreateProjectRequest,
  validateUpdateProjectRequest,
  validateUuid,
} from '../utils/projectValidation.js';

class ProjectController {
  constructor(projectRepository = new ProjectRepository()) {
    this.projectRepository = projectRepository;
  }

  async list(req, res) {
    const projects = await this.projectRepository.listForUser(req.user.id);
    return res.json({ success: true, data: projects });
  }

  async create(req, res) {
    const project = validateCreateProjectRequest(req.body);
    const created = await this.projectRepository.createForUser(
      req.user.id,
      project,
    );
    return res.status(201).json({ success: true, data: created });
  }

  async get(req, res) {
    const projectId = validateUuid(req.params.projectId, 'Project ID');
    const project = await this.projectRepository.findByIdForUser(
      projectId,
      req.user.id,
    );

    if (!project) {
      throw new AppError('NOT_FOUND', 'Project not found.', 404);
    }

    return res.json({ success: true, data: project });
  }

  async update(req, res) {
    const projectId = validateUuid(req.params.projectId, 'Project ID');
    const changes = validateUpdateProjectRequest(req.body);
    const project = await this.projectRepository.updateForUser(
      projectId,
      req.user.id,
      changes,
    );

    if (!project) {
      throw new AppError('NOT_FOUND', 'Project not found.', 404);
    }

    return res.json({ success: true, data: project });
  }

  async delete(req, res) {
    const projectId = validateUuid(req.params.projectId, 'Project ID');
    const project = await this.projectRepository.deleteForUser(
      projectId,
      req.user.id,
    );

    if (!project) {
      throw new AppError('NOT_FOUND', 'Project not found.', 404);
    }

    return res.json({ success: true, data: { id: project.id } });
  }
}

export default ProjectController;
