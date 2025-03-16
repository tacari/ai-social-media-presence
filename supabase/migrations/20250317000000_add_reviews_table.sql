-- Add Place ID to businesses table
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS place_id TEXT;

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  reviewer_name TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  timestamp TIMESTAMP NOT NULL,
  response TEXT
); 