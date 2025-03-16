import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/supabase';
import { storeFacebookTokens } from '@/app/lib/auth';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    // Get the code from the Facebook OAuth redirect
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    
    // Handle any errors from Facebook
    if (error) {
      console.error('Facebook OAuth error:', error);
      return NextResponse.redirect(`${request.nextUrl.origin}/login?error=facebook_oauth_error`);
    }
    
    // Check if code is present
    if (!code) {
      console.error('No code provided in Facebook OAuth callback');
      return NextResponse.redirect(`${request.nextUrl.origin}/login?error=no_code`);
    }
    
    // Exchange the code for an access token
    const tokenResponse = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: {
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        redirect_uri: `${request.nextUrl.origin}/api/auth/callback/facebook`,
        code
      }
    });
    
    if (!tokenResponse.data.access_token) {
      console.error('No access token received from Facebook');
      return NextResponse.redirect(`${request.nextUrl.origin}/login?error=no_access_token`);
    }
    
    const accessToken = tokenResponse.data.access_token;
    const expiresIn = tokenResponse.data.expires_in || 3600;
    
    // Get the user's session from Supabase
    const supabase = createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error('No Supabase session found');
      return NextResponse.redirect(`${request.nextUrl.origin}/login?error=no_session`);
    }
    
    // Store the tokens in the database
    const expiryDate = new Date(Date.now() + expiresIn * 1000);
    
    await storeFacebookTokens(
      session.user.id,
      accessToken,
      '', // Facebook doesn't provide refresh tokens in the same way as Google
      expiryDate
    );
    
    // Redirect to the dashboard or the specified redirect URI
    const redirectTo = searchParams.get('state') || '/dashboard';
    return NextResponse.redirect(`${request.nextUrl.origin}${redirectTo}`);
  } catch (error) {
    console.error('Error handling Facebook OAuth callback:', error);
    return NextResponse.redirect(`${request.nextUrl.origin}/login?error=oauth_callback_error`);
  }
} 