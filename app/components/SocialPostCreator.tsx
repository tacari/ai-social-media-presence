import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Flex,
  Text,
  Heading,
  Textarea,
  Input,
  SimpleGrid,
  FormControl,
  FormLabel,
  FormHelperText,
  Select,
  Badge,
  useToast,
  Switch,
  InputGroup,
  InputRightElement,
  AspectRatio,
  Image,
  IconButton,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  useColorModeValue,
  VStack,
  HStack,
  Spinner,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  Icon
} from '@chakra-ui/react';
import { FaFacebook, FaInstagram, FaTwitter, FaLinkedin, FaImage, FaTrash, FaRobot, FaCalendarAlt } from 'react-icons/fa';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface SocialPostCreatorProps {
  businessId: string;
  platform?: 'facebook' | 'instagram' | 'twitter' | 'linkedin';
  onPostCreated?: () => void;
}

interface PlatformAccount {
  id: string;
  business_id: string;
  platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin';
  account_id: string;
  account_name?: string;
  account_username?: string;
  account_image_url?: string;
}

const SocialPostCreator: React.FC<SocialPostCreatorProps> = ({ 
  businessId, 
  platform: initialPlatform,
  onPostCreated 
}) => {
  // Form state
  const [platform, setPlatform] = useState<string>(initialPlatform || '');
  const [content, setContent] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [schedulePost, setSchedulePost] = useState<boolean>(false);
  const [scheduledTime, setScheduledTime] = useState<Date | null>(null);
  const [useAI, setUseAI] = useState<boolean>(false);
  
  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [accountsByPlatform, setAccountsByPlatform] = useState<Record<string, PlatformAccount[]>>({});
  const [characterCount, setCharacterCount] = useState<number>(0);
  
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  // Platform-specific limits
  const platformLimits = {
    twitter: 280,
    facebook: 5000,
    instagram: 2200,
    linkedin: 3000
  };
  
  // Platform icons
  const platformIcons = {
    facebook: FaFacebook,
    instagram: FaInstagram,
    twitter: FaTwitter,
    linkedin: FaLinkedin
  };
  
  // Fetch connected accounts for the business
  useEffect(() => {
    if (businessId) {
      fetchAccounts();
    }
  }, [businessId]);
  
  // Set character count when content changes
  useEffect(() => {
    setCharacterCount(content.length);
  }, [content]);
  
  // Update accountId when platform changes
  useEffect(() => {
    if (platform && accountsByPlatform[platform]?.length > 0) {
      setAccountId(accountsByPlatform[platform][0].id);
    } else {
      setAccountId('');
    }
  }, [platform, accountsByPlatform]);
  
  // Auto-populate scheduled time when toggled
  useEffect(() => {
    if (schedulePost && !scheduledTime) {
      // Default to 24 hours from now
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setScheduledTime(tomorrow);
    }
  }, [schedulePost]);
  
  const fetchAccounts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/socialmedia/connect`, {
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
      const fetchedAccounts = data.accounts || [];
      setAccounts(fetchedAccounts);
      
      // Group accounts by platform
      const grouped = fetchedAccounts.reduce<Record<string, PlatformAccount[]>>((acc, account) => {
        if (!acc[account.platform]) {
          acc[account.platform] = [];
        }
        acc[account.platform].push(account);
        return acc;
      }, {});
      
      setAccountsByPlatform(grouped);
      
      // Auto-select platform if only one is available
      if (Object.keys(grouped).length === 1 && !platform) {
        setPlatform(Object.keys(grouped)[0]);
      } else if (initialPlatform && grouped[initialPlatform]?.length > 0) {
        setPlatform(initialPlatform);
      }
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
  
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // In a real app, you would upload this to your storage service
      // For now, we'll create a temporary URL
      const tempUrl = URL.createObjectURL(file);
      setImageUrl(tempUrl);
    }
  };
  
  const clearImage = () => {
    setImageUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const generateAIContent = async () => {
    try {
      setIsGeneratingAI(true);
      
      if (!platform) {
        throw new Error('Please select a platform first');
      }
      
      // Get business details for better AI generation
      const businessResponse = await fetch(`/api/businesses/${businessId}`);
      if (!businessResponse.ok) {
        throw new Error('Failed to fetch business details');
      }
      
      const businessData = await businessResponse.json();
      const business = businessData.business;
      
      // Generate content via API
      const response = await fetch('/api/socialmedia/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessName: business.name,
          industry: business.industry || 'general',
          platform
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate content');
      }
      
      const data = await response.json();
      setContent(data.content);
      
      toast({
        title: 'Success',
        description: `Generated ${platform} content`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error generating content:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate content',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };
  
  const handleSubmit = async () => {
    try {
      // Validation
      if (!platform) {
        toast({
          title: 'Error',
          description: 'Please select a platform',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }
      
      if (!accountId) {
        toast({
          title: 'Error',
          description: 'Please select an account',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }
      
      if (!content || content.trim() === '') {
        toast({
          title: 'Error',
          description: 'Please enter content for your post',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }
      
      if (platform === 'instagram' && !imageUrl) {
        toast({
          title: 'Error',
          description: 'Instagram posts require an image',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }
      
      setIsLoading(true);
      
      // Create post
      const response = await fetch('/api/socialmedia/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId,
          platformAccountId: accountId,
          platform,
          content,
          imageUrl,
          scheduledTime: schedulePost ? scheduledTime?.toISOString() : null,
          postNow: !schedulePost,
          generateAI: useAI && (!content || content.trim() === '')
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create post');
      }
      
      const data = await response.json();
      
      toast({
        title: 'Success',
        description: schedulePost 
          ? `Post scheduled for ${scheduledTime?.toLocaleString()}`
          : 'Post published successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Reset form
      resetForm();
      
      // Notify parent component
      if (onPostCreated) {
        onPostCreated();
      }
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create post',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetForm = () => {
    setContent('');
    setImageUrl('');
    setSchedulePost(false);
    setScheduledTime(null);
    setUseAI(false);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const getCharacterLimit = () => {
    return platform ? platformLimits[platform as keyof typeof platformLimits] || 0 : 0;
  };
  
  const getCharacterCountColor = () => {
    const limit = getCharacterLimit();
    if (!limit) return 'gray.500';
    
    if (characterCount > limit) {
      return 'red.500';
    } else if (characterCount > limit * 0.8) {
      return 'orange.500';
    }
    return 'green.500';
  };
  
  const getPlatformColor = (platformKey: string) => {
    switch (platformKey) {
      case 'facebook': return 'facebook.500';
      case 'instagram': return 'pink.500';
      case 'twitter': return 'twitter.500';
      case 'linkedin': return 'linkedin.500';
      default: return 'gray.500';
    }
  };
  
  const renderPlatformTabs = () => {
    const availablePlatforms = Object.keys(accountsByPlatform);
    
    if (availablePlatforms.length === 0) {
      return (
        <Box p={4} borderWidth="1px" borderRadius="md" borderColor={borderColor}>
          <Text>No social media accounts connected. Please connect accounts first.</Text>
        </Box>
      );
    }
    
    return (
      <Tabs 
        onChange={(index) => setPlatform(availablePlatforms[index])} 
        colorScheme="blue"
        index={availablePlatforms.indexOf(platform)}
      >
        <TabList>
          {availablePlatforms.map((p) => (
            <Tab key={p} display="flex" alignItems="center">
              <Icon 
                as={platformIcons[p as keyof typeof platformIcons]} 
                mr={2} 
                color={getPlatformColor(p)} 
              />
              <Text>{p.charAt(0).toUpperCase() + p.slice(1)}</Text>
            </Tab>
          ))}
        </TabList>
        
        <TabPanels>
          {availablePlatforms.map((p) => (
            <TabPanel key={p} p={4}>
              {accountsByPlatform[p]?.length > 1 && (
                <FormControl mb={4}>
                  <FormLabel>Select Account</FormLabel>
                  <Select 
                    value={accountId} 
                    onChange={(e) => setAccountId(e.target.value)}
                  >
                    {accountsByPlatform[p].map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.account_name || account.account_username || account.account_id}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              )}
              
              {p === 'twitter' && (
                <FormHelperText mb={2}>
                  Twitter has a {platformLimits.twitter} character limit
                </FormHelperText>
              )}
              
              {p === 'instagram' && !imageUrl && (
                <FormHelperText mb={2} color="orange.500">
                  Instagram posts require an image
                </FormHelperText>
              )}
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>
    );
  };
  
  if (isLoading && accounts.length === 0) {
    return (
      <Flex justify="center" align="center" h="200px">
        <Spinner size="lg" />
      </Flex>
    );
  }
  
  return (
    <Box 
      p={5} 
      borderWidth="1px" 
      borderRadius="lg" 
      borderColor={borderColor}
      bg={bgColor}
      boxShadow="sm"
    >
      <Heading size="md" mb={4}>Create Social Media Post</Heading>
      
      {renderPlatformTabs()}
      
      <VStack spacing={4} mt={4} align="stretch">
        <FormControl>
          <FormLabel>Post Content</FormLabel>
          <InputGroup>
            <Textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What would you like to share?"
              size="md"
              minH="150px"
              isDisabled={isGeneratingAI}
            />
            <InputRightElement top="0" right="0" position="absolute" p={2}>
              <Button
                size="sm"
                leftIcon={<Icon as={FaRobot} />}
                colorScheme="purple"
                variant="ghost"
                isLoading={isGeneratingAI}
                onClick={generateAIContent}
                title="Generate AI content"
              >
                AI
              </Button>
            </InputRightElement>
          </InputGroup>
          <Flex justifyContent="space-between" mt={1}>
            <FormHelperText>
              {platform ? `Write your ${platform} post` : 'Select a platform first'}
            </FormHelperText>
            <Text 
              fontSize="sm" 
              color={getCharacterCountColor()}
              fontWeight={characterCount > getCharacterLimit() ? 'bold' : 'normal'}
            >
              {characterCount}
              {getCharacterLimit() > 0 && `/${getCharacterLimit()}`}
            </Text>
          </Flex>
        </FormControl>
        
        <FormControl>
          <FormLabel>Image</FormLabel>
          <Box>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleImageUpload}
            />
            
            {imageUrl ? (
              <Box position="relative" mb={4}>
                <AspectRatio ratio={16 / 9} maxH="250px">
                  <Image 
                    src={imageUrl} 
                    alt="Post image" 
                    objectFit="cover" 
                    borderRadius="md"
                  />
                </AspectRatio>
                <IconButton
                  aria-label="Remove image"
                  icon={<FaTrash />}
                  size="sm"
                  colorScheme="red"
                  position="absolute"
                  top={2}
                  right={2}
                  onClick={clearImage}
                />
              </Box>
            ) : (
              <Button
                leftIcon={<Icon as={FaImage} />}
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                isFullWidth
                h="100px"
              >
                Add Image
              </Button>
            )}
          </Box>
          <FormHelperText>
            {platform === 'instagram' 
              ? 'Required: Instagram posts must include an image' 
              : 'Optional: Add an image to your post'}
          </FormHelperText>
        </FormControl>
        
        <FormControl display="flex" alignItems="center">
          <FormLabel htmlFor="schedule-post" mb="0">
            Schedule for later
          </FormLabel>
          <Switch 
            id="schedule-post" 
            isChecked={schedulePost}
            onChange={(e) => setSchedulePost(e.target.checked)}
          />
        </FormControl>
        
        {schedulePost && (
          <FormControl>
            <FormLabel>Schedule Time</FormLabel>
            <InputGroup>
              <Input
                as={DatePicker}
                selected={scheduledTime}
                onChange={(date: Date) => setScheduledTime(date)}
                showTimeSelect
                dateFormat="MMMM d, yyyy h:mm aa"
                minDate={new Date()}
                placeholderText="Select date and time"
                width="100%"
              />
              <InputRightElement>
                <Icon as={FaCalendarAlt} color="gray.500" />
              </InputRightElement>
            </InputGroup>
            <FormHelperText>
              When should this post be published?
            </FormHelperText>
          </FormControl>
        )}
        
        <Flex mt={4} justify="space-between">
          <Button
            onClick={onOpen}
            variant="ghost"
          >
            Cancel
          </Button>
          
          <Button
            colorScheme="blue"
            isLoading={isLoading}
            loadingText={schedulePost ? "Scheduling..." : "Posting..."}
            onClick={handleSubmit}
            isDisabled={
              !platform || 
              !accountId || 
              !content || 
              (platform === 'instagram' && !imageUrl) ||
              (schedulePost && !scheduledTime) ||
              (platform === 'twitter' && characterCount > platformLimits.twitter)
            }
          >
            {schedulePost ? "Schedule Post" : "Post Now"}
          </Button>
        </Flex>
      </VStack>
      
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Cancel Post
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure? Your post will not be saved.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Continue Editing
              </Button>
              <Button 
                colorScheme="red" 
                onClick={() => {
                  resetForm();
                  onClose();
                }} 
                ml={3}
              >
                Discard Post
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default SocialPostCreator; 