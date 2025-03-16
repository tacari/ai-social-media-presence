-- Add Google OAuth token fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_access_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_token_expires_at TIMESTAMP;

-- Add a field to store GMB location IDs in the businesses table
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS gmb_location_id TEXT; 