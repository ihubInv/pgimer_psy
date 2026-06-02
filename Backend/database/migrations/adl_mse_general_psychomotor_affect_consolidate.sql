-- MSE general, psychomotor, and affect subsections → one text column each.

ALTER TABLE public.adl_files
  ADD COLUMN IF NOT EXISTS mse_general_examination text,
  ADD COLUMN IF NOT EXISTS mse_psychomotor_examination text,
  ADD COLUMN IF NOT EXISTS mse_affect_examination text;

COMMENT ON COLUMN public.adl_files.mse_general_examination IS
  'MSE general: demeanour, tidy/unkempt, awareness, cooperation';
COMMENT ON COLUMN public.adl_files.mse_psychomotor_examination IS
  'MSE psychomotor: verbalization, pressure, tension, posture, mannerism, catatonic features';
COMMENT ON COLUMN public.adl_files.mse_affect_examination IS
  'MSE affect: subjective/objective feeling, tone, resting expression, fluctuation';

UPDATE public.adl_files
SET mse_general_examination = NULLIF(TRIM(
  CONCAT_WS(
    E'\n\n',
    CASE WHEN COALESCE(TRIM(mse_general_demeanour), '') <> '' THEN
      'Demeanour' || E'\n' || TRIM(mse_general_demeanour) END,
    CASE WHEN COALESCE(TRIM(mse_general_tidy), '') <> '' THEN
      'Tidy/Unkempt' || E'\n' || TRIM(mse_general_tidy) END,
    CASE WHEN COALESCE(TRIM(mse_general_awareness), '') <> '' THEN
      'Awareness' || E'\n' || TRIM(mse_general_awareness) END,
    CASE WHEN COALESCE(TRIM(mse_general_cooperation), '') <> '' THEN
      'Cooperation' || E'\n' || TRIM(mse_general_cooperation) END
  )
), '')
WHERE mse_general_examination IS NULL OR TRIM(mse_general_examination) = '';

UPDATE public.adl_files
SET mse_psychomotor_examination = NULLIF(TRIM(
  CONCAT_WS(
    E'\n\n',
    CASE WHEN COALESCE(TRIM(mse_psychomotor_verbalization), '') <> '' THEN
      'Verbalization' || E'\n' || TRIM(mse_psychomotor_verbalization) END,
    CASE WHEN COALESCE(TRIM(mse_psychomotor_pressure), '') <> '' THEN
      'Pressure of activity' || E'\n' || TRIM(mse_psychomotor_pressure) END,
    CASE WHEN COALESCE(TRIM(mse_psychomotor_tension), '') <> '' THEN
      'Tension' || E'\n' || TRIM(mse_psychomotor_tension) END,
    CASE WHEN COALESCE(TRIM(mse_psychomotor_posture), '') <> '' THEN
      'Posture' || E'\n' || TRIM(mse_psychomotor_posture) END,
    CASE WHEN COALESCE(TRIM(mse_psychomotor_mannerism), '') <> '' THEN
      'Mannerism/Stereotypy' || E'\n' || TRIM(mse_psychomotor_mannerism) END,
    CASE WHEN COALESCE(TRIM(mse_psychomotor_catatonic), '') <> '' THEN
      'Catatonic features' || E'\n' || TRIM(mse_psychomotor_catatonic) END
  )
), '')
WHERE mse_psychomotor_examination IS NULL OR TRIM(mse_psychomotor_examination) = '';

UPDATE public.adl_files
SET mse_affect_examination = NULLIF(TRIM(
  CONCAT_WS(
    E'\n\n',
    CASE WHEN COALESCE(TRIM(mse_affect_subjective), '') <> '' THEN
      'Subjective feeling/Objective Feeling' || E'\n' || TRIM(mse_affect_subjective) END,
    CASE WHEN COALESCE(TRIM(mse_affect_tone), '') <> '' THEN
      'Tone' || E'\n' || TRIM(mse_affect_tone) END,
    CASE WHEN COALESCE(TRIM(mse_affect_resting), '') <> '' THEN
      'Resting expression' || E'\n' || TRIM(mse_affect_resting) END,
    CASE WHEN COALESCE(TRIM(mse_affect_fluctuation), '') <> '' THEN
      'Fluctuation' || E'\n' || TRIM(mse_affect_fluctuation) END
  )
), '')
WHERE mse_affect_examination IS NULL OR TRIM(mse_affect_examination) = '';

ALTER TABLE public.adl_files DROP COLUMN IF EXISTS mse_general_demeanour;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS mse_general_tidy;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS mse_general_awareness;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS mse_general_cooperation;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS mse_psychomotor_verbalization;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS mse_psychomotor_pressure;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS mse_psychomotor_tension;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS mse_psychomotor_posture;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS mse_psychomotor_mannerism;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS mse_psychomotor_catatonic;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS mse_affect_subjective;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS mse_affect_tone;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS mse_affect_resting;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS mse_affect_fluctuation;
