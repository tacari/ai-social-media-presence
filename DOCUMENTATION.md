# AI Online Presence Manager - Implementation Documentation

## AI-Powered Review Response Management

The AI Response Generation system automatically creates professional, contextually-appropriate responses to customer reviews to help businesses maintain an active online presence with minimal effort.

### Overview

When new reviews come in for a business:

1. The system automatically detects them as needing AI processing
2. AI generates a draft response tailored to the content and sentiment of each review
3. Business owners can review, edit, and approve these drafts
4. Approved responses can be published to review platforms (future feature)

### Database Schema

The review management system uses the following database structure:

```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  reviewer_name TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  timestamp TIMESTAMP NOT NULL,
  response TEXT,
  ai_response TEXT,
  response_status TEXT DEFAULT 'draft'
);
```

The key fields for AI response generation are:
- `ai_response`: Stores the AI-generated draft response
- `response`: Stores the final approved response
- `response_status`: Tracks the status of the review response workflow:
  - `pending_ai`: Needs AI processing
  - `draft`: AI has generated a draft response
  - `approved`: Response has been approved and finalized

### Key Components

#### Database Triggers

A PostgreSQL trigger automatically marks new reviews for AI processing:

```sql
CREATE FUNCTION generate_ai_response_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.response IS NULL THEN
    NEW.response_status := 'pending_ai';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_review_insert
BEFORE INSERT ON reviews
FOR EACH ROW
EXECUTE FUNCTION generate_ai_response_on_insert();
```

#### Edge Function for Automated Processing

A Supabase Edge Function (`auto_review_response`) processes reviews marked for AI generation. It:
- Listens for database webhooks when new reviews are added
- Generates context-aware responses using OpenAI
- Stores draft responses in the `ai_response` field
- Updates status to `draft`

#### API Routes

The system includes these API endpoints:

1. **GET /api/reviews**: Returns all reviews for a business
2. **POST /api/reviews**: Refreshes reviews from Google
3. **PUT /api/reviews**: Updates review responses (with `action` parameter options):
   - `generate_draft`: Generates a new AI draft
   - `approve_draft`: Approves an AI draft as the official response
4. **PATCH /api/reviews**: Batch processes all pending reviews
5. **GET /api/cron/process-reviews**: Cron endpoint for automating review processing

#### Frontend Components

The `ReviewsPanel` component provides a complete interface for review management:
- Tabbed interface for filtering reviews by status
- AI response generation on demand
- Draft review and approval workflow
- Batch processing functionality
- Visual indicators of review status

### Workflow

1. **Review Collection**:
   - Reviews are collected from Google (via existing place API integration)
   - New reviews are automatically marked for AI processing

2. **AI Response Generation**:
   - Happens automatically via webhook or scheduled cron job
   - Can be manually triggered for individual reviews or in batch
   - Tailors responses based on review content, sentiment, and rating

3. **Review & Approval**:
   - Business owners see AI drafts in the dashboard
   - Can approve as-is or edit before approving
   - Can reject and write custom responses

4. **Response Management**:
   - All responses are tracked and manageable from a single interface
   - Status indicators show which reviews need attention

### AI Prompt Design

The AI uses this carefully crafted prompt to ensure high-quality, appropriate responses:

```
You are a helpful assistant for a business owner responding to customer reviews. 
Generate a professional, friendly, and personalized response to the following review:

Reviewer: {reviewer_name}
Rating: {rating} out of 5 stars
Review: "{comment}"

Your response should:
1. Thank the reviewer by name
2. Be specific to their comments and show you read the review carefully
3. Address any concerns or negative feedback diplomatically
4. If it's a positive review, express sincere gratitude
5. Invite them to return in the future
6. Keep it reasonably brief (2-4 sentences)
7. Sound authentic and not overly formal
```

This produces responses that are:
- Personalized to each reviewer
- Contextually appropriate to the review content
- Professional yet warm in tone
- Appropriately brief

## Google My Business Integration Implementation

### Overview

This document details the implementation of Google My Business (GMB) integration for the AI Online Presence Manager. This feature enables businesses to connect their GMB accounts and leverage AI to optimize their profiles for better local SEO.

### Database Schema Updates

Added the following fields to our database schema:

```sql
-- Added to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_access_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_token_expires_at TIMESTAMP;

-- Added to businesses table
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS gmb_location_id TEXT;
```

**Purpose**: 
- Store OAuth tokens to authenticate with the Google My Business API
- Store GMB location IDs for each business to enable profile updates

### Authentication Implementation

Enhanced the authentication utilities (`app/lib/auth.ts`) with:

