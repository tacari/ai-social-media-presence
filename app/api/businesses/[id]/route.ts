import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/supabase';
import { getCurrentUser } from '@/app/lib/auth';

// Get a specific business
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const businessId = params.id;
    
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ business: data });
  } catch (error) {
    console.error('Get business error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching the business' },
      { status: 500 }
    );
  }
}

// Update a specific business
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const businessId = params.id;
    const { 
      name, 
      industry, 
      address, 
      gmb_location_id, 
      facebook_page_id,
      place_id 
    } = await request.json();
    
    const updates: any = {};
    if (name) updates.name = name;
    if (industry) updates.industry = industry;
    if (address !== undefined) updates.address = address;
    if (gmb_location_id !== undefined) updates.gmb_location_id = gmb_location_id;
    if (facebook_page_id !== undefined) updates.facebook_page_id = facebook_page_id;
    if (place_id !== undefined) updates.place_id = place_id;
    
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No updates provided' },
        { status: 400 }
      );
    }
    
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('businesses')
      .update(updates)
      .eq('id', businessId)
      .eq('user_id', user.id)
      .select()
      .single();
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    // Log the business update action
    await supabase
      .from('actions_log')
      .insert({
        business_id: businessId,
        action: 'Business updated'
      });
    
    return NextResponse.json({ business: data });
  } catch (error) {
    console.error('Update business error:', error);
    return NextResponse.json(
      { error: 'An error occurred while updating the business' },
      { status: 500 }
    );
  }
}

// Delete a specific business
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const businessId = params.id;
    
    const supabase = createServerClient();
    
    // First, ensure the business belongs to the user
    const { data: business, error: fetchError } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .eq('user_id', user.id)
      .single();
    
    if (fetchError || !business) {
      return NextResponse.json(
        { error: 'Business not found or not authorized' },
        { status: 404 }
      );
    }
    
    // Delete related records first (metrics, actions_log, and reviews)
    await supabase
      .from('metrics')
      .delete()
      .eq('business_id', businessId);
    
    await supabase
      .from('actions_log')
      .delete()
      .eq('business_id', businessId);
      
    await supabase
      .from('reviews')
      .delete()
      .eq('business_id', businessId);
    
    // Delete the business
    const { error } = await supabase
      .from('businesses')
      .delete()
      .eq('id', businessId);
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete business error:', error);
    return NextResponse.json(
      { error: 'An error occurred while deleting the business' },
      { status: 500 }
    );
  }
} 