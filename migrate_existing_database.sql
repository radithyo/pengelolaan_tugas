-- One-time migration for the previous RuangTugas schema:
-- tasks.category_id referenced categories and tasks had no priority column.

CREATE TABLE IF NOT EXISTS task_categories (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  color CHAR(7) NOT NULL DEFAULT '#718b69',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_task_categories_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO task_categories (id, name, color, created_at)
SELECT
  id,
  name,
  CASE WHEN color REGEXP '^#[0-9A-Fa-f]{6}$' THEN color ELSE '#718b69' END,
  COALESCE(created_at, CURRENT_TIMESTAMP)
FROM categories;

ALTER TABLE tasks
  DROP FOREIGN KEY tasks_ibfk_1,
  MODIFY COLUMN status
    ENUM('pending', 'todo', 'in_progress', 'done') NOT NULL DEFAULT 'todo',
  ADD COLUMN priority
    ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium' AFTER status;

UPDATE tasks SET status = 'todo' WHERE status = 'pending';

ALTER TABLE tasks
  MODIFY COLUMN status
    ENUM('todo', 'in_progress', 'done') NOT NULL DEFAULT 'todo',
  ADD CONSTRAINT fk_tasks_category
    FOREIGN KEY (category_id) REFERENCES task_categories (id)
    ON DELETE SET NULL;
