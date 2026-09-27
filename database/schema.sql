-- ========================================================
-- LIFEGRID: AI-Powered Emergency Response & Coordination Network
-- PostgreSQL + PostGIS Production Schema
-- "Connect. Coordinate. Respond."
-- ========================================================

-- Enable PostGIS Extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Users & RBAC
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(120) UNIQUE NOT NULL,
    username VARCHAR(60) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('patient', 'family', 'admin', 'ambulance', 'doctor', 'hospital', 'traffic', 'bloodbank')),
    full_name VARCHAR(120) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Patient Profiles
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(120) NOT NULL,
    age INTEGER NOT NULL,
    gender VARCHAR(20) NOT NULL,
    blood_group VARCHAR(10) NOT NULL,
    emergency_contact VARCHAR(120) NOT NULL,
    emergency_phone VARCHAR(30) NOT NULL,
    allergies TEXT,
    existing_conditions TEXT,
    current_medications TEXT,
    previous_history TEXT,
    notes TEXT,
    emergency_preferences TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Family Members
CREATE TABLE family_members (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    relationship_to_patient VARCHAR(50) NOT NULL,
    contact_phone VARCHAR(30) NOT NULL,
    is_authorized BOOLEAN DEFAULT TRUE
);

-- 4. Hospitals
CREATE TABLE hospitals (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(30) UNIQUE NOT NULL,
    address VARCHAR(255) NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    geom GEOMETRY(Point, 4326),
    total_beds INTEGER DEFAULT 100,
    available_beds INTEGER DEFAULT 20,
    total_icu INTEGER DEFAULT 20,
    available_icu INTEGER DEFAULT 5,
    trauma_ready BOOLEAN DEFAULT TRUE,
    cardiac_ready BOOLEAN DEFAULT TRUE,
    pediatric_ready BOOLEAN DEFAULT TRUE,
    burn_unit BOOLEAN DEFAULT FALSE,
    status VARCHAR(30) DEFAULT 'NORMAL' CHECK (status IN ('NORMAL', 'HIGH_LOAD', 'CRITICAL')),
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(100) NOT NULL
);

-- 5. Doctors
CREATE TABLE doctors (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    hospital_id INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    specialty VARCHAR(100) NOT NULL,
    on_duty BOOLEAN DEFAULT TRUE,
    phone VARCHAR(30),
    room VARCHAR(30) DEFAULT 'ER-1'
);

-- 6. Ambulances
CREATE TABLE ambulances (
    id SERIAL PRIMARY KEY,
    vehicle_number VARCHAR(30) UNIQUE NOT NULL,
    ambulance_type VARCHAR(30) DEFAULT 'ALS' CHECK (ambulance_type IN ('BLS', 'ALS', 'Mobile ICU')),
    driver_name VARCHAR(100) NOT NULL,
    driver_phone VARCHAR(30) NOT NULL,
    paramedic_name VARCHAR(100) NOT NULL,
    status VARCHAR(30) DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'BUSY', 'EN_ROUTE', 'ARRIVED', 'TRANSPORTING', 'OFFLINE')),
    current_lat DOUBLE PRECISION NOT NULL,
    current_lng DOUBLE PRECISION NOT NULL,
    current_geom GEOMETRY(Point, 4326),
    speed DOUBLE PRECISION DEFAULT 0.0,
    equipment TEXT,
    current_emergency_id INTEGER
);

