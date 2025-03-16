import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/supabase';
import { getCurrentUser } from '@/app/lib/auth';
import { generateAIPostContent, schedulePost } from '@/app/lib/facebook';

// Post to Facebook handler
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { businessId, content, scheduledTime } = await request.json();
    
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
      .select('id, name, industry, facebook_page_id, facebook_page_access_token')
      .eq('id', businessId)
      .eq('user_id', user.id)
      .single();
    
    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found or not authorized' },
        { status: 404 }
      );
    }
    
    if (!business.facebook_page_id || !business.facebook_page_access_token) {
      return NextResponse.json(
        { error: 'Facebook page not connected' },
        { status: 400 }
      );
    }
    
    // Use provided content or generate AI content
    const postContent = content || await generateAIPostContent(business.name, business.industry);
    
    // Schedule or immediately post to Facebook
    const scheduledDate = scheduledTime ? new Date(scheduledTime) : undefined;
    const result = await schedulePost(user.id, businessId, postContent, scheduledDate);
    
    return NextResponse.json({
      success: true,
      post_id: result.id,
      content: postContent,
      scheduled: !!scheduledDate,
      scheduled_time: scheduledDate?.toISOString()
    });
  } catch (error) {
    console.error('Facebook post error:', error);
    return NextResponse.json(
      { error: 'An error occurred while posting to Facebook' },
      { status: 500 }
    );
  }
} 