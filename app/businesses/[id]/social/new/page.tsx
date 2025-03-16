import React from 'react';
import { Box, Heading, Container, Button, Flex, Breadcrumb, BreadcrumbItem, BreadcrumbLink, Icon } from '@chakra-ui/react';
import SocialPostCreator from '@/app/components/SocialPostCreator';
import { FaChevronRight, FaArrowLeft } from 'react-icons/fa';
import Link from 'next/link';

interface NewSocialPostPageProps {
  params: {
    id: string;
  };
  searchParams: {
    platform?: string;
  };
}

const NewSocialPostPage: React.FC<NewSocialPostPageProps> = ({ 
  params, 
  searchParams 
}) => {
  const businessId = params.id;
  const selectedPlatform = searchParams.platform as 'facebook' | 'instagram' | 'twitter' | 'linkedin' | undefined;
  
  return (
    <Container maxW="container.lg" py={6}>
      <Flex direction="column" width="100%">
        <Flex alignItems="center" mb={4}>
          <Button 
            as={Link} 
            href={`/businesses/${businessId}/social`} 
            variant="ghost" 
            leftIcon={<Icon as={FaArrowLeft} />} 
            size="sm"
            mr={4}
          >
            Back
          </Button>
          
          <Breadcrumb separator={<Icon as={FaChevronRight} color="gray.500" fontSize="xs" />}>
            <BreadcrumbItem>
              <BreadcrumbLink as={Link} href="/businesses">Businesses</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink as={Link} href={`/businesses/${businessId}`}>Business</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink as={Link} href={`/businesses/${businessId}/social`}>Social Media</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>
              <BreadcrumbLink>New Post</BreadcrumbLink>
            </BreadcrumbItem>
          </Breadcrumb>
        </Flex>
        
        <Heading as="h1" size="xl" mb={6}>Create New Social Media Post</Heading>
        
        <SocialPostCreator 
          businessId={businessId} 
          platform={selectedPlatform}
          onPostCreated={() => {
            // Redirect back to the social media page with posts tab selected
            window.location.href = `/businesses/${businessId}/social?tab=posts`;
          }}
        />
      </Flex>
    </Container>
  );
};

export default NewSocialPostPage; 