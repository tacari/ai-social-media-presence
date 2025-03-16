import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/supabase';
import { getCurrentUser } from '@/app/lib/auth';
import { fetchGMBAccounts, fetchGMBLocations, storeGMBDetails } from '@/app/lib/gmb';

// Connect GMB account handler
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Fetch the user's GMB accounts
    const accounts = await fetchGMBAccounts(user.id);
    
    if (!accounts || accounts.length === 0) {
      return NextResponse.json(
        { error: 'No GMB accounts found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('GMB accounts fetch error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching GMB accounts' },
      { status: 500 }
    );
  }
}

// Connect GMB account and location to a business
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { businessId, accountId } = await request.json();
    
    if (!businessId || !accountId) {
      return NextResponse.json(
        { error: 'Business ID and Account ID are required' },
        { status: 400 }
      );
    }
    
    // Verify the business belongs to the user
    const supabase = createServerClient();
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .eq('user_id', user.id)
      .single();
    
    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found or not authorized' },
        { status: 404 }
      );
    }
    
    // Fetch locations for the account
    const locations = await fetchGMBLocations(user.id, accountId);
    
    if (!locations || locations.length === 0) {
      return NextResponse.json(
        { error: 'No locations found for this GMB account' },
        { status: 404 }
      );
    }
    
    // For simplicity, use the first location
    const locationId = locations[0].name;
    
    // Store the GMB account and location IDs
    await storeGMBDetails(businessId, accountId, locationId);
    
    // Log the action
    await supabase
      .from('actions_log')
      .insert({
        business_id: businessId,
        action: 'Google My Business account connected'
      });
    
    return NextResponse.json({
      success: true,
      account_id: accountId,
      location_id: locationId,
      locations: locations
    });
  } catch (error) {
    console.error('GMB connect error:', error);
    return NextResponse.json(
      { error: 'An error occurred while connecting GMB account' },
      { status: 500 }
    );
  }
} 