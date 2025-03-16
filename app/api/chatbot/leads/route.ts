import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { ChatbotLead } from '@/app/lib/chatbot';

// GET endpoint for retrieving leads
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const businessId = searchParams.get('businessId');
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  
  if (!businessId) {
    return NextResponse.json(
      { error: 'Missing required parameter: businessId is required' },
      { status: 400 }
    );
  }
  
  try {
    const supabase = createClient(cookies());
    
    // Verify if the authenticated user has access to this business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('user_id')
      .eq('id', businessId)
      .single();
    
    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found or unauthorized' },
        { status: 403 }
      );
    }
    
    // Start building the query
    let query = supabase
      .from('chatbot_leads')
      .select('*', { count: 'exact' })
      .eq('business_id', businessId);
    
    // Apply status filter if provided
    if (status) {
      query = query.eq('status', status);
    }
    
    // Apply pagination
    const offset = (page - 1) * limit;
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Error fetching leads:', error);
      return NextResponse.json(
        { error: 'Error fetching leads' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      leads: data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    });
  } catch (error) {
    console.error('Error getting leads:', error);
    return NextResponse.json(
      { error: 'Error getting leads' },
      { status: 500 }
    );
  }
}

// POST endpoint for creating a new lead
export async function POST(request: NextRequest) {
  try {
    const leadData = await request.json() as ChatbotLead;
    
    // Validate input
    if (!leadData.business_id || !leadData.session_id) {
      return NextResponse.json(
        { error: 'Missing required fields: business_id and session_id are required' },
        { status: 400 }
      );
    }
    
    const supabase = createClient(cookies());
    
    // Verify if the authenticated user has access to this business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('user_id')
      .eq('id', leadData.business_id)
      .single();
    
    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found or unauthorized' },
        { status: 403 }
      );
    }
    
    // Create the lead
    const { data, error } = await supabase
      .from('chatbot_leads')
      .insert({
        business_id: leadData.business_id,
        session_id: leadData.session_id,
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone,
        notes: leadData.notes,
        status: leadData.status || 'new'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating lead:', error);
      return NextResponse.json(
        { error: 'Error creating lead' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ lead: data });
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json(
      { error: 'Error creating lead' },
      { status: 500 }
    );
  }
}

// PUT endpoint for updating a lead
export async function PUT(request: NextRequest) {
  try {
    const leadData = await request.json();
    
    // Validate input
    if (!leadData.id || !leadData.business_id) {
      return NextResponse.json(
        { error: 'Missing required fields: id and business_id are required' },
        { status: 400 }
      );
    }
    
    const supabase = createClient(cookies());
    
    // Verify if the authenticated user has access to this business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('user_id')
      .eq('id', leadData.business_id)
      .single();
    
    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found or unauthorized' },
        { status: 403 }
      );
    }
    
    // Update the lead
    const { data, error } = await supabase
      .from('chatbot_leads')
      .update({
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone,
        notes: leadData.notes,
        status: leadData.status
      })
      .eq('id', leadData.id)
      .eq('business_id', leadData.business_id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating lead:', error);
      return NextResponse.json(
        { error: 'Error updating lead' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ lead: data });
  } catch (error) {
    console.error('Error updating lead:', error);
    return NextResponse.json(
      { error: 'Error updating lead' },
      { status: 500 }
    );
  }
}

// DELETE endpoint for deleting a lead
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  const businessId = searchParams.get('businessId');
  
  if (!id || !businessId) {
    return NextResponse.json(
      { error: 'Missing required parameters: id and businessId are required' },
      { status: 400 }
    );
  }
  
  try {
    const supabase = createClient(cookies());
    
    // Verify if the authenticated user has access to this business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('user_id')
      .eq('id', businessId)
      .single();
    
    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found or unauthorized' },
        { status: 403 }
      );
    }
    
    // Delete the lead
    const { error } = await supabase
      .from('chatbot_leads')
      .delete()
      .eq('id', id)
      .eq('business_id', businessId);
    
    if (error) {
      console.error('Error deleting lead:', error);
      return NextResponse.json(
        { error: 'Error deleting lead' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting lead:', error);
    return NextResponse.json(
      { error: 'Error deleting lead' },
      { status: 500 }
    );
  }
} 