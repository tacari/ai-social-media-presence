-- Create platform_accounts table to store connection details for each platform
CREATE TABLE IF NOT EXISTS platform_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'facebook', 'instagram', 'twitter', 'linkedin'
  account_id TEXT NOT NULL, -- Platform-specific account ID
  account_name TEXT, -- Display name for the account
  account_username TEXT, -- Username for the account
  account_image_url TEXT, -- Profile picture URL
  access_token TEXT NOT NULL, -- OAuth access token
  refresh_token TEXT, -- For platforms with refresh tokens (e.g., LinkedIn)
  token_expiry TIMESTAMP, -- Token expiration time
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id, platform, account_id)
);

-- Create social_media_posts table to track posts across all platforms
CREATE TABLE IF NOT EXISTS social_media_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'facebook', 'instagram', 'twitter', 'linkedin'
  platform_account_id UUID REFERENCES platform_accounts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT, -- Optional, for image support
  scheduled_time TIMESTAMP,
  published_time TIMESTAMP,
  status TEXT DEFAULT 'draft', -- 'draft', 'scheduled', 'posted', 'failed'
  post_id TEXT, -- Platform-specific post ID after posting
  ai_generated BOOLEAN DEFAULT FALSE, -- Whether the content was AI-generated
  engagement_data JSONB, -- Likes, comments, shares, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indices for better query performance
CREATE INDEX IF NOT EXISTS platform_accounts_business_platform_idx ON platform_accounts(business_id, platform);
CREATE INDEX IF NOT EXISTS platform_accounts_platform_idx ON platform_accounts(platform);
CREATE INDEX IF NOT EXISTS social_media_posts_business_idx ON social_media_posts(business_id);
CREATE INDEX IF NOT EXISTS social_media_posts_platform_idx ON social_media_posts(platform);
CREATE INDEX IF NOT EXISTS social_media_posts_status_idx ON social_media_posts(status);
CREATE INDEX IF NOT EXISTS social_media_posts_scheduled_time_idx ON social_media_posts(scheduled_time);

-- Add Row Level Security (RLS) policies for the new tables
ALTER TABLE platform_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_posts ENABLE ROW LEVEL SECURITY;

-- RLS policies for platform_accounts
CREATE POLICY "Users can view their own platform accounts" ON platform_accounts
  FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own platform accounts" ON platform_accounts
  FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own platform accounts" ON platform_accounts
  FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own platform accounts" ON platform_accounts
  FOR DELETE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- RLS policies for social_media_posts
CREATE POLICY "Users can view their own social media posts" ON social_media_posts
  FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own social media posts" ON social_media_posts
  FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own social media posts" ON social_media_posts
  FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own social media posts" ON social_media_posts
  FOR DELETE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Migrate existing Facebook data to new structure
INSERT INTO platform_accounts(
  business_id, 
  platform, 
  account_id, 
  account_name,
  access_token, 
  created_at, 
  updated_at
)
SELECT 
  id, 
  'facebook', 
  facebook_page_id,
  name,
  facebook_page_access_token,
  NOW(),
  NOW()
FROM 
  businesses
WHERE 
  facebook_page_id IS NOT NULL AND facebook_page_access_token IS NOT NULL; 