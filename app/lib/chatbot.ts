import { createServerClient } from '@/app/lib/supabase';
import OpenAI from 'openai';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';

// Define typescript interfaces for our data structures
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatbotSettings {
  id: string;
  business_id: string;
  is_enabled: boolean;
  welcome_message: string;
  tone: string;
  custom_faqs: Array<{
    question: string;
    answer: string;
  }>;
  max_history_length: number;
  lead_capture_enabled: boolean;
}

export interface ChatLog {
  id?: string;
  business_id: string;
  session_id: string;
  user_message: string;
  bot_response: string;
}

export interface ChatbotLead {
  id?: string;
  business_id: string;
  session_id: string;
  name?: string;
  email?: string;
  phone?: string;
  notes?: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'rejected';
  created_at?: string;
  updated_at?: string;
}

export interface ChatbotFeedback {
  id?: string;
  business_id: string;
  session_id: string;
  log_id: string;
  was_helpful: boolean;
  comment?: string;
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Get or create chatbot settings for a business
 */
export async function getChatbotSettings(businessId: string): Promise<ChatbotSettings | null> {
  const supabase = createServerClient();
  
  // Try to get existing settings
  const { data, error } = await supabase
    .from('chatbot_settings')
    .select('*')
    .eq('business_id', businessId)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error getting chatbot settings:', error);
    return null;
  }
  
  // If settings exist, return them
  if (data) {
    return data as ChatbotSettings;
  }
  
  // Otherwise create default settings
  const { data: newSettings, error: insertError } = await supabase
    .from('chatbot_settings')
    .insert({
      business_id: businessId,
      is_enabled: true,
      welcome_message: 'Hi there! How can I help you today?',
      tone: 'professional',
      custom_faqs: [],
      max_history_length: 10,
      lead_capture_enabled: true
    })
    .select()
    .single();
  
  if (insertError) {
    console.error('Error creating chatbot settings:', insertError);
    return null;
  }
  
  return newSettings as ChatbotSettings;
}

/**
 * Update chatbot settings
 */
export async function updateChatbotSettings(
  businessId: string, 
  updates: Partial<ChatbotSettings>
): Promise<ChatbotSettings | null> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('chatbot_settings')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('business_id', businessId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating chatbot settings:', error);
    return null;
  }
  
  return data as ChatbotSettings;
}

/**
 * Store a chat log
 */
export async function logChatInteraction(
  businessId: string,
  sessionId: string,
  userMessage: string,
  botResponse: string
): Promise<ChatLog | null> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('chatbot_logs')
    .insert({
      business_id: businessId,
      session_id: sessionId,
      user_message: userMessage,
      bot_response: botResponse
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error logging chat interaction:', error);
    return null;
  }
  
  return data as ChatLog;
}

/**
 * Get chat logs for a session
 */
export async function getChatLogs(
  businessId: string,
  sessionId: string
): Promise<ChatLog[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('chatbot_logs')
    .select('*')
    .eq('business_id', businessId)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error getting chat logs:', error);
    return [];
  }
  
  return data as ChatLog[];
}

/**
 * Store feedback for a chat interaction
 */
export async function storeChatFeedback(
  businessId: string,
  sessionId: string,
  logId: string,
  wasHelpful: boolean,
  comment?: string
): Promise<ChatbotFeedback | null> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('chatbot_feedback')
    .insert({
      business_id: businessId,
      session_id: sessionId,
      log_id: logId,
      was_helpful: wasHelpful,
      comment
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error storing chat feedback:', error);
    return null;
  }
  
  return data as ChatbotFeedback;
}

/**
 * Create a new lead from chat information
 */
export async function createLeadFromChat(
  businessId: string,
  sessionId: string,
  leadInfo: Partial<ChatbotLead>
): Promise<ChatbotLead | null> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('chatbot_leads')
    .insert({
      business_id: businessId,
      session_id: sessionId,
      ...leadInfo,
      status: leadInfo.status || 'new'
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating lead from chat:', error);
    return null;
  }
  
  return data as ChatbotLead;
}

/**
 * Generate chat completion with OpenAI
 */
