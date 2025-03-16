import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/app/lib/session';
import {
  createSearchCampaign,
  createAdGroup,
  addKeywordsToAdGroup,
  generateAdHeadlines,
  generateAdDescriptions,
  suggestKeywords,
  setAutomatedBidding,
} from '@/app/lib/googleAds';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * GET /api/googleads/campaigns
 * Lists campaigns for a business
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    
    if (!businessId) {
      return NextResponse.json({ error: 'Missing business ID' }, { status: 400 });
    }
    
    // Check if the user has permission to view this business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('user_id, google_ads_customer_id')
      .eq('id', businessId)
      .single();
      
    if (businessError || business.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to view this business' }, { status: 403 });
    }
    
    // Check if the business has a connected Google Ads account
    if (!business.google_ads_customer_id) {
      return NextResponse.json({ error: 'Business does not have a connected Google Ads account' }, { status: 400 });
    }
    
    // Get campaigns for this business
    const { data: campaigns, error: campaignsError } = await supabase
      .from('ad_campaigns')
      .select('*')
      .eq('business_id', businessId);
      
    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError);
      return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
    }
    
    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error('Error in Google Ads campaigns endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/googleads/campaigns
 * Creates a new campaign for a business
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const {
      businessId,
      campaignName,
      dailyBudget,
      locations,
      industry,
      generateAI = true,
    } = await request.json();
    
    if (!businessId || !campaignName || !dailyBudget || !locations) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Check if the user has permission to manage this business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('user_id, name, google_ads_customer_id')
      .eq('id', businessId)
      .single();
      
    if (businessError || business.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to manage this business' }, { status: 403 });
    }
    
    // Check if the business has a connected Google Ads account
    if (!business.google_ads_customer_id) {
      return NextResponse.json({ error: 'Business does not have a connected Google Ads account' }, { status: 400 });
    }
    
    // Create the campaign
    const campaign = await createSearchCampaign(businessId, campaignName, dailyBudget, locations);
    
    // Create an ad group
    const adGroup = await createAdGroup(campaign.id, `${campaignName} Ad Group`);
    
    // If AI generation is requested, generate ad content and keywords
    if (generateAI && industry) {
      // Generate headlines and descriptions
      const headlines = await generateAdHeadlines(business.name, industry);
      const descriptions = await generateAdDescriptions(business.name, industry);
      
      // Generate keywords
      const keywords = await suggestKeywords(industry);
      
      // Add keywords to the ad group
      await addKeywordsToAdGroup(adGroup.id, keywords);
      
      // Set up automated bidding
      await setAutomatedBidding(campaign.id);
      
      return NextResponse.json({
        success: true,
        campaign,
        adGroup,
        headlines,
        descriptions,
        keywords,
      });
    }
    
    return NextResponse.json({
      success: true,
      campaign,
      adGroup,
    });
  } catch (error) {
    console.error('Error creating Google Ads campaign:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/googleads/campaigns
 * Updates a campaign's status or settings
 */
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { campaignId, status, dailyBudget } = await request.json();
    
    if (!campaignId || (!status && !dailyBudget)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Get the campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('ad_campaigns')
      .select('business_id')
      .eq('id', campaignId)
      .single();
      
    if (campaignError) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    
    // Check if the user has permission to manage this business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('user_id')
      .eq('id', campaign.business_id)
      .single();
      
    if (businessError || business.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to manage this campaign' }, { status: 403 });
    }
    
    // Update the campaign
    const updateData: any = {};
    if (status) updateData.status = status;
    if (dailyBudget) updateData.daily_budget = dailyBudget;
    
    const { data: updatedCampaign, error: updateError } = await supabase
      .from('ad_campaigns')
      .update(updateData)
      .eq('id', campaignId)
      .select()
      .single();
      
    if (updateError) {
      console.error('Error updating campaign:', updateError);
      return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      campaign: updatedCampaign,
    });
  } catch (error) {
    console.error('Error updating Google Ads campaign:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 