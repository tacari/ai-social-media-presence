-- Add AI response fields to reviews table
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS ai_response TEXT,
ADD COLUMN IF NOT EXISTS response_status TEXT DEFAULT 'draft';

-- Create an index for faster querying reviews by status
CREATE INDEX IF NOT EXISTS reviews_status_idx ON reviews (response_status);

-- Create a function to automatically generate AI responses for new reviews
CREATE OR REPLACE FUNCTION generate_ai_response_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- New review inserted without a response, trigger AI generation
  IF NEW.response IS NULL THEN
    -- Mark for AI processing
    NEW.response_status := 'pending_ai';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the function on insert
DROP TRIGGER IF EXISTS on_review_insert ON reviews;
CREATE TRIGGER on_review_insert
BEFORE INSERT ON reviews
FOR EACH ROW
EXECUTE FUNCTION generate_ai_response_on_insert(); 