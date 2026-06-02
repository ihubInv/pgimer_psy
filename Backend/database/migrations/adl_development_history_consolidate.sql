-- Development: merge nine text fields into one column.

ALTER TABLE public.adl_files
  ADD COLUMN IF NOT EXISTS development_history text;

COMMENT ON COLUMN public.adl_files.development_history IS
  'Development milestones: weaning, first words, three-word sentences, walking, neurotic traits, nail biting, bedwetting, phobias, childhood illness';

UPDATE public.adl_files
SET development_history = NULLIF(TRIM(
  CONCAT_WS(
    E'\n\n',
    CASE WHEN COALESCE(TRIM(development_weaning_age), '') <> '' THEN
      'Weaning age' || E'\n' || TRIM(development_weaning_age) END,
    CASE WHEN COALESCE(TRIM(development_first_words), '') <> '' THEN
      'First words' || E'\n' || TRIM(development_first_words) END,
    CASE WHEN COALESCE(TRIM(development_three_words), '') <> '' THEN
      'Three words sentences' || E'\n' || TRIM(development_three_words) END,
    CASE WHEN COALESCE(TRIM(development_walking), '') <> '' THEN
      'Walking age' || E'\n' || TRIM(development_walking) END,
    CASE WHEN COALESCE(TRIM(development_neurotic_traits), '') <> '' THEN
      'Neurotic traits' || E'\n' || TRIM(development_neurotic_traits) END,
    CASE WHEN COALESCE(TRIM(development_nail_biting), '') <> '' THEN
      'Nail biting' || E'\n' || TRIM(development_nail_biting) END,
    CASE WHEN COALESCE(TRIM(development_bedwetting), '') <> '' THEN
      'Bedwetting' || E'\n' || TRIM(development_bedwetting) END,
    CASE WHEN COALESCE(TRIM(development_phobias), '') <> '' THEN
      'Phobias' || E'\n' || TRIM(development_phobias) END,
    CASE WHEN COALESCE(TRIM(development_childhood_illness), '') <> '' THEN
      'Childhood illness' || E'\n' || TRIM(development_childhood_illness) END
  )
), '')
WHERE development_history IS NULL OR TRIM(development_history) = '';

ALTER TABLE public.adl_files DROP COLUMN IF EXISTS development_weaning_age;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS development_first_words;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS development_three_words;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS development_walking;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS development_neurotic_traits;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS development_nail_biting;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS development_bedwetting;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS development_phobias;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS development_childhood_illness;
