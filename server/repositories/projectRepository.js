import { getPool } from '../config/database.js';
import { mapProject } from './mappers.js';

const PROJECT_WITH_COUNTS = `
  SELECT
    p.*,
    COUNT(t.id)::INTEGER AS task_count,
    COUNT(t.id) FILTER (WHERE t.status = 'done')::INTEGER
      AS completed_task_count
  FROM projects p
  LEFT JOIN tasks t ON t.project_id = p.id
`;

class ProjectRepository {
  constructor(database) {
    this.database = database;
  }

  get db() {
    return this.database || getPool();
  }

  async listForUser(userId) {
    const result = await this.db.query(
      `${PROJECT_WITH_COUNTS}
       WHERE p.user_id = $1
       GROUP BY p.id
       ORDER BY p.updated_at DESC`,
      [userId],
    );

    return result.rows.map(mapProject);
  }

  async createForUser(userId, project) {
    const result = await this.db.query(
      `INSERT INTO projects (
         user_id, name, goal, timeframe, team_size, strictness
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        userId,
        project.name,
        project.goal,
        project.timeframe ?? null,
        project.teamSize ?? null,
        project.strictness ?? null,
      ],
    );

    return mapProject(result.rows[0]);
  }

  async findByIdForUser(projectId, userId, database = this.db) {
    const result = await database.query(
      `${PROJECT_WITH_COUNTS}
       WHERE p.id = $1 AND p.user_id = $2
       GROUP BY p.id`,
      [projectId, userId],
    );

    return mapProject(result.rows[0]);
  }

  async updateForUser(projectId, userId, changes) {
    const result = await this.db.query(
      `UPDATE projects
       SET
         name = COALESCE($3, name),
         goal = COALESCE($4, goal),
         timeframe = COALESCE($5, timeframe),
         team_size = COALESCE($6, team_size),
         strictness = COALESCE($7, strictness),
         updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [
        projectId,
        userId,
        changes.name ?? null,
        changes.goal ?? null,
        changes.timeframe ?? null,
        changes.teamSize ?? null,
        changes.strictness ?? null,
      ],
    );

    return mapProject(result.rows[0]);
  }

  async deleteForUser(projectId, userId) {
    const result = await this.db.query(
      `DELETE FROM projects
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [projectId, userId],
    );

    return mapProject(result.rows[0]);
  }

  async touch(projectId, database = this.db) {
    await database.query(
      'UPDATE projects SET updated_at = NOW() WHERE id = $1',
      [projectId],
    );
  }
}

export default ProjectRepository;
