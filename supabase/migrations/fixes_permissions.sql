-- Permissions Fix
-- Run this in the Supabase SQL Editor to grant access to the new schema

-- Allow usage of the schema
GRANT USAGE ON SCHEMA built_flexdata TO anon, authenticated, service_role;

-- Allow access to all tables in the schema
GRANT ALL ON ALL TABLES IN SCHEMA built_flexdata TO anon, authenticated, service_role;

-- Allow access to all sequences (if any)
GRANT ALL ON ALL SEQUENCES IN SCHEMA built_flexdata TO anon, authenticated, service_role;

-- Ensure future tables also inherit these permissions (optional but good for dev)
ALTER DEFAULT PRIVILEGES IN SCHEMA built_flexdata GRANT ALL ON TABLES TO anon, authenticated, service_role;
