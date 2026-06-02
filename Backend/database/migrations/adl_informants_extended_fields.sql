-- ADL informants JSONB: extended object shape (no new table columns required).
-- Each element in adl_files.informants may include:
--   relationship, name, reliability (original)
--   age, sex, education, marital_status, occupation, city_district (added)

COMMENT ON COLUMN public.adl_files.informants IS
  'JSONB array of informant objects: relationship, name, reliability, age, sex, education, marital_status, occupation, city_district';
