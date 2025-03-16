import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/app/lib/session';
import { fetchGoogleAdsAccounts, storeGoogleAdsCustomerId } from '@/app/lib/googleAds';
import { signInWithGoogleAds, linkGoogleAdsAccount } from '@/app/lib/auth';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * GET /api/googleads/connect
 * Returns the URL for initiating Google Ads OAuth flow
 * or lists available Google Ads accounts if already authorized
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const userId = searchParams.get('userId');
    
    // Get the current user from the session
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // If this is a callback with a code, process OAuth
    if (code && userId) {
      await linkGoogleAdsAccount(userId, code);
      return NextResponse.json({ success: true });
    }
    
    // Check if the user has connected Google Ads
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('google_ads_access_token, google_ads_refresh_token')
      .eq('id', user.id)
      .single();
      
    if (userError) {
      console.error('Error fetching user data:', userError);
      return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
    }
    
    // If not connected, return the OAuth URL
    if (!userData.google_ads_access_token) {
      const authUrl = await signInWithGoogleAds();
      return NextResponse.json({ 
        connected: false,
        authUrl 
      });
    }
    
    // If connected, fetch and return available accounts
    const accounts = await fetchGoogleAdsAccounts(user.id);
    return NextResponse.json({
      connected: true,
      accounts: accounts.map(account => {
        const id = account.split('/')[1];
        return {
          id,
          name: `Account ${id}`, // In a real implementation, you would fetch account names
        };
      }),
    });
  } catch (error) {
    console.error('Error in Google Ads connect endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/googleads/connect
 * Links a selected Google Ads account to a business
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { businessId, customerId } = await request.json();
    
    if (!businessId || !customerId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Check if the user has permission to manage this business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('user_id')
      .eq('id', businessId)
      .single();
      
    if (businessError || business.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to manage this business' }, { status: 403 });
    }
    
    // Store the customer ID
    await storeGoogleAdsCustomerId(businessId, customerId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error linking Google Ads account to business:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 