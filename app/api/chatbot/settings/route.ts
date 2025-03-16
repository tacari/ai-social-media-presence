import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/app/lib/auth';
import { createServerClient } from '@/app/lib/supabase';
import { getChatbotSettings, updateChatbotSettings } from '@/app/lib/chatbot';

// Update chatbot settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const data = await request.json();
    const { businessId, settings } = data;
    
    if (!businessId || !settings) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
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
    
    // Validate settings
    const validationErrors = validateSettings(settings);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Invalid settings', validationErrors },
        { status: 400 }
      );
    }
    
    // Update settings
    const updatedSettings = await updateChatbotSettings(businessId, settings);
    
    if (!updatedSettings) {
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ settings: updatedSettings });
  } catch (error) {
    console.error('Error updating chatbot settings:', error);
    return NextResponse.json(
      { error: 'Failed to update chatbot settings' },
      { status: 500 }
    );
  }
}

// Validate settings
function validateSettings(settings: any): string[] {
  const errors: string[] = [];
  
  // Validate tone if provided
  if (settings.tone !== undefined) {
    const validTones = ['professional', 'friendly', 'casual', 'formal', 'helpful'];
    if (!validTones.includes(settings.tone)) {
      errors.push(`Tone must be one of: ${validTones.join(', ')}`);
    }
  }
  
  // Validate custom FAQs if provided
  if (settings.custom_faqs !== undefined) {
    if (!Array.isArray(settings.custom_faqs)) {
      errors.push('custom_faqs must be an array');
    } else {
      for (let i = 0; i < settings.custom_faqs.length; i++) {
        const faq = settings.custom_faqs[i];
        if (!faq.question || typeof faq.question !== 'string') {
          errors.push(`FAQ #${i + 1} is missing a valid question`);
        }
        if (!faq.answer || typeof faq.answer !== 'string') {
          errors.push(`FAQ #${i + 1} is missing a valid answer`);
        }
      }
    }
  }
  
  // Validate welcome message if provided
  if (settings.welcome_message !== undefined && (!settings.welcome_message || typeof settings.welcome_message !== 'string')) {
    errors.push('welcome_message must be a non-empty string');
  }
  
  return errors;
} 