-- Living situation: remove residents/in-laws JSONB; merge arrangement fields into one text column.

ALTER TABLE public.adl_files
  ADD COLUMN IF NOT EXISTS living_situation_history text;

COMMENT ON COLUMN public.adl_files.living_situation_history IS
  'Living arrangements: income sharing, expenses, kitchen, domestic conflicts, social class';

UPDATE public.adl_files
SET living_situation_history = NULLIF(TRIM(
  CONCAT_WS(
    E'\n\n',
    CASE WHEN COALESCE(TRIM(living_income_sharing), '') <> '' THEN
      'Income sharing arrangements' || E'\n' || TRIM(living_income_sharing) END,
    CASE WHEN COALESCE(TRIM(living_expenses), '') <> '' THEN
      'Expenses' || E'\n' || TRIM(living_expenses) END,
    CASE WHEN COALESCE(TRIM(living_kitchen), '') <> '' THEN
      'Kitchen arrangements' || E'\n' || TRIM(living_kitchen) END,
    CASE WHEN COALESCE(TRIM(living_domestic_conflicts), '') <> '' THEN
      'Domestic conflicts' || E'\n' || TRIM(living_domestic_conflicts) END,
    CASE WHEN COALESCE(TRIM(living_social_class), '') <> '' THEN
      'Social class' || E'\n' || TRIM(living_social_class) END
  )
), '')
WHERE living_situation_history IS NULL OR TRIM(living_situation_history) = '';

ALTER TABLE public.adl_files DROP COLUMN IF EXISTS living_residents;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS living_inlaws;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS living_income_sharing;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS living_expenses;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS living_kitchen;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS living_domestic_conflicts;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS living_social_class;
