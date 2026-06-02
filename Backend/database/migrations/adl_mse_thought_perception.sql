-- MSE Thought: add perception field (possession already exists on adl_files).

ALTER TABLE public.adl_files
  ADD COLUMN IF NOT EXISTS mse_thought_perception text;

COMMENT ON COLUMN public.adl_files.mse_thought_perception IS 'MSE thought: perception';
