-- Education: merge eight text fields into one column.

ALTER TABLE public.adl_files
  ADD COLUMN IF NOT EXISTS education_history text;

COMMENT ON COLUMN public.adl_files.education_history IS
  'Education: start age, highest class, performance, disciplinary problems, peer relationships, hobbies, special abilities, reason for discontinuing';

UPDATE public.adl_files
SET education_history = NULLIF(TRIM(
  CONCAT_WS(
    E'\n\n',
    CASE WHEN COALESCE(TRIM(education_start_age), '') <> '' THEN
      'Age at start of education' || E'\n' || TRIM(education_start_age) END,
    CASE WHEN COALESCE(TRIM(education_highest_class), '') <> '' THEN
      'Highest class passed' || E'\n' || TRIM(education_highest_class) END,
    CASE WHEN COALESCE(TRIM(education_performance), '') <> '' THEN
      'Performance' || E'\n' || TRIM(education_performance) END,
    CASE WHEN COALESCE(TRIM(education_disciplinary), '') <> '' THEN
      'Disciplinary problems' || E'\n' || TRIM(education_disciplinary) END,
    CASE WHEN COALESCE(TRIM(education_peer_relationship), '') <> '' THEN
      'Peer relationships' || E'\n' || TRIM(education_peer_relationship) END,
    CASE WHEN COALESCE(TRIM(education_hobbies), '') <> '' THEN
      'Hobbies and interests' || E'\n' || TRIM(education_hobbies) END,
    CASE WHEN COALESCE(TRIM(education_special_abilities), '') <> '' THEN
      'Special abilities' || E'\n' || TRIM(education_special_abilities) END,
    CASE WHEN COALESCE(TRIM(education_discontinue_reason), '') <> '' THEN
      'Reason for discontinuing education' || E'\n' || TRIM(education_discontinue_reason) END
  )
), '')
WHERE education_history IS NULL OR TRIM(education_history) = '';

ALTER TABLE public.adl_files DROP COLUMN IF EXISTS education_start_age;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS education_highest_class;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS education_performance;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS education_disciplinary;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS education_peer_relationship;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS education_hobbies;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS education_special_abilities;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS education_discontinue_reason;
