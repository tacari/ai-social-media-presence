import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/supabase';
import { getSession } from '@/app/lib/auth';
import { 
  getSocialMediaPosts, 
  storeSocialMediaPost, 
  updateSocialMediaPost, 
  postToSocialMedia,
  generateSocialMediaContent
} from '@/app/lib/socialMedia';

// Get all posts for a business
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const platform = searchParams.get('platform');
    const status = searchParams.get('status');
    
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
    
    const posts = await getSocialMediaPosts(
      businessId, 
      platform || undefined, 
      status || undefined
    );
    
    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Error fetching social media posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch social media posts' },
      { status: 500 }
    );
  }
}

// Create a new social media post
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const data = await request.json();
    const { 
      businessId, 
      platformAccountId, 
      platform, 
      content, 
      imageUrl, 
      scheduledTime,
      generateAI
    } = data;
    
    if (!businessId || !platformAccountId || !platform) {
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
    
    // Verify platform account
    const { data: account, error: accountError } = await supabase
      .from('platform_accounts')
      .select('*')
      .eq('id', platformAccountId)
      .eq('business_id', businessId)
      .single();
    
    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Platform account not found or access denied' },
        { status: 403 }
      );
    }
    
    let finalContent = content;
    
    // Generate AI content if requested
    if (generateAI && (!content || content.trim() === '')) {
      finalContent = await generateSocialMediaContent(
        business.name,
        business.industry || 'general',
        platform
      );
    }
    
    if (!finalContent || finalContent.trim() === '') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }
    
    // Check platform-specific requirements
    if (platform === 'instagram' && !imageUrl) {
      return NextResponse.json(
        { error: 'Instagram posts require an image' },
        { status: 400 }
      );
    }
    
    // Determine status - draft, scheduled, or immediate posting
    let status: 'draft' | 'scheduled' | 'posted' = 'draft';
    
    if (scheduledTime) {
      status = 'scheduled';
    }
    
    // Create the post
    const post = await storeSocialMediaPost({
      business_id: businessId,
      platform_account_id: platformAccountId,
      platform,
      content: finalContent,
      image_url: imageUrl,
      scheduled_time: scheduledTime,
      status,
      ai_generated: !!generateAI
    });
    
    // If immediate posting is requested
    if (data.postNow) {
      try {
        const publishedPost = await postToSocialMedia(post.id);
        return NextResponse.json({ post: publishedPost });
      } catch (postError) {
        console.error('Error posting to social media:', postError);
        return NextResponse.json(
          { 
            error: 'Post was created but immediate publishing failed', 
            post 
          },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json({ post });
  } catch (error) {
    console.error('Error creating social media post:', error);
    return NextResponse.json(
      { error: 'Failed to create social media post' },
      { status: 500 }
    );
  }
}

// Update an existing post
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const data = await request.json();
    const { postId, content, imageUrl, scheduledTime, action } = data;
    
    if (!postId) {
      return NextResponse.json(
        { error: 'Missing post ID' },
        { status: 400 }
      );
    }
    
    // Get the post to verify access
    const supabase = createServerClient();
    const { data: post, error: postError } = await supabase
      .from('social_media_posts')
      .select('*, businesses(*)')
      .eq('id', postId)
      .single();
    
    if (postError || !post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }
    
    // Check if post is already published
    if (post.status === 'posted' && !action) {
      return NextResponse.json(
        { error: 'Cannot update a published post' },
        { status: 400 }
      );
    }
    
    // Handle special actions
    if (action) {
      switch (action) {
        case 'publish':
          try {
            const publishedPost = await postToSocialMedia(postId);
            return NextResponse.json({ post: publishedPost });
          } catch (publishError) {
            console.error('Error publishing post:', publishError);
            return NextResponse.json(
              { error: 'Failed to publish post' },
              { status: 500 }
            );
          }
          
        case 'cancel':
          const cancelledPost = await updateSocialMediaPost(postId, {
            status: 'draft',
            scheduled_time: null
          });
          return NextResponse.json({ post: cancelledPost });
          
        default:
          return NextResponse.json(
            { error: 'Invalid action' },
            { status: 400 }
          );
      }
    }
    
    // Regular update
    const updates: any = {};
    
    if (content !== undefined) {
      updates.content = content;
    }
    
    if (imageUrl !== undefined) {
      updates.image_url = imageUrl;
    }
    
    if (scheduledTime !== undefined) {
      updates.scheduled_time = scheduledTime;
      updates.status = scheduledTime ? 'scheduled' : 'draft';
    }
    
    const updatedPost = await updateSocialMediaPost(postId, updates);
    
    return NextResponse.json({ post: updatedPost });
  } catch (error) {
    console.error('Error updating social media post:', error);
    return NextResponse.json(
      { error: 'Failed to update social media post' },
      { status: 500 }
    );
  }
}

// Delete a post
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');
    
    if (!postId) {
      return NextResponse.json(
        { error: 'Missing post ID parameter' },
        { status: 400 }
      );
    }
    
    // Get the post to verify access
    const supabase = createServerClient();
    const { data: post, error: postError } = await supabase
      .from('social_media_posts')
      .select('*, businesses(*)')
      .eq('id', postId)
      .single();
    
    if (postError || !post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }
    
    // Check if post is already published
    if (post.status === 'posted') {
      return NextResponse.json(
        { error: 'Cannot delete a published post' },
        { status: 400 }
      );
    }
    
    // Delete the post
    const { error: deleteError } = await supabase
      .from('social_media_posts')
      .delete()
      .eq('id', postId);
    
    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete post' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting social media post:', error);
    return NextResponse.json(
      { error: 'Failed to delete social media post' },
      { status: 500 }
    );
  }
} 