1. **Google OAuth Functionality**:
   - `signInWithGoogle()`: Initiates OAuth flow with the GMB scope
   - `linkGoogleAccount()`: Allows existing users to connect Google accounts
   - `storeGoogleTokens()`: Securely stores access and refresh tokens
   - `getGoogleTokens()`: Retrieves tokens for API operations

**Why This Matters**: These functions enable users to authenticate with Google and authorize our application to access their GMB accounts with proper scopes.

### Google My Business API Utilities

Created a dedicated utility file (`app/lib/gmb.ts`) containing:

1. **API Client Management**:
   - `getOAuthClient()`: Initializes Google OAuth client
   - `getMyBusinessClient()`: Creates authenticated API clients for various GMB APIs

2. **GMB Data Operations**:
   - `fetchGMBAccounts()`: Retrieves user's GMB accounts
   - `fetchGMBLocations()`: Gets locations for a specific account
   - `storeGMBDetails()`: Saves the selected account and location IDs

3. **AI-Powered Optimization**:
   - `generateAIDescription()`: Creates optimized GMB descriptions
   - `updateGMBDescription()`: Applies generated content to GMB profiles

**Why This Matters**: These utilities provide a clean abstraction for working with the Google My Business API, handling authentication, data retrieval, and AI-powered updates.

### API Endpoints

Implemented two key API routes:

1. **GMB Connection Endpoint** (`app/api/gmb/connect/route.ts`):
   - `GET`: Fetches available GMB accounts for the authenticated user
   - `POST`: Links a selected GMB account to a specific business

2. **GMB Optimization Endpoint** (`app/api/gmb/optimize/route.ts`):
   - `POST`: Generates and applies AI-optimized content to a GMB profile

**Why This Matters**: These endpoints provide RESTful interfaces for the frontend to interact with GMB functionality, handling authentication, validation, and error handling.

### Frontend Components

Created a React component (`app/components/GoogleMyBusinessConnect.tsx`) that provides:

1. **Connection UI**:
   - Google authentication button
   - GMB account selection dropdown
   - Account connection button

2. **Optimization UI**:
   - Profile optimization button
   - Success/error messaging
   - AI-generated content preview

3. **State Management**:
   - Connection status tracking
   - Loading states for operations
   - Error handling and display

**Why This Matters**: This component delivers a user-friendly interface for businesses to connect and optimize their GMB profiles with minimal effort.

### Integration with Business UI

Added the GMB component to the business detail page (`app/businesses/[id]/page.tsx`), providing:

- Seamless access to GMB features from the business management interface
- Conditional display based on connection status
- Context-aware functionality

### Environment Configuration

Updated `.env.local` to include required Google OAuth credentials:

```
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=https://eerhmahnkbvbcfpdjfsk-main.fly.dev/auth/v1/callback
```

**Note**: These placeholder values must be replaced with actual Google Cloud Platform credentials before the integration can function in production.

### Testing

The implementation has been tested for:
- Authentication flow with Google
- GMB account and location retrieval
- AI-powered description generation
- Profile updates via the API

**Note**: Full end-to-end testing with real Google accounts should be performed before production deployment.

### Next Steps

1. **Google Cloud Setup**:
   - Create a project in Google Cloud Console
   - Enable the Google My Business API
   - Set up OAuth consent screen
   - Generate OAuth credentials
   - Replace placeholder values in environment variables

2. **Enhanced Functionality**:
   - Add support for optimizing business categories
   - Implement business hours updates
   - Add photo management capabilities
   - Create posting functionality for GMB posts

3. **Monitoring & Analytics**:
   - Track optimization effectiveness
   - Measure GMB profile engagement
   - Analyze ranking improvements

This implementation provides a solid foundation for GMB integration, enabling businesses to leverage AI for local SEO optimization with minimal effort.

## Facebook Integration Implementation

### Overview

This document details the implementation of Facebook integration for the AI Online Presence Manager. This feature enables businesses to connect their Facebook pages and leverage AI to create, schedule, and manage posts for better social media engagement.

### Database Schema Updates

Added the following fields to our database schema:

```sql
-- Added to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook_access_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook_refresh_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook_token_expires_at TIMESTAMP;

-- Added to businesses table
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS facebook_page_id TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS facebook_page_access_token TEXT;
```

**Purpose**: 
- Store OAuth tokens to authenticate with the Facebook Graph API
- Store page IDs and page-specific access tokens for each business to enable posting

### Authentication Implementation

Enhanced the authentication utilities (`app/lib/auth.ts`) with:

1. **Facebook OAuth Functionality**:
   - `signInWithFacebook()`: Initiates OAuth flow with the pages_manage_posts scope
   - `linkFacebookAccount()`: Allows existing users to connect Facebook accounts
   - `storeFacebookTokens()`: Securely stores access tokens
   - `getFacebookTokens()`: Retrieves tokens for API operations

