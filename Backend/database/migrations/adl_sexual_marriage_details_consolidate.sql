-- Marriage: drop marriage date; merge spouse/adjustment fields into one text column.

ALTER TABLE public.adl_files
  ADD COLUMN IF NOT EXISTS sexual_marriage_details text;

COMMENT ON COLUMN public.adl_files.sexual_marriage_details IS
  'Marriage details: spouse age, spouse occupation, general adjustment, sexual adjustment, sexual problems';

UPDATE public.adl_files
SET sexual_marriage_details = NULLIF(TRIM(
  CONCAT_WS(
    E'\n\n',
    CASE WHEN sexual_spouse_age IS NOT NULL THEN
      'Spouse age' || E'\n' || TRIM(sexual_spouse_age::text) END,
    CASE WHEN COALESCE(TRIM(sexual_spouse_occupation), '') <> '' THEN
      'Spouse occupation' || E'\n' || TRIM(sexual_spouse_occupation) END,
    CASE WHEN COALESCE(TRIM(sexual_adjustment_general), '') <> '' THEN
      'General adjustment' || E'\n' || TRIM(sexual_adjustment_general) END,
    CASE WHEN COALESCE(TRIM(sexual_adjustment_sexual), '') <> '' THEN
      'Sexual adjustment' || E'\n' || TRIM(sexual_adjustment_sexual) END,
    CASE WHEN COALESCE(TRIM(sexual_problems), '') <> '' THEN
      'Sexual problems' || E'\n' || TRIM(sexual_problems) END
  )
), '')
WHERE sexual_marriage_details IS NULL OR TRIM(sexual_marriage_details) = '';

ALTER TABLE public.adl_files DROP COLUMN IF EXISTS sexual_marriage_date;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS sexual_spouse_age;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS sexual_spouse_occupation;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS sexual_adjustment_general;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS sexual_adjustment_sexual;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS sexual_problems;
