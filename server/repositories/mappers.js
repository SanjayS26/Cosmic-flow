export function mapUser(row) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapProject(row) {
  if (!row) return null;

  const project = {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    goal: row.goal,
    timeframe: row.timeframe,
    teamSize: row.team_size,
    strictness: row.strictness,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (row.task_count !== undefined) {
    project.taskCount = Number(row.task_count);
    project.completedTaskCount = Number(row.completed_task_count);
  }

  return project;
}

export function mapTask(row) {
  if (!row) return null;

  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    category: row.category,
    priority: row.priority,
    status: row.status,
    estimatedDuration: row.estimated_duration,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