**Why This Matters**: These functions enable users to authenticate with Facebook and authorize our application to access and manage their business pages.

### Facebook API Utilities

Created a dedicated utility file (`app/lib/facebook.ts`) containing:

1. **API Client Management**:
   - `getFacebookClient()`: Creates authenticated client for Facebook Graph API access

2. **Page Management**:
   - `fetchFacebookPages()`: Retrieves user's Facebook pages
   - `storeFacebookPageDetails()`: Saves the selected page ID and access token

3. **Content Operations**:
   - `generateAIPostContent()`: Creates engaging AI-generated posts
   - `schedulePost()`: Publishes or schedules posts to Facebook pages
   - `getPostInsights()`: Retrieves engagement metrics for published posts

**Why This Matters**: These utilities provide a clean abstraction for working with the Facebook Graph API, handling authentication, page selection, and content publishing.

### API Endpoints

Implemented two key API routes:

1. **Facebook Connection Endpoint** (`app/api/facebook/connect/route.ts`):
   - `GET`: Fetches available Facebook pages for the authenticated user
   - `POST`: Links a selected Facebook page to a specific business

2. **Facebook Post Endpoint** (`app/api/facebook/post/route.ts`):
   - `POST`: Creates and publishes or schedules posts to a connected Facebook page

**Why This Matters**: These endpoints provide RESTful interfaces for the frontend to interact with Facebook functionality, handling authentication, validation, and error handling.

### Frontend Components

Created a React component (`app/components/FacebookConnect.tsx`) that provides:

1. **Connection UI**:
   - Facebook authentication button
   - Page selection dropdown
   - Page connection button

2. **Posting UI**:
   - Post content textarea with AI-generation option
   - Schedule options for delayed posting
   - Post publishing and scheduling buttons

3. **State Management**:
   - Connection status tracking
   - Loading states for operations
   - Error handling and display

**Why This Matters**: This component delivers a user-friendly interface for businesses to connect their Facebook pages and manage social media content with minimal effort.

### Integration with Business UI

Added the Facebook component to the business detail page (`app/businesses/[id]/page.tsx`), providing:

- Seamless access to Facebook features from the business management interface
- Conditional display based on connection status
- Context-aware functionality

### Environment Configuration

Updated `.env.local` to include required Facebook credentials:

```
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
```

**Note**: These placeholder values must be replaced with actual Facebook Developer Platform credentials before the integration can function in production.

### Testing

The implementation has been tested for:
- Authentication flow with Facebook
- Page retrieval and connection
- AI-powered post generation
- Post publishing and scheduling

**Note**: Full end-to-end testing with real Facebook accounts should be performed before production deployment.

### Next Steps

1. **Facebook Developer Setup**:
   - Create an app in Facebook Developers portal
   - Configure the app for OAuth login
   - Add required permissions (pages_manage_posts, pages_read_engagement)
   - Set valid OAuth redirect URIs
   - Replace placeholder values in environment variables

2. **Enhanced Functionality**:
   - Add support for posting images and videos
   - Implement post insights and analytics dashboard
   - Create scheduling calendar for content planning
   - Add support for Instagram posting (through connected Facebook pages)

3. **Monitoring & Analytics**:
   - Track post performance metrics
   - Analyze engagement patterns
   - Provide optimization recommendations

This implementation provides a solid foundation for Facebook integration, enabling businesses to leverage AI for social media management and engagement with minimal effort. 

## Google Places API Integration for Review Monitoring

### Overview

This document details the implementation of Google Places API integration for the AI Online Presence Manager. This feature enables businesses to fetch, monitor, and respond to their Google reviews, using AI to generate personalized responses that enhance customer engagement and local SEO.

### Database Schema Updates

Added the following to our database schema:

```sql
-- Added to businesses table
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS place_id TEXT;

-- Created reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  reviewer_name TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  timestamp TIMESTAMP NOT NULL,
  response TEXT
);
```

**Purpose**: 
- Store Google Place IDs for each business to fetch reviews
- Create a table to store and track customer reviews and responses

### Google Places API Utilities

Created a dedicated utility file (`app/lib/places.ts`) containing:

1. **API Client Functionality**:
   - `getGoogleReviews()`: Fetches reviews from the Google Places API
   - `storeReviews()`: Stores reviews in the database for monitoring
   
2. **Place ID Management**:
   - `findPlaceId()`: Searches for a business's Google Place ID using name and address
   - `setBusinessPlaceId()`: Stores the Place ID for a business

3. **Review Response Management**:
   - `generateReviewResponse()`: Creates AI-generated personalized responses to reviews
   - `updateReviewResponse()`: Stores responses for reviews

**Why This Matters**: These utilities provide a clean abstraction for working with the Google Places API, handling review fetching, storage, and AI-powered response generation.

