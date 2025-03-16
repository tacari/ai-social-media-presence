import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@3';

// Initialize OpenAI
const configuration = new Configuration({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});
const openai = new OpenAIApi(configuration);

// Initialize Supabase client with service role key
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Generates an AI response to a review
 */
async function generateReviewResponse(review: any): Promise<string> {
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
    
    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are an expert in business communication specializing in review responses" },
        { role: "user", content: prompt }
      ],
      max_tokens: 200,
      temperature: 0.7,
    });
    
    return completion.data.choices[0].message?.content?.trim() || "";
  } catch (error) {
    console.error('Error generating review response:', error);
    return "Thank you for your feedback. We appreciate you taking the time to share your experience and will take your comments into consideration.";
  }
}

serve(async (req) => {
  try {
    // Parse the webhook payload
    const payload = await req.json();
    
    // Verify the security token if you've set one up
    const authHeader = req.headers.get('Authorization');
    const expectedToken = Deno.env.get('WEBHOOK_SECRET');
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Extract the review data
    const review = payload.record;
    
    // Verify this is a review that needs AI response
    if (!review || review.response_status !== 'pending_ai') {
      return new Response(JSON.stringify({ error: 'Not a pending review' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Generate AI response
    const aiResponse = await generateReviewResponse(review);
    
    // Store the AI-generated draft
    const { error } = await supabase
      .from('reviews')
      .update({ 
        ai_response: aiResponse,
        response_status: 'draft'
      })
      .eq('id', review.id);
    
    if (error) {
      throw new Error(`Failed to update review: ${error.message}`);
    }
    
    // Log the action
    await supabase
      .from('actions_log')
      .insert({
        business_id: review.business_id,
        action: 'Auto-generated AI draft response'
      });
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'AI response generated and stored as draft',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in Edge Function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}); 