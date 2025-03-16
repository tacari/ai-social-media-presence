import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/supabase';
import { getCurrentUser } from '@/app/lib/auth';
import { generateAIDescription, updateGMBDescription } from '@/app/lib/gmb';

// Optimize GMB profile handler
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { businessId } = await request.json();
    
    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }
    
    // Verify the business belongs to the user and get its details
    const supabase = createServerClient();
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, industry, gmb_account_id, gmb_location_id')
      .eq('id', businessId)
      .eq('user_id', user.id)
      .single();
    
    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found or not authorized' },
        { status: 404 }
      );
    }
    
    if (!business.gmb_account_id || !business.gmb_location_id) {
      return NextResponse.json(
        { error: 'Google My Business account not connected' },
        { status: 400 }
      );
    }
    
    // Generate an AI-optimized description
    const newDescription = await generateAIDescription(business.name, business.industry);
    
    // Update the GMB profile
    await updateGMBDescription(user.id, businessId, newDescription);
    
    return NextResponse.json({
      success: true,
      description: newDescription
    });
  } catch (error) {
    console.error('GMB optimization error:', error);
    return NextResponse.json(
      { error: 'An error occurred while optimizing GMB profile' },
      { status: 500 }
    );
  }
} 