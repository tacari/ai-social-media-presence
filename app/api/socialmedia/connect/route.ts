import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/supabase';
import { getSession } from '@/app/lib/auth';
import { storePlatformAccount } from '@/app/lib/socialMedia';
import axios from 'axios';

// Generate authorization URLs for different platforms
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    const businessId = searchParams.get('businessId');
    
    if (!platform || !businessId) {
      return NextResponse.json(
        { error: 'Missing platform or business ID parameters' },
        { status: 400 }
      );
    }
    
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/socialmedia/callback`;
    
    // Store state for OAuth flow
    const state = Buffer.from(
      JSON.stringify({
        userId: session.user.id,
        businessId,
        platform,
      })
    ).toString('base64');
    
    let authUrl = '';
    
    switch (platform) {
      case 'facebook':
        authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${
          process.env.FACEBOOK_APP_ID
        }&redirect_uri=${encodeURIComponent(
          redirectUri
        )}&state=${state}&scope=pages_show_list,pages_read_engagement,pages_manage_posts,pages_manage_metadata`;
        break;
        
      case 'instagram':
        authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${
          process.env.FACEBOOK_APP_ID
        }&redirect_uri=${encodeURIComponent(
          redirectUri
        )}&state=${state}&scope=instagram_basic,instagram_content_publish,pages_show_list`;
        break;
        
      case 'twitter':
        // Using Twitter OAuth 2.0
        authUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${
          process.env.TWITTER_CLIENT_ID
        }&redirect_uri=${encodeURIComponent(
          redirectUri
        )}&scope=tweet.read+tweet.write+users.read&state=${state}`;
        break;
        
      case 'linkedin':
        authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${
          process.env.LINKEDIN_CLIENT_ID
        }&redirect_uri=${encodeURIComponent(
          redirectUri
        )}&state=${state}&scope=r_organization_social+w_organization_social+rw_organization_admin`;
        break;
        
      default:
        return NextResponse.json(
          { error: 'Unsupported platform' },
          { status: 400 }
        );
    }
    
    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate authorization URL' },
      { status: 500 }
    );
  }
}

// Extract accounts from different platforms after OAuth
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const data = await request.json();
    const { platform, businessId, accountId } = data;
    
    if (!platform || !businessId || !accountId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    const supabase = createServerClient();
    
    // Get the business to make sure the user has access
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();
    
    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found or access denied' },
        { status: 403 }
      );
    }
    
    // Get the existing platform account
    const { data: account } = await supabase
      .from('platform_accounts')
      .select('*')
      .eq('id', accountId)
      .single();
    
    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }
    
    // Return the account details
    return NextResponse.json({ account });
  } catch (error) {
    console.error('Error processing platform connection:', error);
    return NextResponse.json(
      { error: 'Failed to process platform connection' },
      { status: 500 }
    );
  }
} 