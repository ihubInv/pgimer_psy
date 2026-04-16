-- Optional: set USE_SQL_ADL_NUMBER=true in Backend .env if you want the API to call this function.
-- Otherwise the server generates ADL numbers in JavaScript (no DB round trip).
-- Run once on databases that do not already define this function.
CREATE OR REPLACE FUNCTION public.generate_adl_number()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT 'ADL'
    || extract(year from now())::int::text
    || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
$$;
