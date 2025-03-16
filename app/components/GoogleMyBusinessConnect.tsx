'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithGoogle } from '@/app/lib/auth';

interface GoogleMyBusinessConnectProps {
  businessId: string;
  isConnected: boolean;
}

interface GMBAccount {
  name: string;
  accountName: string;
  type: string;
}

export default function GoogleMyBusinessConnect({ businessId, isConnected }: GoogleMyBusinessConnectProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [accounts, setAccounts] = useState<GMBAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [error, setError] = useState('');
  
  // Fetch GMB accounts if the user is authenticated with Google
  useEffect(() => {
    if (!isConnected) {
      fetchGMBAccounts();
    }
  }, [isConnected]);
  
  const fetchGMBAccounts = async () => {
    try {
      const response = await fetch(`/api/gmb/connect`);
      
      if (response.status === 401) {
        // User needs to authenticate with Google
        return;
      }
      
      if (!response.ok) {
        const error = await response.json();
        // Silently fail - user probably hasn't connected Google yet
        console.error('Failed to fetch GMB accounts:', error);
        return;
      }
      
      const data = await response.json();
      setAccounts(data.accounts || []);
      
      if (data.accounts && data.accounts.length > 0) {
        setSelectedAccount(data.accounts[0].name);
      }
    } catch (error) {
      console.error('Error fetching GMB accounts:', error);
      // Don't show an error to the user, they might not have connected Google yet
    }
  };
  
  const handleGoogleConnect = async () => {
    setLoading(true);
    setError('');
    
    try {
      await signInWithGoogle(`${window.location.origin}/businesses/${businessId}`);
      // The page will redirect to Google for authentication
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to connect with Google');
      setLoading(false);
    }
  };
  
  const handleConnectGMB = async () => {
    if (!selectedAccount) {
      setError('Please select a Google My Business account');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/gmb/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId,
          accountId: selectedAccount,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect Google My Business account');
      }
      
      // Refresh the page data
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to connect Google My Business account');
    } finally {
      setLoading(false);
    }
  };
  
  const handleOptimize = async () => {
    setOptimizing(true);
    setError('');
    
    try {
      const response = await fetch('/api/gmb/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ businessId }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to optimize GMB profile');
      }
      
      alert(`Profile optimized! New description: "${data.description}"`);
      
      // Refresh the page data
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to optimize GMB profile');
    } finally {
      setOptimizing(false);
    }
  };
  
  return (
    <div className="mb-6 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Google My Business Integration</h2>
      
      {error && (
        <div className="p-4 mb-4 text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}
      
      {!isConnected ? (
        <div>
          {accounts.length === 0 ? (
            <div>
              <p className="mb-4 text-gray-600">
                Connect your Google account to enable AI-powered SEO optimization for your Google My Business profile.
              </p>
              <button
                onClick={handleGoogleConnect}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {loading ? 'Connecting...' : 'Connect with Google'}
              </button>
            </div>
          ) : (
            <div>
              <p className="mb-4 text-gray-600">
                Select a Google My Business account to connect:
              </p>
              <div className="mb-4">
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {accounts.map((account) => (
                    <option key={account.name} value={account.name}>
                      {account.accountName || 'Google My Business Account'}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleConnectGMB}
                disabled={loading || !selectedAccount}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {loading ? 'Connecting...' : 'Connect Google My Business'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div>
          <p className="mb-4 text-green-600 font-semibold">
            ✓ Google My Business Connected
          </p>
          <p className="mb-4 text-gray-600">
            Use AI to optimize your Google My Business profile for better local SEO and visibility.
          </p>
          <button
            onClick={handleOptimize}
            disabled={optimizing}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {optimizing ? 'Optimizing...' : 'Optimize GMB Profile with AI'}
          </button>
        </div>
      )}
    </div>
  );
} 