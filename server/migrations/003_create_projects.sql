CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  goal VARCHAR(1000) NOT NULL,
  timeframe VARCHAR(100),
  team_size SMALLINT,
  strictness VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT projects_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT projects_goal_not_blank CHECK (length(btrim(goal)) > 0),
  CONSTRAINT projects_team_size_range CHECK (
    team_size IS NULL OR team_size BETWEEN 1 AND 100
  ),
  CONSTRAINT projects_strictness_allowed CHECK (
    strictness IS NULL
    OR strictness IN ('Flexible', 'Balanced', 'Granular')
  )
);
