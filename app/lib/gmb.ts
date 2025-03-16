import { google } from 'googleapis';
import { createServerClient } from './supabase';
import { getGoogleTokens } from './auth';

// Initialize Google OAuth client
export const getOAuthClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  
  if (!clientId || !clientSecret || !redirectUri) {
    console.error('Missing Google OAuth credentials:', { 
      hasClientId: !!clientId, 
      hasClientSecret: !!clientSecret, 
      hasRedirectUri: !!redirectUri 
    });
    throw new Error('Google OAuth credentials not configured properly');
  }
  
  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );
};

// Get authenticated MyBusiness API client
export const getMyBusinessClient = async (userId: string) => {
  const tokens = await getGoogleTokens(userId);
  
  if (!tokens?.google_access_token) {
    throw new Error('Google account not connected');
  }
  
  const auth = getOAuthClient();
  auth.setCredentials({
    access_token: tokens.google_access_token,
    refresh_token: tokens.google_refresh_token,
    expiry_date: tokens.google_token_expires_at ? new Date(tokens.google_token_expires_at).getTime() : undefined
  });
  
  return {
    accounts: google.mybusinessaccountmanagement({ version: 'v1', auth }),
    business: google.mybusiness({ version: 'v4', auth }),
    placeAPI: google.mybusinessplaceactions({ version: 'v1', auth }),
    businessInfo: google.mybusinessbusinessinformation({ version: 'v1', auth })
  };
};

// Fetch GMB accounts for a user
export const fetchGMBAccounts = async (userId: string) => {
  try {
    console.log('Fetching GMB accounts for user:', userId);
    const { accounts } = await getMyBusinessClient(userId);
    console.log('Got MyBusiness client, calling accounts.list()');
    const response = await accounts.accounts.list();
    console.log('GMB accounts response:', response.data);
    return response.data.accounts || [];
  } catch (error) {
    console.error('Error fetching GMB accounts:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw error;
  }
};

// Fetch locations for a GMB account
export const fetchGMBLocations = async (userId: string, accountId: string) => {
  try {
    const { businessInfo } = await getMyBusinessClient(userId);
    const response = await businessInfo.accounts.locations.list({
      parent: accountId
    });
    return response.data.locations || [];
  } catch (error) {
    console.error('Error fetching GMB locations:', error);
    throw error;
  }
};

// Store GMB account and location IDs for a business
export const storeGMBDetails = async (businessId: string, accountId: string, locationId: string) => {
  try {
    const supabase = createServerClient();
    const { error } = await supabase
      .from('businesses')
      .update({
        gmb_account_id: accountId,
        gmb_location_id: locationId
      })
      .eq('id', businessId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error storing GMB details:', error);
    throw error;
  }
};

// Generate an AI-optimized description
export const generateAIDescription = async (businessName: string, industry: string) => {
  // This would be replaced with actual AI API call (e.g., to Claude)
  const prompt = `Write a compelling Google My Business description for a ${industry} business named ${businessName}. 
  Keep it under 750 characters, highlight unique selling points, and use language that will appeal to local customers.
  Include relevant keywords for SEO without keyword stuffing.`;
  
  // Placeholder for AI-generated content
  return `${businessName} is a premier ${industry} provider in your local area. We specialize in delivering exceptional products and services tailored to your specific needs. With years of experience and a dedicated team of professionals, we're committed to exceeding your expectations. Visit us today to experience the difference of working with a trusted local business that truly cares about customer satisfaction.`;
};

// Update GMB profile with new description
export const updateGMBDescription = async (userId: string, businessId: string, newDescription: string) => {
  try {
    // Get the business details from Supabase
    const supabase = createServerClient();
    const { data: business, error } = await supabase
      .from('businesses')
      .select('gmb_account_id, gmb_location_id')
      .eq('id', businessId)
      .single();
    
    if (error || !business) throw new Error('Business not found');
    if (!business.gmb_account_id || !business.gmb_location_id) {
      throw new Error('GMB account not connected');
    }
    
    // Get the MyBusiness API client
    const { business: mybusiness } = await getMyBusinessClient(userId);
    
    // Update the business description
    await mybusiness.accounts.locations.patch({
      name: `${business.gmb_account_id}/locations/${business.gmb_location_id}`,
      updateMask: 'profile.description',
      requestBody: {
        profile: {
          description: newDescription
        }
      }
    });
    
    // Log the action
    await supabase
      .from('actions_log')
      .insert({
        business_id: businessId,
        action: `Updated GMB description to: "${newDescription.substring(0, 100)}..."`
      });
    
    return true;
  } catch (error) {
    console.error('Error updating GMB description:', error);
    throw error;
  }
}; 