import axios from 'axios';
import { createServerClient } from './supabase';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Types
export interface PlatformAccount {
  id: string;
  business_id: string;
  platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin';
  account_id: string;
  account_name?: string;
  account_username?: string;
  account_image_url?: string;
  access_token: string;
  refresh_token?: string;
  token_expiry?: string;
}

export interface SocialMediaPost {
  id?: string;
  business_id: string;
  platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin';
  platform_account_id: string;
  content: string;
  image_url?: string;
  scheduled_time?: string;
  published_time?: string;
  status: 'draft' | 'scheduled' | 'posted' | 'failed';
  post_id?: string;
  ai_generated: boolean;
  engagement_data?: any;
}

// ----------------------------------
// Account Management Functions
// ----------------------------------

/**
 * Store a platform account in the database
 */
export const storePlatformAccount = async (account: Omit<PlatformAccount, 'id'>) => {
  try {
    const supabase = createServerClient();
    
    // Check if the account already exists
    const { data: existingAccount } = await supabase
      .from('platform_accounts')
      .select('id')
      .eq('business_id', account.business_id)
      .eq('platform', account.platform)
      .eq('account_id', account.account_id)
      .single();
    
    if (existingAccount) {
      // Update existing account
      const { data, error } = await supabase
        .from('platform_accounts')
        .update({
          account_name: account.account_name,
          account_username: account.account_username,
          account_image_url: account.account_image_url,
          access_token: account.access_token,
          refresh_token: account.refresh_token,
          token_expiry: account.token_expiry,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingAccount.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } else {
      // Insert new account
      const { data, error } = await supabase
        .from('platform_accounts')
        .insert(account)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }
  } catch (error) {
    console.error(`Error storing ${account.platform} account:`, error);
    throw error;
  }
};

/**
 * Get platform accounts for a business
 */
export const getPlatformAccounts = async (businessId: string, platform?: string) => {
  try {
    const supabase = createServerClient();
    
    let query = supabase
      .from('platform_accounts')
      .select('*')
      .eq('business_id', businessId);
    
    if (platform) {
      query = query.eq('platform', platform);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching platform accounts:', error);
    throw error;
  }
};

/**
 * Delete a platform account
 */
export const deletePlatformAccount = async (accountId: string) => {
  try {
    const supabase = createServerClient();
    const { error } = await supabase
      .from('platform_accounts')
      .delete()
      .eq('id', accountId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting platform account:', error);
    throw error;
  }
};

// ----------------------------------
// Post Management Functions
// ----------------------------------

/**
 * Store a social media post
 */
export const storeSocialMediaPost = async (post: Omit<SocialMediaPost, 'id'>) => {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('social_media_posts')
      .insert(post)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error storing ${post.platform} post:`, error);
    throw error;
  }
};

/**
 * Update a social media post
 */
export const updateSocialMediaPost = async (postId: string, updates: Partial<SocialMediaPost>) => {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('social_media_posts')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', postId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating social media post:', error);
    throw error;
  }
};

/**
 * Get social media posts for a business
 */
export const getSocialMediaPosts = async (
  businessId: string, 
  platform?: string, 
  status?: string
) => {
  try {
    const supabase = createServerClient();
    
    let query = supabase
      .from('social_media_posts')
      .select('*, platform_accounts(*)')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    
    if (platform) {
      query = query.eq('platform', platform);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching social media posts:', error);
    throw error;
  }
};

// ----------------------------------
// Platform-Specific API Functions
// ----------------------------------

/**
 * Generic function to post to any platform
 */
export const postToSocialMedia = async (postId: string) => {
  try {
    const supabase = createServerClient();
    
    // Get post details
    const { data: post, error: postError } = await supabase
      .from('social_media_posts')
      .select('*, platform_accounts(*)')
      .eq('id', postId)
      .single();
    
    if (postError || !post) {
      throw new Error('Post not found');
    }
    
    // Get platform account
    const platformAccount = post.platform_accounts;
    
    if (!platformAccount) {
      throw new Error('Platform account not found');
    }
    
    // Publish to appropriate platform
    let result;
    
    switch (post.platform) {
      case 'facebook':
        result = await postToFacebook(platformAccount.access_token, post.content, post.image_url);
        break;
      case 'instagram':
        result = await postToInstagram(platformAccount.access_token, post.content, post.image_url);
        break;
      case 'twitter':
        result = await postToTwitter(platformAccount.access_token, post.content, post.image_url);
        break;
      case 'linkedin':
        result = await postToLinkedIn(platformAccount.access_token, post.content, post.image_url);
        break;
      default:
        throw new Error(`Unsupported platform: ${post.platform}`);
    }
    
    // Update post with result
    const { data: updatedPost, error: updateError } = await supabase
      .from('social_media_posts')
      .update({
        status: 'posted',
        post_id: result.id,
        published_time: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', postId)
      .select()
      .single();
    
    if (updateError) {
      throw updateError;
    }
    
    return updatedPost;
  } catch (error) {
    console.error('Error posting to social media:', error);
    
    // Update post status to failed
    const supabase = createServerClient();
    await supabase
      .from('social_media_posts')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('id', postId);
    
    throw error;
  }
};

/**
 * Post to Facebook
 */
export const postToFacebook = async (accessToken: string, content: string, imageUrl?: string) => {
  try {
    const pageId = accessToken.split('|')[0]; // Extract page ID from token if needed
    
    const params: any = {
      message: content,
      access_token: accessToken
    };
    
    if (imageUrl) {
      params.url = imageUrl;
      
      // Post photo with caption
      const response = await axios.post(
        `https://graph.facebook.com/v19.0/${pageId}/photos`,
        params
      );
      
      return { id: response.data.id };
    } else {
      // Post text only
      const response = await axios.post(
        `https://graph.facebook.com/v19.0/${pageId}/feed`,
        params
      );
      
      return { id: response.data.id };
    }
  } catch (error) {
    console.error('Error posting to Facebook:', error);
    throw error;
  }
};

/**
 * Post to Instagram (via Facebook Graph API)
 */
export const postToInstagram = async (accessToken: string, caption: string, imageUrl?: string) => {
  try {
    if (!imageUrl) {
      throw new Error('Instagram requires an image for posting');
    }
    
    const igUserId = accessToken.split('|')[0]; // Extract Instagram user ID from token if needed
    
    // Step 1: Create a media container
    const mediaResponse = await axios.post(
      `https://graph.facebook.com/v19.0/${igUserId}/media`,
      {
        image_url: imageUrl,
        caption: caption,
        access_token: accessToken
      }
    );
    
    const creationId = mediaResponse.data.id;
    
    // Step 2: Publish the container
    const publishResponse = await axios.post(
      `https://graph.facebook.com/v19.0/${igUserId}/media_publish`,
      {
        creation_id: creationId,
        access_token: accessToken
      }
    );
    
    return { id: publishResponse.data.id };
  } catch (error) {
    console.error('Error posting to Instagram:', error);
    throw error;
  }
};

/**
 * Post to Twitter
 */
export const postToTwitter = async (accessToken: string, content: string, imageUrl?: string) => {
  try {
    // For Twitter, we need to ensure content is under 280 characters
    const truncatedContent = content.length > 280 ? content.substring(0, 277) + '...' : content;
    
    if (imageUrl) {
      // First upload the media
      const mediaUploadResponse = await axios.post(
        'https://upload.twitter.com/1.1/media/upload.json',
        { media: imageUrl },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      const mediaId = mediaUploadResponse.data.media_id_string;
      
      // Then create the tweet with the media
      const tweetResponse = await axios.post(
        'https://api.twitter.com/2/tweets',
        {
          text: truncatedContent,
          media: { media_ids: [mediaId] }
        },
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      
      return { id: tweetResponse.data.data.id };
    } else {
      // Text-only tweet
      const response = await axios.post(
        'https://api.twitter.com/2/tweets',
        { text: truncatedContent },
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      
      return { id: response.data.data.id };
    }
  } catch (error) {
    console.error('Error posting to Twitter:', error);
    throw error;
  }
};

/**
 * Post to LinkedIn
 */
export const postToLinkedIn = async (accessToken: string, content: string, imageUrl?: string) => {
  try {
    const orgUrn = process.env.LINKEDIN_ORGANIZATION_URN;
    
    if (!orgUrn) {
      throw new Error('LinkedIn organization URN not configured');
    }
    
    let postData: any = {
      author: `urn:li:organization:${orgUrn}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: content },
          shareMediaCategory: 'NONE'
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    };
    
    if (imageUrl) {
      // Register an image upload
      const registerUploadResponse = await axios.post(
        'https://api.linkedin.com/v2/assets?action=registerUpload',
        {
          registerUploadRequest: {
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
            owner: `urn:li:organization:${orgUrn}`,
            serviceRelationships: [{
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent'
            }]
          }
        },
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      
      const uploadUrl = registerUploadResponse.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
      const asset = registerUploadResponse.data.value.asset;
      
      // Upload the image
      await axios.put(uploadUrl, imageUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'image/jpeg'  // Adjust based on your image type
        }
      });
      
      // Add the media to the post
      postData.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'IMAGE';
      postData.specificContent['com.linkedin.ugc.ShareContent'].media = [{
        status: 'READY',
        description: {
          text: content.substring(0, 200)  // LinkedIn requires a shorter description
        },
        media: asset,
        title: { text: content.substring(0, 100) }
      }];
    }
    
    // Create the post
    const response = await axios.post(
      'https://api.linkedin.com/v2/ugcPosts',
      postData,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    
    // LinkedIn returns the post ID in the response header
    const postId = response.headers['x-restli-id'];
    return { id: postId };
  } catch (error) {
    console.error('Error posting to LinkedIn:', error);
    throw error;
  }
};

// ----------------------------------
// AI Content Generation
// ----------------------------------

/**
 * Generate platform-specific content with AI
 */
export const generateSocialMediaContent = async (
  businessName: string,
  industry: string,
  platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin'
) => {
  try {
    const platformPrompts = {
      facebook: `Create an engaging Facebook post for a ${industry} business named "${businessName}". 
                 Keep it conversational and include a question or call-to-action to encourage 
                 engagement. The post should be around 100-150 words long.`,
                 
      instagram: `Create an Instagram caption for a ${industry} business named "${businessName}". 
                  Make it vibrant and visual, with appropriate hashtags (4-6 hashtags) and emojis.
                  The caption should be around 100-150 characters plus hashtags.`,
                  
      twitter: `Create a tweet for a ${industry} business named "${businessName}". 
                Make it concise and punchy. Include relevant hashtags (1-2 max). 
                The tweet must be under 280 characters total.`,
                
      linkedin: `Create a professional LinkedIn post for a ${industry} business named "${businessName}". 
                 Focus on industry insights, professional value, or thought leadership.
                 The post should be around 150-200 words and maintain a professional tone.`
    };
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { 
          role: "system", 
          content: "You are a professional social media content creator who specializes in creating engaging, platform-specific content" 
        },
        { 
          role: "user", 
          content: platformPrompts[platform] 
        }
      ],
      max_tokens: platform === 'twitter' ? 100 : 300,
      temperature: 0.7,
    });
    
    return completion.choices[0].message.content?.trim() || "";
  } catch (error) {
    console.error(`Error generating ${platform} content:`, error);
    throw error;
  }
};

/**
 * Schedule a post for publishing
 */
export const schedulePost = async (
  businessId: string,
  platformAccountId: string,
  platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin',
  content: string,
  scheduledTime: Date,
  imageUrl?: string
) => {
  try {
    // Get platform account
    const supabase = createServerClient();
    const { data: account, error: accountError } = await supabase
      .from('platform_accounts')
      .select('*')
      .eq('id', platformAccountId)
      .single();
    
    if (accountError || !account) {
      throw new Error('Platform account not found');
    }
    
    // Create the post record
    const post = {
      business_id: businessId,
      platform,
      platform_account_id: platformAccountId,
      content,
      image_url: imageUrl,
      scheduled_time: scheduledTime.toISOString(),
      status: 'scheduled' as const,
      ai_generated: false
    };
    
    const { data, error } = await supabase
      .from('social_media_posts')
      .insert(post)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error scheduling post:', error);
    throw error;
  }
}; 