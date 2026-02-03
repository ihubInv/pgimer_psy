-- Migration: Create child_patient_registrations table
-- Description: Stores Child Guidance Clinic (CGC) child patient registration data
-- Date: 2026-01-23

-- Create child_patient_registrations table
CREATE TABLE IF NOT EXISTS child_patient_registrations (
    id SERIAL PRIMARY KEY,
    
    -- Visit Details
    seen_as_walk_in_on DATE,
    
    -- Identification Details
    cr_number VARCHAR(50),
    cgc_number VARCHAR(50),
    
    -- Address Details
    address_line TEXT,
    city_town_village TEXT,
    district TEXT,
    state TEXT,
    country TEXT DEFAULT 'India',
    pincode VARCHAR(10),
    
    -- Child Personal Information
    child_name TEXT NOT NULL,
    sex VARCHAR(10) CHECK (sex IN ('Male', 'Female', 'Other')),
    
    -- Age Group
    age_group VARCHAR(50) CHECK (age_group IN ('Less than 1 year', '1 – 5 years', '5 – 10 years', '10 – 15 years')),
    
    -- Educational Status
    educational_status VARCHAR(50) CHECK (educational_status IN ('Illiterate', 'Literate', 'Primary', 'Middle', 'Matric', 'Not Known')),
    
    -- Occupational Status
    occupational_status VARCHAR(50) CHECK (occupational_status IN ('Dependent', 'Student', 'Household', 'Cultivation', 'Agricultural / Labourer', 'Others', 'Not Known')),
    
    -- Religion
    religion VARCHAR(50) CHECK (religion IN ('Hindu', 'Islam', 'Sikh', 'Christian', 'Others', 'Not Known')),
    
    -- Head of Family Details
    head_name TEXT,
    head_relationship VARCHAR(50) CHECK (head_relationship IN ('Father', 'Mother', 'Guardian', 'Relative', 'Others')),
    head_age INTEGER,
    head_education VARCHAR(50) CHECK (head_education IN ('Illiterate', 'Primary', 'Middle', 'Matric', 'Graduate', 'Others')),
    head_occupation VARCHAR(50) CHECK (head_occupation IN ('Service', 'Business', 'Labourer', 'Farmer', 'Household', 'Others')),
    head_monthly_income VARCHAR(50) CHECK (head_monthly_income IN ('Below ₹5,000', '₹5,000 – ₹10,000', '₹10,001 – ₹25,000', 'Above ₹25,000', 'Not Known')),
    
    -- Locality
    locality VARCHAR(50) CHECK (locality IN ('Rural', 'Urban', 'Semi-Urban', 'Not Known')),
    
    -- Distance Travelled
    distance_travelled VARCHAR(50) CHECK (distance_travelled IN ('Local', 'Up to 20 miles', '21 – 60 miles', '61 – 100 miles', 'Above 100 miles', 'Not Known')),
    
    -- Source of Referral
    source_of_referral VARCHAR(50) CHECK (source_of_referral IN ('Self', 'Relatives / Friends', 'Other Medical Agencies', 'Non-Medical Institutions', 'P.G.I.', 'Others')),
    
    -- Present Address
    present_address_line TEXT,
    present_city_town_village TEXT,
    present_district TEXT,
    present_state TEXT,
    present_country TEXT,
    present_pincode VARCHAR(10),
    
    -- Permanent Address
    permanent_address_line TEXT,
    permanent_city_town_village TEXT,
    permanent_district TEXT,
    permanent_state TEXT,
    permanent_country TEXT,
    permanent_pincode VARCHAR(10),
    
    -- Local Address
    local_address_line TEXT,
    local_city_town_village TEXT,
    local_district TEXT,
    local_state TEXT,
    local_country TEXT,
    local_pincode VARCHAR(10),
    
    -- Assigned Room
    assigned_room VARCHAR(50),
    
    -- Patient Documents & Files (stored as JSONB array of file paths)
    documents JSONB DEFAULT '[]'::jsonb,
    photo_path TEXT,
    
    -- Metadata
    filled_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_child_patient_cr_number ON child_patient_registrations(cr_number);
CREATE INDEX IF NOT EXISTS idx_child_patient_cgc_number ON child_patient_registrations(cgc_number);
CREATE INDEX IF NOT EXISTS idx_child_patient_child_name ON child_patient_registrations(child_name);
CREATE INDEX IF NOT EXISTS idx_child_patient_created_at ON child_patient_registrations(created_at);
CREATE INDEX IF NOT EXISTS idx_child_patient_filled_by ON child_patient_registrations(filled_by);

-- Add comments
COMMENT ON TABLE child_patient_registrations IS 'Stores Child Guidance Clinic (CGC) child patient registration data';
COMMENT ON COLUMN child_patient_registrations.documents IS 'JSONB array of document file paths: ["path1", "path2"]';
COMMENT ON COLUMN child_patient_registrations.photo_path IS 'Path to child patient photo file';
