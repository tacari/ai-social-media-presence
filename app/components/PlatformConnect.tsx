import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Flex,
  Text,
  Heading,
  SimpleGrid,
  useToast,
  Select,
  VStack,
  HStack,
  Avatar,
  Badge,
  Divider,
  ButtonGroup,
  Icon,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Stack,
  Spinner
} from '@chakra-ui/react';
import { FaFacebook, FaInstagram, FaTwitter, FaLinkedin, FaPlus, FaTrash } from 'react-icons/fa';
import { useRouter } from 'next/navigation';

interface PlatformConnectProps {
  businessId: string;
}

interface PlatformAccount {
  id: string;
  business_id: string;
  platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin';
  account_id: string;
  account_name?: string;
  account_username?: string;
  account_image_url?: string;
  access_token: string;
  refresh_token?: string;
  token_expiry?: string;
}

const PlatformConnect: React.FC<PlatformConnectProps> = ({ businessId }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingPlatform, setLoadingPlatform] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const toast = useToast();
  const router = useRouter();
  
  // Platform options
  const platforms = [
    { id: 'facebook', name: 'Facebook', icon: FaFacebook, color: '#1877F2' },
    { id: 'instagram', name: 'Instagram', icon: FaInstagram, color: '#E1306C' },
    { id: 'twitter', name: 'Twitter', icon: FaTwitter, color: '#1DA1F2' },
    { id: 'linkedin', name: 'LinkedIn', icon: FaLinkedin, color: '#0A66C2' }
  ];
  
  // Fetch connected accounts when component mounts
  useEffect(() => {
    fetchAccounts();
  }, [businessId]);
  
  const fetchAccounts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/socialmedia/connect?businessId=${businessId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ businessId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch accounts');
      }
      
      const data = await response.json();
      setAccounts(data.accounts || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load connected accounts',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const connectPlatform = async (platform: string) => {
    try {
      setLoadingPlatform(platform);
      const response = await fetch(`/api/socialmedia/connect?platform=${platform}&businessId=${businessId}`);
      
      if (!response.ok) {
        throw new Error('Failed to generate auth URL');
      }
      
      const { authUrl } = await response.json();
      
      if (authUrl) {
        // Redirect to authorization URL
        window.location.href = authUrl;
      } else {
        throw new Error('Invalid auth URL');
      }
    } catch (error) {
      console.error(`Error connecting to ${platform}:`, error);
      toast({
        title: 'Connection Error',
        description: `Failed to connect to ${platform}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setLoadingPlatform(null);
    }
  };
  
  const disconnectPlatform = async (accountId: string, platform: string) => {
    try {
      const response = await fetch(`/api/socialmedia/connect`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to disconnect account');
      }
      
      // Update accounts list
      setAccounts(accounts.filter(account => account.id !== accountId));
      
      toast({
        title: 'Success',
        description: `Disconnected from ${platform} account`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error disconnecting account:', error);
      toast({
        title: 'Error',
        description: 'Failed to disconnect account',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  // Group accounts by platform
  const accountsByPlatform = accounts.reduce<Record<string, PlatformAccount[]>>((acc, account) => {
    if (!acc[account.platform]) {
      acc[account.platform] = [];
    }
    acc[account.platform].push(account);
    return acc;
  }, {});
  
  const getConnectedCount = () => {
    return Object.keys(accountsByPlatform).length;
  };
  
  const getPlatformIcon = (platform: string) => {
    const platformData = platforms.find(p => p.id === platform);
    return platformData ? platformData.icon : null;
  };
  
  const getPlatformColor = (platform: string) => {
    const platformData = platforms.find(p => p.id === platform);
    return platformData ? platformData.color : 'gray.500';
  };
  
  return (
    <Box>
      <Heading size="md" mb={4}>Social Media Accounts</Heading>
      
      {isLoading ? (
        <Flex justify="center" align="center" h="200px">
          <Spinner size="lg" />
        </Flex>
      ) : (
        <Box>
          <Flex mb={6} justifyContent="space-between" alignItems="center">
            <Text>
              {getConnectedCount()} of {platforms.length} platforms connected
            </Text>
            
            <Box>
              <Select 
                placeholder="Connect a platform" 
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                mr={2}
                width={{ base: 'full', md: '200px' }}
              >
                {platforms.map(platform => {
                  const isConnected = accountsByPlatform[platform.id]?.length > 0;
                  return (
                    <option 
                      key={platform.id} 
                      value={platform.id}
                      disabled={isConnected}
                    >
                      {platform.name} {isConnected ? '(Connected)' : ''}
                    </option>
                  );
                })}
              </Select>
              
              <Button
                colorScheme="blue"
                leftIcon={<Icon as={FaPlus} />}
                isDisabled={!selectedPlatform}
                isLoading={loadingPlatform === selectedPlatform}
                onClick={() => connectPlatform(selectedPlatform)}
              >
                Connect
              </Button>
            </Box>
          </Flex>
          
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            {platforms.map(platform => {
              const platformAccounts = accountsByPlatform[platform.id] || [];
              const isConnected = platformAccounts.length > 0;
              
              return (
                <Card key={platform.id} variant="outline">
                  <CardHeader>
                    <Flex justifyContent="space-between" alignItems="center">
                      <HStack>
                        <Icon as={platform.icon} boxSize={6} color={platform.color} />
                        <Heading size="sm">{platform.name}</Heading>
                      </HStack>
                      <Badge colorScheme={isConnected ? 'green' : 'gray'}>
                        {isConnected ? 'Connected' : 'Not Connected'}
                      </Badge>
                    </Flex>
                  </CardHeader>
                  
                  <CardBody>
                    {isConnected ? (
                      <Stack spacing={4}>
                        {platformAccounts.map(account => (
                          <Flex key={account.id} justifyContent="space-between" alignItems="center">
                            <HStack>
                              <Avatar size="sm" src={account.account_image_url || ''} name={account.account_name || ''} />
                              <Box>
                                <Text fontWeight="bold">{account.account_name}</Text>
                                {account.account_username && (
                                  <Text fontSize="sm" color="gray.500">@{account.account_username}</Text>
                                )}
                              </Box>
                            </HStack>
                            <Button
                              size="sm"
                              colorScheme="red"
                              variant="ghost"
                              leftIcon={<Icon as={FaTrash} />}
                              onClick={() => disconnectPlatform(account.id, platform.name)}
                            >
                              Disconnect
                            </Button>
                          </Flex>
                        ))}
                      </Stack>
                    ) : (
                      <Flex 
                        direction="column" 
                        alignItems="center" 
                        justifyContent="center" 
                        h="100px"
                      >
                        <Text color="gray.500" mb={3}>No accounts connected</Text>
                        <Button
                          colorScheme="blue"
                          size="sm"
                          leftIcon={<Icon as={FaPlus} />}
                          isLoading={loadingPlatform === platform.id}
                          onClick={() => connectPlatform(platform.id)}
                        >
                          Connect {platform.name}
                        </Button>
                      </Flex>
                    )}
                  </CardBody>
                  
                  {isConnected && (
                    <CardFooter>
                      <Button 
                        colorScheme="blue" 
                        width="full"
                        onClick={() => router.push(`/businesses/${businessId}/social/new?platform=${platform.id}`)}
                      >
                        Create New Post
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              );
            })}
          </SimpleGrid>
        </Box>
      )}
    </Box>
  );
};

export default PlatformConnect; 