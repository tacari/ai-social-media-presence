import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/supabase';
import { processAllPendingAIReviews } from '@/app/lib/places';

// This endpoint is meant to be called by a scheduled job (cron)
// It processes all pending reviews for all businesses
export async function GET(request: NextRequest) {
  try {
    // Check for secret token to make sure this is a legitimate request
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get all businesses with place IDs
    const supabase = createServerClient();
    const { data: businesses, error: businessesError } = await supabase
      .from('businesses')
      .select('id, name')
      .not('place_id', 'is', null);
    
    if (businessesError) {
      throw businessesError;
    }
    
    // Process reviews for each business
    const results = [];
    
    for (const business of businesses || []) {
      try {
        const processedCount = await processAllPendingAIReviews(business.id);
        
        if (processedCount > 0) {
          // Log the action
          await supabase
            .from('actions_log')
            .insert({
              business_id: business.id,
              action: `Auto-generated AI responses for ${processedCount} reviews via cron job`
            });
          
          results.push({
            businessId: business.id,
            businessName: business.name,
            processedCount
          });
        }
      } catch (error) {
        console.error(`Error processing reviews for business ${business.id}:`, error);
        // Continue with next business even if one fails
      }
    }
    
    return NextResponse.json({
      success: true,
      processedBusinesses: results.length,
      totalProcessedReviews: results.reduce((sum, result) => sum + result.processedCount, 0),
      details: results
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing reviews' },
      { status: 500 }
    );
  }
} 