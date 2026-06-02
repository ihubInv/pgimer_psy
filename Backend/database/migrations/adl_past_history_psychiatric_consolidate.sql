-- Past history B. Psychiatric: one text field; drop date and separate sub-fields.

ALTER TABLE public.adl_files
  ADD COLUMN IF NOT EXISTS past_history_psychiatric text;

COMMENT ON COLUMN public.adl_files.past_history_psychiatric IS
  'Past psychiatric history (diagnosis, treatment, interim history, recovery/socialization)';

UPDATE public.adl_files
SET past_history_psychiatric = NULLIF(TRIM(
  CONCAT_WS(
    E'\n\n',
    CASE WHEN COALESCE(TRIM(past_history_psychiatric_diagnosis), '') <> '' THEN
      'Diagnosis or salient features' || E'\n' || TRIM(past_history_psychiatric_diagnosis) END,
    CASE WHEN COALESCE(TRIM(past_history_psychiatric_treatment), '') <> '' THEN
      'Treatment' || E'\n' || TRIM(past_history_psychiatric_treatment) END,
    CASE WHEN COALESCE(TRIM(past_history_psychiatric_interim), '') <> '' THEN
      'Interim history of previous psychiatric illness' || E'\n' || TRIM(past_history_psychiatric_interim) END,
    CASE WHEN COALESCE(TRIM(past_history_psychiatric_recovery), '') <> '' THEN
      'Specific enquiry into completeness of recovery and socialization/personal care in the interim period' || E'\n' || TRIM(past_history_psychiatric_recovery) END
  )
), '')
WHERE past_history_psychiatric IS NULL OR TRIM(past_history_psychiatric) = '';

ALTER TABLE public.adl_files DROP COLUMN IF EXISTS past_history_psychiatric_dates;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS past_history_psychiatric_diagnosis;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS past_history_psychiatric_treatment;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS past_history_psychiatric_interim;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS past_history_psychiatric_recovery;
