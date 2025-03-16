import axios from 'axios';
import { createServerClient } from './supabase';
import { getFacebookTokens } from './auth';

// Get authenticated Facebook API client
export const getFacebookClient = async (userId: string) => {
  const tokens = await getFacebookTokens(userId);
  
  if (!tokens?.facebook_access_token) {
    throw new Error('Facebook account not connected');
  }
  
  return {
    accessToken: tokens.facebook_access_token,
    expiresAt: tokens.facebook_token_expires_at
  };
};

// Fetch Facebook Pages for a user
export const fetchFacebookPages = async (userId: string) => {
  try {
    const { accessToken } = await getFacebookClient(userId);
    
    const response = await axios.get('https://graph.facebook.com/v19.0/me/accounts', {
      params: {
        access_token: accessToken,
        fields: 'id,name,access_token,category,picture'
      }
    });
    
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching Facebook pages:', error);
    throw error;
  }
};

// Store Facebook Page details for a business
export const storeFacebookPageDetails = async (
  businessId: string, 
  pageId: string, 
  pageAccessToken: string
) => {
  try {
    const supabase = createServerClient();
    const { error } = await supabase
      .from('businesses')
      .update({
        facebook_page_id: pageId,
        facebook_page_access_token: pageAccessToken
      })
      .eq('id', businessId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error storing Facebook page details:', error);
    throw error;
  }
};

// Generate AI-optimized post content
export const generateAIPostContent = async (businessName: string, industry: string) => {
  // This would be replaced with actual AI API call (e.g., to Claude)
  const prompt = `Create an engaging Facebook post for a ${industry} business named ${businessName}. 
  Keep it concise (under 280 characters), include a call-to-action, and use engaging language that 
  will appeal to potential customers. Include relevant hashtags for better visibility.`;
  
  // Placeholder for AI-generated content
  return `Looking for the best ${industry.toLowerCase()} services in town? Look no further than ${businessName}! 
  Our team of experts is ready to exceed your expectations with our top-quality products and personalized service. 
  Stop by today or contact us to learn more! #${industry.replace(/\s+/g, '')} #LocalBusiness #QualityService`;
};

// Schedule a post on Facebook
export const schedulePost = async (
  userId: string,
  businessId: string,
  postContent: string,
  scheduledTime?: Date
) => {
  try {
    // Get the business details from Supabase
    const supabase = createServerClient();
    const { data: business, error } = await supabase
      .from('businesses')
      .select('facebook_page_id, facebook_page_access_token')
      .eq('id', businessId)
      .single();
    
    if (error || !business) throw new Error('Business not found');
    if (!business.facebook_page_id || !business.facebook_page_access_token) {
      throw new Error('Facebook page not connected');
    }
    
    const postData: any = {
      message: postContent
    };
    
    // If scheduledTime is provided, schedule the post for that time
    if (scheduledTime) {
      postData.published = false;
      postData.scheduled_publish_time = Math.floor(scheduledTime.getTime() / 1000);
    }
    
    // Call the Facebook Graph API to create the post
    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${business.facebook_page_id}/feed`,
      postData,
      {
        params: {
          access_token: business.facebook_page_access_token
        }
      }
    );
    
    // Log the action
    await supabase
      .from('actions_log')
      .insert({
        business_id: businessId,
        action: scheduledTime 
          ? `Scheduled a Facebook post for ${scheduledTime.toISOString()}` 
          : 'Published a Facebook post'
      });
    
    return response.data;
  } catch (error) {
    console.error('Error posting to Facebook:', error);
    throw error;
  }
};

// Fetch post insights
export const getPostInsights = async (userId: string, businessId: string, postId: string) => {
  try {
    // Get the business details from Supabase
    const supabase = createServerClient();
    const { data: business, error } = await supabase
      .from('businesses')
      .select('facebook_page_id, facebook_page_access_token')
      .eq('id', businessId)
      .single();
    
    if (error || !business) throw new Error('Business not found');
    if (!business.facebook_page_id || !business.facebook_page_access_token) {
      throw new Error('Facebook page not connected');
    }
    
    // Call the Facebook Graph API to get post insights
    const response = await axios.get(
      `https://graph.facebook.com/v19.0/${postId}/insights`,
      {
        params: {
          access_token: business.facebook_page_access_token,
          metric: 'post_impressions,post_engagements,post_reactions_by_type_total'
        }
      }
    );
    
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching post insights:', error);
    throw error;
  }
}; 