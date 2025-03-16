import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/supabase';
import { getSession } from '@/app/lib/auth';
import { storePlatformAccount } from '@/app/lib/socialMedia';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const stateParam = searchParams.get('state');
    const error = searchParams.get('error');
    
    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/social-connect-error?error=${error}`);
    }
    
    if (!code || !stateParam) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/social-connect-error?error=missing_params`);
    }
    
    // Decode state containing user and business info
    let state;
    try {
      state = JSON.parse(Buffer.from(stateParam, 'base64').toString());
    } catch (e) {
      console.error('Error decoding state:', e);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/social-connect-error?error=invalid_state`);
    }
    
    const { userId, businessId, platform } = state;
    
    if (!userId || !businessId || !platform) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/social-connect-error?error=invalid_state_data`);
    }
    
    // Verify user session
    const session = await getSession();
    if (!session || session.user.id !== userId) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/social-connect-error?error=unauthorized`);
    }
    
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/socialmedia/callback`;
    
    // Process tokens based on platform
    switch (platform) {
      case 'facebook':
        await handleFacebookCallback(code, redirectUri, userId, businessId);
        break;
        
      case 'instagram':
        await handleInstagramCallback(code, redirectUri, userId, businessId);
        break;
        
      case 'twitter':
        await handleTwitterCallback(code, redirectUri, userId, businessId);
        break;
        
      case 'linkedin':
        await handleLinkedInCallback(code, redirectUri, userId, businessId);
        break;
        
      default:
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/social-connect-error?error=unsupported_platform`);
    }
    
    // Redirect back to the business page after successful connection
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/businesses/${businessId}?tab=social`);
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/social-connect-error?error=server_error`);
  }
}

/**
 * Handle Facebook OAuth callback
 */
async function handleFacebookCallback(code: string, redirectUri: string, userId: string, businessId: string) {
  try {
    // Exchange code for access token
    const tokenResponse = await axios.get(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${
        process.env.FACEBOOK_APP_ID
      }&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${
        process.env.FACEBOOK_APP_SECRET
      }&code=${code}`
    );
    
    const accessToken = tokenResponse.data.access_token;
    
    // Get user's Facebook pages
    const pagesResponse = await axios.get(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`
    );
    
    const pages = pagesResponse.data.data;
    
    if (!pages || pages.length === 0) {
      throw new Error('No Facebook pages found');
    }
    
    // Store each page as a platform account
    for (const page of pages) {
      await storePlatformAccount({
        business_id: businessId,
        platform: 'facebook',
        account_id: page.id,
        account_name: page.name,
        access_token: page.access_token,
        account_image_url: `https://graph.facebook.com/${page.id}/picture?type=large`
      });
    }
  } catch (error) {
    console.error('Error handling Facebook callback:', error);
    throw error;
  }
}

/**
 * Handle Instagram OAuth callback (via Facebook)
 */
async function handleInstagramCallback(code: string, redirectUri: string, userId: string, businessId: string) {
  try {
    // Exchange code for access token
    const tokenResponse = await axios.get(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${
        process.env.FACEBOOK_APP_ID
      }&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${
        process.env.FACEBOOK_APP_SECRET
      }&code=${code}`
    );
    
    const accessToken = tokenResponse.data.access_token;
    
    // Get user's Facebook pages that have Instagram accounts
    const pagesResponse = await axios.get(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`
    );
    
    const pages = pagesResponse.data.data;
    
    if (!pages || pages.length === 0) {
      throw new Error('No Facebook pages found');
    }
    
    // For each page, check if it has an Instagram business account
    for (const page of pages) {
      try {
        const pageAccessToken = page.access_token;
        
        const igResponse = await axios.get(
          `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${pageAccessToken}`
        );
        
        if (igResponse.data.instagram_business_account) {
          const igAccountId = igResponse.data.instagram_business_account.id;
          
          // Get Instagram account details
          const igAccountResponse = await axios.get(
            `https://graph.facebook.com/v19.0/${igAccountId}?fields=username,profile_picture_url&access_token=${pageAccessToken}`
          );
          
          await storePlatformAccount({
            business_id: businessId,
            platform: 'instagram',
            account_id: igAccountId,
            account_name: page.name,
            account_username: igAccountResponse.data.username,
            account_image_url: igAccountResponse.data.profile_picture_url,
            access_token: `${igAccountId}|${pageAccessToken}`  // Store IG ID with page token
          });
        }
      } catch (pageError) {
        console.error(`Error processing Instagram account for page ${page.id}:`, pageError);
        // Continue with other pages if one fails
      }
    }
  } catch (error) {
    console.error('Error handling Instagram callback:', error);
    throw error;
  }
}

/**
 * Handle Twitter OAuth callback
 */
async function handleTwitterCallback(code: string, redirectUri: string, userId: string, businessId: string) {
  try {
    // Exchange code for access token
    const tokenResponse = await axios.post(
      'https://api.twitter.com/2/oauth2/token',
      new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: process.env.TWITTER_CLIENT_ID!,
        redirect_uri: redirectUri,
        code_verifier: 'challenge'  // In production, use actual PKCE code_verifier
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(
            `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
          ).toString('base64')}`
        }
      }
    );
    
    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    
    // Get Twitter user info
    const userResponse = await axios.get('https://api.twitter.com/2/users/me', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      },
      params: {
        'user.fields': 'profile_image_url,username,name'
      }
    });
    
    const twitterUser = userResponse.data.data;
    
    // Calculate token expiry
    const expiryDate = new Date();
    expiryDate.setSeconds(expiryDate.getSeconds() + expires_in);
    
    await storePlatformAccount({
      business_id: businessId,
      platform: 'twitter',
      account_id: twitterUser.id,
      account_name: twitterUser.name,
      account_username: twitterUser.username,
      account_image_url: twitterUser.profile_image_url,
      access_token: access_token,
      refresh_token: refresh_token,
      token_expiry: expiryDate.toISOString()
    });
  } catch (error) {
    console.error('Error handling Twitter callback:', error);
    throw error;
  }
}

/**
 * Handle LinkedIn OAuth callback
 */
async function handleLinkedInCallback(code: string, redirectUri: string, userId: string, businessId: string) {
  try {
    // Exchange code for access token
    const tokenResponse = await axios.post(
      'https://www.linkedin.com/oauth/v2/accessToken',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    
    // Get organization info
    const orgUrn = process.env.LINKEDIN_ORGANIZATION_URN;
    
    if (!orgUrn) {
      throw new Error('LinkedIn organization URN not configured');
    }
    
    const orgResponse = await axios.get(
      `https://api.linkedin.com/v2/organizations/${orgUrn}`,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      }
    );
    
    const organization = orgResponse.data;
    
    // Calculate token expiry
    const expiryDate = new Date();
    expiryDate.setSeconds(expiryDate.getSeconds() + expires_in);
    
    await storePlatformAccount({
      business_id: businessId,
      platform: 'linkedin',
      account_id: orgUrn,
      account_name: organization.localizedName,
      account_image_url: organization.logoV2?.original?.url,
      access_token: access_token,
      refresh_token: refresh_token,
      token_expiry: expiryDate.toISOString()
    });
  } catch (error) {
    console.error('Error handling LinkedIn callback:', error);
    throw error;
  }
} 