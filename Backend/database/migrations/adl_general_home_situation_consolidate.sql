-- General Home Situation: merge four text fields into one column.

ALTER TABLE public.adl_files
  ADD COLUMN IF NOT EXISTS general_home_situation text;

COMMENT ON COLUMN public.adl_files.general_home_situation IS
  'General home situation: childhood home, parents relationship, socioeconomic status, interpersonal relationships';

UPDATE public.adl_files
SET general_home_situation = NULLIF(TRIM(
  CONCAT_WS(
    E'\n\n',
    CASE WHEN COALESCE(TRIM(home_situation_childhood), '') <> '' THEN
      'Description of childhood home situation' || E'\n' || TRIM(home_situation_childhood) END,
    CASE WHEN COALESCE(TRIM(home_situation_parents_relationship), '') <> '' THEN
      'Parents'' relationship' || E'\n' || TRIM(home_situation_parents_relationship) END,
    CASE WHEN COALESCE(TRIM(home_situation_socioeconomic), '') <> '' THEN
      'Socioeconomic status' || E'\n' || TRIM(home_situation_socioeconomic) END,
    CASE WHEN COALESCE(TRIM(home_situation_interpersonal), '') <> '' THEN
      'Interpersonal relationships' || E'\n' || TRIM(home_situation_interpersonal) END
  )
), '')
WHERE general_home_situation IS NULL OR TRIM(general_home_situation) = '';

ALTER TABLE public.adl_files DROP COLUMN IF EXISTS home_situation_childhood;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS home_situation_parents_relationship;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS home_situation_socioeconomic;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS home_situation_interpersonal;