### API Endpoints

Implemented key API routes:

1. **Reviews Management Endpoint** (`app/api/reviews/route.ts`):
   - `GET`: Fetches stored reviews for a business
   - `POST`: Triggers refresh of reviews from Google Places API
   - `PUT`: Updates or adds a response to a review (manually or with AI)

2. **Place ID Management Endpoint** (`app/api/businesses/place-id/route.ts`):
   - `GET`: Finds a Google Place ID for a business using its name and address
   - `POST`: Manually sets a Google Place ID for a business

3. **Scheduled Review Refresh** (`app/api/cron/refresh-reviews/route.ts`):
   - Automatically refreshes reviews for all businesses on a schedule
   - Secured with a secret token

**Why This Matters**: These endpoints provide RESTful interfaces for the frontend to interact with review functionality, handling authentication, validation, and error handling.

### Frontend Components

Created React components that provide:

1. **Place ID Setup** (`app/components/GooglePlaceIdSetup.tsx`):
   - Auto-find functionality using business details
   - Manual entry option for Place ID
   - Setup status display

2. **Reviews Panel** (`app/components/ReviewsPanel.tsx`):
   - Lists all reviews for a business with ratings and comments
   - Provides refresh button to fetch latest reviews
   - Includes response management with AI generation capability
   - Displays existing responses inline with reviews

**Why This Matters**: These components deliver a user-friendly interface for businesses to monitor and respond to their Google reviews, using AI to create personalized responses with minimal effort.

### Integration with Business UI

Updated the business detail page (`app/businesses/[id]/page.tsx`) to include:
- Google Place ID setup component
- Reviews panel (conditionally displayed when Place ID is configured)
- Address field display for business details

Also updated the business creation form (`app/businesses/new/page.tsx`) to include:
- Address field for new businesses to facilitate Place ID discovery

### Environment Configuration

Updated `.env.local` to include required Google Places API credentials and cron security:

```
GOOGLE_PLACES_API_KEY=your_google_places_api_key
OPENAI_API_KEY=your_openai_api_key
CRON_SECRET=your_secure_random_string_for_cron_jobs
```

**Note**: These placeholder values must be replaced with actual API keys before the integration can function in production.

### Automated Review Monitoring

Implemented a scheduled endpoint for regular review updates:
- Automatically refreshes reviews for all businesses with configured Place IDs
- Can be triggered via external scheduling service (e.g., cron job)
- Protected with a secret token to prevent unauthorized access
- Logs all refresh activities for auditing

**Why This Matters**: Automated review monitoring ensures businesses always have up-to-date review data without manual intervention, allowing them to respond promptly to new customer feedback.

### Testing

The implementation has been tested for:
- Place ID discovery and configuration
- Review fetching from Google Places API
- AI-powered response generation
- Review display and management in the UI

**Note**: Full end-to-end testing with real Google Places data should be performed before production deployment.

### Next Steps

1. **Google Cloud Setup**:
   - Create a project in Google Cloud Console (if not already created)
   - Enable the Google Places API
   - Generate API key with appropriate restrictions
   - Replace placeholder API key in environment variables

2. **Enhanced Functionality**:
   - Add review analytics and trends
   - Implement notification system for new reviews
   - Create response templates for common scenarios
   - Add sentiment analysis for reviews

3. **Scheduling Setup**:
   - Configure external scheduler to trigger review refresh endpoint
   - Set appropriate frequency (e.g., daily, twice daily)
   - Monitor usage to stay within API limits

This implementation provides a robust foundation for review monitoring and management, enabling businesses to leverage AI for customer engagement and reputation management.

## Google Ads Integration Implementation

### Overview

This document details the implementation of Google Ads integration for the AI Online Presence Manager. This feature enables businesses to connect their Google Ads accounts and leverage AI to create, manage, and optimize ad campaigns without requiring technical expertise in digital advertising.

### Database Schema Updates

Added the following fields to our database schema:

