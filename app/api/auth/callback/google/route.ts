import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/supabase';
import { storeGoogleTokens } from '@/app/lib/auth';
import { getOAuthClient } from '@/app/lib/gmb';

export async function GET(request: NextRequest) {
  try {
    // Get the code from the Google OAuth redirect
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    
    // Handle any errors from Google
    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.redirect(`${request.nextUrl.origin}/login?error=google_oauth_error`);
    }
    
    // Check if code is present
    if (!code) {
      console.error('No code provided in Google OAuth callback');
      return NextResponse.redirect(`${request.nextUrl.origin}/login?error=no_code`);
    }
    
    // Get the OAuth client
    const oauth2Client = getOAuthClient();
    
    // Exchange the code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    console.log('Received tokens from Google:', tokens);
    
    if (!tokens.access_token) {
      console.error('No access token received from Google');
      return NextResponse.redirect(`${request.nextUrl.origin}/login?error=no_access_token`);
    }
    
    // Get the user's session from Supabase
    const supabase = createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error('No Supabase session found');
      return NextResponse.redirect(`${request.nextUrl.origin}/login?error=no_session`);
    }
    
    // Store the tokens in the database
    const expiryDate = tokens.expiry_date 
      ? new Date(tokens.expiry_date) 
      : new Date(Date.now() + (tokens.expires_in || 3600) * 1000);
    
    await storeGoogleTokens(
      session.user.id,
      tokens.access_token,
      tokens.refresh_token || '',
      expiryDate
    );
    
    // Redirect to the dashboard or the specified redirect URI
    const redirectTo = searchParams.get('state') || '/dashboard';
    return NextResponse.redirect(`${request.nextUrl.origin}${redirectTo}`);
  } catch (error) {
    console.error('Error handling Google OAuth callback:', error);
    return NextResponse.redirect(`${request.nextUrl.origin}/login?error=oauth_callback_error`);
  }
} 