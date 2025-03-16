import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/app/lib/auth';
import { createServerClient } from '@/app/lib/supabase';
import { storeChatFeedback } from '@/app/lib/chatbot';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { saveFeedback } from '@/app/lib/chatbot';

export async function POST(request: NextRequest) {
  try {
    const { businessId, logId, sessionId, wasHelpful, comment } = await request.json();
    
    // Validate input
    if (!businessId || !logId || !sessionId || wasHelpful === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: businessId, logId, sessionId, and wasHelpful are required' },
        { status: 400 }
      );
    }
    
    // Save feedback
    await saveFeedback({
      business_id: businessId,
      log_id: logId,
      session_id: sessionId,
      was_helpful: wasHelpful,
      comment
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving feedback:', error);
    return NextResponse.json(
      { error: 'Error saving feedback' },
      { status: 500 }
    );
  }
}

// Get feedback for a business
export async function GET(request: NextRequest) {
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
    
    // Get feedback statistics 
    const { data: positiveCount, error: positiveError } = await supabase
      .from('chatbot_feedback')
      .select('id', { count: 'exact' })
      .eq('business_id', businessId)
      .eq('was_helpful', true);
    
    const { data: negativeCount, error: negativeError } = await supabase
      .from('chatbot_feedback')
      .select('id', { count: 'exact' })
      .eq('business_id', businessId)
      .eq('was_helpful', false);
    
    if (positiveError || negativeError) {
      return NextResponse.json(
        { error: 'Failed to retrieve feedback statistics' },
        { status: 500 }
      );
    }
    
    // Get recent feedback with comments
    const { data: recentFeedback, error: recentError } = await supabase
      .from('chatbot_feedback')
      .select(`
        id,
        was_helpful,
        comment,
        created_at,
        chatbot_logs(user_message, bot_response)
      `)
      .eq('business_id', businessId)
      .not('comment', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (recentError) {
      return NextResponse.json(
        { error: 'Failed to retrieve recent feedback' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      statistics: {
        positive: positiveCount ? (positiveCount as any).count : 0,
        negative: negativeCount ? (negativeCount as any).count : 0,
        total: (positiveCount ? (positiveCount as any).count : 0) + 
               (negativeCount ? (negativeCount as any).count : 0)
      },
      recentFeedback
    });
  } catch (error) {
    console.error('Error fetching chatbot feedback:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chatbot feedback' },
      { status: 500 }
    );
  }
} 