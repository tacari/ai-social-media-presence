import axios from 'axios';
import { createServerClient } from './supabase';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Type for Google review
interface GoogleReview {
  reviewer_name: string;
  rating: number;
  comment: string;
  timestamp: string;
}

// Type for database review
interface DbReview {
  id?: string;
  business_id: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  timestamp: string;
  response?: string;
}

/**
 * Fetches reviews from Google Places API
 */
export async function getGoogleReviews(placeId: string): Promise<GoogleReview[]> {
  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    
    if (!apiKey) {
      throw new Error('Google Places API key not configured');
    }
    
    // Fetch place details with reviews
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews&key=${apiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`Places API returned status: ${data.status}, error: ${data.error_message || 'Unknown error'}`);
    }
    
    if (!data.result || !data.result.reviews) {
      // No reviews available
      return [];
    }
    
    // Map Google reviews to our format
    return data.result.reviews.map((review: any) => ({
      reviewer_name: review.author_name,
      rating: review.rating,
      comment: review.text,
      timestamp: new Date(review.time * 1000).toISOString(),
    }));
  } catch (error) {
    console.error('Error fetching Google reviews:', error);
    throw error;
  }
}

/**
 * Stores reviews in the database
 */
export async function storeReviews(businessId: string, reviews: GoogleReview[]): Promise<void> {
  try {
    if (!reviews.length) {
      return; // No reviews to store
    }
    
    const supabase = createServerClient();
    
    // First, get existing reviews to avoid duplicates
    const { data: existingReviews } = await supabase
      .from('reviews')
      .select('reviewer_name, comment, timestamp')
      .eq('business_id', businessId);
    
    // Create a lookup map for fast comparison
    const existingReviewMap = new Map();
    existingReviews?.forEach(review => {
      const key = `${review.reviewer_name}|${review.comment}|${review.timestamp}`;
      existingReviewMap.set(key, true);
    });
    
    // Filter out reviews that already exist
    const newReviews = reviews.filter(review => {
      const key = `${review.reviewer_name}|${review.comment}|${review.timestamp}`;
      return !existingReviewMap.has(key);
    });
    
    if (newReviews.length === 0) {
      return; // No new reviews to add
    }
    
    // Prepare new reviews for insertion
    const reviewsToInsert = newReviews.map(review => ({
      business_id: businessId,
      reviewer_name: review.reviewer_name,
      rating: review.rating,
      comment: review.comment,
      timestamp: review.timestamp,
    }));
    
    // Insert new reviews
    const { error } = await supabase
      .from('reviews')
      .insert(reviewsToInsert);
    
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error storing reviews:', error);
    throw error;
  }
}

/**
 * Generates an AI response to a review
 */
export async function generateReviewResponse(review: DbReview): Promise<string> {
  try {
    const prompt = `
      You are a helpful assistant for a business owner responding to customer reviews. 
      Generate a professional, friendly, and personalized response to the following review:
      
      Reviewer: ${review.reviewer_name}
      Rating: ${review.rating} out of 5 stars
      Review: "${review.comment}"
      
      Your response should:
      1. Thank the reviewer by name
      2. Be specific to their comments and show you read the review carefully
      3. Address any concerns or negative feedback diplomatically
      4. If it's a positive review, express sincere gratitude
      5. Invite them to return in the future
      6. Keep it reasonably brief (2-4 sentences)
      7. Sound authentic and not overly formal
      
      Response:
    `;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are an expert in business communication specializing in review responses" },
        { role: "user", content: prompt }
      ],
      max_tokens: 200,
      temperature: 0.7,
    });
    
    return completion.choices[0].message.content?.trim() || "";
  } catch (error) {
    console.error('Error generating review response:', error);
    return "Thank you for your feedback. We appreciate you taking the time to share your experience and will take your comments into consideration.";
  }
}

/**
 * Updates a review with a response
 */
export async function updateReviewResponse(reviewId: string, response: string): Promise<boolean> {
  try {
    const supabase = createServerClient();
    
    const { error } = await supabase
      .from('reviews')
      .update({ response, response_status: 'approved' })
      .eq('id', reviewId);
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error updating review response:', error);
    return false;
  }
}

