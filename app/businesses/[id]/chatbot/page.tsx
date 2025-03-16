'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Flex,
  Heading,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Box,
  Button,
  Icon,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  useToast,
  Card,
  CardBody,
  VStack,
  Text,
  Code,
  useClipboard,
  Badge,
} from '@chakra-ui/react';
import { FaLink, FaCopy, FaCheck } from 'react-icons/fa';
import Link from 'next/link';
import ChatbotSettings from '@/app/components/ChatbotSettings';
import ChatbotLeads from '@/app/components/ChatbotLeads';

interface ChatbotPageProps {
  params: {
    id: string;
  };
  searchParams?: {
    tab?: string;
  };
}

export default function ChatbotPage({ params, searchParams }: ChatbotPageProps) {
  const { id: businessId } = params;
  const tabIndex = searchParams?.tab === 'leads' ? 1 : searchParams?.tab === 'preview' ? 2 : 0;
  const [selectedTab, setSelectedTab] = useState(tabIndex);
  const toast = useToast();
  
  // Demo business object for the widget preview
  const demoBusiness = {
    id: businessId,
    name: 'Sample Business',
    description: 'This is a sample business for previewing the chatbot widget.',
  };

  // Function to copy embed code to clipboard
  const embedCode = `<script 
  src="${process.env.NEXT_PUBLIC_APP_URL || 'https://app-url.com'}/chatbot/embed.js" 
  id="ai-chatbot" 
  data-business-id="${businessId}"
  data-position="bottom-right"
  data-accent-color="#4299e1"
  data-welcome-message="Hello! How can I help you today?">
</script>`;

  const { hasCopied, onCopy } = useClipboard(embedCode);

  const handleCopyCode = () => {
    onCopy();
    toast({
      title: 'Copied!',
      description: 'Embed code copied to clipboard',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  return (
    <Container maxW="container.xl" py={6}>
      {/* Breadcrumb Navigation */}
      <Breadcrumb mb={4} fontSize="sm">
        <BreadcrumbItem>
          <BreadcrumbLink as={Link} href="/businesses">
            Businesses
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink as={Link} href={`/businesses/${businessId}`}>
            Business Details
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          <BreadcrumbLink>Chatbot Manager</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>

      <Heading as="h1" size="xl" mb={6}>
        Chatbot Manager
      </Heading>

      <Tabs index={selectedTab} onChange={setSelectedTab} isLazy>
        <TabList>
          <Tab>Settings</Tab>
          <Tab>Leads</Tab>
          <Tab>Preview</Tab>
        </TabList>

        <TabPanels>
          {/* Settings Tab */}
          <TabPanel>
            <ChatbotSettings businessId={businessId} />
          </TabPanel>

          {/* Leads Tab */}
          <TabPanel>
            <ChatbotLeads businessId={businessId} />
          </TabPanel>

          {/* Preview Tab */}
          <TabPanel>
            <VStack spacing={8} align="stretch">
              <Card>
                <CardBody>
                  <Heading size="md" mb={4}>Embed Code</Heading>
                  <Text mb={4}>
                    Copy and paste this code into your website to add the AI Chatbot.
                  </Text>
                  <Box position="relative" mb={4}>
                    <Code
                      p={4}
                      borderRadius="md"
                      w="100%"
                      display="block"
                      whiteSpace="pre-wrap"
                      fontSize="sm"
                      overflowX="auto"
                    >
                      {embedCode}
                    </Code>
                    <Button
                      position="absolute"
                      top={2}
                      right={2}
                      size="sm"
                      onClick={handleCopyCode}
                      leftIcon={hasCopied ? <FaCheck /> : <FaCopy />}
                    >
                      {hasCopied ? 'Copied' : 'Copy'}
                    </Button>
                  </Box>
                  <Text mb={2} fontWeight="bold">Customization Options:</Text>
                  <VStack align="stretch" spacing={1} pl={4} mb={4}>
                    <Text fontSize="sm"><Code>data-position</Code>: "bottom-right" or "bottom-left"</Text>
                    <Text fontSize="sm"><Code>data-accent-color</Code>: Any valid CSS color</Text>
                    <Text fontSize="sm"><Code>data-welcome-message</Code>: Custom greeting message</Text>
                  </VStack>
                  <Badge colorScheme="blue" mb={2}>Important</Badge>
                  <Text fontSize="sm">
                    Make sure to update the script src attribute with your actual application URL before using in production.
                  </Text>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <Heading size="md" mb={4}>Live Preview</Heading>
                  <Text mb={4}>
                    This is how your chatbot will appear on your website. Click the chat icon in the bottom-right corner to open it.
                  </Text>
                  <Box 
                    h="400px" 
                    borderWidth="1px" 
                    borderRadius="md" 
                    position="relative" 
                    overflow="hidden"
                    bgGradient="linear(to-r, gray.50, gray.100)"
                  >
                    {/* Add a mock website preview here */}
                    <Flex h="100%" justify="center" align="center" direction="column">
                      <Heading size="md" color="gray.500" mb={2}>{demoBusiness.name}</Heading>
                      <Text color="gray.500" textAlign="center" maxW="400px">
                        {demoBusiness.description}
                      </Text>
                    </Flex>
                    
                    {/* This would be replaced with the actual chatbot widget in a real implementation */}
                    <Box
                      position="absolute"
                      bottom="20px"
                      right="20px"
                      bgColor="blue.500"
                      color="white"
                      w="50px"
                      h="50px"
                      borderRadius="full"
                      display="flex"
                      justifyContent="center"
                      alignItems="center"
                      cursor="pointer"
                      boxShadow="lg"
                    >
                      <Icon as={FaLink} boxSize={5} />
                    </Box>
                  </Box>
                  <Text fontSize="sm" mt={4} color="gray.600">
                    Note: This is a simulated preview. The actual chatbot will connect to OpenAI&apos;s API and
                    provide AI-powered responses based on your business information.
                  </Text>
                </CardBody>
              </Card>
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Container>
  );
} 