import { createServerClient, createBrowserClient } from './supabase';

// Sign up a new user
export const signUp = async (email: string, password: string) => {
  const supabase = createBrowserClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (error) throw error;
  
  // If sign-up is successful, create a user record in the users table
  if (data.user) {
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: data.user.id,
        email,
        subscription_status: 'inactive',
      });
    
    if (insertError) throw insertError;
  }
  
  return data;
};

// Sign in a user
export const signIn = async (email: string, password: string) => {
  const supabase = createBrowserClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
};

// Sign in with Google OAuth
export const signInWithGoogle = async (redirectTo?: string) => {
  const supabase = createBrowserClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: 'https://www.googleapis.com/auth/business.manage',
      redirectTo: `${window.location.origin}/api/auth/callback/google`,
      queryParams: {
        state: redirectTo || '/dashboard',
        access_type: 'offline',
        prompt: 'consent'
      }
    },
  });
  
  if (error) throw error;
  return data;
};

// Link Google account to existing user
export const linkGoogleAccount = async (redirectTo?: string) => {
  return signInWithGoogle(redirectTo);
};

// Store Google tokens in the database
export const storeGoogleTokens = async (
  userId: string, 
  accessToken: string, 
  refreshToken: string, 
  expiresAt: Date
) => {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('users')
    .update({
      google_access_token: accessToken,
      google_refresh_token: refreshToken,
      google_token_expires_at: expiresAt.toISOString(),
    })
    .eq('id', userId);
  
  if (error) throw error;
  return true;
};

// Get Google tokens for a user
export const getGoogleTokens = async (userId: string) => {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('users')
    .select('google_access_token, google_refresh_token, google_token_expires_at')
    .eq('id', userId)
    .single();
  
  if (error) throw error;
  return data;
};

// Sign out the user
export const signOut = async () => {
  const supabase = createBrowserClient();
  const { error } = await supabase.auth.signOut();
  
  if (error) throw error;
  return true;
};

// Get the current user
export const getCurrentUser = async () => {
  const supabase = createServerClient();
  const { data, error } = await supabase.auth.getUser();
  
  if (error) throw error;
  return data?.user || null;
};

// Check if the user is authenticated
export const isAuthenticated = async () => {
  const user = await getCurrentUser();
  return !!user;
};

// Get the user's session
export const getSession = async () => {
  const supabase = createServerClient();
  const { data, error } = await supabase.auth.getSession();
  
  if (error) throw error;
  return data.session;
};

// Sign in with Facebook OAuth
export const signInWithFacebook = async (redirectTo?: string) => {
  const supabase = createBrowserClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: {
      scopes: 'pages_manage_posts,pages_read_engagement',
      redirectTo: `${window.location.origin}/api/auth/callback/facebook`,
      queryParams: {
        state: redirectTo || '/dashboard',
        auth_type: 'rerequest'
      }
    },
  });
  
  if (error) throw error;
  return data;
};

// Link Facebook account to existing user
export const linkFacebookAccount = async (redirectTo?: string) => {
  return signInWithFacebook(redirectTo);
};

// Store Facebook tokens in the database
export const storeFacebookTokens = async (
  userId: string, 
  accessToken: string, 
  refreshToken: string, 
  expiresAt: Date
) => {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('users')
    .update({
      facebook_access_token: accessToken,
      facebook_refresh_token: refreshToken,
      facebook_token_expires_at: expiresAt.toISOString(),
    })
    .eq('id', userId);
  
  if (error) throw error;
  return true;
};

// Get Facebook tokens for a user
export const getFacebookTokens = async (userId: string) => {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('users')
    .select('facebook_access_token, facebook_refresh_token, facebook_token_expires_at')
    .eq('id', userId)
    .single();
  
  if (error) throw error;
  return data;
};

// Google Ads Authentication Functions

/**
 * Initiates the OAuth flow for Google Ads authentication
 * @returns URL to redirect the user to for Google Ads authentication
 */
export async function signInWithGoogleAds() {
  // Generate a random state value to prevent CSRF attacks
  const state = Math.random().toString(36).substring(2, 15);
  
  // Store the state in the session for verification after redirect
  // This would be implemented with your session management
  
  // Set up the OAuth URL with required scopes for Google Ads
  const authUrl = new URL('https://accounts.google.com/o/oauth2/auth');
  authUrl.searchParams.append('client_id', process.env.GOOGLE_ADS_CLIENT_ID || '');
  authUrl.searchParams.append('redirect_uri', process.env.GOOGLE_ADS_REDIRECT_URI || '');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('scope', 'https://www.googleapis.com/auth/adwords');
  authUrl.searchParams.append('access_type', 'offline');
  authUrl.searchParams.append('prompt', 'consent'); // Always prompt for consent to ensure refresh token

  return authUrl.toString();
}