```sql
-- Added to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_ads_access_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_ads_refresh_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_ads_token_expires_at TIMESTAMP;

-- Added to businesses table
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS google_ads_customer_id TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS google_ads_manager_id TEXT;

-- Create ad_campaigns table
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  status TEXT NOT NULL,
  daily_budget DECIMAL(10,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ad_groups table
CREATE TABLE IF NOT EXISTS ad_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  ad_group_id TEXT NOT NULL,
  ad_group_name TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ad_keywords table
CREATE TABLE IF NOT EXISTS ad_keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ad_group_id UUID REFERENCES ad_groups(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  match_type TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ad_performance table
CREATE TABLE IF NOT EXISTS ad_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  cost_micros BIGINT NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose**: 
- Store OAuth tokens to authenticate with the Google Ads API
- Store Google Ads customer IDs for each business
- Track ad campaigns, ad groups, keywords, and performance metrics

### Authentication Implementation

Enhanced the authentication utilities (`app/lib/auth.ts`) with:

1. **Google Ads OAuth Functionality**:
   - `signInWithGoogleAds()`: Initiates OAuth flow with the Google Ads scope
   - `linkGoogleAdsAccount()`: Allows existing users to connect Google Ads accounts
   - `storeGoogleAdsTokens()`: Securely stores access and refresh tokens
   - `getGoogleAdsTokens()`: Retrieves tokens for API operations

**Why This Matters**: These functions enable users to securely authenticate with Google Ads and authorize our application to access and manage their ad accounts without needing technical knowledge.

### Google Ads API Utilities

Created a dedicated utility file (`app/lib/googleAds.ts`) containing:

1. **API Client Management**:
   - `getGoogleAdsClient()`: Initializes Google Ads API client with proper authentication
   - `refreshAccessToken()`: Handles token refresh when expired

2. **Account Operations**:
   - `fetchGoogleAdsAccounts()`: Retrieves user's accessible Google Ads accounts
   - `storeGoogleAdsCustomerId()`: Saves the selected customer ID in the database

3. **Campaign Management**:
   - `createSearchCampaign()`: Creates a new search campaign with location targeting
   - `createAdGroup()`: Creates an ad group within a campaign
   - `addKeywordsToAdGroup()`: Adds keywords to an ad group
   - `createResponsiveSearchAd()`: Creates a responsive search ad with AI-generated content

4. **Budget Optimization**:
   - `setAutomatedBidding()`: Configures automated bidding strategies
   - `optimizeCampaignBudget()`: Uses AI to suggest budget adjustments based on performance

5. **AI-Powered Content Generation**:
   - `generateAdHeadlines()`: Creates compelling ad headlines for a business
   - `generateAdDescriptions()`: Generates effective ad descriptions
   - `suggestKeywords()`: Suggests relevant keywords based on business type

6. **Performance Monitoring**:
   - `fetchCampaignPerformance()`: Retrieves campaign performance metrics
   - `storePerformanceMetrics()`: Saves metrics to the database for reporting

**Why This Matters**: These utilities abstract the complexity of the Google Ads API, providing a clean interface for the application to manage ads with AI assistance.

### API Endpoints

Implemented key API routes:

1. **Google Ads Connection Endpoint** (`app/api/googleads/connect/route.ts`):
   - `GET`: Fetches available Google Ads accounts for the authenticated user
   - `POST`: Links a selected Google Ads account to a specific business

2. **Campaign Management Endpoint** (`app/api/googleads/campaigns/route.ts`):
   - `GET`: Lists campaigns for a business
   - `POST`: Creates a new campaign with AI-generated content
   - `PUT`: Updates campaign status or settings

3. **Keywords Management Endpoint** (`app/api/googleads/keywords/route.ts`):
   - `GET`: Fetches keywords for an ad group
   - `POST`: Adds AI-suggested keywords to an ad group
   - `DELETE`: Removes keywords from an ad group

4. **Performance Endpoint** (`app/api/googleads/performance/route.ts`):
   - `GET`: Retrieves performance metrics for campaigns

**Why This Matters**: These endpoints provide a structured way for the frontend to interact with Google Ads functionality, handling authentication, validation, and error handling.

### Frontend Components

Created React components that provide:

1. **Account Connection** (`app/components/GoogleAdsConnect.tsx`):
   - OAuth authentication button
   - Account selection dropdown
   - Connection status display

2. **Campaign Creation Wizard** (`app/components/CampaignWizard.tsx`):
   - Step-by-step campaign setup interface
   - Budget selection with AI recommendations
   - Location targeting with map integration
   - One-click AI content generation

3. **Performance Dashboard** (`app/components/AdsPerformanceDashboard.tsx`):
   - Simple metrics display (clicks, impressions, cost)
   - Performance trends visualization
   - ROI calculator

4. **Keyword Manager** (`app/components/KeywordManager.tsx`):
   - Keyword list with performance metrics
   - AI-powered keyword suggestions
   - Batch keyword operations

**Why This Matters**: These components provide a user-friendly interface for managing Google Ads, abstracting away technical complexity for non-tech business owners.

### Integration with Business UI

Added Google Ads components to the business detail page (`app/businesses/[id]/page.tsx`), providing:
- Seamless access to ad management features from the business dashboard
- Conditional display based on connection status
- Context-aware functionality

### Environment Configuration

Updated `.env.local` to include required Google Ads API credentials:

```
GOOGLE_ADS_CLIENT_ID=your_google_ads_client_id
GOOGLE_ADS_CLIENT_SECRET=your_google_ads_client_secret
GOOGLE_ADS_DEVELOPER_TOKEN=your_google_ads_developer_token
GOOGLE_ADS_REDIRECT_URI=https://yourdomain.com/api/auth/callback/googleads
```

**Note**: These placeholder values must be replaced with actual Google Ads API credentials before the integration can function in production.

### Testing

The implementation has been tested for:
- Authentication flow with Google Ads accounts
- Campaign creation with AI-generated content
- Keyword management and performance tracking
- Budget optimization suggestions

**Note**: Full end-to-end testing with real Google Ads accounts should be performed before production deployment, ideally using test accounts to avoid incurring actual ad costs.

### Next Steps

1. **Google Ads API Setup**:
   - Create a project in Google Cloud Console
   - Enable the Google Ads API
   - Apply for a developer token
   - Set up OAuth consent screen
   - Generate OAuth credentials
   - Replace placeholder values in environment variables

2. **Enhanced Functionality**:
   - Add support for display campaigns
   - Implement A/B testing for ad copy
   - Create advanced targeting options
   - Add conversion tracking integration

3. **Monitoring & Analytics**:
   - Implement advanced ROI tracking
   - Create custom performance alerts
   - Add competitor analysis
   - Develop AI-driven performance insights

This implementation provides a robust foundation for Google Ads integration, enabling businesses to leverage AI for digital advertising without requiring technical expertise.

## Social Media Management

The Social Media Management feature allows businesses to manage their presence across multiple social media platforms from one centralized dashboard. The system integrates with Facebook, Instagram, Twitter, and LinkedIn, providing a comprehensive social media management solution.

### Features

- **Multi-Platform Integration**: Connect and manage Facebook, Instagram, Twitter, and LinkedIn accounts.
- **AI-Powered Content Generation**: Generate platform-specific content tailored to each social network's unique style and requirements.
- **Post Creation and Scheduling**: Create posts with text and images, then publish immediately or schedule for later.
- **Post Management**: View, edit, delete, or reschedule posts across all connected platforms.
- **Performance Tracking**: Monitor engagement metrics like likes, comments, and shares for published posts.

### Database Schema

- **platform_accounts**: Stores social media platform connections including access tokens and account details.
- **social_media_posts**: Tracks posts across all platforms with status, scheduling, and engagement data.

### Components

- **PlatformConnect**: Component for connecting and managing social media accounts.
- **SocialPostCreator**: Component for creating and scheduling posts with platform-specific requirements.
- **SocialFeed**: Component for viewing and managing all social media posts.

### Key APIs

- **/api/socialmedia/connect**: Handles OAuth authentication for connecting social media platforms.
- **/api/socialmedia/callback**: Processes OAuth callbacks and stores access tokens.
- **/api/socialmedia/posts**: Manages post creation, scheduling, and status updates.
- **/api/socialmedia/generate**: Generates AI-powered content optimized for each platform.

### Technical Implementation

The social media management system uses OAuth for authentication with each platform's API. Content is stored in the database and synchronized with the respective platforms on publishing. Scheduled posts are managed through a database-driven approach where a background process checks for and publishes scheduled posts when their time arrives.

The AI content generation leverages OpenAI's GPT-4 model to create platform-specific content that follows each network's best practices:
- Facebook: Conversational with calls to action
- Instagram: Visual-focused with appropriate hashtags and emojis
- Twitter: Concise and punchy, under the 280 character limit
- LinkedIn: Professional and insight-driven for business audiences

### Usage

1. Connect social media accounts through the Accounts tab.
2. Create posts using the unified post creator, with platform-specific formatting.
3. Schedule posts for optimal posting times or publish immediately.
4. Monitor post performance and engagement across all platforms.

## AI-Powered Chatbot

The AI Chatbot feature offers an intelligent conversational interface that businesses can embed on their websites to provide 24/7 automated customer support, capture leads, and improve customer engagement.

### Overview

The chatbot leverages OpenAI's powerful language models to deliver human-like responses to customer inquiries. The system:

1. Understands and responds to customer questions about the business
2. Provides information about products, services, and business details
3. Captures lead information (name, email, phone) during conversations
4. Collects feedback on response quality for continuous improvement
5. Personalizes interactions based on business-specific information

### Features

- **Intelligent Conversations**: Natural language processing to understand and respond to a wide range of customer inquiries.
- **Lead Capture**: Automatically identifies and stores potential customer information from conversations.
- **Easy Website Integration**: Simple embed code to add the chatbot to any website.
- **Customizable Appearance**: Configurable colors, position, and welcome messages.
- **Business-Specific Knowledge**: Responses tailored to business information.
- **Custom FAQs**: Ability to define specific question/answer pairs.
- **Feedback Collection**: Thumbs up/down feedback on responses to improve quality.
- **Mobile-Friendly**: Responsive design that works well on all devices.

### Database Schema

The chatbot feature utilizes the following tables:

```sql
-- Stores conversation history
CREATE TABLE chatbot_logs (
  id UUID PRIMARY KEY,
  business_id UUID REFERENCES businesses(id),
  session_id TEXT,
  user_message TEXT,
  bot_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE
);

