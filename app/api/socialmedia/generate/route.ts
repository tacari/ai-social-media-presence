import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/app/lib/auth';
import { generateSocialMediaContent } from '@/app/lib/socialMedia';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const data = await request.json();
    const { businessName, industry, platform } = data;
    
    if (!businessName || !platform) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    if (!['facebook', 'instagram', 'twitter', 'linkedin'].includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform specified' },
        { status: 400 }
      );
    }
    
    const content = await generateSocialMediaContent(
      businessName,
      industry || 'general',
      platform as any
    );
    
    return NextResponse.json({ content });
  } catch (error) {
    console.error('Error generating social media content:', error);
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    );
  }
} 