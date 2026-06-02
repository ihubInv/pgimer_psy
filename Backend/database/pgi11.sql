--
-- PostgreSQL database dump
--

\restrict mld3P4lPXlQGiAYKVT0b7pl16ynJMFCAhHU5LtcRjQCEaoJ11lubJus3mUPeQew

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

-- Started on 2025-11-25 16:39:11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 244 (class 1255 OID 21372)
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 226 (class 1259 OID 21383)
-- Name: adl_files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.adl_files (
    id integer NOT NULL,
    patient_id integer,
    adl_no character varying(50),
    created_by integer,
    clinical_proforma_id integer,
    file_status character varying(20) DEFAULT 'created'::character varying,
    physical_file_location text,
    file_created_date date NOT NULL,
    last_accessed_date date,
    last_accessed_by integer,
    total_visits integer DEFAULT 1,
    is_active boolean DEFAULT true,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    history_narrative text,
    history_specific_enquiry text,
    history_drug_intake text,
    history_treatment_place text,
    history_treatment_dates date,
    history_treatment_drugs text,
    history_treatment_response text,
    informants jsonb DEFAULT '[]'::jsonb,
    complaints_patient jsonb DEFAULT '[]'::jsonb,
    complaints_informant jsonb DEFAULT '[]'::jsonb,
    onset_duration text,
    precipitating_factor text,
    course text,
    past_history_medical text,
    past_history_psychiatric_dates date,
    past_history_psychiatric_diagnosis text,
    past_history_psychiatric_treatment text,
    past_history_psychiatric_interim text,
    past_history_psychiatric_recovery text,
    family_history_father_age integer,
    family_history_father_education text,
    family_history_father_occupation text,
    family_history_father_personality text,
    family_history_father_deceased boolean DEFAULT false,
    family_history_father_death_age integer,
    family_history_father_death_date date,
    family_history_father_death_cause text,
    family_history_mother_age integer,
    family_history_mother_education text,
    family_history_mother_occupation text,
    family_history_mother_personality text,
    family_history_mother_deceased boolean DEFAULT false,
    family_history_mother_death_age integer,
    family_history_mother_death_date date,
    family_history_mother_death_cause text,
    family_history_siblings jsonb DEFAULT '[]'::jsonb,
    family_history text,
    diagnostic_formulation_history text,
    premorbid_personality_history text,
    physical_appearance text,
    physical_body_build text,
    physical_pallor boolean DEFAULT false,
    physical_icterus boolean DEFAULT false,
    physical_oedema boolean DEFAULT false,
    physical_lymphadenopathy boolean DEFAULT false,
    physical_pulse text,
    physical_bp text,
    physical_height text,
    physical_weight text,
    physical_waist text,
    physical_fundus text,
    physical_cvs_examination text,
    physical_chest_examination text,
    physical_abdomen_examination text,
    physical_cns_cranial text,
    physical_cns_motor_sensory text,
    physical_cns_rigidity text,
    physical_cns_involuntary text,
    physical_cns_superficial_reflexes text,
    physical_cns_dtrs text,
    physical_cns_plantar text,
    physical_cns_cerebellar text,
    mse_general_examination text,
    mse_psychomotor_examination text,
    mse_affect_examination text,
    mse_thought_flow text,
    mse_thought_form text,
    mse_thought_content text,
    mse_thought_possession text,
    mse_thought_perception text,
    mse_cognitive_consciousness text,
    mse_cognitive_orientation_time text,
    mse_cognitive_orientation_place text,
    mse_cognitive_orientation_person text,
    mse_cognitive_memory_immediate text,
    mse_cognitive_memory_recent text,
    mse_cognitive_memory_remote text,
    mse_cognitive_subtraction text,
    mse_cognitive_digit_span text,
    mse_cognitive_counting text,
    mse_cognitive_general_knowledge text,
    mse_cognitive_calculation text,
    mse_cognitive_similarities text,
    mse_cognitive_proverbs text,
    mse_insight_examination text,
    education_history text,
    occupation_history text,
    sexual_menarche_age text,
    sexual_menarche_reaction text,
    sexual_education text,
    sexual_masturbation text,
    sexual_contact text,
    sexual_premarital_extramarital text,
    sexual_marriage_arranged text,
    sexual_marriage_details text,
    sexual_children jsonb DEFAULT '[]'::jsonb,
    religion_history text,
    living_situation_history text,
    general_home_situation text,
    personal_birth_date date,
    personal_birth_place text,
    personal_delivery_type text,
    personal_complications_prenatal text,
    personal_complications_natal text,
    personal_complications_postnatal text,
    development_history text,
    final_assessment_history text,
    CONSTRAINT adl_files_file_status_check CHECK (((file_status)::text = ANY (ARRAY[('created'::character varying)::text, ('stored'::character varying)::text, ('retrieved'::character varying)::text, ('active'::character varying)::text, ('archived'::character varying)::text])))
);


ALTER TABLE public.adl_files OWNER TO postgres;

--
-- TOC entry 5193 (class 0 OID 0)
-- Dependencies: 226
-- Name: TABLE adl_files; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.adl_files IS 'Specialized file management for complex cases';


--
-- TOC entry 5194 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN adl_files.history_narrative; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.adl_files.history_narrative IS 'Detailed narrative history of present illness';


--
-- TOC entry 5195 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN adl_files.informants; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.adl_files.informants IS 'JSONB array of informant details';


--
-- TOC entry 5196 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN adl_files.complaints_patient; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.adl_files.complaints_patient IS 'JSONB array of patient complaints';


--
-- TOC entry 5197 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN adl_files.complaints_informant; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.adl_files.complaints_informant IS 'JSONB array of informant complaints';


--
-- TOC entry 5198 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN adl_files.family_history_siblings; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.adl_files.family_history_siblings IS 'JSONB array of sibling information';


--
-- TOC entry 5199 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN adl_files.premorbid_personality_history; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.adl_files.premorbid_personality_history IS 'Premorbid personality: passive/active, assertiveness, introvert/extrovert, traits, hobbies, habits, alcohol/drugs';


--
-- TOC entry 5200 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN adl_files.occupation_history; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.adl_files.occupation_history IS 'Occupation / employment history (combined job fields)';


--
-- TOC entry 5201 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN adl_files.sexual_children; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.adl_files.sexual_children IS 'JSONB array of children information';


--
-- TOC entry 5202 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN adl_files.living_residents; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.adl_files.living_situation_history IS 'Living arrangements: income sharing, expenses, kitchen, domestic conflicts, social class';


--
-- TOC entry 5203 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN adl_files.living_inlaws; Type: COMMENT; Schema: public; Owner: postgres
--



--
-- TOC entry 217 (class 1259 OID 21373)
-- Name: adl_files_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.adl_files_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.adl_files_id_seq OWNER TO postgres;

--
-- TOC entry 5205 (class 0 OID 0)
-- Dependencies: 217
-- Name: adl_files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.adl_files_id_seq OWNED BY public.adl_files.id;


--
-- TOC entry 227 (class 1259 OID 21410)
-- Name: audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_log (
    id integer NOT NULL,
    table_name character varying(50) NOT NULL,
    record_id character varying(255) NOT NULL,
    action character varying(20) NOT NULL,
    old_values jsonb,
    new_values jsonb,
    changed_by integer,
    changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ip_address inet,
    user_agent text
);


ALTER TABLE public.audit_log OWNER TO postgres;

--
-- TOC entry 5207 (class 0 OID 0)
-- Dependencies: 227
-- Name: TABLE audit_log; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.audit_log IS 'Complete audit trail for all data changes';


--
-- TOC entry 218 (class 1259 OID 21374)
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_log_id_seq OWNER TO postgres;

--
-- TOC entry 5209 (class 0 OID 0)
-- Dependencies: 218
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;


--
-- TOC entry 239 (class 1259 OID 21714)
-- Name: clinical_options; Type: TABLE; Schema: public; Owner: fariyad
--

