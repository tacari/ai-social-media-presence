import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Flex,
  Text,
  Heading,
  SimpleGrid,
  useToast,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Badge,
  Stack,
  Avatar,
  IconButton,
  Icon,
  Image,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Spinner,
  useColorModeValue,
  HStack,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Divider,
  Link,
  Tag,
  TagLeftIcon,
  TagLabel,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure
} from '@chakra-ui/react';
import { format, formatDistance } from 'date-fns';
import { 
  FaFacebook, 
  FaInstagram, 
  FaTwitter, 
  FaLinkedin, 
  FaEllipsisV, 
  FaPlay, 
  FaClock, 
  FaCheckCircle, 
  FaExclamationCircle,
  FaEdit,
  FaTrash,
  FaRobot,
  FaThumbsUp,
  FaComment,
  FaShare,
  FaCalendarAlt
} from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';

interface SocialFeedProps {
  businessId: string;
}

interface PlatformAccount {
  id: string;
  platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin';
  account_name?: string;
  account_username?: string;
  account_image_url?: string;
}

interface SocialPost {
  id: string;
  business_id: string;
  platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin';
  platform_account_id: string;
  content: string;
  image_url?: string;
  scheduled_time?: string;
  published_time?: string;
  status: 'draft' | 'scheduled' | 'posted' | 'failed';
  post_id?: string;
  ai_generated: boolean;
  engagement_data?: {
    likes?: number;
    comments?: number;
    shares?: number;
  };
  platform_accounts: PlatformAccount;
}

