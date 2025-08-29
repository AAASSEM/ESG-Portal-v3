-- Initialize ESG Portal Database
-- This script runs when the PostgreSQL container starts for the first time

-- Create database if it doesn't exist (already handled by POSTGRES_DB)
-- CREATE DATABASE IF NOT EXISTS esg_portal;

-- Create user if it doesn't exist (already handled by POSTGRES_USER)
-- CREATE USER IF NOT EXISTS esg_user WITH PASSWORD 'esg_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE esg_portal TO esg_user;

-- Set timezone
SET timezone = 'Asia/Dubai';

-- Create extensions if needed
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Log initialization
SELECT 'ESG Portal Database initialized successfully' as status;