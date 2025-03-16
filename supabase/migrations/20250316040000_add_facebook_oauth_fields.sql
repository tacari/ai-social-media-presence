-- Add Facebook OAuth token fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook_access_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook_refresh_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook_token_expires_at TIMESTAMP;

-- Add a field to store Facebook Page IDs in the businesses table
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS facebook_page_id TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS facebook_page_access_token TEXT; 