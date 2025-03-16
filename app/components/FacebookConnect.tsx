'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithFacebook } from '@/app/lib/auth';

interface FacebookConnectProps {
  businessId: string;
  isConnected: boolean;
}

interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  category: string;
  picture?: {
    data: {
      url: string;
    };
  };
}

export default function FacebookConnect({ businessId, isConnected }: FacebookConnectProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<FacebookPage | null>(null);
  const [postContent, setPostContent] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [error, setError] = useState('');
  
  // Format a date for the datetime-local input (YYYY-MM-DDThh:mm)
  const formatDateForInput = (date: Date): string => {
    return date.toISOString().slice(0, 16);
  };
  
  // Set a default scheduled time (1 hour from now)
  useEffect(() => {
    const defaultTime = new Date();
    defaultTime.setHours(defaultTime.getHours() + 1);
    setScheduledTime(formatDateForInput(defaultTime));
  }, []);
  
  // Fetch Facebook pages if the user is authenticated with Facebook
  useEffect(() => {
    if (!isConnected) {
      fetchFacebookPages();
    }
  }, [isConnected]);
  
  const fetchFacebookPages = async () => {
    try {
      const response = await fetch(`/api/facebook/connect`);
      
      if (response.status === 401) {
        // User needs to authenticate with Facebook
        return;
      }
      
      if (!response.ok) {
        const error = await response.json();
        // Silently fail - user probably hasn't connected Facebook yet
        console.error('Failed to fetch Facebook pages:', error);
        return;
      }
      
      const data = await response.json();
      setPages(data.pages || []);
      
      if (data.pages && data.pages.length > 0) {
        setSelectedPage(data.pages[0]);
      }
    } catch (error) {
      console.error('Error fetching Facebook pages:', error);
      // Don't show an error to the user, they might not have connected Facebook yet
    }
  };
  
  const handleFacebookConnect = async () => {
    setLoading(true);
    setError('');
    
    try {
      await signInWithFacebook(`${window.location.origin}/businesses/${businessId}`);
      // The page will redirect to Facebook for authentication
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to connect with Facebook');
      setLoading(false);
    }
  };
  
  const handleConnectPage = async () => {
    if (!selectedPage) {
      setError('Please select a Facebook page');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/facebook/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId,
          pageId: selectedPage.id,
          pageAccessToken: selectedPage.access_token
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect Facebook page');
      }
      
      // Refresh the page data
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to connect Facebook page');
    } finally {
      setLoading(false);
    }
  };
  
  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setPosting(true);
    setError('');
    
    try {
      const response = await fetch('/api/facebook/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId,
          content: postContent || undefined, // Only send if there's content
          scheduledTime: scheduledTime ? new Date(scheduledTime).toISOString() : undefined
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to post to Facebook');
      }
      
      // Clear the form
      setPostContent('');
      
      // Show success message
      if (data.scheduled) {
        alert(`Post scheduled for ${new Date(data.scheduled_time).toLocaleString()}`);
      } else {
        alert('Post published successfully!');
      }
      
      // Refresh the page data
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to post to Facebook');
    } finally {
      setPosting(false);
    }
  };
  
  return (
    <div className="mb-6 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Facebook Integration</h2>
      
      {error && (
        <div className="p-4 mb-4 text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}
      
      {!isConnected ? (
        <div>
          {pages.length === 0 ? (
            <div>
              <p className="mb-4 text-gray-600">
                Connect your Facebook account to enable AI-powered social media management for your business pages.
              </p>
              <button
                onClick={handleFacebookConnect}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Connecting...' : 'Connect with Facebook'}
              </button>
            </div>
          ) : (
            <div>
              <p className="mb-4 text-gray-600">
                Select a Facebook page to connect:
              </p>
              <div className="mb-4">
                <select
                  value={selectedPage?.id || ''}
                  onChange={(e) => {
                    const page = pages.find(p => p.id === e.target.value);
                    setSelectedPage(page || null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {pages.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.name} ({page.category})
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleConnectPage}
                disabled={loading || !selectedPage}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Connecting...' : 'Connect Facebook Page'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div>
          <p className="mb-4 text-green-600 font-semibold">
            ✓ Facebook Page Connected
          </p>
          <p className="mb-4 text-gray-600">
            Create and schedule posts for your Facebook Page with AI-generated content.
          </p>
          
          <form onSubmit={handlePost} className="space-y-4">
            <div>
              <label htmlFor="postContent" className="block text-sm font-medium text-gray-700">
                Post Content (leave empty for AI-generated content)
              </label>
              <textarea
                id="postContent"
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Enter your post content or leave empty to use AI-generated content"
              />
            </div>
            
            <div>
              <label htmlFor="scheduledTime" className="block text-sm font-medium text-gray-700">
                Schedule Time (optional)
              </label>
              <input
                type="datetime-local"
                id="scheduledTime"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Leave empty to post immediately
              </p>
            </div>
            
            <div>
              <button
                type="submit"
                disabled={posting}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {posting ? 'Posting...' : scheduledTime ? 'Schedule Post' : 'Post Now'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
} 