export async function generateChatResponse(
  messages: ChatMessage[],
  businessInfo: any = {},
  settings: ChatbotSettings
): Promise<string> {
  try {
    // First check if we can find a match in custom FAQs
    if (messages.length > 0 && messages[messages.length - 1].role === 'user' && settings.custom_faqs.length > 0) {
      const userQuestion = messages[messages.length - 1].content.toLowerCase();
      
      // Try to find a match in the FAQs
      const matchedFaq = settings.custom_faqs.find(faq => 
        userQuestion.includes(faq.question.toLowerCase())
      );
      
      if (matchedFaq) {
        return matchedFaq.answer;
      }
    }
    
    // Build system prompt based on business info and settings
    const systemPrompt = getSystemPrompt(businessInfo, settings);
    
    // Add system prompt to messages
    const promptMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];
    
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: promptMessages,
      temperature: 0.7,
      max_tokens: 500,
    });
    
    return response.choices[0].message.content || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error('Error generating chat response:', error);
    return "I'm sorry, I'm having trouble connecting to my brain right now. Please try again later.";
  }
}

/**
 * Generate system prompt based on business info and settings
 */
function getSystemPrompt(businessInfo: any, settings: ChatbotSettings): string {
  const { name, address, phone, industry } = businessInfo;
  const { tone } = settings;
  
  return `You are a ${tone} AI chatbot for ${name}, a business in the ${industry || 'service'} industry.
Location: ${address || 'Not specified'}
Phone: ${phone || 'Not specified'}

Your primary functions:
1. Answer customer questions about ${name}
2. Help visitors learn about products/services
3. Collect contact information when visitors express interest
4. Be courteous, helpful, and stay in character as a ${tone} representative

When customers ask about contact information:
- Feel free to share the business address: ${address || 'Please contact us for our address.'}
- Share the phone number: ${phone || 'Please contact us for our phone number.'}

When customers express interest in services:
- Ask for their name, email, or phone to help them further
- Thank them for their interest

Keep responses concise, friendly, and professional. Don't provide fictional information.`;
}

/**
 * Extract potential lead information from user messages
 */