CREATE TABLE public.clinical_options (
    id integer NOT NULL,
    option_group character varying(100) NOT NULL,
    option_label character varying(255) NOT NULL,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.clinical_options OWNER TO fariyad;

--
-- TOC entry 5211 (class 0 OID 0)
-- Dependencies: 239
-- Name: TABLE clinical_options; Type: COMMENT; Schema: public; Owner: fariyad
--

COMMENT ON TABLE public.clinical_options IS 'Dynamic options for clinical proforma form fields';


--
-- TOC entry 238 (class 1259 OID 21713)
-- Name: clinical_options_id_seq; Type: SEQUENCE; Schema: public; Owner: fariyad
--

CREATE SEQUENCE public.clinical_options_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clinical_options_id_seq OWNER TO fariyad;

--
-- TOC entry 5212 (class 0 OID 0)
-- Dependencies: 238
-- Name: clinical_options_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: fariyad
--

ALTER SEQUENCE public.clinical_options_id_seq OWNED BY public.clinical_options.id;


--
-- TOC entry 228 (class 1259 OID 21417)
-- Name: clinical_proforma; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clinical_proforma (
    id integer NOT NULL,
    patient_id integer,
    filled_by integer,
    visit_date date NOT NULL,
    visit_type character varying(20) DEFAULT 'first_visit'::character varying,
    room_no text,
    informant_present boolean,
    nature_of_information text,
    onset_duration text,
    course text,
    precipitating_factor text,
    illness_duration text,
    current_episode_since text,
    mood text,
    behaviour text,
    speech text,
    thought text,
    perception text,
    somatic text,
    bio_functions text,
    adjustment text,
    cognitive_function text,
    fits text,
    sexual_problem text,
    substance_use text,
    past_history text,
    family_history text,
    associated_medical_surgical text,
    mse_behaviour text,
    mse_affect text,
    mse_thought text,
    mse_delusions text,
    mse_perception text,
    mse_cognitive_function text,
    gpe text,
    diagnosis text,
    icd_code text,
    disposal text,
    workup_appointment date,
    referred_to text,
    treatment_prescribed text,
    doctor_decision character varying(20) DEFAULT 'simple_case'::character varying,
    case_severity character varying(20),
    requires_adl_file boolean DEFAULT false,
    adl_reasoning text,
    adl_file_id integer,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    assigned_doctor integer,
    prescriptions jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT clinical_proforma_case_severity_check CHECK (((case_severity)::text = ANY (ARRAY[('mild'::character varying)::text, ('moderate'::character varying)::text, ('severe'::character varying)::text, ('critical'::character varying)::text]))),
    CONSTRAINT clinical_proforma_doctor_decision_check CHECK (((doctor_decision)::text = ANY (ARRAY[('simple_case'::character varying)::text, ('complex_case'::character varying)::text]))),
    CONSTRAINT clinical_proforma_visit_type_check CHECK (((visit_type)::text = ANY (ARRAY[('first_visit'::character varying)::text, ('follow_up'::character varying)::text])))
);


ALTER TABLE public.clinical_proforma OWNER TO postgres;

--
-- TOC entry 5213 (class 0 OID 0)
-- Dependencies: 228
-- Name: TABLE clinical_proforma; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.clinical_proforma IS 'Clinical assessment data collected by doctors';


--
-- TOC entry 5214 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN clinical_proforma.assigned_doctor; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.clinical_proforma.assigned_doctor IS 'Doctor assigned to the patient for this visit';


--
-- TOC entry 219 (class 1259 OID 21375)
-- Name: clinical_proforma_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.clinical_proforma_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clinical_proforma_id_seq OWNER TO postgres;

--
-- TOC entry 5216 (class 0 OID 0)
-- Dependencies: 219
-- Name: clinical_proforma_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.clinical_proforma_id_seq OWNED BY public.clinical_proforma.id;


--
-- TOC entry 229 (class 1259 OID 21433)
-- Name: login_otps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.login_otps (
    id integer NOT NULL,
    user_id integer NOT NULL,
    otp character varying(6) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.login_otps OWNER TO postgres;

--
-- TOC entry 5218 (class 0 OID 0)
-- Dependencies: 229
-- Name: TABLE login_otps; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.login_otps IS 'Login OTPs for 2FA login verification';


--
-- TOC entry 220 (class 1259 OID 21376)
-- Name: login_otps_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.login_otps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.login_otps_id_seq OWNER TO postgres;

--
-- TOC entry 5220 (class 0 OID 0)
-- Dependencies: 220
-- Name: login_otps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.login_otps_id_seq OWNED BY public.login_otps.id;


--
-- TOC entry 230 (class 1259 OID 21440)
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_reset_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token character varying(255) NOT NULL,
    otp character varying(6) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.password_reset_tokens OWNER TO postgres;

--
-- TOC entry 5222 (class 0 OID 0)
-- Dependencies: 230
-- Name: TABLE password_reset_tokens; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.password_reset_tokens IS 'Password reset tokens for forgot password functionality';


--
-- TOC entry 221 (class 1259 OID 21377)
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.password_reset_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_reset_tokens_id_seq OWNER TO postgres;

--
-- TOC entry 5224 (class 0 OID 0)
-- Dependencies: 221
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.password_reset_tokens_id_seq OWNED BY public.password_reset_tokens.id;


--
-- TOC entry 243 (class 1259 OID 21757)
-- Name: patient_files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.patient_files (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    attachment text[] DEFAULT '{}'::text[] NOT NULL,
    role jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.patient_files OWNER TO postgres;

--
-- TOC entry 5226 (class 0 OID 0)
-- Dependencies: 243
-- Name: TABLE patient_files; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.patient_files IS 'Stores file attachments for patients. Each record can contain multiple file paths in the attachment array.';


--
-- TOC entry 5227 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN patient_files.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.patient_files.id IS 'Primary key';


--
-- TOC entry 5228 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN patient_files.patient_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.patient_files.patient_id IS 'Foreign key to registered_patient table';


--
-- TOC entry 5229 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN patient_files.attachment; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.patient_files.attachment IS 'Array of file paths stored in uploads/patient_files/{patient_id}/';


--
-- TOC entry 5230 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN patient_files.role; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.patient_files.role IS 'JSONB array of user IDs who uploaded/updated files, format: [{ id: 1 }, { id: 2 }]';


--
-- TOC entry 5231 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN patient_files.created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.patient_files.created_at IS 'Timestamp when record was created';


--
-- TOC entry 5232 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN patient_files.updated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.patient_files.updated_at IS 'Timestamp when record was last updated';


--
-- TOC entry 242 (class 1259 OID 21756)
-- Name: patient_files_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.patient_files_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.patient_files_id_seq OWNER TO postgres;

--
-- TOC entry 5234 (class 0 OID 0)
-- Dependencies: 242
-- Name: patient_files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.patient_files_id_seq OWNED BY public.patient_files.id;


--
-- TOC entry 231 (class 1259 OID 21447)
-- Name: patient_visits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.patient_visits (
    id integer NOT NULL,
    patient_id integer,
    visit_date date NOT NULL,
    visit_type character varying(20) NOT NULL,
    has_file boolean DEFAULT false,
    adl_file_id integer,
    clinical_proforma_id integer,
    assigned_doctor_id integer,
    room_no text,
    visit_status character varying(20) DEFAULT 'scheduled'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT patient_visits_visit_status_check CHECK (((visit_status)::text = ANY (ARRAY[('scheduled'::character varying)::text, ('in_progress'::character varying)::text, ('completed'::character varying)::text, ('cancelled'::character varying)::text]))),
    CONSTRAINT patient_visits_visit_type_check CHECK (((visit_type)::text = ANY (ARRAY[('first_visit'::character varying)::text, ('follow_up'::character varying)::text])))
);


ALTER TABLE public.patient_visits OWNER TO postgres;

--
-- TOC entry 5236 (class 0 OID 0)
-- Dependencies: 231
-- Name: TABLE patient_visits; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.patient_visits IS 'Visit tracking and history';


--
-- TOC entry 222 (class 1259 OID 21378)
-- Name: patient_visits_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.patient_visits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.patient_visits_id_seq OWNER TO postgres;

--
-- TOC entry 5238 (class 0 OID 0)
-- Dependencies: 222
-- Name: patient_visits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.patient_visits_id_seq OWNED BY public.patient_visits.id;


--
-- TOC entry 237 (class 1259 OID 21701)
-- Name: prescriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.prescriptions (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    clinical_proforma_id integer NOT NULL,
    prescriptions jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.prescriptions OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 21700)
-- Name: prescriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.prescriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.prescriptions_id_seq OWNER TO postgres;

--
-- TOC entry 5241 (class 0 OID 0)
-- Dependencies: 236
-- Name: prescriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.prescriptions_id_seq OWNED BY public.prescriptions.id;


--
-- TOC entry 241 (class 1259 OID 21729)
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.refresh_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token text NOT NULL,
    device_info text,
    ip_address character varying(45),
    last_activity timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone NOT NULL,
    is_revoked boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.refresh_tokens OWNER TO postgres;

--
-- TOC entry 5243 (class 0 OID 0)
-- Dependencies: 241
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.refresh_tokens IS 'Stores refresh tokens for session management with activity tracking';


--
-- TOC entry 240 (class 1259 OID 21728)
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.refresh_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.refresh_tokens_id_seq OWNER TO postgres;

--
-- TOC entry 5245 (class 0 OID 0)
-- Dependencies: 240
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.refresh_tokens_id_seq OWNED BY public.refresh_tokens.id;


--
-- TOC entry 232 (class 1259 OID 21467)
-- Name: registered_patient; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.registered_patient (
    id integer NOT NULL,
    cr_no character varying(50),
    psy_no text,
    special_clinic_no text,
    adl_no character varying(50),
    date date,
    name text NOT NULL,
    contact_number text,
    age integer,
    sex character varying(10),
    category character varying(50),
    father_name text,
    department text,
    unit_consit text,
    room_no text,
    serial_no text,
    file_no text,
    unit_days text,
    seen_in_walk_in_on date,
    worked_up_on date,
    age_group text,
    marital_status text,
    year_of_marriage integer,
    no_of_children_male integer DEFAULT 0,
    no_of_children_female integer DEFAULT 0,
    occupation text,
    education text,
    locality text,
    income numeric(12,2),
    religion text,
    family_type text,
    head_name text,
    head_age integer,
    head_relationship text,
    head_education text,
    head_occupation text,
    head_income numeric(12,2),
    distance_from_hospital text,
    mobility text,
    referred_by text,
    address_line text,
    country text,
    state text,
    district text,
    city text,
    pin_code text,
    assigned_doctor_id integer,
    assigned_doctor_name text,
    assigned_room text,
    filled_by integer,
    has_adl_file boolean DEFAULT false,
    file_status character varying(20) DEFAULT 'none'::character varying,
    case_complexity character varying(20) DEFAULT 'simple'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    permanent_address_line_1 text,
    permanent_address_line_2 text,
    permanent_city_town_village text,
    permanent_district text,
    permanent_state text,
    permanent_pin_code text,
    permanent_country text,
    present_address_line_1 text,
    present_address_line_2 text,
    present_city_town_village text,
    present_district text,
    present_state text,
    present_pin_code text,
    present_country text,
    local_address text,
    patient_income numeric(15,2) DEFAULT 0,
    family_income numeric(15,2) DEFAULT 0,
    present_city_town_village_2 text,
    present_district_2 text,
    present_state_2 text,
    present_pin_code_2 text,
    present_country_2 text,
    patient_files jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT check_unit_days CHECK (((unit_days IS NULL) OR (unit_days = ANY (ARRAY[('mon'::character varying)::text, ('tue'::character varying)::text, ('wed'::character varying)::text, ('thu'::character varying)::text, ('fri'::character varying)::text, ('sat'::character varying)::text])))),
    CONSTRAINT registered_patient_age_check CHECK (((age >= 0) AND (age <= 150))),
    CONSTRAINT registered_patient_case_complexity_check CHECK (((case_complexity)::text = ANY (ARRAY[('simple'::character varying)::text, ('complex'::character varying)::text]))),
    CONSTRAINT registered_patient_file_status_check CHECK (((file_status)::text = ANY (ARRAY[('none'::character varying)::text, ('created'::character varying)::text, ('stored'::character varying)::text, ('retrieved'::character varying)::text, ('active'::character varying)::text]))),
    CONSTRAINT registered_patient_sex_check CHECK (((sex)::text = ANY (ARRAY[('M'::character varying)::text, ('F'::character varying)::text, ('Other'::character varying)::text])))
);


ALTER TABLE public.registered_patient OWNER TO postgres;

--
-- TOC entry 5247 (class 0 OID 0)
-- Dependencies: 232
-- Name: TABLE registered_patient; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.registered_patient IS 'Master patient registry with comprehensive patient information';


--
-- TOC entry 5248 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN registered_patient.present_address_line_2; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.registered_patient.present_address_line_2 IS 'Second line of present address (if applicable)';


--
-- TOC entry 5249 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN registered_patient.present_city_town_village_2; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.registered_patient.present_city_town_village_2 IS 'Alternative city/town/village for present address';


--
-- TOC entry 5250 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN registered_patient.present_district_2; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.registered_patient.present_district_2 IS 'Alternative district for present address';


--
-- TOC entry 5251 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN registered_patient.present_state_2; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.registered_patient.present_state_2 IS 'Alternative state for present address';


--
-- TOC entry 5252 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN registered_patient.present_pin_code_2; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.registered_patient.present_pin_code_2 IS 'Alternative pin code for present address';


--
-- TOC entry 5253 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN registered_patient.present_country_2; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.registered_patient.present_country_2 IS 'Alternative country for present address';


--
-- TOC entry 5254 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN registered_patient.patient_files; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.registered_patient.patient_files IS 'JSON array of uploaded files. Each file object contains filename, path, type, size, and uploaded_at timestamp.';


--
-- TOC entry 223 (class 1259 OID 21380)
-- Name: registered_patient_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.registered_patient_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.registered_patient_id_seq OWNER TO postgres;

--
-- TOC entry 5256 (class 0 OID 0)
-- Dependencies: 223
-- Name: registered_patient_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.registered_patient_id_seq OWNED BY public.registered_patient.id;


--
-- TOC entry 233 (class 1259 OID 21486)
-- Name: system_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_settings (
    id integer NOT NULL,
    setting_key character varying(100) NOT NULL,
    setting_value text,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.system_settings OWNER TO postgres;

--
-- TOC entry 5258 (class 0 OID 0)
-- Dependencies: 233
-- Name: TABLE system_settings; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.system_settings IS 'Application configuration settings';


--
-- TOC entry 224 (class 1259 OID 21381)
-- Name: system_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.system_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_settings_id_seq OWNER TO postgres;

--
-- TOC entry 5260 (class 0 OID 0)
-- Dependencies: 224
-- Name: system_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.system_settings_id_seq OWNED BY public.system_settings.id;


--
-- TOC entry 234 (class 1259 OID 21495)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    role character varying(50) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    two_factor_secret character varying(32),
    two_factor_enabled boolean DEFAULT false,
    backup_codes text[],
    is_active boolean DEFAULT true,
    last_login timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    mobile character varying(15),
    CONSTRAINT users_role_check CHECK (((role)::text = ANY (ARRAY[('Admin'::character varying)::text, ('Faculty'::character varying)::text, ('Resident'::character varying)::text, ('Psychiatric Welfare Officer'::character varying)::text])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 5262 (class 0 OID 0)
-- Dependencies: 234
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.users IS 'System users with role-based access control';


--
-- TOC entry 235 (class 1259 OID 21506)
-- Name: user_stats; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.user_stats AS
 SELECT role,
    count(*) AS total_users,
    count(
        CASE
            WHEN (is_active = true) THEN 1
            ELSE NULL::integer
        END) AS active_users,
    count(
        CASE
            WHEN (last_login IS NOT NULL) THEN 1
            ELSE NULL::integer
        END) AS users_with_login
   FROM public.users
  GROUP BY role;


ALTER VIEW public.user_stats OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 21382)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 5265 (class 0 OID 0)
-- Dependencies: 225
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 4810 (class 2604 OID 21386)
-- Name: adl_files id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.adl_files ALTER COLUMN id SET DEFAULT nextval('public.adl_files_id_seq'::regclass);


--
-- TOC entry 4831 (class 2604 OID 21413)
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- TOC entry 4878 (class 2604 OID 21717)
-- Name: clinical_options id; Type: DEFAULT; Schema: public; Owner: fariyad
--

ALTER TABLE ONLY public.clinical_options ALTER COLUMN id SET DEFAULT nextval('public.clinical_options_id_seq'::regclass);


--
-- TOC entry 4833 (class 2604 OID 21420)
-- Name: clinical_proforma id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinical_proforma ALTER COLUMN id SET DEFAULT nextval('public.clinical_proforma_id_seq'::regclass);


--
-- TOC entry 4841 (class 2604 OID 21436)
-- Name: login_otps id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login_otps ALTER COLUMN id SET DEFAULT nextval('public.login_otps_id_seq'::regclass);


--
-- TOC entry 4845 (class 2604 OID 21443)
-- Name: password_reset_tokens id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens ALTER COLUMN id SET DEFAULT nextval('public.password_reset_tokens_id_seq'::regclass);


--
-- TOC entry 4888 (class 2604 OID 21760)
-- Name: patient_files id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_files ALTER COLUMN id SET DEFAULT nextval('public.patient_files_id_seq'::regclass);


--
-- TOC entry 4849 (class 2604 OID 21450)
-- Name: patient_visits id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_visits ALTER COLUMN id SET DEFAULT nextval('public.patient_visits_id_seq'::regclass);


--
-- TOC entry 4875 (class 2604 OID 21704)
-- Name: prescriptions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prescriptions ALTER COLUMN id SET DEFAULT nextval('public.prescriptions_id_seq'::regclass);


--
-- TOC entry 4883 (class 2604 OID 21732)
-- Name: refresh_tokens id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('public.refresh_tokens_id_seq'::regclass);


--
-- TOC entry 4854 (class 2604 OID 21470)
-- Name: registered_patient id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registered_patient ALTER COLUMN id SET DEFAULT nextval('public.registered_patient_id_seq'::regclass);


--
-- TOC entry 4866 (class 2604 OID 21489)
-- Name: system_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings ALTER COLUMN id SET DEFAULT nextval('public.system_settings_id_seq'::regclass);


--
-- TOC entry 4870 (class 2604 OID 21498)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 5171 (class 0 OID 21383)
-- Dependencies: 226
-- Data for Name: adl_files; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.adl_files (id, patient_id, adl_no, created_by, clinical_proforma_id, file_status, physical_file_location, file_created_date, last_accessed_date, last_accessed_by, total_visits, is_active, notes, created_at, updated_at, history_narrative, history_specific_enquiry, history_drug_intake, history_treatment_place, history_treatment_dates, history_treatment_drugs, history_treatment_response, informants, complaints_patient, complaints_informant, onset_duration, precipitating_factor, course, past_history_medical, past_history_psychiatric_dates, past_history_psychiatric_diagnosis, past_history_psychiatric_treatment, past_history_psychiatric_interim, past_history_psychiatric_recovery, family_history_father_age, family_history_father_education, family_history_father_occupation, family_history_father_personality, family_history_father_deceased, family_history_father_death_age, family_history_father_death_date, family_history_father_death_cause, family_history_mother_age, family_history_mother_education, family_history_mother_occupation, family_history_mother_personality, family_history_mother_deceased, family_history_mother_death_age, family_history_mother_death_date, family_history_mother_death_cause, family_history_siblings, family_history, diagnostic_formulation_summary, diagnostic_formulation_features, diagnostic_formulation_psychodynamic, premorbid_personality_passive_active, premorbid_personality_assertive, premorbid_personality_introvert_extrovert, premorbid_personality_traits, premorbid_personality_hobbies, premorbid_personality_habits, premorbid_personality_alcohol_drugs, physical_appearance, physical_body_build, physical_pallor, physical_icterus, physical_oedema, physical_lymphadenopathy, physical_pulse, physical_bp, physical_height, physical_weight, physical_waist, physical_fundus, physical_cvs_apex, physical_cvs_regularity, physical_cvs_heart_sounds, physical_cvs_murmurs, physical_chest_expansion, physical_chest_percussion, physical_chest_adventitious, physical_abdomen_tenderness, physical_abdomen_mass, physical_abdomen_bowel_sounds, physical_cns_cranial, physical_cns_motor_sensory, physical_cns_rigidity, physical_cns_involuntary, physical_cns_superficial_reflexes, physical_cns_dtrs, physical_cns_plantar, physical_cns_cerebellar, mse_general_demeanour, mse_general_tidy, mse_general_awareness, mse_general_cooperation, mse_psychomotor_verbalization, mse_psychomotor_pressure, mse_psychomotor_tension, mse_psychomotor_posture, mse_psychomotor_mannerism, mse_psychomotor_catatonic, mse_affect_subjective, mse_affect_tone, mse_affect_resting, mse_affect_fluctuation, mse_thought_flow, mse_thought_form, mse_thought_content, mse_thought_possession, mse_cognitive_consciousness, mse_cognitive_orientation_time, mse_cognitive_orientation_place, mse_cognitive_orientation_person, mse_cognitive_memory_immediate, mse_cognitive_memory_recent, mse_cognitive_memory_remote, mse_cognitive_subtraction, mse_cognitive_digit_span, mse_cognitive_counting, mse_cognitive_general_knowledge, mse_cognitive_calculation, mse_cognitive_similarities, mse_cognitive_proverbs, mse_insight_understanding, mse_insight_judgement, education_start_age, education_highest_class, education_performance, education_disciplinary, education_peer_relationship, education_hobbies, education_special_abilities, education_discontinue_reason, occupation_jobs, sexual_menarche_age, sexual_menarche_reaction, sexual_education, sexual_masturbation, sexual_contact, sexual_premarital_extramarital, sexual_marriage_arranged, sexual_marriage_date, sexual_spouse_age, sexual_spouse_occupation, sexual_adjustment_general, sexual_adjustment_sexual, sexual_children, sexual_problems, religion_type, religion_participation, religion_changes, living_residents, living_income_sharing, living_expenses, living_kitchen, living_domestic_conflicts, living_social_class, living_inlaws, home_situation_childhood, home_situation_parents_relationship, home_situation_socioeconomic, home_situation_interpersonal, personal_birth_date, personal_birth_place, personal_delivery_type, personal_complications_prenatal, personal_complications_natal, personal_complications_postnatal, development_weaning_age, development_first_words, development_three_words, development_walking, development_neurotic_traits, development_nail_biting, development_bedwetting, development_phobias, development_childhood_illness, provisional_diagnosis, treatment_plan, consultant_comments) FROM stdin;
4	5	ADL2025R6R8PZ37	8	5	created	\N	2025-11-19	\N	\N	1	t	\N	2025-11-23 01:35:27.624638	2025-11-23 01:37:57.485384	\N	\N	\N	\N	\N	\N	\N	[{"name": "", "reliability": "", "relationship": ""}]	[{"duration": "", "complaint": ""}]	[{"duration": "", "complaint": ""}]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	[{"age": "", "sex": "", "education": "", "occupation": "", "marital_status": ""}]	\N	zxc	cxzc	zxc	\N	\N	\N	[]	\N	\N	\N	\N	\N	f	f	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	[{"job": "", "dates": "", "adjustment": "", "promotions": "", "difficulties": "", "change_reason": ""}]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	[{"age": "", "sex": ""}]	\N	\N	\N	\N	[{"age": "", "name": "", "relationship": ""}]	\N	\N	\N	\N	\N	[{"age": "", "name": "", "relationship": ""}]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	zxc	zxc	xzc
6	13	ADL2025VCLG6M0X	8	11	created	\N	2025-11-24	\N	\N	1	t	\N	2025-11-25 11:16:14.246268	2025-11-25 11:16:14.49511	\N	\N	\N	\N	\N	\N	\N	[]	[]	[]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	[]	\N	\N	\N	\N	\N	\N	\N	[]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	[]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	[]	\N	\N	\N	\N	[]	\N	\N	\N	\N	\N	[]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
7	12	ADL2025TS621K5U	8	10	created	\N	2025-11-24	\N	\N	1	t	\N	2025-11-25 11:21:53.040075	2025-11-25 11:21:53.242206	\N	\N	\N	\N	\N	\N	\N	[]	[]	[]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	[]	\N	\N	\N	\N	\N	\N	\N	[]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	[]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	[]	\N	\N	\N	\N	[]	\N	\N	\N	\N	\N	[]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- TOC entry 5172 (class 0 OID 21410)
-- Dependencies: 227
-- Data for Name: audit_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_log (id, table_name, record_id, action, old_values, new_values, changed_by, changed_at, ip_address, user_agent) FROM stdin;
\.


--
-- TOC entry 5183 (class 0 OID 21714)
-- Dependencies: 239
-- Data for Name: clinical_options; Type: TABLE DATA; Schema: public; Owner: fariyad
--

COPY public.clinical_options (id, option_group, option_label, display_order, is_active, created_at, updated_at) FROM stdin;
1	mood	Anxious	1	t	2025-11-22 23:18:25.536478	2025-11-22 23:18:25.536478
2	mood	Sad	2	t	2025-11-22 23:18:25.536478	2025-11-22 23:18:25.536478
3	mood	Cheerful	3	t	2025-11-22 23:18:25.536478	2025-11-22 23:18:25.536478
4	mood	Agitated	4	t	2025-11-22 23:18:25.536478	2025-11-22 23:18:25.536478
5	mood	Fearful	5	t	2025-11-22 23:18:25.536478	2025-11-22 23:18:25.536478
6	mood	Irritable	6	t	2025-11-22 23:18:25.536478	2025-11-22 23:18:25.536478
7	behaviour	Suspiciousness	1	t	2025-11-22 23:18:25.546151	2025-11-22 23:18:25.546151
8	behaviour	Talking/Smiling to self	2	t	2025-11-22 23:18:25.546151	2025-11-22 23:18:25.546151
9	behaviour	Hallucinatory behaviour	3	t	2025-11-22 23:18:25.546151	2025-11-22 23:18:25.546151
10	behaviour	Increased goal-directed activity	4	t	2025-11-22 23:18:25.546151	2025-11-22 23:18:25.546151
11	behaviour	Compulsions	5	t	2025-11-22 23:18:25.546151	2025-11-22 23:18:25.546151
12	behaviour	Apathy	6	t	2025-11-22 23:18:25.546151	2025-11-22 23:18:25.546151
13	behaviour	Anhedonia	7	t	2025-11-22 23:18:25.546151	2025-11-22 23:18:25.546151
14	behaviour	Avolution	8	t	2025-11-22 23:18:25.546151	2025-11-22 23:18:25.546151
15	behaviour	Stupor	9	t	2025-11-22 23:18:25.546151	2025-11-22 23:18:25.546151
16	behaviour	Posturing	10	t	2025-11-22 23:18:25.546151	2025-11-22 23:18:25.546151
17	behaviour	Stereotypy	11	t	2025-11-22 23:18:25.546151	2025-11-22 23:18:25.546151
18	behaviour	Ambitendency	12	t	2025-11-22 23:18:25.546151	2025-11-22 23:18:25.546151
19	behaviour	Disinhibition	13	t	2025-11-22 23:18:25.546151	2025-11-22 23:18:25.546151
20	behaviour	Impulsivity	14	t	2025-11-22 23:18:25.546151	2025-11-22 23:18:25.546151
21	behaviour	Anger outbursts	15	t	2025-11-22 23:18:25.546151	2025-11-22 23:18:25.546151
22	behaviour	Suicide/self-harm attempts	16	t	2025-11-22 23:18:25.546151	2025-11-22 23:18:25.546151
23	speech	Irrelevant	1	t	2025-11-22 23:18:25.556691	2025-11-22 23:18:25.556691
24	speech	Incoherent	2	t	2025-11-22 23:18:25.556691	2025-11-22 23:18:25.556691
25	speech	Pressure	3	t	2025-11-22 23:18:25.556691	2025-11-22 23:18:25.556691
26	speech	Alogia	4	t	2025-11-22 23:18:25.556691	2025-11-22 23:18:25.556691
27	speech	Mutism	5	t	2025-11-22 23:18:25.556691	2025-11-22 23:18:25.556691
28	thought	Reference	1	t	2025-11-22 23:18:25.560118	2025-11-22 23:18:25.560118
29	thought	Persecution	2	t	2025-11-22 23:18:25.560118	2025-11-22 23:18:25.560118
30	thought	Grandiose	3	t	2025-11-22 23:18:25.560118	2025-11-22 23:18:25.560118
31	thought	Love Infidelity	4	t	2025-11-22 23:18:25.560118	2025-11-22 23:18:25.560118
32	thought	Bizarre	5	t	2025-11-22 23:18:25.560118	2025-11-22 23:18:25.560118
33	thought	Pessimism	6	t	2025-11-22 23:18:25.560118	2025-11-22 23:18:25.560118
34	thought	Worthlessness	7	t	2025-11-22 23:18:25.560118	2025-11-22 23:18:25.560118
35	thought	Guilt	8	t	2025-11-22 23:18:25.560118	2025-11-22 23:18:25.560118
36	thought	Poverty	9	t	2025-11-22 23:18:25.560118	2025-11-22 23:18:25.560118
37	thought	Nihilism	10	t	2025-11-22 23:18:25.560118	2025-11-22 23:18:25.560118
38	thought	Hypochondriasis	11	t	2025-11-22 23:18:25.560118	2025-11-22 23:18:25.560118
39	thought	Wish to die	12	t	2025-11-22 23:18:25.560118	2025-11-22 23:18:25.560118
40	thought	Active suicidal ideation	13	t	2025-11-22 23:18:25.560118	2025-11-22 23:18:25.560118
41	thought	Plans	14	t	2025-11-22 23:18:25.560118	2025-11-22 23:18:25.560118
42	thought	Worries	15	t	2025-11-22 23:18:25.560118	2025-11-22 23:18:25.560118
43	thought	Obsessions	16	t	2025-11-22 23:18:25.560118	2025-11-22 23:18:25.560118
44	thought	Phobias	17	t	2025-11-22 23:18:25.560118	2025-11-22 23:18:25.560118
45	thought	Panic attacks	18	t	2025-11-22 23:18:25.560118	2025-11-22 23:18:25.560118
46	perception	Hallucination - Auditory	1	t	2025-11-22 23:18:25.571732	2025-11-22 23:18:25.571732
47	perception	Hallucination - Visual	2	t	2025-11-22 23:18:25.571732	2025-11-22 23:18:25.571732
48	perception	Hallucination - Tactile	3	t	2025-11-22 23:18:25.571732	2025-11-22 23:18:25.571732
49	perception	Hallucination - Olfactory	4	t	2025-11-22 23:18:25.571732	2025-11-22 23:18:25.571732
50	perception	Passivity	5	t	2025-11-22 23:18:25.571732	2025-11-22 23:18:25.571732
51	perception	Depersonalization	6	t	2025-11-22 23:18:25.571732	2025-11-22 23:18:25.571732
52	perception	Derealization	7	t	2025-11-22 23:18:25.571732	2025-11-22 23:18:25.571732
53	somatic	Pains	1	t	2025-11-22 23:18:25.576837	2025-11-22 23:18:25.576837
54	somatic	Numbness	2	t	2025-11-22 23:18:25.576837	2025-11-22 23:18:25.576837
55	somatic	Weakness	3	t	2025-11-22 23:18:25.576837	2025-11-22 23:18:25.576837
56	somatic	Fatigue	4	t	2025-11-22 23:18:25.576837	2025-11-22 23:18:25.576837
57	somatic	Tremors	5	t	2025-11-22 23:18:25.576837	2025-11-22 23:18:25.576837
58	somatic	Palpitations	6	t	2025-11-22 23:18:25.576837	2025-11-22 23:18:25.576837
59	somatic	Dyspnoea	7	t	2025-11-22 23:18:25.576837	2025-11-22 23:18:25.576837
60	somatic	Dizziness	8	t	2025-11-22 23:18:25.576837	2025-11-22 23:18:25.576837
61	bio_functions	Sleep	1	t	2025-11-22 23:18:25.58132	2025-11-22 23:18:25.58132
62	bio_functions	Appetite	2	t	2025-11-22 23:18:25.58132	2025-11-22 23:18:25.58132
63	bio_functions	Bowel/Bladder	3	t	2025-11-22 23:18:25.58132	2025-11-22 23:18:25.58132
64	bio_functions	Self-care	4	t	2025-11-22 23:18:25.58132	2025-11-22 23:18:25.58132
65	adjustment	Work output	1	t	2025-11-22 23:18:25.584926	2025-11-22 23:18:25.584926
66	adjustment	Socialization	2	t	2025-11-22 23:18:25.584926	2025-11-22 23:18:25.584926
67	cognitive_function	Disorientation	1	t	2025-11-22 23:18:25.587061	2025-11-22 23:18:25.587061
68	cognitive_function	Inattention	2	t	2025-11-22 23:18:25.587061	2025-11-22 23:18:25.587061
69	cognitive_function	Impaired Memory	3	t	2025-11-22 23:18:25.587061	2025-11-22 23:18:25.587061
70	cognitive_function	Intelligence	4	t	2025-11-22 23:18:25.587061	2025-11-22 23:18:25.587061
71	fits	Epileptic	1	t	2025-11-22 23:18:25.590387	2025-11-22 23:18:25.590387
72	fits	Dissociative	2	t	2025-11-22 23:18:25.590387	2025-11-22 23:18:25.590387
73	fits	Mixed	3	t	2025-11-22 23:18:25.590387	2025-11-22 23:18:25.590387
74	fits	Not clear	4	t	2025-11-22 23:18:25.590387	2025-11-22 23:18:25.590387
75	sexual_problem	Dhat	1	t	2025-11-22 23:18:25.593617	2025-11-22 23:18:25.593617
76	sexual_problem	Poor erection	2	t	2025-11-22 23:18:25.593617	2025-11-22 23:18:25.593617
77	sexual_problem	Early ejaculation	3	t	2025-11-22 23:18:25.593617	2025-11-22 23:18:25.593617
78	sexual_problem	Decreased desire	4	t	2025-11-22 23:18:25.593617	2025-11-22 23:18:25.593617
79	sexual_problem	Perversion	5	t	2025-11-22 23:18:25.593617	2025-11-22 23:18:25.593617
80	sexual_problem	Homosexuality	6	t	2025-11-22 23:18:25.593617	2025-11-22 23:18:25.593617
81	sexual_problem	Gender dysphoria	7	t	2025-11-22 23:18:25.593617	2025-11-22 23:18:25.593617
82	substance_use	Alcohol	1	t	2025-11-22 23:18:25.597167	2025-11-22 23:18:25.597167
83	substance_use	Opioid	2	t	2025-11-22 23:18:25.597167	2025-11-22 23:18:25.597167
84	substance_use	Cannabis	3	t	2025-11-22 23:18:25.597167	2025-11-22 23:18:25.597167
85	substance_use	Benzodiazepines	4	t	2025-11-22 23:18:25.597167	2025-11-22 23:18:25.597167
86	substance_use	Tobacco	5	t	2025-11-22 23:18:25.597167	2025-11-22 23:18:25.597167
87	associated_medical_surgical	Hypertension	1	t	2025-11-22 23:18:25.601477	2025-11-22 23:18:25.601477
88	associated_medical_surgical	Diabetes	2	t	2025-11-22 23:18:25.601477	2025-11-22 23:18:25.601477
89	associated_medical_surgical	Dyslipidemia	3	t	2025-11-22 23:18:25.601477	2025-11-22 23:18:25.601477
90	associated_medical_surgical	Thyroid dysfunction	4	t	2025-11-22 23:18:25.601477	2025-11-22 23:18:25.601477
91	mse_behaviour	Uncooperative	1	t	2025-11-22 23:18:25.605285	2025-11-22 23:18:25.605285
92	mse_behaviour	Unkempt	2	t	2025-11-22 23:18:25.605285	2025-11-22 23:18:25.605285
93	mse_behaviour	Fearful	3	t	2025-11-22 23:18:25.605285	2025-11-22 23:18:25.605285
94	mse_behaviour	Odd	4	t	2025-11-22 23:18:25.605285	2025-11-22 23:18:25.605285
95	mse_behaviour	Suspicious	5	t	2025-11-22 23:18:25.605285	2025-11-22 23:18:25.605285
96	mse_behaviour	Retarded	6	t	2025-11-22 23:18:25.605285	2025-11-22 23:18:25.605285
97	mse_behaviour	Excited	7	t	2025-11-22 23:18:25.605285	2025-11-22 23:18:25.605285
98	mse_behaviour	Aggressive	8	t	2025-11-22 23:18:25.605285	2025-11-22 23:18:25.605285
99	mse_behaviour	Apathetic	9	t	2025-11-22 23:18:25.605285	2025-11-22 23:18:25.605285
100	mse_behaviour	Catatonic	10	t	2025-11-22 23:18:25.605285	2025-11-22 23:18:25.605285
101	mse_behaviour	Demonstrative	11	t	2025-11-22 23:18:25.605285	2025-11-22 23:18:25.605285
102	mse_affect	Sad	1	t	2025-11-22 23:18:25.611325	2025-11-22 23:18:25.611325
103	mse_affect	Anxious	2	t	2025-11-22 23:18:25.611325	2025-11-22 23:18:25.611325
104	mse_affect	Elated	3	t	2025-11-22 23:18:25.611325	2025-11-22 23:18:25.611325
105	mse_affect	Inappropriate	4	t	2025-11-22 23:18:25.611325	2025-11-22 23:18:25.611325
106	mse_affect	Blunted	5	t	2025-11-22 23:18:25.611325	2025-11-22 23:18:25.611325
107	mse_affect	Labile	6	t	2025-11-22 23:18:25.611325	2025-11-22 23:18:25.611325
108	mse_thought	Depressive	1	t	2025-11-22 23:18:25.615912	2025-11-22 23:18:25.615912
109	mse_thought	Suicidal	2	t	2025-11-22 23:18:25.615912	2025-11-22 23:18:25.615912
110	mse_thought	Obsessions	3	t	2025-11-22 23:18:25.615912	2025-11-22 23:18:25.615912
111	mse_thought	Hypochondriacal	4	t	2025-11-22 23:18:25.615912	2025-11-22 23:18:25.615912
112	mse_thought	Preoccupations	5	t	2025-11-22 23:18:25.615912	2025-11-22 23:18:25.615912
113	mse_thought	Worries	6	t	2025-11-22 23:18:25.615912	2025-11-22 23:18:25.615912
114	mse_perception	Hallucinations - Auditory	1	t	2025-11-22 23:18:25.620056	2025-11-22 23:18:25.620056
115	mse_perception	Hallucinations - Visual	2	t	2025-11-22 23:18:25.620056	2025-11-22 23:18:25.620056
116	mse_perception	Hallucinations - Tactile	3	t	2025-11-22 23:18:25.620056	2025-11-22 23:18:25.620056
117	mse_perception	Hallucinations - Olfactory	4	t	2025-11-22 23:18:25.620056	2025-11-22 23:18:25.620056
118	mse_perception	Illusions	5	t	2025-11-22 23:18:25.620056	2025-11-22 23:18:25.620056
119	mse_perception	Depersonalization	6	t	2025-11-22 23:18:25.620056	2025-11-22 23:18:25.620056
120	mse_perception	Derealization	7	t	2025-11-22 23:18:25.620056	2025-11-22 23:18:25.620056
121	mse_cognitive_function	Impaired	1	t	2025-11-22 23:18:25.623186	2025-11-22 23:18:25.623186
122	mse_cognitive_function	Not impaired	2	t	2025-11-22 23:18:25.623186	2025-11-22 23:18:25.623186
\.


--
-- TOC entry 5173 (class 0 OID 21417)
-- Dependencies: 228
-- Data for Name: clinical_proforma; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clinical_proforma (id, patient_id, filled_by, visit_date, visit_type, room_no, informant_present, nature_of_information, onset_duration, course, precipitating_factor, illness_duration, current_episode_since, mood, behaviour, speech, thought, perception, somatic, bio_functions, adjustment, cognitive_function, fits, sexual_problem, substance_use, past_history, family_history, associated_medical_surgical, mse_behaviour, mse_affect, mse_thought, mse_delusions, mse_perception, mse_cognitive_function, gpe, diagnosis, icd_code, disposal, workup_appointment, referred_to, treatment_prescribed, doctor_decision, case_severity, requires_adl_file, adl_reasoning, adl_file_id, is_active, created_at, updated_at, assigned_doctor, prescriptions) FROM stdin;
1	1	8	2025-11-20	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	t	2025-11-20 12:17:13.732264	2025-11-20 12:17:13.732264	\N	[]
3	3	8	2025-11-20	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	t	2025-11-20 13:19:17.156729	2025-11-20 13:19:17.156729	\N	[]
5	5	8	2025-11-19	first_visit	\N	t	Reliable	<1_week	Continuous	xcxzc	\N	2025-11-22	Anxious	Suspiciousness, Avolution	Irrelevant	Reference, Hypochondriasis	Hallucination - Auditory	Pains	Sleep	Work output	Disorientation	Epileptic	Dhat	Alcohol	zxczxc	xzczxc	Hypertension	Uncooperative, Demonstrative	Sad	{"Depressive"}	\N	Hallucinations - Auditory	Impaired	xzczxc	zxczxc	07	xzczxc	2025-11-22	xzczxc	xzcxzc	complex_case	\N	t	\N	4	t	2025-11-20 13:35:59.887838	2025-11-23 01:35:27.629849	6	[]
7	8	8	2025-11-23	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	t	2025-11-23 22:23:43.62628	2025-11-23 22:23:43.62628	\N	[]
9	11	8	2025-11-24	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	t	2025-11-24 11:57:50.745361	2025-11-24 11:57:50.745361	\N	[]
11	13	8	2025-11-24	first_visit	\N	t	Unreliable	1w_1m	\N	qwertghj	6	2025-11-25	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Poor erection	Cannabis, patient is depend on mdma fro 3 months	ew4w5rtyuy	sertyj	\N	\N	Elated	{"Suicidal"}	\N	Hallucinations - Visual	Not impaired	\N	sdfgh	6B20.0	\N	2025-11-25	\N	\N	complex_case	\N	t	\N	6	t	2025-11-25 11:09:21.992265	2025-11-25 11:16:14.256818	6	[]
10	12	8	2025-11-24	first_visit	\N	t	\N	\N	\N	\N	\N	2025-11-25	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2025-11-25	\N	\N	complex_case	\N	t	\N	7	t	2025-11-25 09:40:00.195082	2025-11-25 11:21:53.044231	6	[]
\.


--
-- TOC entry 5174 (class 0 OID 21433)
-- Dependencies: 229
-- Data for Name: login_otps; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.login_otps (id, user_id, otp, expires_at, used, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5175 (class 0 OID 21440)
-- Dependencies: 230
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.password_reset_tokens (id, user_id, token, otp, expires_at, used, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5187 (class 0 OID 21757)
-- Dependencies: 243
-- Data for Name: patient_files; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.patient_files (id, patient_id, attachment, role, created_at, updated_at) FROM stdin;
1	11	{}	[{"id": 7}]	2025-11-24 15:51:40.990134	2025-11-24 15:51:40.990134
2	5	{}	[{"id": 7}]	2025-11-24 16:07:44.412467	2025-11-24 16:07:44.412467
3	5	{/uploads/patient_files/Resident/5/2_Resident.png,/uploads/patient_files/Resident/5/2_Resident_1.png}	[{"id": 7}]	2025-11-24 16:07:44.425199	2025-11-24 16:07:44.425199
4	12	{/uploads/patient_files/Psychiatric_Welfare_Officer/12/4_Psychiatric_Welfare_Officer.png}	[{"id": 8}]	2025-11-25 09:40:00.167934	2025-11-25 09:40:00.178266
5	13	{/uploads/patient_files/Psychiatric_Welfare_Officer/13/5_Psychiatric_Welfare_Officer.png}	[{"id": 8}]	2025-11-25 11:09:21.910903	2025-11-25 11:09:21.926832
\.


--
-- TOC entry 5176 (class 0 OID 21447)
-- Dependencies: 231
-- Data for Name: patient_visits; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.patient_visits (id, patient_id, visit_date, visit_type, has_file, adl_file_id, clinical_proforma_id, assigned_doctor_id, room_no, visit_status, notes, created_at, updated_at) FROM stdin;
1	1	2025-11-20	follow_up	f	\N	\N	6	206	scheduled	\N	2025-11-20 12:17:13.711411	2025-11-20 12:17:13.711411
3	3	2025-11-20	follow_up	f	\N	\N	6	211	scheduled	\N	2025-11-20 13:19:17.129157	2025-11-20 13:19:17.129157
5	5	2025-11-20	follow_up	f	\N	\N	6	206	scheduled	\N	2025-11-20 13:35:47.160197	2025-11-20 13:35:47.160197
7	1	2025-11-20	follow_up	f	\N	\N	6	206	scheduled	Visit created via Existing Patient flow	2025-11-20 16:25:57.064476	2025-11-20 16:25:57.064476
10	7	2025-11-23	first_visit	f	\N	\N	6	301	completed	\N	2025-11-23 19:59:32.072571	2025-11-23 21:49:17.431915
11	7	2025-11-23	follow_up	f	\N	\N	6	301	completed	Visit created via Existing Patient flow - Visit #2	2025-11-23 19:59:37.440166	2025-11-23 21:49:17.431915
12	7	2025-11-23	follow_up	f	\N	\N	6	401	completed	\N	2025-11-23 20:00:39.171134	2025-11-23 21:49:17.431915
13	7	2025-11-23	follow_up	f	\N	\N	6	401	completed	Visit created via Existing Patient flow - Visit #4	2025-11-23 20:00:43.092091	2025-11-23 21:49:17.431915
14	7	2025-11-23	follow_up	f	\N	\N	7	401	completed	\N	2025-11-23 20:26:18.647006	2025-11-23 21:49:17.431915
15	7	2025-11-23	follow_up	f	\N	\N	6	401	completed	\N	2025-11-23 20:26:27.363535	2025-11-23 21:49:17.431915
16	7	2025-11-23	follow_up	f	\N	\N	6	401	completed	Visit created via Existing Patient flow - Visit #7	2025-11-23 20:26:38.626986	2025-11-23 21:49:17.431915
17	7	2025-11-23	follow_up	f	\N	\N	6	401	completed	Visit created via Existing Patient flow - Visit #8	2025-11-23 20:26:54.704471	2025-11-23 21:49:17.431915
18	7	2025-11-23	follow_up	f	\N	\N	6	401	completed	Visit created via Existing Patient flow - Visit #9	2025-11-23 20:36:40.306638	2025-11-23 21:49:17.431915
19	7	2025-11-23	follow_up	f	\N	\N	7	801	completed	Visit created via Existing Patient flow - Visit #10	2025-11-23 20:48:00.691639	2025-11-23 21:49:17.431915
20	7	2025-11-23	follow_up	f	\N	\N	7	801	completed	Visit created via Existing Patient flow - Visit #11	2025-11-23 20:55:13.218922	2025-11-23 21:49:17.431915
21	7	2025-11-23	follow_up	f	\N	\N	7	801	completed	Visit created via Existing Patient flow - Visit #12	2025-11-23 20:58:50.242054	2025-11-23 21:49:17.431915
22	5	2025-11-23	follow_up	f	\N	\N	6	206	completed	Visit created via Existing Patient flow - Visit #2	2025-11-23 21:30:05.569791	2025-11-23 21:49:38.758462
23	5	2025-11-23	follow_up	f	\N	\N	7	205	completed	Visit created via Existing Patient flow - Visit #3	2025-11-23 21:33:21.829501	2025-11-23 21:49:38.758462
8	3	2025-11-23	follow_up	f	\N	\N	7	206	completed	\N	2025-11-23 19:14:37.710573	2025-11-23 21:50:59.790901
9	3	2025-11-23	follow_up	f	\N	\N	6	206	completed	Visit created via Existing Patient flow	2025-11-23 19:14:56.56188	2025-11-23 21:50:59.790901
24	1	2025-11-23	follow_up	f	\N	\N	6	206	completed	Visit created via Existing Patient flow - Visit #3	2025-11-23 21:54:57.150056	2025-11-23 22:03:04.930808
25	8	2025-11-23	first_visit	f	\N	\N	6	206	scheduled	\N	2025-11-23 22:23:43.603223	2025-11-23 22:23:43.603223
26	9	2025-11-24	first_visit	f	\N	\N	7	205	completed	Visit created via Existing Patient flow - Visit #1	2025-11-24 11:11:45.378162	2025-11-24 11:28:57.730548
27	11	2025-11-24	first_visit	f	\N	\N	7	205	completed	\N	2025-11-24 11:57:50.730928	2025-11-24 11:58:14.15911
28	11	2025-11-24	follow_up	f	\N	\N	7	205	completed	Visit created via Existing Patient flow - Visit #2	2025-11-24 14:42:12.784321	2025-11-24 16:31:23.180532
29	12	2025-11-25	first_visit	f	\N	\N	6	206	scheduled	\N	2025-11-25 09:40:00.122488	2025-11-25 09:40:00.122488
30	13	2025-11-25	first_visit	f	\N	\N	6	206	completed	\N	2025-11-25 11:09:21.857127	2025-11-25 11:18:04.2763
\.


--
-- TOC entry 5181 (class 0 OID 21701)
-- Dependencies: 237
-- Data for Name: prescriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.prescriptions (id, patient_id, clinical_proforma_id, prescriptions, created_at, updated_at) FROM stdin;
3	5	5	[{"id": 1, "notes": "ffdfgfdg", "dosage": "1-0-1", "details": "ddfff", "duration": "3 Days", "medicine": "Abilify", "quantity": "90", "frequency": "Once Daily", "when_to_take": "Bedtime"}, {"id": 2, "notes": "fdgdfg", "dosage": "1-0-1", "details": "gfdgdfg", "duration": "3 Days", "medicine": "Acamprosate", "quantity": "1", "frequency": "Once Daily", "when_to_take": "Before Food"}]	2025-11-21 17:29:57.552515	2025-11-21 17:29:57.552515
7	10	8	[{"id": 1, "notes": "asdfgh", "dosage": "1-1-1", "details": "asdfgh", "duration": "5 Days", "medicine": "Abilify", "quantity": "2", "frequency": "Once Daily", "when_to_take": "Empty Stomach"}, {"id": 2, "notes": "ASDFGH", "dosage": "1-0-1", "details": "adrfghj", "duration": "3 Days", "medicine": "aewsreth", "quantity": "2", "frequency": "Once Daily", "when_to_take": "Before Food"}]	2025-11-24 11:28:07.911547	2025-11-24 11:28:07.911547
8	13	11	[]	2025-11-25 11:16:14.632661	2025-11-25 11:16:14.632661
9	12	10	[]	2025-11-25 11:21:53.315036	2025-11-25 11:21:53.315036
\.


--
-- TOC entry 5185 (class 0 OID 21729)
-- Dependencies: 241
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.refresh_tokens (id, user_id, token, device_info, ip_address, last_activity, expires_at, is_revoked, created_at, updated_at) FROM stdin;
12	6	2c22e9072f1dd6e11f8b3841270a95954fb8abae4b7f9dd56033fda5467c37ff2ee614a048b7c3383c7c32bdd3f08c0a47534989689afa8c1a822536fd87c6e3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	::1	2025-11-23 20:20:55.850949	2025-11-30 20:20:55.816	f	2025-11-23 20:20:55.821478	2025-11-23 20:20:55.850949
14	7	9061def8b2ba9331e489aa4a51b45df594d2ada248c3c985c2df8891706d3e90b629399dfece918874f4cdbafa1b6628789adfbd6657e62dd969c6b3248c1269	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	::1	2025-11-23 20:48:29.352006	2025-11-30 20:48:29.317	f	2025-11-23 20:48:29.318206	2025-11-23 20:48:29.352006
6	6	81862fd68b415d62971925e77c7b650f8793a56b8a83d0f1221225fb565875d7f5da5d313907621206fd82bef4520f3a5c6eefe81dd55a16eec805dde29e7f09	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	::1	2025-11-23 19:10:43.21465	2025-11-30 19:10:33.797	f	2025-11-23 19:10:33.79826	2025-11-23 19:10:43.21465
7	8	a0432c634d2982686de987f6ce86b39c09ec40a229606c10bb006232099e4a232f7d514c7fed2b4eff111982fccb4d3ea77bea16daad039b9c3de86b876a34a3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	::1	2025-11-23 19:12:55.903966	2025-11-30 19:12:55.853	f	2025-11-23 19:12:55.857456	2025-11-23 19:12:55.903966
19	8	5e53fc947f389df21686202c69f0970859d4ca9ca50414cdadf4835e68dee4d70f8d136a25f296a0af979d15febbc6df7808aeb201a4d0ffe32ce661b5d49d7f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	::1	2025-11-23 21:54:21.883483	2025-11-30 21:54:21.843	f	2025-11-23 21:54:21.844399	2025-11-23 21:54:21.883483
2	8	8ac7495acb24daef709f0278064522e4ed7852d9d5df6908eb4b5d5227dcca1e58ad542f3d0dbe0a6aa79724ce7ccc45ea34a6bc8bc41745287af550d74274b1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	::1	2025-11-23 01:12:06.156069	2025-11-30 01:03:37.143	f	2025-11-23 01:03:37.144325	2025-11-23 01:12:06.156069
17	6	5f3cd5140fd8f3e6f787eaa1e1afb260e63ca78cebfb821dbd0b3ff8781594d5880dd6c71e4b389081521ebe9c4d86d80d810daf9d4727d5b9b6fb5e7e162164	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	::1	2025-11-23 21:51:27.883539	2025-11-30 21:50:33.355	f	2025-11-23 21:50:33.358885	2025-11-23 21:51:27.883539
3	5	197f8b266902e8fafa2f7df68a15139f977aed26bc2f7abed7fa0f826283e8a69ed73a2b2bc294e24eaf2a58c20a859227151037d9c022e781795c487d1c0ead	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	::1	2025-11-23 02:37:49.038636	2025-11-30 01:20:52.158	f	2025-11-23 01:20:52.159851	2025-11-23 02:37:49.038636
4	5	329819acf40414fa21ce0c3dbf285a8961c68194c2ad6e52346bea533c30ade8d27b67849618c4427aabcc0c78dad69ce334cdba41bd70ef32e7d7fea533367f	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	::1	2025-11-23 19:05:45.222746	2025-11-30 19:05:45.143	f	2025-11-23 19:05:45.147172	2025-11-23 19:05:45.222746
5	8	fc9c53fa55b4b9754324acb20361abd3b43138a5dd6da64212a7def92d4d4ce2ae94320c61d52e6cf46b0527f0e5f893a2ecb54bd1302eef0c76020f4f988e5c	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	::1	2025-11-23 19:07:19.69995	2025-11-30 19:07:19.645	f	2025-11-23 19:07:19.646888	2025-11-23 19:07:19.69995
1	5	d9b3a8b6d6aa6a81acf25cab0f624b1ba3d66bff20a29862201baa902d7e24de4e84240a3aa32213a83ca560d8f2ff5c105c74a8fc9b8c6ff21d0ac5cf163b2c	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	::1	2025-11-23 01:03:10.042245	2025-11-29 23:48:53.715	f	2025-11-22 23:48:53.717962	2025-11-23 01:03:10.042245
9	8	7d051623b8131acc2a0fa2a8faf62ec1a82900dd71fe02e517fd34ee44e86bd765e423b1232773dd6f540d579be80c1adbabb5930ef021655cc6bc0dc30ad315	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	::1	2025-11-23 20:16:38.37578	2025-11-30 19:35:16.795	f	2025-11-23 19:35:16.797144	2025-11-23 20:16:38.37578
10	6	f6e0da3aebd593551abb79c5cfa344d7763176e170d10743f926086c05c00c010474d09791f1e593d8026d172fde006803f1532bdeb0ea3ee0ab64d1b37f193c	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	::1	2025-11-23 20:19:40.367297	2025-11-30 20:19:40.311	f	2025-11-23 20:19:40.312127	2025-11-23 20:19:40.367297
8	7	02d98a0f3361a84f73de54f3356b6850ebbd4cba3cf1657eb24858fd5e0907e1c18ae2efc0ec9db152f4abf00810b683eef3b2ace68c6cd0d401974153d06283	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	::1	2025-11-23 19:31:46.419232	2025-11-30 19:15:46.221	f	2025-11-23 19:15:46.222012	2025-11-23 19:31:46.419232
11	7	d292e7fa668f4630e99422bba0c30137f6aacc42a42f64e604758c49956487179930e681a36e3654ea44a794470ace72c295f864d1de127ec00261925a7959b2	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	::1	2025-11-23 20:20:32.472238	2025-11-30 20:20:32.425	f	2025-11-23 20:20:32.426428	2025-11-23 20:20:32.472238
18	8	c36106fbc73226f3c61140edd4b1aac0190aaab28eafdc29b87ace1a485ea7d9f44cd36ff04291279bf828a9bc1f010c01a571cecf12738d856ca61dae4aca5b	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	::1	2025-11-23 21:54:04.065191	2025-11-30 21:54:04.017	f	2025-11-23 21:54:04.018642	2025-11-23 21:54:04.065191
16	7	02b0c2fc969c321e1f99f7472608b87163b6a1824f1316a8c5fd104091a9ffb6e598219b738355ba01ea18582f96b2e535d588aee1dd0f77a385dc8adf231901	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	::1	2025-11-23 21:49:44.543694	2025-11-30 21:35:23.086	f	2025-11-23 21:35:23.096244	2025-11-23 21:49:44.543694
13	8	961d4132e138d7065372b1af632b54c3c7744291c6c2676e55164ae6f542a950225f5b81c3bd24eacb1a3b9ec3be965b105ef86e2d503973548420fdae376efb	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	::1	2025-11-23 20:44:26.509135	2025-11-30 20:24:22.376	f	2025-11-23 20:24:22.384225	2025-11-23 20:44:26.509135
15	8	17338bbc4af734967514ef933c89ac652104c7ad98257a176a9d3cce0a17d37beaa7c5d2ab62c949cd2ffee8b401e5ceb75a2541ba53d25121f17740b3a28cb1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	::1	2025-11-23 21:31:17.413858	2025-11-30 20:49:01.713	f	2025-11-23 20:49:01.71438	2025-11-23 21:31:17.413858
20	6	e21f557cc58ad26078780039e277f7ac0a4961513aa37e0621b09f19af4be4508c70c256e1494b40294266fe0a79e964596d54811aa12db428211559acc126ba	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	::1	2025-11-23 22:03:13.082162	2025-11-30 21:55:12.989	f	2025-11-23 21:55:12.99102	2025-11-23 22:03:13.082162
31	7	a81e7177384d03a9335fa9da248edd4dd9b7e7bd30256bf2011b3b1d874a5b2291cc4fb0d010ca4328f96ff79cd100f2f2681ac48a7b51280aa1ffd5951ca1f1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	::1	2025-11-24 14:16:56.056415	2025-12-01 12:39:03.381	f	2025-11-24 12:39:03.383459	2025-11-24 14:16:56.056415
21	8	0bb214caf7594359bd947ffbcb89d64b7e1589a4aeadcb6d7a6beecfeb9f857ca79ee1624810e3d77aee702b008682dc4734fb213778e43bf9b320c2bc9f7535	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	::1	2025-11-24 10:03:40.670814	2025-11-30 22:04:04.018	t	2025-11-23 22:04:04.0192	2025-11-24 10:03:40.670135
22	5	36400e7e84d2841fba84be6bfa6dd1195dc75d70484b28d8b03f77f5a56b68dff7d236c97c7e72a996beb284c203f0dd18863295edcf564f0840a8a68ff8194b	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	::1	2025-11-24 10:04:10.93074	2025-12-01 10:04:10.863	f	2025-11-24 10:04:10.864773	2025-11-24 10:04:10.93074
23	8	f9fc8bfb5b69d41ff64949b05408e2da785f508b42b1131a7f8ed69722ffe098933a1aff32b2577b00c94edbd2c53cc257b97f7d4e9d5f879b20568a8cb291bc	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	::1	2025-11-24 11:03:00.49291	2025-12-01 11:03:00.45	f	2025-11-24 11:03:00.451032	2025-11-24 11:03:00.49291
28	7	3a8b105a4307589fe812e03a8bed36135e614f1eca2e0d9ea6e0877ef97a40e96c83ebf473b99130b183ab4ddd5fba35943553dcfc69f9a848b72d6f55f3969d	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	::1	2025-11-24 11:55:12.74987	2025-12-01 11:31:12.401	f	2025-11-24 11:31:12.402752	2025-11-24 11:55:12.74987
26	7	9d854a3c88c6fa5a2c89cf8efe5bf1a192f6cb00f45336648b3f8c0251c12d2a1897e891db717ecff4c2c9773893c87d8e0cc78c2f86efaa37445751c38c18ac	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	::1	2025-11-24 11:28:48.812403	2025-12-01 11:11:59.694	f	2025-11-24 11:11:59.695376	2025-11-24 11:28:48.812403
24	7	fd848e8cd2a9ac6f5952bbdde8e3fc6f5799dee33be934583d09d424c6ac026ae0b31dc6616a2e580503da5bb031904b11c15d653f4dc0f16b1e4468c9bf851b	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	::1	2025-11-24 11:10:41.600933	2025-12-01 11:06:05.915	f	2025-11-24 11:06:05.918177	2025-11-24 11:10:41.600933
25	8	698346599b87ecfacf678477eaf4b1cb6cd7b58e3b8ee171c2cb476083b9509795fa65fc941269b7248806b615978c2580fcd95eaa26250caf472f64266145f3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	::1	2025-11-24 11:10:52.842389	2025-12-01 11:10:52.806	f	2025-11-24 11:10:52.8074	2025-11-24 11:10:52.842389
27	5	9547ce4c082d7b1c45f730609f2d70f45d591b33f9cff6befd1a98a04ef6d200c28b97292853486223dbcaebede45943fe4fa7790a12b65a5ad79a94cb1b786c	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	::1	2025-11-24 11:29:55.380613	2025-12-01 11:29:55.338	f	2025-11-24 11:29:55.340693	2025-11-24 11:29:55.380613
29	8	f4cba7cb1d06642db62155ec3b5af286b71b273383b6d19d5cb42351b5de0207e8aa3a3e07fff619f2c3c258de652a85efdd87c979fec1c0218add74aff33422	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	::1	2025-11-24 11:56:52.840362	2025-12-01 11:56:52.805	f	2025-11-24 11:56:52.806739	2025-11-24 11:56:52.840362
30	7	6249af79882d74f8df9ceda932a862ed7d44d053b016597c510e0a9d561688cf7730e300939f5982ccb57aa76f15eee57ffec583d1f771c8561779850b1133e3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	::1	2025-11-24 11:58:04.633444	2025-12-01 11:58:04.595	f	2025-11-24 11:58:04.595833	2025-11-24 11:58:04.633444
34	7	df1616ed4b1b9a4e5387bbf1f0f5a888f9d2905aacef1a01ffe057d48482c9708cf27ef3dc9d6dca52350d7e61600c932c0ca805559fe91408a312deffaeb08c	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	::1	2025-11-24 16:36:15.306568	2025-12-01 14:42:30.071	f	2025-11-24 14:42:30.080845	2025-11-24 16:36:15.306568
32	5	a8b5078ef25e0b2c98c0452746d8bb3129e3f279dac42899a3cb37c5cdbfaa7443c03d12c0e995cdd60af15cc5d5127e20a606f74185b6d1f087635d501547d7	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	::1	2025-11-24 14:39:59.696075	2025-12-01 14:18:56.743	f	2025-11-24 14:18:56.744288	2025-11-24 14:39:59.696075
33	8	6fa0fff61e3b4000144983547f2406768c9f649dfb1d0f08338969e5be7347999ee0274cfd6ad884b1caf4482df3b7a7e257eaf18b4be1279ce3c117651ad793	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	::1	2025-11-24 14:41:09.843952	2025-12-01 14:41:09.799	f	2025-11-24 14:41:09.800234	2025-11-24 14:41:09.843952
36	6	a813253ea3abc6d73e059891d5ba18f184704194df590596e2bae708b3b9202a727027b01ca5b9f9da0a5517f0315daf4da4ea4c2d5ab5e4045c51aa6cec1565	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	::1	2025-11-25 11:04:43.602238	2025-12-02 09:40:16.42	f	2025-11-25 09:40:16.421878	2025-11-25 11:04:43.602238
35	8	b9ae34b542691226ee0b15a3149b42ae73d7885bb03a824026d66da30894e8e41604cbf35fbcf7c2247c02c84b495c4a3465975a494c40d0ee5b370e8098d973	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	::1	2025-11-25 09:38:03.050356	2025-12-01 16:36:57.543	f	2025-11-24 16:36:57.54423	2025-11-25 09:38:03.050356
39	5	598c4df2e8827e5aa2559444b30b8cb7d6270f48661d4ccdf9394527a616627d4f0a3c4a7cf92212f6bec6ec3aeb4d8867b3b5bab3f8665ca462acd442a211c3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	::1	2025-11-25 11:40:14.095694	2025-12-02 11:36:14.045	f	2025-11-25 11:36:14.045964	2025-11-25 11:40:14.095694
38	6	9e3c5b2c2dd9aa3fb34c12092e0f5229aa9f59953ae154b937d876ca6c7ba065c8f5b0a021058386ac92e81b387406f76090fa69c278aaa11a615690e5ff4960	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	::1	2025-11-25 11:35:12.755202	2025-12-02 11:09:50.875	f	2025-11-25 11:09:50.876583	2025-11-25 11:35:12.755202
37	8	b59c5545dc52703691e2e11a2b09137d27decd3c781a67f137a0e37f08c2d09651d7aad1b5e361f1476328074413eed8235b78c257fe753552f9632867dc83fa	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	::1	2025-11-25 11:09:04.622088	2025-12-02 11:05:04.473	f	2025-11-25 11:05:04.474478	2025-11-25 11:09:04.622088
\.


--
-- TOC entry 5177 (class 0 OID 21467)
-- Dependencies: 232
-- Data for Name: registered_patient; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.registered_patient (id, cr_no, psy_no, special_clinic_no, adl_no, date, name, contact_number, age, sex, category, father_name, department, unit_consit, room_no, serial_no, file_no, unit_days, seen_in_walk_in_on, worked_up_on, age_group, marital_status, year_of_marriage, no_of_children_male, no_of_children_female, occupation, education, locality, income, religion, family_type, head_name, head_age, head_relationship, head_education, head_occupation, head_income, distance_from_hospital, mobility, referred_by, address_line, country, state, district, city, pin_code, assigned_doctor_id, assigned_doctor_name, assigned_room, filled_by, has_adl_file, file_status, case_complexity, is_active, created_at, updated_at, permanent_address_line_1, permanent_address_line_2, permanent_city_town_village, permanent_district, permanent_state, permanent_pin_code, permanent_country, present_address_line_1, present_address_line_2, present_city_town_village, present_district, present_state, present_pin_code, present_country, local_address, patient_income, family_income, present_city_town_village_2, present_district_2, present_state_2, present_pin_code_2, present_country_2, patient_files) FROM stdin;
1	123456789	PSY2025136391	01	\N	2025-11-20	Chirag	8580686984	25	M	GEN	Inder Singh	Psychiatry	BNS	211	01	PSYGEN01	thu	2025-11-20	2025-11-20	15-30	single	\N	\N	\N	student	\N	urban	\N	\N	\N	Inder Singh	55	father	inter_diploma	semi_professional	15000.00	20	permanent_resident	self	Pandoh	India	Himachal Pradesh	Mandi	Mandi	175000	6	Unknown Doctor	206	8	f	none	simple	t	2025-11-20 12:15:36.394242	2025-11-20 12:17:13.680289	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	\N	\N	[]
5	98752515	PSY2025751686	ERRFG8788	\N	2025-11-19	mohit	07018409360	22	M	GEN	Rahul	Psychiatry	AG	25	46	PSYGEN03	mon	2025-11-17	2025-11-17	15-30	married	2018	2	2	unskilled	primary	urban	\N	islam	nuclear	Suresh	45	brother	primary	unskilled	25555.00	20	transferable	medical_specialities_pgi	Mandi	India	Himachal Pradesh	Mandi	Mandi	175024	7	Chirag	205	8	t	none	simple	t	2025-11-20 13:32:31.693997	2025-11-24 16:07:44.393419	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	25555.00	25555.00	\N	\N	\N	\N	\N	[]
8	7418529612	PSY2025463815	\N	\N	2025-11-23	Srishti	7418529631	25	F	GEN	Surender Pal	Psychiatry	BNS	211	06	PSYSC0006	mon	2025-11-23	2025-11-23	15-30	\N	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Mandi	India	Himachal Pradesh	Mandi	Mandi	175024	6	Fariyad	206	8	f	none	simple	t	2025-11-23 22:17:43.823151	2025-11-23 22:23:43.557604	Mandi	\N	Mandi	Mandi	Himachal Pradesh	175024	India	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	\N	\N	[]
3	CR555555	PSY2025801071	ERRFG5255	\N	2025-11-20	sumit	07018409360	25	M	GEN	Surender Pal	Psychiatry	AG	25	03	PSYGEN6984	mon	2025-11-20	2025-11-20	15-30	married	2020	2	2	skilled	primary	urban	\N	hinduism	nuclear	Surender Pal	85	father	primary	unemployed	25555.00	12	transferable	self	Dharampur	India	Himachal Pradesh	Mandi	Mandi	175024	6	Unknown Doctor	206	8	f	none	simple	t	2025-11-20 13:16:41.074443	2025-11-23 19:14:16.546407	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	\N	\N	[]
9	987522385	PSY2025238945	\N	\N	2025-11-22	Rohit	741852963	23	M	GEN	Inder Singh	Psychiatry	One	211	46	PSYSC0004	mon	2025-11-24	2025-11-24	\N	\N	\N	0	0	\N	\N	\N	\N	\N	\N	Inder Singh	\N	\N	\N	\N	\N	\N	\N	\N	Mandi	India	Himachal Pradesh	Mandi	Mandi	175024	7	Chirag	205	8	f	none	simple	t	2025-11-23 22:30:38.948416	2025-11-24 11:11:39.342764	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	\N	\N	[]
7	CR2025108363	PSY2025108363	\N	\N	\N	mohit	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	7	Chirag	801	8	f	none	simple	t	2025-11-23 19:08:28.367605	2025-11-23 20:59:32.592455	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	\N	\N	[]
13	74185296	PSY2025019664	0158	\N	2025-11-25	Rohit	7894561234	25	M	GEN	inderi	Psychiatry	BNS	205	01	PSYSC0004	tue	2025-11-25	2025-11-25	15-30	single	\N	0	0	professional	middle	urban	\N	hinduism	nuclear	Kapil	55	father	primary	semi_skilled	15000.00	12	permanent_resident	self	Mandi	India	Himachal Pradesh	Mandi	Mandi	175024	6	Fariyad	206	8	t	none	simple	t	2025-11-25 11:06:59.667489	2025-11-25 11:16:14.266466	Mandi	\N	Mandi	Mandi	Himachal Pradesh	175024	India	\N	\N	\N	\N	\N	\N	\N	near by pgi	15000.00	150000.00	\N	\N	\N	\N	\N	[]
12	7895485892	PSY2025776961	\N	\N	2025-11-23	Naveen	7988456566	40	M	GEN	Rahul	Psychiatry	BNS	211	01	PSYGEN01	tue	2025-11-24	2025-11-24	30-45	\N	\N	0	0	\N	\N	\N	\N	\N	\N	Rahul	\N	\N	\N	\N	\N	\N	\N	\N	Mandi	Mandi	Himachal Pradesh	Mandi	Mandi	175024	6	Fariyad	206	8	t	none	simple	t	2025-11-25 09:39:36.965177	2025-11-25 11:21:53.053636	Mandi	\N	Mandi	Mandi	Himachal Pradesh	175024	Mandi	\N	\N	\N	\N	\N	\N	\N	near by pgi	0.00	0.00	\N	\N	\N	\N	\N	[]
11	7895485895	PSY2025654373	\N	\N	2025-11-21	qwedfg	asdfgbn	25	M	GEN	Rahul	Psychiatry	software	211	03	PSYGEN03	mon	2025-11-21	2025-11-21	15-30	\N	\N	0	0	\N	\N	\N	\N	\N	\N	Rahul	\N	\N	\N	\N	\N	\N	\N	\N	Mandi	India	Himachal Pradesh	Mandi	Mandi	175024	7	Chirag	205	8	f	none	simple	t	2025-11-24 11:57:34.375283	2025-11-24 15:51:40.975606	Mandi	\N	Mandi	Mandi	Himachal Pradesh	175024	India	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	\N	\N	\N	\N	\N	[]
\.


--
-- TOC entry 5178 (class 0 OID 21486)
-- Dependencies: 233
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_settings (id, setting_key, setting_value, description, is_active, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5179 (class 0 OID 21495)
-- Dependencies: 234
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, role, email, password_hash, two_factor_secret, two_factor_enabled, backup_codes, is_active, last_login, created_at, updated_at, mobile) FROM stdin;
7	Chirag	Resident	chirag@ihubiitmandi.in	$2a$12$jeoTMYarn3pBiyaw/AxDOOJTs007gghbHepR8vFdAl5osj/cUDjOW	\N	f	\N	t	2025-11-24 14:42:30.084018	2025-11-20 12:03:36.02094	2025-11-24 14:42:30.084018	\N
8	Rohit	Psychiatric Welfare Officer	rohit@ihubiitmandi.in	$2a$12$mC/xxC/4Wm.mAFVBO1sl4e2X8OPdGjEih7H4mjPPklskNeKM0n7ha	\N	f	\N	t	2025-11-25 11:05:04.485456	2025-11-20 12:03:36.02094	2025-11-25 11:05:04.485456	\N
6	Fariyad	Faculty	fariyad@ihubiitmandi.in	$2a$12$IpFrUTSJcFfso2oxA4.LLO83V2Irgoh62MgLtyBmMiCIQrfLEov32	\N	f	\N	t	2025-11-25 11:09:50.885529	2025-11-20 12:03:36.02094	2025-11-25 11:09:50.885529	\N
5	Inventory Admin	Admin	inventory@ihubiitmandi.in	$2a$12$bpjPWNGYdXgrJU1QLUsuF.kswvgMo71Akig6LOTDn4Ze4emPUyiVC	\N	f	\N	t	2025-11-25 11:36:14.049585	2025-11-20 12:03:36.02094	2025-11-25 11:36:14.049585	\N
\.


--
-- TOC entry 5267 (class 0 OID 0)
-- Dependencies: 217
-- Name: adl_files_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.adl_files_id_seq', 7, true);


--
-- TOC entry 5268 (class 0 OID 0)
-- Dependencies: 218
-- Name: audit_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_log_id_seq', 1, false);


--
-- TOC entry 5269 (class 0 OID 0)
-- Dependencies: 238
-- Name: clinical_options_id_seq; Type: SEQUENCE SET; Schema: public; Owner: fariyad
--

SELECT pg_catalog.setval('public.clinical_options_id_seq', 122, true);


--
-- TOC entry 5270 (class 0 OID 0)
-- Dependencies: 219
-- Name: clinical_proforma_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.clinical_proforma_id_seq', 11, true);


--
-- TOC entry 5271 (class 0 OID 0)
-- Dependencies: 220
-- Name: login_otps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.login_otps_id_seq', 1, false);


--
-- TOC entry 5272 (class 0 OID 0)
-- Dependencies: 221
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.password_reset_tokens_id_seq', 1, false);


--
-- TOC entry 5273 (class 0 OID 0)
-- Dependencies: 242
-- Name: patient_files_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.patient_files_id_seq', 5, true);


--
-- TOC entry 5274 (class 0 OID 0)
-- Dependencies: 222
-- Name: patient_visits_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.patient_visits_id_seq', 30, true);


--
-- TOC entry 5275 (class 0 OID 0)
-- Dependencies: 236
-- Name: prescriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.prescriptions_id_seq', 9, true);


--
-- TOC entry 5276 (class 0 OID 0)
-- Dependencies: 240
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.refresh_tokens_id_seq', 39, true);


--
-- TOC entry 5277 (class 0 OID 0)
-- Dependencies: 223
-- Name: registered_patient_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.registered_patient_id_seq', 13, true);


--
-- TOC entry 5278 (class 0 OID 0)
-- Dependencies: 224
-- Name: system_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.system_settings_id_seq', 1, false);


--
-- TOC entry 5279 (class 0 OID 0)
-- Dependencies: 225
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 8, true);


--
-- TOC entry 4906 (class 2606 OID 21531)
-- Name: adl_files adl_files_adl_no_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.adl_files
    ADD CONSTRAINT adl_files_adl_no_key UNIQUE (adl_no);


--
-- TOC entry 4908 (class 2606 OID 21511)
-- Name: adl_files adl_files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.adl_files
    ADD CONSTRAINT adl_files_pkey PRIMARY KEY (id);


--
-- TOC entry 4914 (class 2606 OID 21513)
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- TOC entry 4971 (class 2606 OID 21725)
-- Name: clinical_options clinical_options_option_group_option_label_key; Type: CONSTRAINT; Schema: public; Owner: fariyad
--

ALTER TABLE ONLY public.clinical_options
    ADD CONSTRAINT clinical_options_option_group_option_label_key UNIQUE (option_group, option_label);


--
-- TOC entry 4973 (class 2606 OID 21723)
-- Name: clinical_options clinical_options_pkey; Type: CONSTRAINT; Schema: public; Owner: fariyad
--

ALTER TABLE ONLY public.clinical_options
    ADD CONSTRAINT clinical_options_pkey PRIMARY KEY (id);


--
-- TOC entry 4919 (class 2606 OID 21515)
-- Name: clinical_proforma clinical_proforma_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinical_proforma
    ADD CONSTRAINT clinical_proforma_pkey PRIMARY KEY (id);


--
-- TOC entry 4928 (class 2606 OID 21517)
-- Name: login_otps login_otps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login_otps
    ADD CONSTRAINT login_otps_pkey PRIMARY KEY (id);


--
-- TOC entry 4930 (class 2606 OID 21519)
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 4932 (class 2606 OID 21533)
-- Name: password_reset_tokens password_reset_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key UNIQUE (token);


--
-- TOC entry 4988 (class 2606 OID 21768)
-- Name: patient_files patient_files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_files
    ADD CONSTRAINT patient_files_pkey PRIMARY KEY (id);


--
-- TOC entry 4938 (class 2606 OID 21521)
-- Name: patient_visits patient_visits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_visits
    ADD CONSTRAINT patient_visits_pkey PRIMARY KEY (id);


--
-- TOC entry 4969 (class 2606 OID 21710)
-- Name: prescriptions prescriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_pkey PRIMARY KEY (id);


--
-- TOC entry 4981 (class 2606 OID 21740)
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 4983 (class 2606 OID 21742)
-- Name: refresh_tokens refresh_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_key UNIQUE (token);


--
-- TOC entry 4950 (class 2606 OID 21535)
-- Name: registered_patient registered_patient_adl_no_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registered_patient
    ADD CONSTRAINT registered_patient_adl_no_key UNIQUE (adl_no);


--
-- TOC entry 4952 (class 2606 OID 21537)
-- Name: registered_patient registered_patient_cr_no_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registered_patient
    ADD CONSTRAINT registered_patient_cr_no_key UNIQUE (cr_no);


--
-- TOC entry 4954 (class 2606 OID 21525)
-- Name: registered_patient registered_patient_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registered_patient
    ADD CONSTRAINT registered_patient_pkey PRIMARY KEY (id);


--
-- TOC entry 4956 (class 2606 OID 21527)
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 4958 (class 2606 OID 21539)
-- Name: system_settings system_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_setting_key_key UNIQUE (setting_key);


--
-- TOC entry 4963 (class 2606 OID 21541)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4965 (class 2606 OID 21712)
-- Name: users users_mobile_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_mobile_key UNIQUE (mobile);


--
-- TOC entry 4967 (class 2606 OID 21529)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4909 (class 1259 OID 21542)
-- Name: idx_adl_files_adl_no; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_adl_files_adl_no ON public.adl_files USING btree (adl_no);


--
-- TOC entry 4910 (class 1259 OID 21543)
-- Name: idx_adl_files_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_adl_files_created_by ON public.adl_files USING btree (created_by);


--
-- TOC entry 4911 (class 1259 OID 21544)
-- Name: idx_adl_files_patient_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_adl_files_patient_id ON public.adl_files USING btree (patient_id);


--
-- TOC entry 4912 (class 1259 OID 21545)
-- Name: idx_adl_files_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_adl_files_status ON public.adl_files USING btree (file_status);


--
-- TOC entry 4915 (class 1259 OID 21546)
-- Name: idx_audit_log_changed_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_log_changed_at ON public.audit_log USING btree (changed_at);


--
-- TOC entry 4916 (class 1259 OID 21547)
-- Name: idx_audit_log_changed_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_log_changed_by ON public.audit_log USING btree (changed_by);


--
-- TOC entry 4917 (class 1259 OID 21548)
-- Name: idx_audit_log_table_record; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_log_table_record ON public.audit_log USING btree (table_name, record_id);


--
-- TOC entry 4920 (class 1259 OID 21549)
-- Name: idx_clinical_case_severity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinical_case_severity ON public.clinical_proforma USING btree (case_severity);


--
-- TOC entry 4921 (class 1259 OID 21550)
-- Name: idx_clinical_doctor_decision; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinical_doctor_decision ON public.clinical_proforma USING btree (doctor_decision);


--
-- TOC entry 4922 (class 1259 OID 21551)
-- Name: idx_clinical_filled_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinical_filled_by ON public.clinical_proforma USING btree (filled_by);


--
-- TOC entry 4974 (class 1259 OID 21727)
-- Name: idx_clinical_options_active; Type: INDEX; Schema: public; Owner: fariyad
--

CREATE INDEX idx_clinical_options_active ON public.clinical_options USING btree (is_active);


--
-- TOC entry 4975 (class 1259 OID 21726)
-- Name: idx_clinical_options_group; Type: INDEX; Schema: public; Owner: fariyad
--

CREATE INDEX idx_clinical_options_group ON public.clinical_options USING btree (option_group);


--
-- TOC entry 4923 (class 1259 OID 21552)
-- Name: idx_clinical_patient_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinical_patient_id ON public.clinical_proforma USING btree (patient_id);


--
-- TOC entry 4924 (class 1259 OID 21553)
-- Name: idx_clinical_proforma_assigned_doctor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinical_proforma_assigned_doctor ON public.clinical_proforma USING btree (assigned_doctor);


--
-- TOC entry 4925 (class 1259 OID 21554)
-- Name: idx_clinical_visit_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinical_visit_date ON public.clinical_proforma USING btree (visit_date);


--
-- TOC entry 4926 (class 1259 OID 21555)
-- Name: idx_clinical_visit_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinical_visit_type ON public.clinical_proforma USING btree (visit_type);


--
-- TOC entry 4984 (class 1259 OID 21776)
-- Name: idx_patient_files_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_files_created_at ON public.patient_files USING btree (created_at);


--
-- TOC entry 4985 (class 1259 OID 21774)
-- Name: idx_patient_files_patient_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_files_patient_id ON public.patient_files USING btree (patient_id);


--
-- TOC entry 4986 (class 1259 OID 21775)
-- Name: idx_patient_files_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_files_role ON public.patient_files USING gin (role);


--
-- TOC entry 4933 (class 1259 OID 21556)
-- Name: idx_patient_visits_assigned_doctor_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_visits_assigned_doctor_id ON public.patient_visits USING btree (assigned_doctor_id);


--
-- TOC entry 4934 (class 1259 OID 21557)
-- Name: idx_patient_visits_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_visits_date ON public.patient_visits USING btree (visit_date);


--
-- TOC entry 4935 (class 1259 OID 21558)
-- Name: idx_patient_visits_patient_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_visits_patient_id ON public.patient_visits USING btree (patient_id);


--
-- TOC entry 4936 (class 1259 OID 21559)
-- Name: idx_patient_visits_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_visits_status ON public.patient_visits USING btree (visit_status);


--
-- TOC entry 4976 (class 1259 OID 21750)
-- Name: idx_refresh_tokens_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_refresh_tokens_expires_at ON public.refresh_tokens USING btree (expires_at);


--
-- TOC entry 4977 (class 1259 OID 21751)
-- Name: idx_refresh_tokens_revoked; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_refresh_tokens_revoked ON public.refresh_tokens USING btree (is_revoked);


--
-- TOC entry 4978 (class 1259 OID 21749)
-- Name: idx_refresh_tokens_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_refresh_tokens_token ON public.refresh_tokens USING btree (token);


--
-- TOC entry 4979 (class 1259 OID 21748)
-- Name: idx_refresh_tokens_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_refresh_tokens_user_id ON public.refresh_tokens USING btree (user_id);


--
-- TOC entry 4939 (class 1259 OID 21561)
-- Name: idx_registered_patient_adl_no; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_registered_patient_adl_no ON public.registered_patient USING btree (adl_no);


--
-- TOC entry 4940 (class 1259 OID 21562)
-- Name: idx_registered_patient_assigned_doctor_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_registered_patient_assigned_doctor_id ON public.registered_patient USING btree (assigned_doctor_id);


--
-- TOC entry 4941 (class 1259 OID 21563)
-- Name: idx_registered_patient_case_complexity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_registered_patient_case_complexity ON public.registered_patient USING btree (case_complexity);


--
-- TOC entry 4942 (class 1259 OID 21564)
-- Name: idx_registered_patient_cr_no; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_registered_patient_cr_no ON public.registered_patient USING btree (cr_no);


--
-- TOC entry 4943 (class 1259 OID 21565)
-- Name: idx_registered_patient_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_registered_patient_created_at ON public.registered_patient USING btree (created_at);


--
-- TOC entry 4944 (class 1259 OID 21566)
-- Name: idx_registered_patient_file_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_registered_patient_file_status ON public.registered_patient USING btree (file_status);


--
-- TOC entry 4945 (class 1259 OID 21754)
-- Name: idx_registered_patient_files; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_registered_patient_files ON public.registered_patient USING gin (patient_files);


--
-- TOC entry 4946 (class 1259 OID 21567)
-- Name: idx_registered_patient_filled_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_registered_patient_filled_by ON public.registered_patient USING btree (filled_by);


--
-- TOC entry 4947 (class 1259 OID 21568)
-- Name: idx_registered_patient_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_registered_patient_is_active ON public.registered_patient USING btree (is_active);


--
-- TOC entry 4948 (class 1259 OID 21569)
-- Name: idx_registered_patient_psy_no; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_registered_patient_psy_no ON public.registered_patient USING btree (psy_no);


--
-- TOC entry 4959 (class 1259 OID 21570)
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- TOC entry 4960 (class 1259 OID 21571)
-- Name: idx_users_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_is_active ON public.users USING btree (is_active);


--
-- TOC entry 4961 (class 1259 OID 21572)
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- TOC entry 5008 (class 2620 OID 21573)
-- Name: adl_files update_adl_files_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_adl_files_updated_at BEFORE UPDATE ON public.adl_files FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 5009 (class 2620 OID 21574)
-- Name: clinical_proforma update_clinical_proforma_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_clinical_proforma_updated_at BEFORE UPDATE ON public.clinical_proforma FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 5010 (class 2620 OID 21575)
-- Name: login_otps update_login_otps_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_login_otps_updated_at BEFORE UPDATE ON public.login_otps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 5011 (class 2620 OID 21576)
-- Name: password_reset_tokens update_password_reset_tokens_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_password_reset_tokens_updated_at BEFORE UPDATE ON public.password_reset_tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 5012 (class 2620 OID 21577)
-- Name: patient_visits update_patient_visits_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_patient_visits_updated_at BEFORE UPDATE ON public.patient_visits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 5013 (class 2620 OID 21579)
-- Name: registered_patient update_registered_patient_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_registered_patient_updated_at BEFORE UPDATE ON public.registered_patient FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 5014 (class 2620 OID 21580)
-- Name: system_settings update_system_settings_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 5015 (class 2620 OID 21581)
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4989 (class 2606 OID 21582)
-- Name: adl_files adl_files_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.adl_files
    ADD CONSTRAINT adl_files_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4990 (class 2606 OID 21587)
-- Name: adl_files adl_files_last_accessed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.adl_files
    ADD CONSTRAINT adl_files_last_accessed_by_fkey FOREIGN KEY (last_accessed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4991 (class 2606 OID 21592)
-- Name: adl_files adl_files_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.adl_files
    ADD CONSTRAINT adl_files_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.registered_patient(id) ON DELETE CASCADE;


--
-- TOC entry 4993 (class 2606 OID 21602)
-- Name: audit_log audit_log_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4994 (class 2606 OID 21607)
-- Name: clinical_proforma clinical_proforma_adl_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinical_proforma
    ADD CONSTRAINT clinical_proforma_adl_file_id_fkey FOREIGN KEY (adl_file_id) REFERENCES public.adl_files(id) ON DELETE SET NULL;


--
-- TOC entry 4995 (class 2606 OID 21612)
-- Name: clinical_proforma clinical_proforma_assigned_doctor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinical_proforma
    ADD CONSTRAINT clinical_proforma_assigned_doctor_fkey FOREIGN KEY (assigned_doctor) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4996 (class 2606 OID 21617)
-- Name: clinical_proforma clinical_proforma_filled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinical_proforma
    ADD CONSTRAINT clinical_proforma_filled_by_fkey FOREIGN KEY (filled_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4997 (class 2606 OID 21622)
-- Name: clinical_proforma clinical_proforma_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinical_proforma
    ADD CONSTRAINT clinical_proforma_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.registered_patient(id) ON DELETE CASCADE;


--
-- TOC entry 4992 (class 2606 OID 21597)
-- Name: adl_files fk_adl_files_clinical_proforma_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.adl_files
    ADD CONSTRAINT fk_adl_files_clinical_proforma_id FOREIGN KEY (clinical_proforma_id) REFERENCES public.clinical_proforma(id) ON DELETE SET NULL;


--
-- TOC entry 5007 (class 2606 OID 21769)
-- Name: patient_files fk_patient_files_patient; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_files
    ADD CONSTRAINT fk_patient_files_patient FOREIGN KEY (patient_id) REFERENCES public.registered_patient(id) ON DELETE CASCADE;


--
-- TOC entry 4998 (class 2606 OID 21627)
-- Name: login_otps login_otps_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login_otps
    ADD CONSTRAINT login_otps_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4999 (class 2606 OID 21632)
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5000 (class 2606 OID 21637)
-- Name: patient_visits patient_visits_adl_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_visits
    ADD CONSTRAINT patient_visits_adl_file_id_fkey FOREIGN KEY (adl_file_id) REFERENCES public.adl_files(id) ON DELETE SET NULL;


--
-- TOC entry 5001 (class 2606 OID 21642)
-- Name: patient_visits patient_visits_assigned_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_visits
    ADD CONSTRAINT patient_visits_assigned_doctor_id_fkey FOREIGN KEY (assigned_doctor_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5002 (class 2606 OID 21647)
-- Name: patient_visits patient_visits_clinical_proforma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_visits
    ADD CONSTRAINT patient_visits_clinical_proforma_id_fkey FOREIGN KEY (clinical_proforma_id) REFERENCES public.clinical_proforma(id) ON DELETE SET NULL;


--
-- TOC entry 5003 (class 2606 OID 21652)
-- Name: patient_visits patient_visits_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_visits
    ADD CONSTRAINT patient_visits_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.registered_patient(id) ON DELETE CASCADE;


--
-- TOC entry 5006 (class 2606 OID 21743)
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5004 (class 2606 OID 21662)
-- Name: registered_patient registered_patient_assigned_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registered_patient
    ADD CONSTRAINT registered_patient_assigned_doctor_id_fkey FOREIGN KEY (assigned_doctor_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5005 (class 2606 OID 21667)
-- Name: registered_patient registered_patient_filled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registered_patient
    ADD CONSTRAINT registered_patient_filled_by_fkey FOREIGN KEY (filled_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5204 (class 0 OID 0)
-- Dependencies: 226
-- Name: TABLE adl_files; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.adl_files TO PUBLIC;


--
-- TOC entry 5206 (class 0 OID 0)
-- Dependencies: 217
-- Name: SEQUENCE adl_files_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.adl_files_id_seq TO PUBLIC;


--
-- TOC entry 5208 (class 0 OID 0)
-- Dependencies: 227
-- Name: TABLE audit_log; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.audit_log TO PUBLIC;


--
-- TOC entry 5210 (class 0 OID 0)
-- Dependencies: 218
-- Name: SEQUENCE audit_log_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.audit_log_id_seq TO PUBLIC;


--
-- TOC entry 5215 (class 0 OID 0)
-- Dependencies: 228
-- Name: TABLE clinical_proforma; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.clinical_proforma TO PUBLIC;


--
-- TOC entry 5217 (class 0 OID 0)
-- Dependencies: 219
-- Name: SEQUENCE clinical_proforma_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.clinical_proforma_id_seq TO PUBLIC;


--
-- TOC entry 5219 (class 0 OID 0)
-- Dependencies: 229
-- Name: TABLE login_otps; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.login_otps TO PUBLIC;


--
-- TOC entry 5221 (class 0 OID 0)
-- Dependencies: 220
-- Name: SEQUENCE login_otps_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.login_otps_id_seq TO PUBLIC;


--
-- TOC entry 5223 (class 0 OID 0)
-- Dependencies: 230
-- Name: TABLE password_reset_tokens; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.password_reset_tokens TO PUBLIC;


--
-- TOC entry 5225 (class 0 OID 0)
-- Dependencies: 221
-- Name: SEQUENCE password_reset_tokens_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.password_reset_tokens_id_seq TO PUBLIC;


--
-- TOC entry 5233 (class 0 OID 0)
-- Dependencies: 243
-- Name: TABLE patient_files; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.patient_files TO PUBLIC;


--
-- TOC entry 5235 (class 0 OID 0)
-- Dependencies: 242
-- Name: SEQUENCE patient_files_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.patient_files_id_seq TO PUBLIC;


--
-- TOC entry 5237 (class 0 OID 0)
-- Dependencies: 231
-- Name: TABLE patient_visits; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.patient_visits TO PUBLIC;


--
-- TOC entry 5239 (class 0 OID 0)
-- Dependencies: 222
-- Name: SEQUENCE patient_visits_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.patient_visits_id_seq TO PUBLIC;


--
-- TOC entry 5240 (class 0 OID 0)
-- Dependencies: 237
-- Name: TABLE prescriptions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.prescriptions TO PUBLIC;


--
-- TOC entry 5242 (class 0 OID 0)
-- Dependencies: 236
-- Name: SEQUENCE prescriptions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.prescriptions_id_seq TO PUBLIC;


--
-- TOC entry 5244 (class 0 OID 0)
-- Dependencies: 241
-- Name: TABLE refresh_tokens; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.refresh_tokens TO PUBLIC;


--
-- TOC entry 5246 (class 0 OID 0)
-- Dependencies: 240
-- Name: SEQUENCE refresh_tokens_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.refresh_tokens_id_seq TO PUBLIC;


--
-- TOC entry 5255 (class 0 OID 0)
-- Dependencies: 232
-- Name: TABLE registered_patient; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.registered_patient TO PUBLIC;


--
-- TOC entry 5257 (class 0 OID 0)
-- Dependencies: 223
-- Name: SEQUENCE registered_patient_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.registered_patient_id_seq TO PUBLIC;


--
-- TOC entry 5259 (class 0 OID 0)
-- Dependencies: 233
-- Name: TABLE system_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.system_settings TO PUBLIC;


--
-- TOC entry 5261 (class 0 OID 0)
-- Dependencies: 224
-- Name: SEQUENCE system_settings_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.system_settings_id_seq TO PUBLIC;


--
-- TOC entry 5263 (class 0 OID 0)
-- Dependencies: 234
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.users TO PUBLIC;


--
-- TOC entry 5264 (class 0 OID 0)
-- Dependencies: 235
-- Name: TABLE user_stats; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_stats TO PUBLIC;


--
-- TOC entry 5266 (class 0 OID 0)
-- Dependencies: 225
-- Name: SEQUENCE users_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.users_id_seq TO PUBLIC;


--
-- TOC entry 2110 (class 826 OID 21674)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO PUBLIC;


--
-- TOC entry 2111 (class 826 OID 21675)
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO PUBLIC;


--
-- TOC entry 2109 (class 826 OID 21673)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO PUBLIC;


-- Completed on 2025-11-25 16:39:12

--
-- PostgreSQL database dump complete
--

\unrestrict mld3P4lPXlQGiAYKVT0b7pl16ynJMFCAhHU5LtcRjQCEaoJ11lubJus3mUPeQew