/**
 * Stores an AI-generated draft response
 */
export async function storeAIResponseDraft(reviewId: string, aiResponse: string): Promise<boolean> {
  try {
    const supabase = createServerClient();
    
    const { error } = await supabase
      .from('reviews')
      .update({ 
        ai_response: aiResponse,
        response_status: 'draft'
      })
      .eq('id', reviewId);
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error storing AI response draft:', error);
    return false;
  }
}

/**
 * Approves an AI response draft to become the official response
 */
export async function approveAIResponseDraft(reviewId: string, editedResponse?: string): Promise<boolean> {
  try {
    const supabase = createServerClient();
    
    // First get the draft response
    const { data, error: fetchError } = await supabase
      .from('reviews')
      .select('ai_response')
      .eq('id', reviewId)
      .single();
    
    if (fetchError || !data) {
      throw fetchError || new Error('Review not found');
    }
    
    // Use either the edited response or the original AI draft
    const finalResponse = editedResponse || data.ai_response;
    
    if (!finalResponse) {
      throw new Error('No AI response draft available to approve');
    }
    
    // Update the review with the approved response
    const { error } = await supabase
      .from('reviews')
      .update({ 
        response: finalResponse,
        response_status: 'approved'
      })
      .eq('id', reviewId);
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error approving AI response draft:', error);
    return false;
  }
}

/**
 * Retrieve reviews that need AI response generation
 */
export async function getPendingAIReviews(businessId: string): Promise<DbReview[]> {
  try {
    const supabase = createServerClient();
    
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('business_id', businessId)
      .eq('response_status', 'pending_ai')
      .is('response', null);
    
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error retrieving pending AI reviews:', error);
    return [];
  }
}

/**
 * Process all pending reviews for a business that need AI responses
 */
export async function processAllPendingAIReviews(businessId: string): Promise<number> {
  try {
    // Get all pending reviews
    const pendingReviews = await getPendingAIReviews(businessId);
    
    if (pendingReviews.length === 0) {
      return 0;
    }
    
    // Process each review
    let processedCount = 0;
    
    for (const review of pendingReviews) {
      try {
        // Generate AI response
        const aiResponse = await generateReviewResponse(review);
        
        // Store the draft
        await storeAIResponseDraft(review.id as string, aiResponse);
        
        processedCount++;
      } catch (error) {
        console.error(`Error processing review ${review.id}:`, error);
        // Continue with next review even if one fails
      }
    }
    
    return processedCount;
  } catch (error) {
    console.error('Error processing pending AI reviews:', error);
    throw error;
  }
}

/**
 * Helps set a Google Place ID for a business
 */
export async function findPlaceId(businessName: string, address: string): Promise<string | null> {
  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    
    if (!apiKey) {
      throw new Error('Google Places API key not configured');
    }
    
    // Create search query from business name and address
    const query = encodeURIComponent(`${businessName} ${address}`);
    
    // Use Places API Text Search
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`Places API returned status: ${data.status}, error: ${data.error_message || 'Unknown error'}`);
    }
    
    if (!data.results || data.results.length === 0) {
      return null; // No places found
    }
    
    // Return the place_id of the first result
    return data.results[0].place_id;
  } catch (error) {
    console.error('Error finding place ID:', error);
    return null;
  }
}

/**
 * Updates a business with a place ID
 */
export async function setBusinessPlaceId(businessId: string, placeId: string): Promise<boolean> {
  try {
    const supabase = createServerClient();
    
    const { error } = await supabase
      .from('businesses')
      .update({ place_id: placeId })
      .eq('id', businessId);
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error setting place ID:', error);
    return false;
  }
}

// Fetch and store reviews for all businesses
export const fetchAndStoreReviewsForAllBusinesses = async (): Promise<void> => {
  const supabase = createServerClient();
  
  const { data: businesses, error } = await supabase
    .from('businesses')
    .select('id, place_id');
  
  if (error) {
    console.error('Error fetching businesses:', error);
    return;
  }

  for (const business of businesses) {
    if (business.place_id) {
      const reviews = await getGoogleReviews(business.place_id);
      await storeReviews(business.id, reviews);
    } else {
      console.log(`No Place ID for business ${business.id}`);
    }
  }
}; 