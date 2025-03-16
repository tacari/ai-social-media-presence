'use client';

import React, { useState, useEffect } from 'react';
import { Button, Card, Select, Spinner, Alert, Box, Flex, Text, Heading, Badge } from '@chakra-ui/react';
import { FcGoogle } from 'react-icons/fc';
import { MdCampaign, MdCheckCircle, MdError } from 'react-icons/md';

interface GoogleAdsConnectProps {
  businessId: string;
  isConnected?: boolean;
}

interface GoogleAdsAccount {
  id: string;
  name: string;
}

export default function GoogleAdsConnect({ businessId, isConnected = false }: GoogleAdsConnectProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [accounts, setAccounts] = useState<GoogleAdsAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [connected, setConnected] = useState<boolean>(isConnected);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showCampaignButton, setShowCampaignButton] = useState<boolean>(isConnected);

  // Fetch Google Ads accounts if the component mounts and we're not already connected
  useEffect(() => {
    if (!connected) {
      fetchGoogleAdsAccounts();
    }
  }, [connected]);

  // Fetch Google Ads accounts
  const fetchGoogleAdsAccounts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/googleads/connect`);
      const data = await response.json();
      
      if (response.ok) {
        if (data.connected) {
          setAccounts(data.accounts);
          if (data.accounts.length > 0) {
            setSelectedAccount(data.accounts[0].id);
          }
        } else {
          // Not connected, store the auth URL for later
          setAccounts([]);
        }
        setConnected(data.connected);
      } else {
        setError(data.error || 'Failed to fetch Google Ads accounts');
      }
    } catch (err) {
      setError('An error occurred while fetching Google Ads accounts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Google Ads connection
  const handleConnectGoogleAds = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/googleads/connect`);
      const data = await response.json();
      
      if (response.ok && data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
      } else {
        setError(data.error || 'Failed to initiate Google Ads connection');
      }
    } catch (err) {
      setError('An error occurred while connecting to Google Ads');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle linking Google Ads account to business
  const handleLinkAccount = async () => {
    if (!selectedAccount) {
      setError('Please select a Google Ads account');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/googleads/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId,
          customerId: selectedAccount,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setConnected(true);
        setShowCampaignButton(true);
        setMessage('Google Ads account successfully linked to your business!');
      } else {
        setError(data.error || 'Failed to link Google Ads account');
      }
    } catch (err) {
      setError('An error occurred while linking Google Ads account');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = () => {
    // Redirect to campaign creation page
    window.location.href = `/businesses/${businessId}/ads/create`;
  };

  return (
    <Card p={6} shadow="md" borderRadius="lg" width="100%" mb={6}>
      <Flex direction="column" gap={4}>
        <Flex justify="space-between" align="center" mb={2}>
          <Heading size="md">Google Ads Integration</Heading>
          {connected && (
            <Badge colorScheme="green" display="flex" alignItems="center" px={2} py={1}>
              <MdCheckCircle style={{ marginRight: '4px' }} />
              Connected
            </Badge>
          )}
        </Flex>
        
        <Text>Automate your Google Ads campaigns with AI-powered ad creation, keyword suggestions, and budget optimization.</Text>
        
        {error && (
          <Alert status="error" borderRadius="md">
            <Flex align="center">
              <MdError style={{ marginRight: '8px' }} />
              {error}
            </Flex>
          </Alert>
        )}
        
        {message && (
          <Alert status="success" borderRadius="md">
            <Flex align="center">
              <MdCheckCircle style={{ marginRight: '8px' }} />
              {message}
            </Flex>
          </Alert>
        )}
        
        {loading ? (
          <Flex justify="center" py={4}>
            <Spinner size="lg" color="blue.500" />
          </Flex>
        ) : (
          <>
            {!connected ? (
              <Box>
                <Button
                  leftIcon={<FcGoogle />}
                  colorScheme="gray"
                  onClick={handleConnectGoogleAds}
                  isLoading={loading}
                  mb={4}
                  width="100%"
                >
                  Connect Google Ads
                </Button>
                
                <Text fontSize="sm" color="gray.600">
                  Connect your Google Ads account to manage campaigns and track performance.
                </Text>
              </Box>
            ) : accounts.length > 0 ? (
              <>
                {!showCampaignButton ? (
                  <Box>
                    <Text mb={2}>Select your Google Ads account:</Text>
                    <Select
                      value={selectedAccount}
                      onChange={(e) => setSelectedAccount(e.target.value)}
                      mb={4}
                    >
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </Select>
                    
                    <Button
                      colorScheme="blue"
                      onClick={handleLinkAccount}
                      isLoading={loading}
                      width="100%"
                    >
                      Link Google Ads Account
                    </Button>
                  </Box>
                ) : (
                  <Box>
                    <Button
                      leftIcon={<MdCampaign />}
                      colorScheme="green"
                      onClick={handleCreateCampaign}
                      width="100%"
                    >
                      Create AI-Powered Campaign
                    </Button>
                    
                    <Text fontSize="sm" color="gray.600" mt={2}>
                      Create campaigns with AI-generated ad copy, keywords, and smart budget optimization.
                    </Text>
                  </Box>
                )}
              </>
            ) : (
              <Text>No Google Ads accounts found. Please create one at ads.google.com first.</Text>
            )}
          </>
        )}
      </Flex>
    </Card>
  );
} 