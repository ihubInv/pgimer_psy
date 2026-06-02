-- Occupation: merge occupation_jobs JSONB array into one text column.

ALTER TABLE public.adl_files
  ADD COLUMN IF NOT EXISTS occupation_history text;

COMMENT ON COLUMN public.adl_files.occupation_history IS
  'Occupation / employment history: job title, dates, adjustment, difficulties, promotions, reason for change';

UPDATE public.adl_files af
SET occupation_history = sub.merged
FROM (
  SELECT
    af2.id,
    NULLIF(TRIM(string_agg(blocks.job_block, E'\n\n---\n\n' ORDER BY blocks.ord)), '') AS merged
  FROM public.adl_files af2
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN af2.occupation_jobs IS NOT NULL AND jsonb_typeof(af2.occupation_jobs) = 'array'
      THEN af2.occupation_jobs
      ELSE '[]'::jsonb
    END
  ) WITH ORDINALITY AS t(elem, ord)
  CROSS JOIN LATERAL (
    SELECT
      ord,
      NULLIF(TRIM(CONCAT_WS(
        E'\n\n',
        CASE WHEN COALESCE(TRIM(elem->>'job'), '') <> '' THEN
          'Job title' || E'\n' || TRIM(elem->>'job') END,
        CASE WHEN COALESCE(TRIM(elem->>'dates'), '') <> '' THEN
          'Dates' || E'\n' || TRIM(elem->>'dates') END,
        CASE WHEN COALESCE(TRIM(elem->>'adjustment'), '') <> '' THEN
          'Adjustment' || E'\n' || TRIM(elem->>'adjustment') END,
        CASE WHEN COALESCE(TRIM(elem->>'difficulties'), '') <> '' THEN
          'Difficulties' || E'\n' || TRIM(elem->>'difficulties') END,
        CASE WHEN COALESCE(TRIM(elem->>'promotions'), '') <> '' THEN
          'Promotions' || E'\n' || TRIM(elem->>'promotions') END,
        CASE WHEN COALESCE(TRIM(elem->>'change_reason'), '') <> '' THEN
          'Reason for change' || E'\n' || TRIM(elem->>'change_reason') END
      )), '') AS job_block
  ) blocks
  WHERE blocks.job_block IS NOT NULL
  GROUP BY af2.id
) sub
WHERE af.id = sub.id
  AND (af.occupation_history IS NULL OR TRIM(af.occupation_history) = '');

ALTER TABLE public.adl_files DROP COLUMN IF EXISTS occupation_jobs;
