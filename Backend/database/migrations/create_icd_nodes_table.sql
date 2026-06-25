-- ICD-11 hierarchy nodes (WHO system + local user extensions)

CREATE TABLE IF NOT EXISTS icd_nodes (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES icd_nodes(id) ON DELETE CASCADE,
    node_type VARCHAR(20) NOT NULL CHECK (node_type IN ('chapter', 'category', 'subcategory', 'code')),
    title TEXT NOT NULL,
    code VARCHAR(50),
    block VARCHAR(50),
    chapter_no VARCHAR(10),
    foundation_uri TEXT,
    is_system BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_icd_nodes_parent ON icd_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_icd_nodes_type ON icd_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_icd_nodes_active ON icd_nodes(is_active);
CREATE INDEX IF NOT EXISTS idx_icd_nodes_code ON icd_nodes(LOWER(code)) WHERE code IS NOT NULL AND code <> '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_icd_nodes_foundation_uri ON icd_nodes(foundation_uri) WHERE foundation_uri IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_icd_nodes_parent_title ON icd_nodes(COALESCE(parent_id, 0), LOWER(title));

COMMENT ON TABLE icd_nodes IS 'ICD-11 hierarchy: chapters, categories, subcategories, and codes (WHO + local)';
