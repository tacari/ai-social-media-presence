import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/supabase';
import { getCurrentUser } from '@/app/lib/auth';

// Get all businesses for the authenticated user
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('user_id', user.id);
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ businesses: data });
  } catch (error) {
    console.error('Get businesses error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching businesses' },
      { status: 500 }
    );
  }
}

// Create a new business for the authenticated user
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { 
      name, 
      industry, 
      address,
      gmb_location_id, 
      facebook_page_id,
      place_id
    } = await request.json();
    
    if (!name || !industry) {
      return NextResponse.json(
        { error: 'Name and industry are required' },
        { status: 400 }
      );
    }
    
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('businesses')
      .insert({
        user_id: user.id,
        name,
        industry,
        address,
        gmb_location_id,
        facebook_page_id,
        place_id,
      })
      .select()
      .single();
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    // Log the business creation action
    await supabase
      .from('actions_log')
      .insert({
        business_id: data.id,
        action: 'Business created'
      });
    
    return NextResponse.json({ business: data });
  } catch (error) {
    console.error('Create business error:', error);
    return NextResponse.json(
      { error: 'An error occurred while creating the business' },
      { status: 500 }
    );
  }
} 