import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/supabase';
import { getCurrentUser } from '@/app/lib/auth';
import { 
  getGoogleReviews, 
  storeReviews, 
  generateReviewResponse, 
  updateReviewResponse,
  storeAIResponseDraft,
  approveAIResponseDraft,
  processAllPendingAIReviews
} from '@/app/lib/places';

// Get reviews for a business
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
    
    // Fetch reviews from the database
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('business_id', businessId)
      .order('timestamp', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({ reviews });
  } catch (error) {
    console.error('Reviews fetch error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching reviews' },
      { status: 500 }
    );
  }
}

// Refresh reviews for a business
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
    
    // Verify the business belongs to the user and get place_id
    const supabase = createServerClient();
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, place_id')
      .eq('id', businessId)
      .eq('user_id', user.id)
      .single();
    
    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found or not authorized' },
        { status: 404 }
      );
    }
    
    if (!business.place_id) {
      return NextResponse.json(
        { error: 'Place ID not set for this business' },
        { status: 400 }
      );
    }
    
    // Fetch and store reviews
    const reviews = await getGoogleReviews(business.place_id);
    await storeReviews(businessId, reviews);
    
    // Log the action
    await supabase
      .from('actions_log')
      .insert({
        business_id: businessId,
        action: 'Refreshed Google reviews'
      });
    
    return NextResponse.json({
      success: true,
      count: reviews.length
    });
  } catch (error) {
    console.error('Review refresh error:', error);
    return NextResponse.json(
      { error: 'An error occurred while refreshing reviews' },
      { status: 500 }
    );
  }
}

// Generate and add response to a review (AI or manual)
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { reviewId, businessId, useAI, response, action } = await request.json();
    
    if (!reviewId || !businessId) {
      return NextResponse.json(
        { error: 'Review ID and Business ID are required' },
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
    
    // Get the review
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', reviewId)
      .eq('business_id', businessId)
      .single();
    
    if (reviewError || !review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }
    
    // Handle different actions
    let success = false;
    let responseText = '';
    let actionLog = '';
    
    if (action === 'approve_draft') {
      // Approve an AI-generated draft (optionally with edits)
      success = await approveAIResponseDraft(reviewId, response);
      responseText = response || review.ai_response;
      actionLog = 'Approved AI-generated response';
    } else if (action === 'generate_draft') {
      // Generate an AI draft without approving it
      responseText = await generateReviewResponse(review);
      success = await storeAIResponseDraft(reviewId, responseText);
      actionLog = 'Generated AI draft response';
    } else {
      // Legacy behavior - generate or use provided response
      if (useAI) {
        responseText = await generateReviewResponse(review);
        // If it's just AI generation without the draft workflow, directly set as response
        success = await updateReviewResponse(reviewId, responseText);
        actionLog = 'Added AI-generated response to review';
      } else if (response) {
        responseText = response;
        success = await updateReviewResponse(reviewId, responseText);
        actionLog = 'Added manual response to review';
      } else {
        return NextResponse.json(
          { error: 'Either useAI must be true or a response must be provided' },
          { status: 400 }
        );
      }
    }
    
    if (!success) {
      throw new Error('Failed to update review response');
    }
    
    // Log the action
    await supabase
      .from('actions_log')
      .insert({
        business_id: businessId,
        action: actionLog
      });
    
    return NextResponse.json({
      success: true,
      response: responseText
    });
  } catch (error) {
    console.error('Review response error:', error);
    return NextResponse.json(
      { error: 'An error occurred while updating the review response' },
      { status: 500 }
    );
  }
}

// New endpoint to batch process all pending reviews
export async function PATCH(request: NextRequest) {
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
    
    // Process all pending reviews
    const processedCount = await processAllPendingAIReviews(businessId);
    
    // Log the action if any reviews were processed
    if (processedCount > 0) {
      await supabase
        .from('actions_log')
        .insert({
          business_id: businessId,
          action: `Generated AI responses for ${processedCount} reviews`
        });
    }
    
    return NextResponse.json({
      success: true,
      processedCount
    });
  } catch (error) {
    console.error('Batch review processing error:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing reviews' },
      { status: 500 }
    );
  }
} 