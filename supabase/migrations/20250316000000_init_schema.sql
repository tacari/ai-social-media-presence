-- Enable the UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table: Stores client info and subscription status
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  subscription_status TEXT DEFAULT 'inactive'
);

-- Businesses table: Stores business details and API IDs
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  industry TEXT NOT NULL,
  gmb_account_id TEXT,  -- Google My Business account ID
  fb_page_id TEXT       -- Facebook page ID
);

-- Actions log table: Tracks AI-driven updates
CREATE TABLE IF NOT EXISTS actions_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id),
  action TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Metrics table: Tracks performance data
CREATE TABLE IF NOT EXISTS metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id),
  metric_name TEXT NOT NULL,
  value TEXT NOT NULL
);

-- Row Level Security (RLS) policies for each table
-- These policies ensure that users can only access their own data

-- Users table RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can view their own user data'
  ) THEN
    CREATE POLICY "Users can view their own user data" ON users
      FOR SELECT
      USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can update their own user data'
  ) THEN
    CREATE POLICY "Users can update their own user data" ON users
      FOR UPDATE
      USING (auth.uid() = id);
  END IF;
END
$$;

-- Businesses table RLS
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'businesses' AND policyname = 'Users can view their own businesses'
  ) THEN
    CREATE POLICY "Users can view their own businesses" ON businesses
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'businesses' AND policyname = 'Users can insert their own businesses'
  ) THEN
    CREATE POLICY "Users can insert their own businesses" ON businesses
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'businesses' AND policyname = 'Users can update their own businesses'
  ) THEN
    CREATE POLICY "Users can update their own businesses" ON businesses
      FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'businesses' AND policyname = 'Users can delete their own businesses'
  ) THEN
    CREATE POLICY "Users can delete their own businesses" ON businesses
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Actions log table RLS
ALTER TABLE actions_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'actions_log' AND policyname = 'Users can view actions for their businesses'
  ) THEN
    CREATE POLICY "Users can view actions for their businesses" ON actions_log
      FOR SELECT
      USING (
        business_id IN (
          SELECT id FROM businesses WHERE user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'actions_log' AND policyname = 'Users can insert actions for their businesses'
  ) THEN
    CREATE POLICY "Users can insert actions for their businesses" ON actions_log
      FOR INSERT
      WITH CHECK (
        business_id IN (
          SELECT id FROM businesses WHERE user_id = auth.uid()
        )
      );
  END IF;
END
$$;

-- Metrics table RLS
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'metrics' AND policyname = 'Users can view metrics for their businesses'
  ) THEN
    CREATE POLICY "Users can view metrics for their businesses" ON metrics
      FOR SELECT
      USING (
        business_id IN (
          SELECT id FROM businesses WHERE user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'metrics' AND policyname = 'Users can insert metrics for their businesses'
  ) THEN
    CREATE POLICY "Users can insert metrics for their businesses" ON metrics
      FOR INSERT
      WITH CHECK (
        business_id IN (
          SELECT id FROM businesses WHERE user_id = auth.uid()
        )
      );
  END IF;
END
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS businesses_user_id_idx ON businesses (user_id);
CREATE INDEX IF NOT EXISTS actions_log_business_id_idx ON actions_log (business_id);
CREATE INDEX IF NOT EXISTS metrics_business_id_idx ON metrics (business_id); 