-- Religion: merge three text fields into one column.

ALTER TABLE public.adl_files
  ADD COLUMN IF NOT EXISTS religion_history text;

COMMENT ON COLUMN public.adl_files.religion_history IS
  'Religion: type, participation in activities, changes in beliefs';

UPDATE public.adl_files
SET religion_history = NULLIF(TRIM(
  CONCAT_WS(
    E'\n\n',
    CASE WHEN COALESCE(TRIM(religion_type), '') <> '' THEN
      'Type of religion' || E'\n' || TRIM(religion_type) END,
    CASE WHEN COALESCE(TRIM(religion_participation), '') <> '' THEN
      'Participation in religious activities' || E'\n' || TRIM(religion_participation) END,
    CASE WHEN COALESCE(TRIM(religion_changes), '') <> '' THEN
      'Changes in religious beliefs' || E'\n' || TRIM(religion_changes) END
  )
), '')
WHERE religion_history IS NULL OR TRIM(religion_history) = '';

ALTER TABLE public.adl_files DROP COLUMN IF EXISTS religion_type;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS religion_participation;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS religion_changes;
