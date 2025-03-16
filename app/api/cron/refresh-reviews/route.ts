import { NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/supabase';
import { getGoogleReviews, storeReviews } from '@/app/lib/places';

// API protection with a simple token
const isValidToken = (requestToken: string | null) => {
  const expectedToken = process.env.CRON_SECRET;
  return expectedToken && requestToken === expectedToken;
};

// POST handler for the cron job
export async function POST(request: Request) {
  try {
    // Validate the request has the proper authorization
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    
    if (!isValidToken(token)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const supabase = createServerClient();
    
    // Get all businesses with a place_id
    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('id, place_id')
      .not('place_id', 'is', null);
    
    if (error) {
      throw error;
    }
    
    // Stats to return
    const stats = {
      total_businesses: businesses.length,
      businesses_processed: 0,
      total_reviews_found: 0,
      errors: [] as string[]
    };
    
    // Process each business
    for (const business of businesses) {
      try {
        if (!business.place_id) continue;
        
        // Fetch reviews from Google
        const reviews = await getGoogleReviews(business.place_id);
        
        // Store them in the database
        await storeReviews(business.id, reviews);
        
        // Update stats
        stats.businesses_processed++;
        stats.total_reviews_found += reviews.length;
        
        // Log the action
        await supabase
          .from('actions_log')
          .insert({
            business_id: business.id,
            action: `Auto-refreshed ${reviews.length} reviews`
          });
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        stats.errors.push(`Error processing business ${business.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully refreshed reviews for ${stats.businesses_processed} businesses`,
      stats
    });
  } catch (error) {
    console.error('Cron refresh error:', error);
    return NextResponse.json(
      { 
        error: 'An error occurred during the scheduled review refresh',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// Also allow GET for testing purposes
export async function GET(request: Request) {
  return POST(request);
} 