/**
 * Links a Google Ads account to an existing user
 * @param userId - The ID of the user to link the Google Ads account to
 * @param code - The authorization code received from the OAuth redirect
 * @returns The stored tokens and expiration time
 */
export async function linkGoogleAdsAccount(userId: string, code: string) {
  try {
    // Exchange the code for access and refresh tokens
    const tokenResponse = await exchangeGoogleAdsCode(code);
    
    // Store the tokens in the database
    return await storeGoogleAdsTokens(userId, tokenResponse);
  } catch (error) {
    console.error('Error linking Google Ads account:', error);
    throw error;
  }
}

/**
 * Exchanges the authorization code for tokens
 * @param code - The authorization code from OAuth redirect
 * @returns The tokens response from Google
 */
async function exchangeGoogleAdsCode(code: string) {
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  
  const params = new URLSearchParams();
  params.append('client_id', process.env.GOOGLE_ADS_CLIENT_ID || '');
  params.append('client_secret', process.env.GOOGLE_ADS_CLIENT_SECRET || '');
  params.append('code', code);
  params.append('grant_type', 'authorization_code');
  params.append('redirect_uri', process.env.GOOGLE_ADS_REDIRECT_URI || '');
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to exchange code: ${JSON.stringify(errorData)}`);
  }
  
  return await response.json();
}

/**
 * Stores Google Ads tokens in the database
 * @param userId - The user ID to associate the tokens with
 * @param tokenResponse - The token response from Google OAuth
 * @returns The stored tokens data
 */
export async function storeGoogleAdsTokens(userId: string, tokenResponse: any) {
  const { access_token, refresh_token, expires_in } = tokenResponse;
  
  // Calculate expiration time
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + expires_in);
  
  // This would be implemented with your database client (e.g., Supabase)
  // Example with Supabase:
  const { data, error } = await supabase
    .from('users')
    .update({
      google_ads_access_token: access_token,
      google_ads_refresh_token: refresh_token,
      google_ads_token_expires_at: expiresAt.toISOString(),
    })
    .eq('id', userId);
    
  if (error) {
    console.error('Error storing Google Ads tokens:', error);
    throw error;
  }
  
  return {
    accessToken: access_token,
    refreshToken: refresh_token,
    expiresAt: expiresAt.toISOString(),
  };
}

/**
 * Retrieves Google Ads tokens for a user
 * @param userId - The user ID to get tokens for
 * @returns The tokens data
 */
export async function getGoogleAdsTokens(userId: string) {
  // This would be implemented with your database client (e.g., Supabase)
  // Example with Supabase:
  const { data, error } = await supabase
    .from('users')
    .select('google_ads_access_token, google_ads_refresh_token, google_ads_token_expires_at')
    .eq('id', userId)
    .single();
    
  if (error) {
    console.error('Error retrieving Google Ads tokens:', error);
    throw error;
  }
  
  return {
    accessToken: data.google_ads_access_token,
    refreshToken: data.google_ads_refresh_token,
    expiresAt: data.google_ads_token_expires_at,
  };
}

/**
 * Refreshes an expired Google Ads access token
 * @param userId - The user ID to refresh the token for
 * @returns The updated tokens
 */
export async function refreshGoogleAdsToken(userId: string) {
  // Get the current refresh token
  const { refreshToken } = await getGoogleAdsTokens(userId);
  
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  
  // Request a new access token
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  
  const params = new URLSearchParams();
  params.append('client_id', process.env.GOOGLE_ADS_CLIENT_ID || '');
  params.append('client_secret', process.env.GOOGLE_ADS_CLIENT_SECRET || '');
  params.append('refresh_token', refreshToken);
  params.append('grant_type', 'refresh_token');
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to refresh token: ${JSON.stringify(errorData)}`);
  }
  
  const tokenResponse = await response.json();
  
  // Store the new access token
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + tokenResponse.expires_in);
  
  // This would be implemented with your database client (e.g., Supabase)
  // Example with Supabase:
  const { data, error } = await supabase
    .from('users')
    .update({
      google_ads_access_token: tokenResponse.access_token,
      google_ads_token_expires_at: expiresAt.toISOString(),
    })
    .eq('id', userId);
    
  if (error) {
    console.error('Error storing refreshed Google Ads token:', error);
    throw error;
  }
  
  return {
    accessToken: tokenResponse.access_token,
    refreshToken: refreshToken,
    expiresAt: expiresAt.toISOString(),
  };
} 