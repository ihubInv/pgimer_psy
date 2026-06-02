-- Physical examination: CVS, chest, and abdomen subsections → one text column each.

ALTER TABLE public.adl_files
  ADD COLUMN IF NOT EXISTS physical_cvs_examination text,
  ADD COLUMN IF NOT EXISTS physical_chest_examination text,
  ADD COLUMN IF NOT EXISTS physical_abdomen_examination text;

COMMENT ON COLUMN public.adl_files.physical_cvs_examination IS
  'CVS: apex, regularity, heart sounds, murmurs';
COMMENT ON COLUMN public.adl_files.physical_chest_examination IS
  'Chest: expansion, percussion, adventitious sounds';
COMMENT ON COLUMN public.adl_files.physical_abdomen_examination IS
  'Abdomen: tenderness, mass, bowel sounds';

UPDATE public.adl_files
SET physical_cvs_examination = NULLIF(TRIM(
  CONCAT_WS(
    E'\n\n',
    CASE WHEN COALESCE(TRIM(physical_cvs_apex), '') <> '' THEN
      'Apex' || E'\n' || TRIM(physical_cvs_apex) END,
    CASE WHEN COALESCE(TRIM(physical_cvs_regularity), '') <> '' THEN
      'Regularity' || E'\n' || TRIM(physical_cvs_regularity) END,
    CASE WHEN COALESCE(TRIM(physical_cvs_heart_sounds), '') <> '' THEN
      'Heart sounds' || E'\n' || TRIM(physical_cvs_heart_sounds) END,
    CASE WHEN COALESCE(TRIM(physical_cvs_murmurs), '') <> '' THEN
      'Murmurs' || E'\n' || TRIM(physical_cvs_murmurs) END
  )
), '')
WHERE physical_cvs_examination IS NULL OR TRIM(physical_cvs_examination) = '';

UPDATE public.adl_files
SET physical_chest_examination = NULLIF(TRIM(
  CONCAT_WS(
    E'\n\n',
    CASE WHEN COALESCE(TRIM(physical_chest_expansion), '') <> '' THEN
      'Chest expansion' || E'\n' || TRIM(physical_chest_expansion) END,
    CASE WHEN COALESCE(TRIM(physical_chest_percussion), '') <> '' THEN
      'Percussion' || E'\n' || TRIM(physical_chest_percussion) END,
    CASE WHEN COALESCE(TRIM(physical_chest_adventitious), '') <> '' THEN
      'Adventitious sounds' || E'\n' || TRIM(physical_chest_adventitious) END
  )
), '')
WHERE physical_chest_examination IS NULL OR TRIM(physical_chest_examination) = '';

UPDATE public.adl_files
SET physical_abdomen_examination = NULLIF(TRIM(
  CONCAT_WS(
    E'\n\n',
    CASE WHEN COALESCE(TRIM(physical_abdomen_tenderness), '') <> '' THEN
      'Tenderness' || E'\n' || TRIM(physical_abdomen_tenderness) END,
    CASE WHEN COALESCE(TRIM(physical_abdomen_mass), '') <> '' THEN
      'Mass' || E'\n' || TRIM(physical_abdomen_mass) END,
    CASE WHEN COALESCE(TRIM(physical_abdomen_bowel_sounds), '') <> '' THEN
      'Bowel sounds' || E'\n' || TRIM(physical_abdomen_bowel_sounds) END
  )
), '')
WHERE physical_abdomen_examination IS NULL OR TRIM(physical_abdomen_examination) = '';

ALTER TABLE public.adl_files DROP COLUMN IF EXISTS physical_cvs_apex;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS physical_cvs_regularity;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS physical_cvs_heart_sounds;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS physical_cvs_murmurs;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS physical_chest_expansion;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS physical_chest_percussion;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS physical_chest_adventitious;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS physical_abdomen_tenderness;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS physical_abdomen_mass;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS physical_abdomen_bowel_sounds;
