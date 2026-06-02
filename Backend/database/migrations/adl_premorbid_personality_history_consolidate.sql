-- Premorbid personality: merge seven fields into one text column.

ALTER TABLE public.adl_files
  ADD COLUMN IF NOT EXISTS premorbid_personality_history text;

COMMENT ON COLUMN public.adl_files.premorbid_personality_history IS
  'Premorbid personality: passive/active, assertiveness, introvert/extrovert, traits, hobbies, habits, alcohol/drugs';

UPDATE public.adl_files
SET premorbid_personality_history = NULLIF(TRIM(
  CONCAT_WS(
    E'\n\n',
    CASE WHEN COALESCE(TRIM(premorbid_personality_passive_active), '') <> '' THEN
      'Passive vs Active' || E'\n' || TRIM(premorbid_personality_passive_active) END,
    CASE WHEN COALESCE(TRIM(premorbid_personality_assertive), '') <> '' THEN
      'Assertiveness' || E'\n' || TRIM(premorbid_personality_assertive) END,
    CASE WHEN COALESCE(TRIM(premorbid_personality_introvert_extrovert), '') <> '' THEN
      'Introvert vs Extrovert' || E'\n' || TRIM(premorbid_personality_introvert_extrovert) END,
    CASE WHEN premorbid_personality_traits IS NOT NULL
      AND jsonb_typeof(premorbid_personality_traits) = 'array'
      AND jsonb_array_length(premorbid_personality_traits) > 0 THEN
      'Personality traits' || E'\n' || (
        SELECT string_agg(TRIM(BOTH '"' FROM elem::text), ', ')
        FROM jsonb_array_elements(premorbid_personality_traits) AS elem
        WHERE TRIM(BOTH '"' FROM elem::text) <> ''
      ) END,
    CASE WHEN COALESCE(TRIM(premorbid_personality_hobbies), '') <> '' THEN
      'Hobbies and interests' || E'\n' || TRIM(premorbid_personality_hobbies) END,
    CASE WHEN COALESCE(TRIM(premorbid_personality_habits), '') <> '' THEN
      'Habits' || E'\n' || TRIM(premorbid_personality_habits) END,
    CASE WHEN COALESCE(TRIM(premorbid_personality_alcohol_drugs), '') <> '' THEN
      'Alcohol and drug use' || E'\n' || TRIM(premorbid_personality_alcohol_drugs) END
  )
), '')
WHERE premorbid_personality_history IS NULL OR TRIM(premorbid_personality_history) = '';

ALTER TABLE public.adl_files DROP COLUMN IF EXISTS premorbid_personality_passive_active;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS premorbid_personality_assertive;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS premorbid_personality_introvert_extrovert;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS premorbid_personality_traits;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS premorbid_personality_hobbies;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS premorbid_personality_habits;
ALTER TABLE public.adl_files DROP COLUMN IF EXISTS premorbid_personality_alcohol_drugs;
