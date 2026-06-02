-- Consolidate HPI fields A/B/C into history_present_illness; drop place & treatment date from section D.

ALTER TABLE public.adl_files
  ADD COLUMN IF NOT EXISTS history_present_illness text;

COMMENT ON COLUMN public.adl_files.history_present_illness IS
  'History of present illness (sections A–C combined): spontaneous narrative, specific enquiry, drug intake';

UPDATE public.adl_files
SET history_present_illness = NULLIF(TRIM(
  CONCAT_WS(
    E'\n\n',
    CASE WHEN COALESCE(TRIM(history_narrative), '') <> '' THEN
      'A. Spontaneous narrative account' || E'\n' || TRIM(history_narrative) END,
    CASE WHEN COALESCE(TRIM(history_specific_enquiry), '') <> '' THEN
      'B. Specific enquiry about mood, sleep, appetite, anxiety symptoms, suicidal risk, social interaction, job efficiency, personal hygiene, memory, etc.' || E'\n' || TRIM(history_specific_enquiry) END,
    CASE WHEN COALESCE(TRIM(history_drug_intake), '') <> '' THEN
      'C. Intake of dependence producing and prescription drugs' || E'\n' || TRIM(history_drug_intake) END
  )
), '')
WHERE history_present_illness IS NULL OR TRIM(history_present_illness) = '';

ALTER TABLE public.adl_files DROP COLUMN IF EXISTS history_narrative;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS history_specific_enquiry;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS history_drug_intake;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS history_treatment_place;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS history_treatment_dates;
