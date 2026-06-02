-- MSE insight, diagnostic formulation, and final assessment → one text column each.

ALTER TABLE public.adl_files
  ADD COLUMN IF NOT EXISTS mse_insight_examination text,
  ADD COLUMN IF NOT EXISTS diagnostic_formulation_history text,
  ADD COLUMN IF NOT EXISTS final_assessment_history text;

COMMENT ON COLUMN public.adl_files.mse_insight_examination IS
  'MSE insight: understanding of illness, judgement';
COMMENT ON COLUMN public.adl_files.diagnostic_formulation_history IS
  'Diagnostic formulation: summary, salient features, psychodynamic';
COMMENT ON COLUMN public.adl_files.final_assessment_history IS
  'Final assessment: provisional diagnosis, treatment plan, consultant comments';

UPDATE public.adl_files
SET mse_insight_examination = NULLIF(TRIM(
  CONCAT_WS(
    E'\n\n',
    CASE WHEN COALESCE(TRIM(mse_insight_understanding), '') <> '' THEN
      'Understanding of illness' || E'\n' || TRIM(mse_insight_understanding) END,
    CASE WHEN COALESCE(TRIM(mse_insight_judgement), '') <> '' THEN
      'Judgement' || E'\n' || TRIM(mse_insight_judgement) END
  )
), '')
WHERE mse_insight_examination IS NULL OR TRIM(mse_insight_examination) = '';

UPDATE public.adl_files
SET diagnostic_formulation_history = NULLIF(TRIM(
  CONCAT_WS(
    E'\n\n',
    CASE WHEN COALESCE(TRIM(diagnostic_formulation_summary), '') <> '' THEN
      'Brief clinical summary' || E'\n' || TRIM(diagnostic_formulation_summary) END,
    CASE WHEN COALESCE(TRIM(diagnostic_formulation_features), '') <> '' THEN
      'Salient features supporting diagnosis' || E'\n' || TRIM(diagnostic_formulation_features) END,
    CASE WHEN COALESCE(TRIM(diagnostic_formulation_psychodynamic), '') <> '' THEN
      'Psychodynamic formulation' || E'\n' || TRIM(diagnostic_formulation_psychodynamic) END
  )
), '')
WHERE diagnostic_formulation_history IS NULL OR TRIM(diagnostic_formulation_history) = '';

UPDATE public.adl_files
SET final_assessment_history = NULLIF(TRIM(
  CONCAT_WS(
    E'\n\n',
    CASE WHEN COALESCE(TRIM(provisional_diagnosis), '') <> '' THEN
      'Provisional Diagnosis' || E'\n' || TRIM(provisional_diagnosis) END,
    CASE WHEN COALESCE(TRIM(treatment_plan), '') <> '' THEN
      'Treatment Plan' || E'\n' || TRIM(treatment_plan) END,
    CASE WHEN COALESCE(TRIM(consultant_comments), '') <> '' THEN
      'Consultant Comments' || E'\n' || TRIM(consultant_comments) END
  )
), '')
WHERE final_assessment_history IS NULL OR TRIM(final_assessment_history) = '';

ALTER TABLE public.adl_files DROP COLUMN IF EXISTS mse_insight_understanding;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS mse_insight_judgement;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS diagnostic_formulation_summary;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS diagnostic_formulation_features;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS diagnostic_formulation_psychodynamic;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS provisional_diagnosis;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS treatment_plan;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS consultant_comments;
