-- Adds psychiatry department assignment for system users.
ALTER TABLE users
ADD COLUMN IF NOT EXISTS department VARCHAR(100);

COMMENT ON COLUMN users.department IS 'Department: Child Department or Adult Department';
