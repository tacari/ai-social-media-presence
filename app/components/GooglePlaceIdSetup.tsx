'use client';

import { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, Alert, CircularProgress, Card, CardContent, CardHeader } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LocationOnIcon from '@mui/icons-material/LocationOn';

interface GooglePlaceIdSetupProps {
  businessId: string;
}

export default function GooglePlaceIdSetup({ businessId }: GooglePlaceIdSetupProps) {
  const [placeId, setPlaceId] = useState<string>('');
  const [customPlaceId, setCustomPlaceId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [isConfigured, setIsConfigured] = useState<boolean>(false);

  // Fetch place ID on component mount
  useEffect(() => {
    if (businessId) {
      checkPlaceId();
    }
  }, [businessId]);

  // Check if place ID is already set
  const checkPlaceId = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/businesses/place-id?businessId=${businessId}`);
      
      if (response.ok) {
        const data = await response.json();
        setPlaceId(data.placeId);
        setCustomPlaceId(data.placeId);
        setIsConfigured(true);
      } else {
        const errorData = await response.json();
        
        // Don't show error if place ID is just not found yet
        if (response.status !== 404 || errorData.error !== 'Could not find a Google Place ID for this business') {
          setError(errorData.error || 'Failed to check place ID');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Auto-find place ID using the business name and address
  const handleFindPlaceId = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      
      const response = await fetch(`/api/businesses/place-id?businessId=${businessId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to find place ID');
      }
      
      const data = await response.json();
      setPlaceId(data.placeId);
      setCustomPlaceId(data.placeId);
      setIsConfigured(true);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Manually set place ID
  const handleSetPlaceId = async () => {
    if (!customPlaceId.trim()) {
      setError('Place ID cannot be empty');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      
      const response = await fetch('/api/businesses/place-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId,
          placeId: customPlaceId.trim(),
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to set place ID');
      }
      
      const data = await response.json();
      setPlaceId(data.placeId);
      setIsConfigured(true);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card variant="outlined" sx={{ mt: 3 }}>
      <CardHeader title="Google Place ID" />
      
      <CardContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Place ID successfully configured!
          </Alert>
        )}
        
        {isConfigured ? (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" sx={{ mb: 1 }}>
              Current Google Place ID:
            </Typography>
            <Typography 
              variant="subtitle1" 
              fontWeight="bold"
              sx={{ 
                p: 1, 
                backgroundColor: 'rgba(0, 0, 0, 0.04)', 
                borderRadius: 1,
                wordBreak: 'break-all'
              }}
            >
              {placeId}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Configure the Google Place ID to enable reviews monitoring for this business.
          </Typography>
        )}
        
        <Box sx={{ mt: 3 }}>
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={handleFindPlaceId}
            disabled={loading}
            sx={{ mr: 2, mb: 2 }}
          >
            {loading ? 'Searching...' : 'Auto-Find Place ID'}
          </Button>
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
            We'll attempt to find your business on Google using your business name and address.
          </Typography>
          
          <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
            Or enter the Place ID manually:
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mt: 1 }}>
            <TextField
              label="Google Place ID"
              value={customPlaceId}
              onChange={(e) => setCustomPlaceId(e.target.value)}
              fullWidth
              variant="outlined"
              placeholder="Enter Place ID"
              size="small"
              sx={{ mr: 2 }}
            />
            
            <Button
              variant="outlined"
              startIcon={<LocationOnIcon />}
              onClick={handleSetPlaceId}
              disabled={loading || !customPlaceId.trim()}
            >
              Set ID
            </Button>
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            You can find your Place ID by searching for your business on <a href="https://developers.google.com/maps/documentation/places/web-service/place-id" target="_blank" rel="noopener noreferrer">Google's Place ID Finder</a>.
          </Typography>
        </Box>
        
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <CircularProgress size={24} />
          </Box>
        )}
      </CardContent>
    </Card>
  );
} 