const SocialFeed: React.FC<SocialFeedProps> = ({ businessId }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  
  const toast = useToast();
  const router = useRouter();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  // Platform options
  const platforms = [
    { id: 'all', name: 'All Platforms' },
    { id: 'facebook', name: 'Facebook', icon: FaFacebook, color: '#1877F2' },
    { id: 'instagram', name: 'Instagram', icon: FaInstagram, color: '#E1306C' },
    { id: 'twitter', name: 'Twitter', icon: FaTwitter, color: '#1DA1F2' },
    { id: 'linkedin', name: 'LinkedIn', icon: FaLinkedin, color: '#0A66C2' }
  ];
  
  // Status options
  const statuses = [
    { id: 'all', name: 'All Status' },
    { id: 'scheduled', name: 'Scheduled', icon: FaClock, color: 'orange.500' },
    { id: 'posted', name: 'Posted', icon: FaCheckCircle, color: 'green.500' },
    { id: 'draft', name: 'Draft', icon: FaEdit, color: 'gray.500' },
    { id: 'failed', name: 'Failed', icon: FaExclamationCircle, color: 'red.500' }
  ];
  
  // Fetch posts on component mount and when selected platform changes
  useEffect(() => {
    fetchPosts();
  }, [businessId, selectedPlatform, selectedStatus]);
  
  const fetchPosts = async () => {
    try {
      setIsLoading(true);
      
      // Build query params
      let url = `/api/socialmedia/posts?businessId=${businessId}`;
      
      if (selectedPlatform !== 'all') {
        url += `&platform=${selectedPlatform}`;
      }
      
      if (selectedStatus !== 'all') {
        url += `&status=${selectedStatus}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      
      const data = await response.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load social media posts',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePostAction = async (postId: string, action: string) => {
    try {
      if (action === 'delete') {
        setPostToDelete(postId);
        onOpen();
        return;
      }
      
      if (action === 'edit') {
        router.push(`/businesses/${businessId}/social/edit/${postId}`);
        return;
      }
      
      // Other actions (publish, cancel)
      const response = await fetch('/api/socialmedia/posts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId,
          action
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${action} post`);
      }
      
      let message = '';
      switch (action) {
        case 'publish':
          message = 'Post published successfully';
          break;
        case 'cancel':
          message = 'Post scheduling cancelled';
          break;
        default:
          message = 'Action completed successfully';
      }
      
      toast({
        title: 'Success',
        description: message,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Refresh posts list
      fetchPosts();
    } catch (error) {
      console.error(`Error performing action ${action}:`, error);
      toast({
        title: 'Error',
        description: `Failed to ${action} post`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  const confirmDeletePost = async () => {
    if (!postToDelete) return;
    
    try {
      const response = await fetch(`/api/socialmedia/posts?postId=${postToDelete}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete post');
      }
      
      // Remove post from list
      setPosts(posts.filter(post => post.id !== postToDelete));
      
      toast({
        title: 'Success',
        description: 'Post deleted successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete post',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setPostToDelete(null);
      onClose();
    }
  };
  
  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'facebook': return FaFacebook;
      case 'instagram': return FaInstagram;
      case 'twitter': return FaTwitter;
      case 'linkedin': return FaLinkedin;
      default: return null;
    }
  };
  
  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'facebook': return '#1877F2';
      case 'instagram': return '#E1306C';
      case 'twitter': return '#1DA1F2';
      case 'linkedin': return '#0A66C2';
      default: return 'gray.500';
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return (
          <Badge colorScheme="gray" variant="subtle">Draft</Badge>
        );
      case 'scheduled':
        return (
          <Badge colorScheme="orange" variant="subtle">Scheduled</Badge>
        );
      case 'posted':
        return (
          <Badge colorScheme="green" variant="subtle">Posted</Badge>
        );
      case 'failed':
        return (
          <Badge colorScheme="red" variant="subtle">Failed</Badge>
        );
      default:
        return null;
    }
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return format(date, 'MMM d, yyyy h:mm a');
  };
  
  const getTimeAgo = (dateString?: string) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return formatDistance(date, new Date(), { addSuffix: true });
  };
  
  const renderPostActions = (post: SocialPost) => {
    if (post.status === 'posted') {
      return (
        <Link href={`https://${post.platform}.com/post/${post.post_id}`} isExternal>
          <Button size="sm" leftIcon={<Icon as={FaPlay} />} colorScheme="blue" variant="outline">
            View on {post.platform.charAt(0).toUpperCase() + post.platform.slice(1)}
          </Button>
        </Link>
      );
    }
    
    if (post.status === 'scheduled') {
      return (
        <HStack spacing={2}>
          <Button 
            size="sm" 
            leftIcon={<Icon as={FaPlay} />} 
            colorScheme="green"
            onClick={() => handlePostAction(post.id, 'publish')}
          >
            Publish Now
          </Button>
          <Button
            size="sm"
            colorScheme="gray"
            variant="outline"
            onClick={() => handlePostAction(post.id, 'cancel')}
          >
            Cancel
          </Button>
        </HStack>
      );
    }
    
    if (post.status === 'draft') {
      return (
        <HStack spacing={2}>
          <Button 
            size="sm" 
            leftIcon={<Icon as={FaEdit} />} 
            colorScheme="blue"
            onClick={() => handlePostAction(post.id, 'edit')}
          >
            Edit
          </Button>
          <Button 
            size="sm" 
            leftIcon={<Icon as={FaPlay} />} 
            colorScheme="green"
            onClick={() => handlePostAction(post.id, 'publish')}
          >
            Publish Now
          </Button>
        </HStack>
      );
    }
    
    if (post.status === 'failed') {
      return (
        <HStack spacing={2}>
          <Button 
            size="sm" 
            leftIcon={<Icon as={FaPlay} />} 
            colorScheme="green"
            onClick={() => handlePostAction(post.id, 'publish')}
          >
            Retry
          </Button>
          <Button
            size="sm"
            colorScheme="red"
            variant="outline"
            onClick={() => handlePostAction(post.id, 'delete')}
          >
            Delete
          </Button>
        </HStack>
      );
    }
    
    return null;
  };
  
  const renderFilterBar = () => (
    <Flex 
      direction={{ base: 'column', md: 'row' }} 
      justifyContent="space-between" 
      mb={4}
      wrap="wrap"
      gap={2}
    >
      <Flex 
        alignItems="center"
        justifyContent={{ base: 'center', md: 'flex-start' }}
        mb={{ base: 2, md: 0 }}
      >
        <Text fontWeight="bold" mr={2}>Filter by:</Text>
        <HStack spacing={2}>
          <Menu>
            <MenuButton as={Button} size="sm" rightIcon={<FaEllipsisV />} variant="outline">
              {platforms.find(p => p.id === selectedPlatform)?.name || 'Platform'}
            </MenuButton>
            <MenuList>
              {platforms.map(platform => (
                <MenuItem 
                  key={platform.id}
                  onClick={() => setSelectedPlatform(platform.id)}
                  icon={platform.icon && <Icon as={platform.icon} color={platform.color} />}
                >
                  {platform.name}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
          
          <Menu>
            <MenuButton as={Button} size="sm" rightIcon={<FaEllipsisV />} variant="outline">
              {statuses.find(s => s.id === selectedStatus)?.name || 'Status'}
            </MenuButton>
            <MenuList>
              {statuses.map(status => (
                <MenuItem 
                  key={status.id}
                  onClick={() => setSelectedStatus(status.id)}
                  icon={status.icon && <Icon as={status.icon} color={status.color} />}
                >
                  {status.name}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
        </HStack>
      </Flex>
      
      <Button
        colorScheme="blue"
        leftIcon={<Icon as={platforms[1].icon} />}
        onClick={() => router.push(`/businesses/${businessId}/social/new`)}
        size="sm"
      >
        Create New Post
      </Button>
    </Flex>
  );
  
  const renderEmptyState = () => (
    <Box textAlign="center" p={8}>
      <Heading size="md" mb={3}>No posts found</Heading>
      <Text mb={6}>
        {selectedPlatform !== 'all' || selectedStatus !== 'all'
          ? 'Try changing your filters or create a new post.'
          : 'Start creating content for your social media platforms.'}
      </Text>
      <Button
        colorScheme="blue"
        leftIcon={<Icon as={platforms[1].icon} />}
        onClick={() => router.push(`/businesses/${businessId}/social/new`)}
      >
        Create Your First Post
      </Button>
    </Box>
  );
  
  const renderPostCard = (post: SocialPost) => {
    const PlatformIcon = getPlatformIcon(post.platform);
    const platformColor = getPlatformColor(post.platform);
    
    return (
      <Card variant="outline" mb={4}>
        <CardHeader>
          <Flex justifyContent="space-between">
            <HStack>
              <Avatar 
                size="sm" 
                src={post.platform_accounts?.account_image_url || ''}
                name={post.platform_accounts?.account_name || post.platform} 
              />
              <Box>
                <Flex alignItems="center">
                  <Text fontWeight="bold">
                    {post.platform_accounts?.account_name || 'Account'}
                  </Text>
                  {post.platform_accounts?.account_username && (
                    <Text ml={1} color="gray.500" fontSize="sm">
                      @{post.platform_accounts.account_username}
                    </Text>
                  )}
                  <Box ml={2}>
                    {PlatformIcon && (
                      <Icon as={PlatformIcon} color={platformColor} boxSize={4} />
                    )}
                  </Box>
                </Flex>
                <HStack spacing={1} mt={1}>
                  {getStatusBadge(post.status)}
                  {post.ai_generated && (
                    <Tag size="sm" colorScheme="purple" variant="subtle">
                      <TagLeftIcon as={FaRobot} boxSize={2.5} />
                      <TagLabel>AI Generated</TagLabel>
                    </Tag>
                  )}
                </HStack>
              </Box>
            </HStack>
            
            <Menu>
              <MenuButton
                as={IconButton}
                aria-label="Options"
                icon={<FaEllipsisV />}
                variant="ghost"
                size="sm"
              />
              <MenuList>
                {post.status === 'draft' && (
                  <MenuItem 
                    icon={<Icon as={FaEdit} />}
                    onClick={() => handlePostAction(post.id, 'edit')}
                  >
                    Edit Post
                  </MenuItem>
                )}
                
                {['draft', 'scheduled'].includes(post.status) && (
                  <MenuItem 
                    icon={<Icon as={FaPlay} />}
                    onClick={() => handlePostAction(post.id, 'publish')}
                  >
                    Publish Now
                  </MenuItem>
                )}
                
                {post.status === 'scheduled' && (
                  <MenuItem 
                    icon={<Icon as={FaClock} />}
                    onClick={() => handlePostAction(post.id, 'cancel')}
                  >
                    Cancel Scheduling
                  </MenuItem>
                )}
                
                {post.status === 'failed' && (
                  <MenuItem 
                    icon={<Icon as={FaPlay} />}
                    onClick={() => handlePostAction(post.id, 'publish')}
                  >
                    Retry Publishing
                  </MenuItem>
                )}
                
                {post.status === 'posted' && post.post_id && (
                  <MenuItem 
                    icon={<Icon as={FaPlay} />}
                    as="a"
                    href={`https://${post.platform}.com/post/${post.post_id}`}
                    target="_blank"
                  >
                    View on {post.platform.charAt(0).toUpperCase() + post.platform.slice(1)}
                  </MenuItem>
                )}
                
                {['draft', 'scheduled', 'failed'].includes(post.status) && (
                  <>
                    <MenuDivider />
                    <MenuItem 
                      icon={<Icon as={FaTrash} />}
                      onClick={() => handlePostAction(post.id, 'delete')}
                      color="red.500"
                    >
                      Delete Post
                    </MenuItem>
                  </>
                )}
              </MenuList>
            </Menu>
          </Flex>
          
          {(post.scheduled_time || post.published_time) && (
            <Flex alignItems="center" mt={2} color="gray.500" fontSize="sm">
              <Icon as={post.status === 'scheduled' ? FaCalendarAlt : FaClock} mr={1} />
              <Text>
                {post.status === 'scheduled' 
                  ? `Scheduled for ${formatDate(post.scheduled_time)}` 
                  : `Posted ${getTimeAgo(post.published_time)}`}
              </Text>
            </Flex>
          )}
        </CardHeader>
        
        <CardBody pt={0}>
          <Text whiteSpace="pre-wrap">{post.content}</Text>
          
          {post.image_url && (
            <Box mt={4}>
              <Image 
                src={post.image_url} 
                alt="Post image" 
                borderRadius="md" 
                maxH="300px"
                objectFit="cover"
              />
            </Box>
          )}
        </CardBody>
        
        <Divider />
        
        <CardFooter>
          {post.status === 'posted' && post.engagement_data ? (
            <Flex justifyContent="space-around" width="100%">
              <HStack>
                <Icon as={FaThumbsUp} color="blue.500" />
                <Text>{post.engagement_data.likes || 0}</Text>
              </HStack>
              <HStack>
                <Icon as={FaComment} color="green.500" />
                <Text>{post.engagement_data.comments || 0}</Text>
              </HStack>
              <HStack>
                <Icon as={FaShare} color="purple.500" />
                <Text>{post.engagement_data.shares || 0}</Text>
              </HStack>
            </Flex>
          ) : (
            <Flex justifyContent="flex-end" width="100%">
              {renderPostActions(post)}
            </Flex>
          )}
        </CardFooter>
      </Card>
    );
  };
  
  return (
    <Box>
      <Heading size="md" mb={4}>Social Media Posts</Heading>
      
      {renderFilterBar()}
      
      {isLoading ? (
        <Flex justify="center" align="center" h="200px">
          <Spinner size="lg" />
        </Flex>
      ) : posts.length === 0 ? (
        renderEmptyState()
      ) : (
        <Stack spacing={4}>
          {posts.map(post => renderPostCard(post))}
        </Stack>
      )}
      
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Post
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={confirmDeletePost} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default SocialFeed; 