'use client';

import { useState, useEffect } from 'react';
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  Typography, 
  Rating, 
  Box, 
  Divider, 
  TextField, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogTitle, 
  CircularProgress, 
  Alert, 
  Snackbar,
  Tabs,
  Tab,
  Chip,
  IconButton,
  Tooltip,
  Badge
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import ReplyIcon from '@mui/icons-material/Reply';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';

interface Review {
  id: string;
  business_id: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  timestamp: string;
  response?: string;
  ai_response?: string;
  response_status?: string;
}

interface ReviewsPanelProps {
  businessId: string;
}

export default function ReviewsPanel({ businessId }: ReviewsPanelProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [manualResponse, setManualResponse] = useState('');
  const [responding, setResponding] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [processingBatch, setProcessingBatch] = useState(false);
  const [useDraftResponse, setUseDraftResponse] = useState(true);

  // Fetch reviews on component mount
  useEffect(() => {
    if (businessId) {
      fetchReviews();
    }
  }, [businessId]);

  // Fetch reviews from the API
  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/reviews?businessId=${businessId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch reviews');
      }
      
      const data = await response.json();
      setReviews(data.reviews || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Refresh reviews from Google Places API
  const handleRefreshReviews = async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ businessId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to refresh reviews');
      }
      
      const data = await response.json();
      
      // Show success message
      setSnackbarMessage(`Successfully refreshed reviews. Found ${data.count} reviews.`);
      setSnackbarOpen(true);
      
      // Fetch updated reviews
      fetchReviews();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while refreshing reviews');
    } finally {
      setRefreshing(false);
    }
  };

  // Open response dialog
  const handleOpenResponseDialog = (review: Review) => {
    setSelectedReview(review);
    // If the review has an AI draft, use that as starting point, otherwise use existing response or empty string
    setManualResponse(review.ai_response || review.response || '');
    setUseDraftResponse(true);
    setResponseDialogOpen(true);
  };

  // Close response dialog
  const handleCloseResponseDialog = () => {
    setResponseDialogOpen(false);
    setSelectedReview(null);
    setManualResponse('');
    setUseDraftResponse(true);
  };

  // Generate AI response
  const handleGenerateAIResponse = async () => {
    if (!selectedReview) return;
    
    try {
      setResponding(true);
      
      const response = await fetch('/api/reviews', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewId: selectedReview.id,
          businessId,
          action: 'generate_draft'
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate response');
      }
      
      const data = await response.json();
      
      // Update the review in the list
      const updatedReview = {
        ...selectedReview,
        ai_response: data.response,
        response_status: 'draft'
      };
      
      setReviews(reviews.map(review => 
        review.id === selectedReview.id 
          ? updatedReview
          : review
      ));
      
      // Update selected review
      setSelectedReview(updatedReview);
      
      // Update manual response text field with the AI draft
      setManualResponse(data.response);
      
      setSnackbarMessage('AI response generated successfully');
      setSnackbarOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while generating response');
    } finally {
      setResponding(false);
    }
  };

  // Process pending reviews in batch
  const handleProcessPendingReviews = async () => {
    try {
      setProcessingBatch(true);
      setError(null);
      
      const response = await fetch('/api/reviews', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ businessId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process reviews');
      }
      
      const data = await response.json();
      
      setSnackbarMessage(`Successfully processed ${data.processedCount} reviews with AI.`);
      setSnackbarOpen(true);
      
      // Refresh reviews to show the updates
      fetchReviews();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while processing reviews');
    } finally {
      setProcessingBatch(false);
    }
  };

  // Save or approve response
  const handleSaveResponse = async () => {
    if (!selectedReview) return;
    
    try {
      setResponding(true);
      
      const response = await fetch('/api/reviews', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewId: selectedReview.id,
          businessId,
          useAI: false,
          response: manualResponse,
          action: useDraftResponse ? 'approve_draft' : undefined
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save response');
      }
      
      // Update the review in the list
      setReviews(reviews.map(review => 
        review.id === selectedReview.id 
          ? { 
              ...review, 
              response: manualResponse,
              response_status: 'approved'
            } 
          : review
      ));
      
      setSnackbarMessage(useDraftResponse 
        ? 'AI response approved successfully' 
        : 'Response saved successfully');
      setSnackbarOpen(true);
      
      // Close dialog
      handleCloseResponseDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving response');
    } finally {
      setResponding(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get filtered reviews based on tab selection
  const getFilteredReviews = () => {
    switch (activeTab) {
      case 0: // All reviews
        return reviews;
      case 1: // Needs response
        return reviews.filter(review => !review.response);
      case 2: // AI drafts
        return reviews.filter(review => 
          review.ai_response && 
          (!review.response || review.response_status === 'draft')
        );
      case 3: // Responded
        return reviews.filter(review => review.response && review.response_status === 'approved');
      default:
        return reviews;
    }
  };

  // Get status label for a review
  const getStatusLabel = (review: Review) => {
    if (review.response && review.response_status === 'approved') {
      return <Chip 
        size="small" 
        color="success" 
        label="Responded" 
        icon={<CheckCircleIcon />} 
      />;
    } else if (review.ai_response && review.response_status === 'draft') {
      return <Chip 
        size="small" 
        color="info" 
        label="AI Draft Ready" 
        icon={<AutoFixHighIcon />} 
      />;
    } else if (review.response_status === 'pending_ai') {
      return <Chip 
        size="small" 
        color="warning" 
        label="AI Pending" 
      />;
    } else {
      return <Chip 
        size="small" 
        color="error" 
        label="Needs Response" 
      />;
    }
  };

  // Count of reviews needing attention
  const countPendingReviews = reviews.filter(r => 
    !r.response || 
    (r.ai_response && r.response_status === 'draft')
  ).length;

  const filteredReviews = getFilteredReviews();

  return (
    <Card variant="outlined" sx={{ mt: 3, mb: 3 }}>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="h6" component="div">Customer Reviews</Typography>
            {countPendingReviews > 0 && (
              <Badge 
                badgeContent={countPendingReviews} 
                color="error"
                sx={{ ml: 2 }}
              />
            )}
          </Box>
        }
        action={
          <Box>
            <Button
              variant="outlined"
              startIcon={<AutoFixHighIcon />}
              onClick={handleProcessPendingReviews}
              disabled={processingBatch || refreshing}
              sx={{ mr: 1 }}
            >
              {processingBatch ? 'Processing...' : 'AI Response All'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleRefreshReviews}
              disabled={refreshing || processingBatch}
            >
              {refreshing ? 'Refreshing...' : 'Refresh Reviews'}
            </Button>
          </Box>
        }
      />
      
      <Tabs 
        value={activeTab} 
        onChange={(_, newValue) => setActiveTab(newValue)}
        sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
      >
        <Tab label="All Reviews" />
        <Tab label={
          <Badge badgeContent={reviews.filter(r => !r.response).length} color="error">
            Needs Response
          </Badge>
        } />
        <Tab label={
          <Badge badgeContent={reviews.filter(r => r.ai_response && r.response_status === 'draft').length} color="info">
            AI Drafts
          </Badge>
        } />
        <Tab label="Responded" />
      </Tabs>
      
      <CardContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : filteredReviews.length === 0 ? (
          <Typography variant="body1" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
            No reviews found for this filter. {reviews.length === 0 && 'Click "Refresh Reviews" to fetch the latest reviews.'}
          </Typography>
        ) : (
          <Box>
            {filteredReviews.map((review, index) => (
              <Box key={review.id} sx={{ mb: 3 }}>
                {index > 0 && <Divider sx={{ mb: 3 }} />}
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {review.reviewer_name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getStatusLabel(review)}
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(review.timestamp)}
                    </Typography>
                  </Box>
                </Box>
                
                <Rating value={review.rating} readOnly precision={0.5} sx={{ mb: 1 }} />
                
                <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                  {review.comment}
                </Typography>
                
                {review.response && (
                  <Box sx={{ pl: 2, borderLeft: '4px solid #4caf50', ml: 2, mb: 2 }}>
                    <Typography variant="subtitle2" color="primary" sx={{ mb: 0.5 }}>
                      Your Response:
                    </Typography>
                    <Typography variant="body2">
                      {review.response}
                    </Typography>
                  </Box>
                )}
                
                {!review.response && review.ai_response && (
                  <Box sx={{ pl: 2, borderLeft: '4px solid #2196f3', ml: 2, mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="subtitle2" color="info.main">
                        AI-Generated Draft Response:
                      </Typography>
                      <Button
                        variant="contained"
                        size="small"
                        color="primary"
                        startIcon={<CheckCircleIcon />}
                        onClick={() => {
                          setSelectedReview(review);
                          setManualResponse(review.ai_response || '');
                          setUseDraftResponse(true);
                          handleSaveResponse();
                        }}
                      >
                        Approve
                      </Button>
                    </Box>
                    <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                      {review.ai_response}
                    </Typography>
                  </Box>
                )}
                
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={review.response ? <EditIcon /> : review.ai_response ? <CompareArrowsIcon /> : <ReplyIcon />}
                  onClick={() => handleOpenResponseDialog(review)}
                  sx={{ mt: 1 }}
                >
                  {review.response 
                    ? 'Edit Response' 
                    : review.ai_response 
                      ? 'Review & Edit' 
                      : 'Respond'}
                </Button>
                
                {!review.ai_response && !review.response && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AutoFixHighIcon />}
                    onClick={() => {
                      setSelectedReview(review);
                      handleGenerateAIResponse();
                      handleOpenResponseDialog(review);
                    }}
                    sx={{ mt: 1, ml: 1 }}
                  >
                    Generate AI Response
                  </Button>
                )}
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
      
      {/* Response Dialog */}
      <Dialog 
        open={responseDialogOpen} 
        onClose={handleCloseResponseDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {selectedReview?.response 
            ? 'Edit Response' 
            : selectedReview?.ai_response 
              ? 'Review AI-Generated Response' 
              : 'Add Response'}
        </DialogTitle>
        
        <DialogContent>
          {selectedReview && (
            <>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Review from {selectedReview.reviewer_name}:
                </Typography>
                <Rating value={selectedReview.rating} readOnly precision={0.5} sx={{ mb: 1 }} />
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {selectedReview.comment}
                </Typography>
              </Box>
              
              {selectedReview.ai_response && !useDraftResponse && (
                <Alert 
                  severity="info" 
                  sx={{ mb: 2 }}
                  action={
                    <Button 
                      color="inherit" 
                      size="small"
                      onClick={() => {
                        setManualResponse(selectedReview.ai_response || '');
                        setUseDraftResponse(true);
                      }}
                    >
                      Use AI Draft
                    </Button>
                  }
                >
                  AI draft available. You're currently editing a custom response.
                </Alert>
              )}
              
              {selectedReview.ai_response && useDraftResponse && (
                <Alert 
                  severity="success" 
                  sx={{ mb: 2 }}
                  action={
                    <Button 
                      color="inherit" 
                      size="small"
                      onClick={() => {
                        setManualResponse('');
                        setUseDraftResponse(false);
                      }}
                    >
                      Write Custom
                    </Button>
                  }
                >
                  You're reviewing the AI-generated response. Edit as needed before approving.
                </Alert>
              )}
              
              <TextField 
                multiline
                fullWidth
                minRows={4}
                value={manualResponse}
                onChange={(e) => setManualResponse(e.target.value)}
                label="Your Response"
                variant="outlined"
                placeholder="Enter your response here..."
              />
              
              {!selectedReview.ai_response && (
                <Button
                  variant="text"
                  startIcon={<AutoFixHighIcon />}
                  onClick={handleGenerateAIResponse}
                  disabled={responding}
                  sx={{ mt: 2 }}
                >
                  {responding ? 'Generating...' : 'Generate AI Response'}
                </Button>
              )}
            </>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseResponseDialog}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveResponse} 
            color="primary" 
            variant="contained"
            disabled={responding || !manualResponse.trim()}
          >
            {responding 
              ? 'Saving...'
              : selectedReview?.ai_response && useDraftResponse 
                ? 'Approve & Save' 
                : 'Save Response'}
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Card>
  );
} 