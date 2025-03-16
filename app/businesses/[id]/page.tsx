'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Business } from '@/app/lib/supabase';
import GoogleMyBusinessConnect from '@/app/components/GoogleMyBusinessConnect';
import FacebookConnect from '@/app/components/FacebookConnect';
import GoogleAdsConnect from '@/app/components/GoogleAdsConnect';
import GooglePlaceIdSetup from '@/app/components/GooglePlaceIdSetup';
import ReviewsPanel from '@/app/components/ReviewsPanel';
import { Alert, AlertIcon, Box, Button, Container, Flex, Grid, GridItem, Heading, Icon, Link as ChakraLink, SimpleGrid, Stack, Tab, TabList, TabPanel, TabPanels, Tabs, Text, VStack } from '@chakra-ui/react';
import { Spinner } from '@/components/Spinner';
import { FaBuilding, FaChartLine, FaEdit, FaEnvelope, FaFacebook, FaInstagram, FaLinkedin, FaMapMarkerAlt, FaPhone, FaTwitter, FaUsers, FaComments } from 'react-icons/fa';
import NextLink from 'next/link';

export default function BusinessDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBusiness = async () => {
      try {
        const response = await fetch(`/api/businesses/${params.id}`);
        
        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to fetch business');
        }
        
        const data = await response.json();
        setBusiness(data.business);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to fetch business');
      } finally {
        setLoading(false);
      }
    };

    fetchBusiness();
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="min-h-screen p-8">
        <div className="flex justify-center items-center h-64">
          <Spinner size="xl" />
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="min-h-screen p-8">
        <Alert status="error" mb={4}>
          <AlertIcon />
          {error || 'Business not found'}
        </Alert>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Heading as="h1" mb={6}>{business.name}</Heading>
      
      <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={8} mt={8}>
        {/* First column: Business details */}
        <Box borderWidth="1px" borderRadius="lg" p={5}>
          <Heading size="md" mb={4}>Business Details</Heading>
          <VStack align="start" spacing={3}>
            <Flex>
              <Icon as={FaBuilding} mr={2} mt={1} />
              <Box>
                <Text fontWeight="bold">Name</Text>
                <Text>{business.name}</Text>
              </Box>
            </Flex>
            <Flex>
              <Icon as={FaMapMarkerAlt} mr={2} mt={1} />
              <Box>
                <Text fontWeight="bold">Address</Text>
                <Text>{business.address}</Text>
              </Box>
            </Flex>
            <Flex>
              <Icon as={FaPhone} mr={2} mt={1} />
              <Box>
                <Text fontWeight="bold">Phone</Text>
                <Text>{business.phone || 'Not provided'}</Text>
              </Box>
            </Flex>
            <Flex>
              <Icon as={FaEnvelope} mr={2} mt={1} />
              <Box>
                <Text fontWeight="bold">Email</Text>
                <Text>{business.email || 'Not provided'}</Text>
              </Box>
            </Flex>
            <Button 
              leftIcon={<FaEdit />} 
              colorScheme="blue" 
              variant="outline" 
              size="sm" 
              mt={2}
              as={NextLink}
              href={`/businesses/${business.id}/edit`}
            >
              Edit Details
            </Button>
          </VStack>
        </Box>

        {/* Second column: Performance Overview */}
        <Box borderWidth="1px" borderRadius="lg" p={5}>
          <Heading size="md" mb={4}>Performance Overview</Heading>
          <VStack align="start" spacing={3}>
            <Flex>
              <Icon as={FaUsers} mr={2} mt={1} />
              <Box>
                <Text fontWeight="bold">Customer Reviews</Text>
                <Text>{reviewCount || 0} reviews</Text>
              </Box>
            </Flex>
            <Flex>
              <Icon as={FaChartLine} mr={2} mt={1} />
              <Box>
                <Text fontWeight="bold">Analytics</Text>
                <Text>View performance metrics</Text>
              </Box>
            </Flex>
            <Button 
              colorScheme="blue" 
              size="sm" 
              mt={2}
              as={NextLink}
              href={`/businesses/${business.id}/analytics`}
            >
              View Analytics
            </Button>
          </VStack>
        </Box>

        {/* Third column: Integrations */}
        <Box borderWidth="1px" borderRadius="lg" p={5}>
          <Heading size="md" mb={4}>Integrations</Heading>
          <VStack align="start" spacing={5} width="100%">
            <Flex justify="space-between" width="100%">
              <Flex align="center">
                <Icon as={FaFacebook} mr={2} color="facebook.500" boxSize={5} />
                <Text fontWeight="bold">Google My Business</Text>
              </Flex>
              <Button size="sm" colorScheme="blue" as={NextLink} href={`/businesses/${business.id}/google`}>
                Manage
              </Button>
            </Flex>
            
            <Flex justify="space-between" width="100%">
              <Flex align="center">
                <Icon as={FaFacebook} mr={2} color="facebook.500" boxSize={5} />
                <Text fontWeight="bold">Facebook</Text>
              </Flex>
              <Button size="sm" colorScheme="blue" as={NextLink} href={`/businesses/${business.id}/facebook`}>
                Manage
              </Button>
            </Flex>
            
            <Flex justify="space-between" width="100%">
              <Flex align="center">
                <Box display="flex" alignItems="center">
                  <Icon as={FaFacebook} mr={1} color="facebook.500" boxSize={4} />
                  <Icon as={FaTwitter} mr={1} color="twitter.500" boxSize={4} />
                  <Icon as={FaInstagram} mr={1} color="pink.500" boxSize={4} />
                  <Icon as={FaLinkedin} mr={2} color="linkedin.500" boxSize={4} />
                  <Text fontWeight="bold">Social Media</Text>
                </Box>
              </Flex>
              <Button 
                size="sm" 
                colorScheme="blue" 
                as={NextLink} 
                href={`/businesses/${business.id}/social`}
              >
                Manage
              </Button>
            </Flex>
            
            <Flex justify="space-between" width="100%">
              <Flex align="center">
                <Icon as={FaComments} mr={2} color="green.500" boxSize={5} />
                <Text fontWeight="bold">AI Chatbot</Text>
              </Flex>
              <Button 
                size="sm" 
                colorScheme="green" 
                as={NextLink} 
                href={`/businesses/${business.id}/chatbot`}
              >
                Manage
              </Button>
            </Flex>
            
          </VStack>
        </Box>
      </SimpleGrid>
      
      {/* Google Place ID Setup Component */}
      <GooglePlaceIdSetup businessId={business.id} />
      
      {/* Only show reviews if place_id is configured */}
      {business.place_id && (
        <ReviewsPanel businessId={business.id} />
      )}
    </div>
  );
} 