-- 7. Emergencies
CREATE TABLE emergencies (
    id SERIAL PRIMARY KEY,
    tracking_code VARCHAR(40) UNIQUE NOT NULL,
    patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
    caller_name VARCHAR(120) NOT NULL,
    caller_phone VARCHAR(30) NOT NULL,
    emergency_type VARCHAR(50) NOT NULL,
    priority VARCHAR(20) DEFAULT 'CRITICAL' CHECK (priority IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    status VARCHAR(40) DEFAULT 'REQUESTED',
    pickup_address VARCHAR(255) NOT NULL,
    pickup_lat DOUBLE PRECISION NOT NULL,
    pickup_lng DOUBLE PRECISION NOT NULL,
    pickup_geom GEOMETRY(Point, 4326),
    ambulance_id INTEGER REFERENCES ambulances(id) ON DELETE SET NULL,
    hospital_id INTEGER REFERENCES hospitals(id) ON DELETE SET NULL,
    doctor_id INTEGER REFERENCES doctors(id) ON DELETE SET NULL,
    eta_minutes INTEGER DEFAULT 12,
    distance_km DOUBLE PRECISION DEFAULT 4.5,
    route_details JSONB,
    hospital_selection_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Emergency Events (Timeline)
CREATE TABLE emergency_events (
    id SERIAL PRIMARY KEY,
    emergency_id INTEGER NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actor_role VARCHAR(40) DEFAULT 'SYSTEM'
);

-- 9. Medical Records & Clinical Outcomes
CREATE TABLE medical_records (
    id SERIAL PRIMARY KEY,
    emergency_id INTEGER NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id INTEGER REFERENCES doctors(id) ON DELETE SET NULL,
    diagnosis VARCHAR(255),
    vitals JSONB,
    summary TEXT,
    outcome VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE test_results (
    id SERIAL PRIMARY KEY,
    medical_record_id INTEGER NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
    emergency_id INTEGER NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,
    test_name VARCHAR(100) NOT NULL,
    result_status VARCHAR(50) DEFAULT 'PENDING',
    result_value VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE medications (
    id SERIAL PRIMARY KEY,
    medical_record_id INTEGER NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
    emergency_id INTEGER NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,
    medicine_name VARCHAR(100) NOT NULL,
    dosage VARCHAR(60) NOT NULL,
    route VARCHAR(30) DEFAULT 'IV',
    instructions VARCHAR(255),
    administered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE treatment_notes (
    id SERIAL PRIMARY KEY,
    medical_record_id INTEGER NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
    emergency_id INTEGER NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,
    author_name VARCHAR(100) NOT NULL,
    author_role VARCHAR(50) NOT NULL,
    note_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Blood Banks & Inventory
CREATE TABLE blood_banks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    address VARCHAR(255) NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    geom GEOMETRY(Point, 4326),
    contact_phone VARCHAR(30) NOT NULL,
    email VARCHAR(100)
);

CREATE TABLE blood_inventory (
    id SERIAL PRIMARY KEY,
    blood_bank_id INTEGER NOT NULL REFERENCES blood_banks(id) ON DELETE CASCADE,
    blood_group VARCHAR(10) NOT NULL,
    units_available INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Traffic Signals & Emergency Priority
CREATE TABLE traffic_signals (
    id SERIAL PRIMARY KEY,
    intersection_name VARCHAR(150) NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    geom GEOMETRY(Point, 4326),
    current_state VARCHAR(20) DEFAULT 'RED' CHECK (current_state IN ('RED', 'YELLOW', 'GREEN')),
    emergency_priority_active BOOLEAN DEFAULT FALSE,
    target_ambulance_id INTEGER REFERENCES ambulances(id) ON DELETE SET NULL,
    congestion_level VARCHAR(20) DEFAULT 'MODERATE',
    delay_factor DOUBLE PRECISION DEFAULT 1.0
);

-- 12. Notifications & Audit Logs
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    role VARCHAR(40) NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    emergency_id INTEGER REFERENCES emergencies(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    role VARCHAR(40),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    details TEXT,
    ip_address VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Spatial Indexes
CREATE INDEX idx_hospitals_geom ON hospitals USING GIST(geom);
CREATE INDEX idx_ambulances_geom ON ambulances USING GIST(current_geom);
CREATE INDEX idx_blood_banks_geom ON blood_banks USING GIST(geom);
CREATE INDEX idx_traffic_signals_geom ON traffic_signals USING GIST(geom);
CREATE INDEX idx_emergencies_pickup ON emergencies USING GIST(pickup_geom);