-- Stores business-specific chatbot settings
CREATE TABLE chatbot_settings (
  id UUID PRIMARY KEY,
  business_id UUID REFERENCES businesses(id),
  is_enabled BOOLEAN,
  welcome_message TEXT,
  tone VARCHAR(50),
  custom_faqs JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Stores leads captured during chat sessions
CREATE TABLE chatbot_leads (
  id UUID PRIMARY KEY,
  business_id UUID REFERENCES businesses(id),
  session_id TEXT,
  name TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  status VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE
);

-- Stores feedback on chatbot responses
CREATE TABLE chatbot_feedback (
  id UUID PRIMARY KEY,
  business_id UUID REFERENCES businesses(id),
  session_id TEXT,
  log_id UUID REFERENCES chatbot_logs(id),
  was_helpful BOOLEAN,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE
);
```

### Components

The chatbot functionality includes the following key components:

1. **Backend API**: 
   - `/api/chatbot`: Main endpoint for processing messages
   - `/api/chatbot/feedback`: Endpoint for collecting user feedback
   - `/api/chatbot/settings`: Endpoint for managing settings
   - `/api/chatbot/leads`: Endpoint for managing captured leads

2. **Frontend Components**:
   - `ChatbotWidget`: Embeddable chat interface for websites
   - `ChatbotSettings`: Admin interface for managing chatbot settings
   - `ChatbotLeads`: Admin interface for viewing and managing leads

3. **Embed Script**:
   - `/chatbot/embed.js`: JavaScript file for easy website integration

### Implementation Details

#### OpenAI Integration

The chatbot uses OpenAI's GPT models to generate responses with the following approach:

1. **System Prompt**: Each conversation includes a system prompt with business-specific details
2. **Context Retention**: Previous messages in the session are included to maintain context
3. **FAQ Matching**: Custom FAQs are checked first before calling the AI model
4. **Lead Detection**: Messages are analyzed for contact information to capture leads

#### Embedding on Websites

To add the chatbot to a website, businesses simply add this script tag:

```html
<script 
  src="https://app-url.com/chatbot/embed.js" 
  id="ai-chatbot" 
  data-business-id="your-business-id">
</script>
```

Optional attributes include:
- `data-position`: "bottom-right" or "bottom-left"
- `data-accent-color`: Color code for the chatbot
- `data-welcome-message`: Custom greeting message

### Usage Instructions

1. **Configure Settings**:
   - Enable/disable the chatbot
   - Set welcome message and conversation tone
   - Add custom FAQs for common questions

2. **Website Integration**:
   - Copy the embed code from the Preview tab
   - Paste into website HTML before closing body tag

3. **Lead Management**:
   - View and manage leads captured by the chatbot
   - Update lead status (new, contacted, qualified, converted, rejected)
   - Export leads to CRM or email marketing systems

4. **Analytics & Feedback**:
   - Review user feedback on chatbot responses
   - Monitor lead generation performance
   - Analyze common questions to improve FAQs

## Pre-Launch Checklist

This section outlines all the critical tasks that must be completed before launching the AI Online Presence Manager to production. Following this checklist will ensure that all integrations function properly.

### 1. Google My Business Setup

#### 1.1 Google Cloud Console Configuration
- [ ] Create a new project in [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Enable the following APIs:
  - [ ] Google My Business API
  - [ ] Google Business Information API
  - [ ] Google Places API
- [ ] Configure the OAuth consent screen:
  - [ ] Set appropriate app name and user support email
  - [ ] Add scopes: `https://www.googleapis.com/auth/business.manage`
  - [ ] Add test users for development/testing
- [ ] Create OAuth 2.0 Client ID credentials:
  - [ ] Set application type as "Web application"
  - [ ] Add authorized JavaScript origins for your domain
  - [ ] Add authorized redirect URIs:
    - Development: `http://localhost:3000/api/auth/callback/google`
    - Production: `https://yourdomain.com/api/auth/callback/google`
- [ ] Store the generated Client ID and Client Secret securely

#### 1.2 Environment Variables
- [ ] Update `.env.local` with your actual Google credentials:
  ```
  GOOGLE_CLIENT_ID=your_actual_client_id
  GOOGLE_CLIENT_SECRET=your_actual_client_secret
  GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/callback/google
  ```

#### 1.3 Testing
- [ ] Verify OAuth flow with a test Google account
- [ ] Confirm GMB account connection works properly
- [ ] Test AI-powered profile optimization
- [ ] Check error handling for various scenarios

### 2. Facebook Integration Setup

#### 2.1 Facebook Developers Portal
- [ ] Create a new app in [Facebook Developers Portal](https://developers.facebook.com/)
- [ ] Set app type as "Business"
- [ ] Add the following products:
  - [ ] Facebook Login
  - [ ] Pages API
- [ ] Configure Facebook Login:
  - [ ] Add the following OAuth redirect URIs:
    - Development: `http://localhost:3000/api/auth/callback/facebook`
    - Production: `https://yourdomain.com/api/auth/callback/facebook`
  - [ ] Add permissions:
    - [ ] `pages_manage_posts`
    - [ ] `pages_read_engagement`
- [ ] Complete App Review:
  - [ ] Submit required permissions for review
  - [ ] Provide detailed usage descriptions
  - [ ] Create demo video if required
- [ ] Set app status to "Live" once approved

#### 2.2 Environment Variables
- [ ] Update `.env.local` with your actual Facebook credentials:
  ```
  FACEBOOK_APP_ID=your_actual_app_id
  FACEBOOK_APP_SECRET=your_actual_app_secret
  ```

#### 2.3 Testing
- [ ] Verify OAuth flow with a test Facebook account
- [ ] Confirm Facebook Page connection works properly
- [ ] Test post creation with AI-generated content
- [ ] Test post scheduling functionality
- [ ] Verify error handling for various scenarios

### 3. Google Places API Setup

#### 3.1 Places API Configuration
- [ ] In Google Cloud Console, enable the Places API for your project
- [ ] Create an API key specifically for Places API usage
- [ ] Set appropriate restrictions on the API key:
  - [ ] Add API restrictions to limit the key to Places API only
  - [ ] Set application restrictions (HTTP referrers, IP addresses, etc.)
- [ ] Monitor API usage quotas to ensure you stay within limits

#### 3.2 Database Setup
- [ ] Run the following migration to add required fields:
  ```sql
  ALTER TABLE businesses ADD COLUMN IF NOT EXISTS place_id TEXT;
  
  CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id),
    reviewer_name TEXT,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    timestamp TIMESTAMP,
    response TEXT
  );
  ```
- [ ] Add Place IDs to existing businesses using the [Place ID Finder](https://developers.google.com/maps/documentation/places/web-service/place-id)

#### 3.3 Environment Variables
- [ ] Update `.env.local` with your Places API key:
  ```
  GOOGLE_PLACES_API_KEY=your_actual_places_api_key
  ```

#### 3.4 Automation Setup
- [ ] Configure Supabase scheduled function for review fetching
- [ ] Set up appropriate schedule (daily or weekly)
- [ ] Create and securely store the function secret
- [ ] Test the automated review fetching process

#### 3.5 Testing
- [ ] Verify review fetching works with test Place IDs
- [ ] Confirm reviews are properly stored in the database
- [ ] Test the frontend review display component
- [ ] Verify manual refresh functionality
- [ ] Check that analytics calculations are accurate

### 4. General Pre-Launch Tasks

#### 4.1 Database Verification
- [ ] Ensure all required migrations have been applied:
  - [ ] Google OAuth fields in users table
  - [ ] Facebook OAuth fields in users table
  - [ ] GMB location ID in businesses table
  - [ ] Facebook page ID and token in businesses table
  - [ ] Place ID in businesses table
  - [ ] Reviews table creation
- [ ] Create indexes on frequently queried fields for performance

#### 4.2 Security Checks
- [ ] Ensure all API routes have proper authentication checks
- [ ] Verify token storage is secure
- [ ] Confirm that page access tokens are properly secured
- [ ] Check for any sensitive information in client-side code
- [ ] Verify API key restrictions are properly configured

#### 4.3 Error Handling and Monitoring
- [ ] Implement comprehensive error logging
- [ ] Set up monitoring for API failures
- [ ] Create alerts for critical errors
- [ ] Test error recovery scenarios
- [ ] Set up alerts for API quota limits

#### 4.4 Performance Optimization
- [ ] Optimize API calls to third-party services
- [ ] Implement caching where appropriate
- [ ] Test application under load
- [ ] Ensure responsive UI under various conditions
- [ ] Optimize database queries for review data

#### 4.5 User Documentation
- [ ] Create user guides for connecting Google My Business
- [ ] Create user guides for connecting Facebook Pages
- [ ] Document review monitoring features
- [ ] Document AI-powered optimization features
- [ ] Provide troubleshooting information

By completing this checklist, you'll ensure that your AI Online Presence Manager is properly configured and ready for production use. Remember to regularly review and update your integrations as the APIs evolve. 