export function extractLeadInfo(userMessage: string): Partial<ChatbotLead> {
  const leadInfo: Partial<ChatbotLead> = {};
  
  // Try to extract email
  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
  const emailMatches = userMessage.match(emailRegex);
  if (emailMatches && emailMatches.length > 0) {
    leadInfo.email = emailMatches[0];
  }
  
  // Try to extract phone
  const phoneRegex = /(\+\d{1,3})?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
  const phoneMatches = userMessage.match(phoneRegex);
  if (phoneMatches && phoneMatches.length > 0) {
    leadInfo.phone = phoneMatches[0];
  }
  
  // Check if the message looks like contact info submission
  if (leadInfo.email || leadInfo.phone) {
    // Try to extract name - this is a naive approach
    const nameMatch = userMessage.match(/(?:(?:my|i'm|i am|this is)\s+)([a-z]+(?:\s+[a-z]+)?)/i);
    if (nameMatch && nameMatch[1]) {
      leadInfo.name = nameMatch[1].trim();
    }
  }
  
  return leadInfo;
}

/**
 * Check if we should capture lead info based on the conversation
 */
export function shouldCaptureLead(messages: ChatMessage[]): boolean {
  if (messages.length < 2) return false;
  
  const lastUserMessage = messages
    .slice()
    .reverse()
    .find(msg => msg.role === 'user')?.content.toLowerCase() || '';
    
  const lastBotMessage = messages
    .slice()
    .reverse()
    .find(msg => msg.role === 'assistant')?.content.toLowerCase() || '';
  
  // Check if bot asked for contact information
  const botAskedForContact = lastBotMessage.includes('email') || 
    lastBotMessage.includes('phone') || 
    lastBotMessage.includes('contact') ||
    lastBotMessage.includes('reach you');
  
  // Check if user message contains email or phone patterns
  const hasEmail = /[\w.-]+@[\w.-]+\.\w+/g.test(lastUserMessage);
  const hasPhone = /(\+\d{1,3})?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g.test(lastUserMessage);
  
  // Check if user is asking about services or products
  const askingAboutServices = lastUserMessage.includes('service') || 
    lastUserMessage.includes('product') || 
    lastUserMessage.includes('offer') ||
    lastUserMessage.includes('appointment') ||
    lastUserMessage.includes('booking') ||
    lastUserMessage.includes('schedule');
  
  return (botAskedForContact && (hasEmail || hasPhone)) || 
         (askingAboutServices && (hasEmail || hasPhone));
}

// Function to get business details for context
export async function getBusinessContext(businessId: string): Promise<string> {
  const supabase = createClient(cookies());
  
  const { data: business, error } = await supabase
    .from('businesses')
    .select('*, business_hours(*), business_details(*)')
    .eq('id', businessId)
    .single();
  
  if (error || !business) {
    console.error('Error fetching business context:', error);
    return 'You are a helpful assistant for a business.';
  }
  
  // Construct business context
  let context = `You are a helpful customer service AI for ${business.name}.
Business information:
- Name: ${business.name}
- Description: ${business.description || 'Not provided'}
- Address: ${business.business_details?.address || 'Not provided'}
- Phone: ${business.business_details?.phone || 'Not provided'}
- Email: ${business.business_details?.email || 'Not provided'}
`;

  // Add business hours if available
  if (business.business_hours && business.business_hours.length > 0) {
    context += '- Business Hours:\n';
    business.business_hours.forEach((hours: any) => {
      context += `  ${hours.day}: ${hours.open ? `${hours.open_time} - ${hours.close_time}` : 'Closed'}\n`;
    });
  }

  // Add specific instructions based on business type
  context += `
Your goal is to provide helpful information about the business, answer questions, and assist potential customers.
Be friendly but professional. If you don't know an answer, be honest and suggest the customer contact the business directly.
If the customer asks for specific availability or pricing that you don't have, suggest they call or email the business.
If they want to book an appointment or place an order, collect their information and let them know someone from the business will contact them.
`;

  return context;
}

// Function to check if a message matches a custom FAQ
function matchFAQ(message: string, faqs: { question: string; answer: string }[]): string | null {
  if (!faqs || faqs.length === 0) return null;
  
  const normalizedMessage = message.toLowerCase().trim();
  
  for (const faq of faqs) {
    const normalizedQuestion = faq.question.toLowerCase().trim();
    
    // Simple exact matching
    if (normalizedMessage === normalizedQuestion) {
      return faq.answer;
    }
    
    // Contains matching (could be improved with more sophisticated matching)
    if (normalizedMessage.includes(normalizedQuestion) || 
        normalizedQuestion.includes(normalizedMessage)) {
      return faq.answer;
    }
  }
  
  return null;
}

// Function to detect potential leads in messages
export function detectLeadInfo(message: string): Partial<ChatbotLead> {
  const leadInfo: Partial<ChatbotLead> = {};
  
  // Email detection
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emails = message.match(emailRegex);
  if (emails && emails.length > 0) {
    leadInfo.email = emails[0];
  }
  
  // Phone detection (various formats)
  const phoneRegex = /(\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
  const phones = message.match(phoneRegex);
  if (phones && phones.length > 0) {
    leadInfo.phone = phones[0];
  }
  
  // Name detection (simplified approach - could be improved)
  // Look for "my name is" or "I am" patterns
  const namePatterns = [
    /my name is ([A-Za-z\s]+)/i,
    /I am ([A-Za-z\s]+)/i,
    /I'm ([A-Za-z\s]+)/i,
    /this is ([A-Za-z\s]+)/i
  ];
  
  for (const pattern of namePatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      // Clean up the name (remove trailing punctuation, etc.)
      const potentialName = match[1].trim().replace(/[,.!?]$/, '');
      
      // Only use if it seems like a name (not too long, doesn't contain suspicious words)
      if (potentialName.split(' ').length <= 4 && 
          !potentialName.toLowerCase().includes('interested') &&
          !potentialName.toLowerCase().includes('looking')) {
        leadInfo.name = potentialName;
        break;
      }
    }
  }
  
  return leadInfo;
}

// Function to get conversation history
export async function getChatHistory(businessId: string, sessionId: string, maxMessages: number = 10): Promise<ChatMessage[]> {
  const supabase = createClient(cookies());
  
  const { data, error } = await supabase
    .from('chatbot_logs')
    .select('*')
    .eq('business_id', businessId)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(maxMessages);
  
  if (error) {
    console.error('Error fetching chat history:', error);
    return [];
  }
  
  return data.map(log => [
    { role: 'user' as const, content: log.user_message },
    { role: 'assistant' as const, content: log.bot_response }
  ]).flat();
}

// Function to log a conversation message
export async function logChatMessage(
  businessId: string, 
  sessionId: string, 
  userMessage: string, 
  botResponse: string,
  tokensUsed: number
): Promise<void> {
  const supabase = createClient(cookies());
  
  const { error } = await supabase
    .from('chatbot_logs')
    .insert({
      business_id: businessId,
      session_id: sessionId,
      user_message: userMessage,
      bot_response: botResponse,
      tokens_used: tokensUsed
    });
  
  if (error) {
    console.error('Error logging chat message:', error);
  }
}

// Function to save feedback
export async function saveFeedback(feedbackData: ChatbotFeedback): Promise<void> {
  const supabase = createClient(cookies());
  
  const { error } = await supabase
    .from('chatbot_feedback')
    .insert(feedbackData);
  
  if (error) {
    console.error('Error saving feedback:', error);
  }
}

// Function to save lead information
export async function saveLead(leadData: ChatbotLead): Promise<void> {
  const supabase = createClient(cookies());
  
  // Check if lead with this session already exists
  const { data: existingLead, error: fetchError } = await supabase
    .from('chatbot_leads')
    .select('id, name, email, phone, notes')
    .eq('business_id', leadData.business_id)
    .eq('session_id', leadData.session_id)
    .single();
  
  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('Error checking for existing lead:', fetchError);
    return;
  }
  
  if (existingLead) {
    // Update existing lead with any new information
    const updateData: Partial<ChatbotLead> = {};
    
    if (leadData.name && !existingLead.name) updateData.name = leadData.name;
    if (leadData.email && !existingLead.email) updateData.email = leadData.email;
    if (leadData.phone && !existingLead.phone) updateData.phone = leadData.phone;
    
    // Only update if we have new information
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('chatbot_leads')
        .update(updateData)
        .eq('id', existingLead.id);
      
      if (updateError) {
        console.error('Error updating lead:', updateError);
      }
    }
  } else {
    // Create new lead
    const { error: insertError } = await supabase
      .from('chatbot_leads')
      .insert({
        business_id: leadData.business_id,
        session_id: leadData.session_id,
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone,
        notes: leadData.notes,
        status: 'new'
      });
    
    if (insertError) {
      console.error('Error creating lead:', insertError);
    }
  }
}

// Main function to process a message and get a response
export async function processChatbotMessage(
  businessId: string,
  sessionId: string,
  userMessage: string,
  previousMessages: ChatMessage[] = []
): Promise<{ 
  response: string; 
  leadInfo?: Partial<ChatbotLead>;
  isLeadCollectionAttempt?: boolean;
  logId?: string;
}> {
  try {
    // Get business settings
    const settings = await getChatbotSettings(businessId);
    
    if (!settings.is_enabled) {
      return { response: "Sorry, this chatbot is currently disabled." };
    }
    
    // Check for FAQ match
    const faqMatch = matchFAQ(userMessage, settings.custom_faqs);
    if (faqMatch) {
      await logChatMessage(businessId, sessionId, userMessage, faqMatch, 0);
      return { response: faqMatch };
    }
    
    // Get business context
    const businessContext = await getBusinessContext(businessId);
    
    // Detect lead information
    const leadInfo = settings.lead_capture_enabled ? detectLeadInfo(userMessage) : {};
    
    // Prepare messages for OpenAI
    const messages: ChatMessage[] = [
      { role: 'system', content: businessContext },
      ...previousMessages.slice(-settings.max_history_length),
      { role: 'user', content: userMessage }
    ];
    
    // Check if we should try to collect contact information
    const isLeadCollectionAttempt = settings.lead_capture_enabled && 
      previousMessages.length >= 2 && 
      !leadInfo.email && !leadInfo.phone;
    
    if (isLeadCollectionAttempt) {
      // Add lead collection instruction to system message
      messages.unshift({
        role: 'system',
        content: `If the user seems interested in the business's services or has specific questions that indicate they might become a customer, POLITELY ask for their contact information (email or phone) so the business can follow up with them. But don't be pushy or ask for contact info more than once.`
      });
    }
    
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages as any, // Type workaround
      max_tokens: 500,
      temperature: settings.tone === 'friendly' ? 0.7 : settings.tone === 'professional' ? 0.3 : 0.5,
    });
    
    const response = completion.choices[0].message.content || "I'm sorry, I couldn't generate a response.";
    const tokensUsed = completion.usage?.total_tokens || 0;
    
    // Log the message
    const { data: logData, error: logError } = await createClient(cookies())
      .from('chatbot_logs')
      .insert({
        business_id: businessId,
        session_id: sessionId,
        user_message: userMessage,
        bot_response: response,
        tokens_used: tokensUsed
      })
      .select('id')
      .single();
    
    if (logError) {
      console.error('Error logging message:', logError);
    }
    
    // Save lead information if detected
    if (settings.lead_capture_enabled && (leadInfo.email || leadInfo.phone || leadInfo.name)) {
      await saveLead({
        business_id: businessId,
        session_id: sessionId,
        ...leadInfo,
        status: 'new'
      });
    }
    
    return { 
      response, 
      leadInfo: Object.keys(leadInfo).length > 0 ? leadInfo : undefined,
      isLeadCollectionAttempt,
      logId: logData?.id
    };
  } catch (error) {
    console.error('Error processing chatbot message:', error);
    return { 
      response: "I'm sorry, I encountered an error processing your message. Please try again later."
    };
  }
} 