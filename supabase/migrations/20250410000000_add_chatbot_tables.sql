-- Create chatbot tables for AI-powered website chatbot feature

-- Table for storing conversation history
CREATE TABLE chatbot_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  user_message TEXT NOT NULL,
  bot_response TEXT NOT NULL,
  tokens_used INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add index for querying by business and session
  CONSTRAINT chatbot_logs_business_session_idx UNIQUE (business_id, session_id, created_at)
);

-- Enable RLS on chatbot_logs
ALTER TABLE chatbot_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for chatbot_logs
CREATE POLICY "Users can view their own business chatbot logs"
  ON chatbot_logs
  FOR SELECT
  USING (business_id IN (
    SELECT id FROM businesses WHERE user_id = auth.uid()
  ));

-- Chatbot settings table for business-specific configuration
CREATE TABLE chatbot_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT true,
  welcome_message TEXT DEFAULT 'Hello! How can I help you today?',
  tone VARCHAR(50) DEFAULT 'professional',
  custom_faqs JSONB DEFAULT '[]'::jsonb,
  max_history_length INTEGER DEFAULT 10,
  lead_capture_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one settings record per business
  CONSTRAINT chatbot_settings_business_unique UNIQUE (business_id)
);

-- Enable RLS on chatbot_settings
ALTER TABLE chatbot_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for chatbot_settings
CREATE POLICY "Users can view their own business chatbot settings"
  ON chatbot_settings
  FOR SELECT
  USING (business_id IN (
    SELECT id FROM businesses WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own business chatbot settings"
  ON chatbot_settings
  FOR UPDATE
  USING (business_id IN (
    SELECT id FROM businesses WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own business chatbot settings"
  ON chatbot_settings
  FOR INSERT
  WITH CHECK (business_id IN (
    SELECT id FROM businesses WHERE user_id = auth.uid()
  ));

-- Chatbot leads table for lead capture
CREATE TABLE chatbot_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  name TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add index for business_id for faster querying
  CONSTRAINT chatbot_leads_business_idx UNIQUE (business_id, id)
);

-- Enable RLS on chatbot_leads
ALTER TABLE chatbot_leads ENABLE ROW LEVEL SECURITY;

-- RLS policies for chatbot_leads
CREATE POLICY "Users can view their own business chatbot leads"
  ON chatbot_leads
  FOR SELECT
  USING (business_id IN (
    SELECT id FROM businesses WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own business chatbot leads"
  ON chatbot_leads
  FOR UPDATE
  USING (business_id IN (
    SELECT id FROM businesses WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own business chatbot leads"
  ON chatbot_leads
  FOR INSERT
  WITH CHECK (business_id IN (
    SELECT id FROM businesses WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own business chatbot leads"
  ON chatbot_leads
  FOR DELETE
  USING (business_id IN (
    SELECT id FROM businesses WHERE user_id = auth.uid()
  ));

-- Chatbot feedback table
CREATE TABLE chatbot_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  log_id UUID REFERENCES chatbot_logs(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  was_helpful BOOLEAN NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on chatbot_feedback
ALTER TABLE chatbot_feedback ENABLE ROW LEVEL SECURITY;

-- RLS policies for chatbot_feedback
CREATE POLICY "Users can view their own business chatbot feedback"
  ON chatbot_feedback
  FOR SELECT
  USING (business_id IN (
    SELECT id FROM businesses WHERE user_id = auth.uid()
  ));

-- Create function to automatically update the "updated_at" column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for chatbot_settings to update "updated_at" column
CREATE TRIGGER update_chatbot_settings_updated_at
BEFORE UPDATE ON chatbot_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for chatbot_leads to update "updated_at" column
CREATE TRIGGER update_chatbot_leads_updated_at
BEFORE UPDATE ON chatbot_leads
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create public API policy for chatbot endpoint
CREATE POLICY "Public can insert chatbot logs"
  ON chatbot_logs
  FOR INSERT
  WITH CHECK (true);

-- Create view for chatbot analytics
CREATE VIEW chatbot_analytics AS
SELECT
  b.id AS business_id,
  b.name AS business_name,
  COUNT(DISTINCT cl.session_id) AS total_conversations,
  COUNT(cl.id) AS total_messages,
  COUNT(DISTINCT cle.id) AS total_leads,
  COUNT(DISTINCT cf.id) AS total_feedback,
  SUM(CASE WHEN cf.was_helpful THEN 1 ELSE 0 END) AS helpful_responses,
  SUM(CASE WHEN NOT cf.was_helpful THEN 1 ELSE 0 END) AS unhelpful_responses,
  AVG(cl.tokens_used) AS avg_tokens_per_message
FROM businesses b
LEFT JOIN chatbot_logs cl ON b.id = cl.business_id
LEFT JOIN chatbot_leads cle ON b.id = cle.business_id
LEFT JOIN chatbot_feedback cf ON b.id = cf.business_id
GROUP BY b.id, b.name;

-- Create RLS policy for the analytics view
ALTER VIEW chatbot_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own business chatbot analytics"
  ON chatbot_analytics
  FOR SELECT
  USING (business_id IN (
    SELECT id FROM businesses WHERE user_id = auth.uid()
  )); 