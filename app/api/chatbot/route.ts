import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/app/lib/auth';
import { createServerClient } from '@/app/lib/supabase';
import {
  ChatMessage,
  generateChatResponse,
  logChatInteraction,
  getChatbotSettings,
  getChatLogs,
  createLeadFromChat,
  extractLeadInfo,
  shouldCaptureLead,
  processChatbotMessage,
  getChatHistory
} from '@/app/lib/chatbot';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

// Rate limiting map (in a production app, use Redis or similar)
const requestCounts = new Map<string, { count: number; timestamp: number }>();

const RATE_LIMIT = 20; // Max requests per minute per IP
const RATE_WINDOW = 60 * 1000; // 1 minute in milliseconds

// Helper function to implement basic rate limiting
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);
  
  if (!record) {
    // First request from this IP
    requestCounts.set(ip, { count: 1, timestamp: now });
    return false;
  }
  
  if (now - record.timestamp > RATE_WINDOW) {
    // Window has passed, reset counter
    requestCounts.set(ip, { count: 1, timestamp: now });
    return false;
  }
  
  // Increment counter
  record.count += 1;
  requestCounts.set(ip, record);
  
  // Check if rate limited
  return record.count > RATE_LIMIT;
}

export async function POST(request: NextRequest) {
  // Get IP for rate limiting
  const ip = request.ip || 'unknown';
  
  // Check rate limit
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      { status: 429 }
    );
  }
  
  try {
    const { businessId, sessionId, message } = await request.json();
    
    // Validate input
    if (!businessId || !sessionId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: businessId, sessionId, and message are required' },
        { status: 400 }
      );
    }
    
    // Get previous messages for context
    const previousMessages = await getChatHistory(businessId, sessionId);
    
    // Process the message
    const result = await processChatbotMessage(
      businessId,
      sessionId,
      message,
      previousMessages
    );
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error processing chatbot message:', error);
    return NextResponse.json(
      { error: 'Error processing message' },
      { status: 500 }
    );
  }
}

// GET endpoint for retrieving conversation history
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const businessId = searchParams.get('businessId');
  const sessionId = searchParams.get('sessionId');
  
  if (!businessId || !sessionId) {
    return NextResponse.json(
      { error: 'Missing required parameters: businessId and sessionId are required' },
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
    
    const { data, error } = await supabase
      .from('chatbot_logs')
      .select('*')
      .eq('business_id', businessId)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching chat history:', error);
      return NextResponse.json(
        { error: 'Error fetching chat history' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ messages: data });
  } catch (error) {
    console.error('Error getting conversation history:', error);
    return NextResponse.json(
      { error: 'Error getting conversation history' },
      { status: 500 }
    );
  }
}

// API endpoint to fetch chatbot settings
export async function GET_settings(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    
    if (!businessId) {
      return NextResponse.json(
        { error: 'Missing business ID parameter' },
        { status: 400 }
      );
    }
    
    // Verify business access
    const supabase = createServerClient();
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();
    
    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found or access denied' },
        { status: 403 }
      );
    }
    
    // Get chatbot settings
    const settings = await getChatbotSettings(businessId);
    
    if (!settings) {
      return NextResponse.json(
        { error: 'Failed to retrieve chatbot settings' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching chatbot settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chatbot settings' },
      { status: 500 }
    );
  }
} 