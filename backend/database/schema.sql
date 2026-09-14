-- ============================================
-- Emission Tracker Database Schema
-- ============================================

-- ============================================
-- Organizations
-- ============================================

CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

-- ============================================
-- Emission Records
-- ============================================

CREATE TABLE IF NOT EXISTS emission_records (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    month DATE NOT NULL,
    electricity_consumption NUMERIC(12, 2) NOT NULL,
    emission_factor NUMERIC(5, 2) NOT NULL DEFAULT 0.82,
    co2_emission NUMERIC(14, 2) NOT NULL,
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending',

    CONSTRAINT fk_organization
        FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_consumption_positive
        CHECK (electricity_consumption > 0),

    CONSTRAINT chk_status
        CHECK (status IN ('Pending', 'Validated', 'Rejected'))
);

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_emission_records_organization_id
ON emission_records(organization_id);

CREATE INDEX IF NOT EXISTS idx_emission_records_status
ON emission_records(status);

CREATE INDEX IF NOT EXISTS idx_emission_records_month
ON emission_records(month);

CREATE INDEX IF NOT EXISTS idx_emission_records_org_status
ON emission_records(organization_id, status);

-- ============================================
-- Sample Organizations
-- ============================================

INSERT INTO organizations (name)
VALUES
    ('Neoliva Ltd'),
    ('Shri Pvt Ltd')
ON CONFLICT DO NOTHING;