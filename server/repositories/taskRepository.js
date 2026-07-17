import { getPool, withTransaction } from '../config/database.js';
import AppError from '../utils/AppError.js';
import { mapTask } from './mappers.js';

const TASK_COLUMNS = `
  t.id, t.project_id, t.title, t.description, t.category,
  t.priority, t.status, t.estimated_duration, t.position,
  t.created_at, t.updated_at
`;

class TaskRepository {
  constructor(database) {
    this.database = database;
  }

  get db() {
    return this.database || getPool();
  }

  async listForProject(projectId, userId) {
    const result = await this.db.query(
      `SELECT ${TASK_COLUMNS}
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       WHERE t.project_id = $1 AND p.user_id = $2
       ORDER BY
         CASE t.status
           WHEN 'todo' THEN 1
           WHEN 'in-progress' THEN 2
           ELSE 3
         END,
         t.position,
         t.created_at`,
      [projectId, userId],
    );

    return result.rows.map(mapTask);
  }

  async findByIdForUser(projectId, taskId, userId, database = this.db) {
    const result = await database.query(
      `SELECT ${TASK_COLUMNS}
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       WHERE t.id = $1 AND t.project_id = $2 AND p.user_id = $3`,
      [taskId, projectId, userId],
    );

    return mapTask(result.rows[0]);
  }

  async createForProject(projectId, userId, task) {
    return withTransaction(async (client) => {
      await this.requireOwnedProject(projectId, userId, client);
      const position = task.position ?? await this.nextPosition(
        projectId,
        task.status,
        client,
      );
      const created = await this.insert(projectId, { ...task, position }, client);
      await this.touchProject(projectId, client);
      return created;
    }, this.db);
  }

  async updateForUser(projectId, taskId, userId, changes) {
    const result = await this.db.query(
      `UPDATE tasks t
       SET
         title = COALESCE($4, t.title),
         description = COALESCE($5, t.description),
         category = COALESCE($6, t.category),
         priority = COALESCE($7, t.priority),
         status = COALESCE($8, t.status),
         estimated_duration = COALESCE($9, t.estimated_duration),
         position = COALESCE($10, t.position),
         updated_at = NOW()
       FROM projects p
       WHERE t.id = $1
         AND t.project_id = $2
         AND p.id = t.project_id
         AND p.user_id = $3
       RETURNING t.*`,
      [
        taskId,
        projectId,
        userId,
        changes.title ?? null,
        changes.description ?? null,
        changes.category ?? null,
        changes.priority ?? null,
        changes.status ?? null,
        changes.estimatedDuration ?? null,
        changes.position ?? null,
      ],
    );

    if (result.rows[0]) {
      await this.touchProject(projectId);
    }

    return mapTask(result.rows[0]);
  }

  async deleteForUser(projectId, taskId, userId) {
    const result = await this.db.query(
      `DELETE FROM tasks t
       USING projects p
       WHERE t.id = $1
         AND t.project_id = $2
         AND p.id = t.project_id
         AND p.user_id = $3
       RETURNING t.*`,
      [taskId, projectId, userId],
    );

    if (result.rows[0]) {
      await this.touchProject(projectId);
    }

    return mapTask(result.rows[0]);
  }

  async insertGeneratedForProject(projectId, userId, tasks) {
    return withTransaction(async (client) => {
      await this.requireOwnedProject(projectId, userId, client);
      const startPosition = await this.nextPosition(projectId, 'todo', client);
      const inserted = [];

      for (const [index, task] of tasks.entries()) {
        inserted.push(await this.insert(projectId, {
          ...task,
          status: 'todo',
          position: startPosition + index,
        }, client));
      }

      await this.touchProject(projectId, client);
      return inserted;
    }, this.db);
  }

  async updateRegeneratedTask(projectId, taskId, userId, replacement) {
    const result = await this.db.query(
      `UPDATE tasks t
       SET
         title = $4,
         description = $5,
         category = $6,
         priority = $7,
         estimated_duration = $8,
         updated_at = NOW()
       FROM projects p
       WHERE t.id = $1
         AND t.project_id = $2
         AND p.id = t.project_id
         AND p.user_id = $3
       RETURNING t.*`,
      [
        taskId,
        projectId,
        userId,
        replacement.title,
        replacement.description,
        replacement.category,
        replacement.priority,
        replacement.estimatedDuration,
      ],
    );

    if (result.rows[0]) {
      await this.touchProject(projectId);
    }

    return mapTask(result.rows[0]);
  }

  async reorderForProject(projectId, userId, updates) {
    return withTransaction(async (client) => {
      await this.requireOwnedProject(projectId, userId, client);
      const taskIds = updates.map((task) => task.id);
      const ownedTasks = await client.query(
        `SELECT id
         FROM tasks
         WHERE project_id = $1 AND id = ANY($2::uuid[])
         FOR UPDATE`,
        [projectId, taskIds],
      );

      if (ownedTasks.rowCount !== taskIds.length) {
        throw new AppError(
          'NOT_FOUND',
          'One or more tasks could not be found.',
          404,
        );
      }

      for (const update of updates) {
        await client.query(
          `UPDATE tasks
           SET status = $2, position = $3, updated_at = NOW()
           WHERE id = $1 AND project_id = $4`,
          [update.id, update.status, update.position, projectId],
        );
      }

      await this.touchProject(projectId, client);
      return this.listWithDatabase(projectId, client);
    }, this.db);
  }

  async listWithDatabase(projectId, database) {
    const result = await database.query(
      `SELECT ${TASK_COLUMNS}
       FROM tasks t
       WHERE t.project_id = $1
       ORDER BY t.status, t.position, t.created_at`,
      [projectId],
    );

    return result.rows.map(mapTask);
  }

  async requireOwnedProject(projectId, userId, database) {
    const result = await database.query(
      `SELECT id FROM projects
       WHERE id = $1 AND user_id = $2
       FOR UPDATE`,
      [projectId, userId],
    );

    if (result.rowCount === 0) {
      throw new AppError('NOT_FOUND', 'Project not found.', 404);
    }
  }

  async nextPosition(projectId, status, database) {
    const result = await database.query(
      `SELECT COALESCE(MAX(position), -1) + 1 AS next_position
       FROM tasks
       WHERE project_id = $1 AND status = $2`,
      [projectId, status],
    );

    return Number(result.rows[0].next_position);
  }

  async insert(projectId, task, database) {
    const result = await database.query(
      `INSERT INTO tasks (
         project_id, title, description, category, priority,
         status, estimated_duration, position
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        projectId,
        task.title,
        task.description,
        task.category,
        task.priority,
        task.status,
        task.estimatedDuration,
        task.position,
      ],
    );

    return mapTask(result.rows[0]);
  }

  async touchProject(projectId, database = this.db) {
    await database.query(
      'UPDATE projects SET updated_at = NOW() WHERE id = $1',
      [projectId],
    );
  }
}

export default TaskRepository;
