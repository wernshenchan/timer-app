-- Drop foreign key constraint first
ALTER TABLE time_entries DROP CONSTRAINT time_entries_project_id_fkey;

-- Alter ID columns to TEXT to match the app's ID format
ALTER TABLE projects ALTER COLUMN id TYPE TEXT;
ALTER TABLE time_entries ALTER COLUMN id TYPE TEXT;
ALTER TABLE time_entries ALTER COLUMN project_id TYPE TEXT;

-- Recreate foreign key constraint
ALTER TABLE time_entries ADD CONSTRAINT time_entries_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
