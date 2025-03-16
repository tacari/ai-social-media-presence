-- Create chatbot_logs table to store conversation history
CREATE TABLE IF NOT EXISTS chatbot_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  user_message TEXT NOT NULL,
  bot_response TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chatbot_settings table for business-specific configurations
CREATE TABLE IF NOT EXISTS chatbot_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT TRUE,
  welcome_message TEXT DEFAULT 'Hi there! How can I help you today?',
  tone VARCHAR(50) DEFAULT 'professional',
  custom_faqs JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id)
);

-- Create chatbot_leads table to store captured lead information
CREATE TABLE IF NOT EXISTS chatbot_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  name TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chatbot_feedback table to track user satisfaction
CREATE TABLE IF NOT EXISTS chatbot_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  log_id UUID REFERENCES chatbot_logs(id) ON DELETE CASCADE,
  was_helpful BOOLEAN,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indices for better query performance
CREATE INDEX IF NOT EXISTS chatbot_logs_business_idx ON chatbot_logs(business_id);
CREATE INDEX IF NOT EXISTS chatbot_logs_session_idx ON chatbot_logs(session_id);
CREATE INDEX IF NOT EXISTS chatbot_leads_business_idx ON chatbot_leads(business_id);
CREATE INDEX IF NOT EXISTS chatbot_leads_email_idx ON chatbot_leads(email);
CREATE INDEX IF NOT EXISTS chatbot_feedback_log_idx ON chatbot_feedback(log_id);

-- Apply Row Level Security (RLS) policies
ALTER TABLE chatbot_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_feedback ENABLE ROW LEVEL SECURITY;

-- RLS policies for chatbot_logs
CREATE POLICY "Users can view their own business chatbot logs" ON chatbot_logs
  FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert chatbot logs for their businesses" ON chatbot_logs
  FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- RLS policies for chatbot_settings
CREATE POLICY "Users can view their own business chatbot settings" ON chatbot_settings
  FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own business chatbot settings" ON chatbot_settings
  FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert chatbot settings for their businesses" ON chatbot_settings
  FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- RLS policies for chatbot_leads
CREATE POLICY "Users can view their own business chatbot leads" ON chatbot_leads
  FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert chatbot leads for their businesses" ON chatbot_leads
  FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own business chatbot leads" ON chatbot_leads
  FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- RLS policies for chatbot_feedback
CREATE POLICY "Users can view their own business chatbot feedback" ON chatbot_feedback
  FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert chatbot feedback for their businesses" ON chatbot_feedback
  FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Insert default settings for existing businesses
INSERT INTO chatbot_settings (business_id)
SELECT id FROM businesses
ON CONFLICT (business_id) DO NOTHING; 