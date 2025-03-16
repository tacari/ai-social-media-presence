import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/supabase';
import { getCurrentUser } from '@/app/lib/auth';
import { findPlaceId, setBusinessPlaceId } from '@/app/lib/places';

// Set a place ID for a business
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { businessId, placeId } = await request.json();
    
    if (!businessId || !placeId) {
      return NextResponse.json(
        { error: 'Business ID and Place ID are required' },
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
    
    // Set the place ID
    const success = await setBusinessPlaceId(businessId, placeId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to set Place ID' },
        { status: 500 }
      );
    }
    
    // Log the action
    await supabase
      .from('actions_log')
      .insert({
        business_id: businessId,
        action: 'Set Google Place ID'
      });
    
    return NextResponse.json({
      success: true,
      businessId,
      placeId
    });
  } catch (error) {
    console.error('Error setting place ID:', error);
    return NextResponse.json(
      { error: 'An error occurred while setting the place ID' },
      { status: 500 }
    );
  }
}

// Find a place ID for a business using Google Places API
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    
    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }
    
    // Verify the business belongs to the user and get data
    const supabase = createServerClient();
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, address, place_id')
      .eq('id', businessId)
      .eq('user_id', user.id)
      .single();
    
    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found or not authorized' },
        { status: 404 }
      );
    }
    
    // If place_id is already set, return it
    if (business.place_id) {
      return NextResponse.json({
        placeId: business.place_id,
        businessId,
        fromCache: true
      });
    }
    
    // If name or address is missing, can't find place ID
    if (!business.name || !business.address) {
      return NextResponse.json(
        { error: 'Business name and address are required to find place ID' },
        { status: 400 }
      );
    }
    
    // Find place ID using Google Places API
    const placeId = await findPlaceId(business.name, business.address);
    
    if (!placeId) {
      return NextResponse.json(
        { error: 'Could not find a Google Place ID for this business' },
        { status: 404 }
      );
    }
    
    // Set the place ID in the database
    await setBusinessPlaceId(businessId, placeId);
    
    // Log the action
    await supabase
      .from('actions_log')
      .insert({
        business_id: businessId,
        action: 'Found and set Google Place ID'
      });
    
    return NextResponse.json({
      placeId,
      businessId,
      fromCache: false
    });
  } catch (error) {
    console.error('Error finding place ID:', error);
    return NextResponse.json(
      { error: 'An error occurred while finding place ID' },
      { status: 500 }
    );
  }
} 