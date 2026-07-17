CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description VARCHAR(3000) NOT NULL,
  category VARCHAR(50) NOT NULL,
  priority VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'todo',
  estimated_duration VARCHAR(100) NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tasks_title_not_blank CHECK (length(btrim(title)) > 0),
  CONSTRAINT tasks_description_not_blank CHECK (
    length(btrim(description)) > 0
  ),
  CONSTRAINT tasks_duration_not_blank CHECK (
    length(btrim(estimated_duration)) > 0
  ),
  CONSTRAINT tasks_category_allowed CHECK (
    category IN ('Engineering', 'Design', 'Marketing', 'Research', 'Logistics')
  ),
  CONSTRAINT tasks_priority_allowed CHECK (
    priority IN ('High', 'Medium', 'Low')
  ),
  CONSTRAINT tasks_status_allowed CHECK (
    status IN ('todo', 'in-progress', 'done')
  ),
  CONSTRAINT tasks_position_nonnegative CHECK (position >= 0)
);
