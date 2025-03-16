import React from 'react';
import { Box, Heading, Tabs, TabList, Tab, TabPanels, TabPanel, Container } from '@chakra-ui/react';
import PlatformConnect from '@/app/components/PlatformConnect';
import SocialFeed from '@/app/components/SocialFeed';

interface SocialMediaPageProps {
  params: {
    id: string;
  };
  searchParams: {
    tab?: string;
  };
}

const SocialMediaPage: React.FC<SocialMediaPageProps> = ({ 
  params, 
  searchParams 
}) => {
  const businessId = params.id;
  
  // Determine initial tab from query params or default to '0'
  const initialTabIndex = searchParams.tab === 'posts' ? 1 : 0;
  
  return (
    <Container maxW="container.xl" py={6}>
      <Heading as="h1" size="xl" mb={6}>Social Media Management</Heading>
      
      <Tabs defaultIndex={initialTabIndex} colorScheme="blue" isLazy>
        <TabList>
          <Tab>Accounts</Tab>
          <Tab>Posts</Tab>
        </TabList>
        
        <TabPanels>
          <TabPanel>
            <PlatformConnect businessId={businessId} />
          </TabPanel>
          
          <TabPanel>
            <SocialFeed businessId={businessId} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Container>
  );
};

export default SocialMediaPage; 