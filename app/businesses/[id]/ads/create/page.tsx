'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Heading, 
  Box, 
  Spinner, 
  Alert, 
  AlertIcon,
  Button,
  Container,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
} from '@chakra-ui/react';
import { ChevronRightIcon } from '@chakra-ui/icons';
import CampaignWizard from '@/app/components/CampaignWizard';

export default function CreateCampaignPage({ params }: { params: { id: string } }) {
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchBusinessDetails() {
      try {
        const response = await fetch(`/api/businesses/${params.id}`);
        
        if (response.status === 401) {
          // User is not authenticated, redirect to login
          router.push('/login');
          return;
        }
        
        if (!response.ok) {
          throw new Error('Failed to fetch business details');
        }
        
        const data = await response.json();
        setBusiness(data);
        
        // Check if the business has a connected Google Ads account
        if (!data.google_ads_customer_id) {
          setError('This business does not have a connected Google Ads account. Please connect an account first.');
        }
      } catch (err) {
        setError('An error occurred while fetching business details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchBusinessDetails();
  }, [params.id, router]);

  return (
    <Container maxW="container.lg" py={8}>
      <Breadcrumb separator={<ChevronRightIcon color="gray.500" />} mb={8}>
        <BreadcrumbItem>
          <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
        </BreadcrumbItem>
        
        <BreadcrumbItem>
          <BreadcrumbLink href={`/businesses/${params.id}`}>
            {business ? business.name : 'Business'}
          </BreadcrumbLink>
        </BreadcrumbItem>
        
        <BreadcrumbItem isCurrentPage>
          <BreadcrumbLink>Create Campaign</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>
      
      <Heading as="h1" mb={6}>Create Google Ads Campaign</Heading>
      
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minH="400px">
          <Spinner size="xl" />
        </Box>
      ) : error ? (
        <Box mb={8}>
          <Alert status="error" mb={4}>
            <AlertIcon />
            {error}
          </Alert>
          
          <Button 
            colorScheme="blue" 
            onClick={() => router.push(`/businesses/${params.id}`)}
          >
            Back to Business
          </Button>
        </Box>
      ) : (
        <CampaignWizard businessId={params.id} businessName={business.name} />
      )}
    </Container>
  );
} 