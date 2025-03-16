import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/supabase';
import { getCurrentUser } from '@/app/lib/auth';
import { fetchFacebookPages, storeFacebookPageDetails } from '@/app/lib/facebook';

// Fetch Facebook pages handler
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Fetch the user's Facebook pages
    const pages = await fetchFacebookPages(user.id);
    
    if (!pages || pages.length === 0) {
      return NextResponse.json(
        { error: 'No Facebook pages found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ pages });
  } catch (error) {
    console.error('Facebook pages fetch error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching Facebook pages' },
      { status: 500 }
    );
  }
}

// Connect Facebook page to a business
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { businessId, pageId, pageAccessToken } = await request.json();
    
    if (!businessId || !pageId || !pageAccessToken) {
      return NextResponse.json(
        { error: 'Business ID, Page ID, and Page Access Token are required' },
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
    
    // Store the Facebook page details
    await storeFacebookPageDetails(businessId, pageId, pageAccessToken);
    
    // Log the action
    await supabase
      .from('actions_log')
      .insert({
        business_id: businessId,
        action: 'Facebook page connected'
      });
    
    return NextResponse.json({
      success: true,
      page_id: pageId
    });
  } catch (error) {
    console.error('Facebook connect error:', error);
    return NextResponse.json(
      { error: 'An error occurred while connecting Facebook page' },
      { status: 500 }
    );
  }
} 