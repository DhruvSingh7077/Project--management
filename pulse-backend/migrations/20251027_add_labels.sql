-- create label table scoped to a project and join table for task labels
CREATE TABLE IF NOT EXISTS label (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES "Project"(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#cccccc',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_label (
  task_id uuid NOT NULL REFERENCES "Task"(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES label(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, label_id)
);

CREATE INDEX IF NOT EXISTS idx_label_project_id ON label(project_id);
CREATE INDEX IF NOT EXISTS idx_task_label_task_id ON task_label(task_id);