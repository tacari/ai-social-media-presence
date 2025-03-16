import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  FormControl,
  FormLabel,
  Input,
  Switch,
  Button,
  Textarea,
  VStack,
  HStack,
  IconButton,
  Divider,
  useToast,
  Select,
  Flex,
  Badge,
  Spinner,
  Card,
  CardHeader,
  CardBody,
  Stack,
  useColorModeValue,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Skeleton
} from '@chakra-ui/react';
import { FaPlus, FaTrash, FaSave, FaEdit, FaTimes } from 'react-icons/fa';
import { ChatbotSettings as ChatbotSettingsType } from '@/app/lib/chatbot';
import { createClient } from '@/utils/supabase/client';

interface ChatbotSettingsProps {
  businessId: string;
}

const ChatbotSettings: React.FC<ChatbotSettingsProps> = ({ businessId }) => {
  const [settings, setSettings] = useState<ChatbotSettingsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [faqs, setFaqs] = useState<{ question: string; answer: string }[]>([]);
  const [newFaq, setNewFaq] = useState({ question: '', answer: '' });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const toast = useToast();
  const supabase = createClient();
  
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  // Fetch settings on component mount
  useEffect(() => {
    fetchSettings();
  }, [businessId]);
  
  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('chatbot_settings')
        .select('*')
        .eq('business_id', businessId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings(data);
        setFaqs(data.custom_faqs || []);
      } else {
        // Create default settings if none exist
        const { data: newSettings, error: createError } = await supabase
          .from('chatbot_settings')
          .insert({
            business_id: businessId,
            is_enabled: true,
            welcome_message: 'Hello! How can I help you today?',
            tone: 'professional',
            custom_faqs: [],
            max_history_length: 10,
            lead_capture_enabled: true
          })
          .select()
          .single();

        if (createError) throw createError;
        setSettings(newSettings);
        setFaqs([]);
      }
    } catch (error) {
      console.error('Error fetching chatbot settings:', error);
      toast({
        title: 'Error fetching settings',
        description: 'Unable to load chatbot settings. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSaveSettings = async () => {
    if (!settings) return;
    
    setIsSaving(true);
    try {
      // Update settings with current FAQs
      const updatedSettings = {
        ...settings,
        custom_faqs: faqs
      };
      
      const { error } = await supabase
        .from('chatbot_settings')
        .update(updatedSettings)
        .eq('id', settings.id);
      
      if (error) throw error;
      
      toast({
        title: 'Settings saved',
        description: 'Your chatbot settings have been updated successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error saving chatbot settings:', error);
      toast({
        title: 'Error saving settings',
        description: 'Unable to save chatbot settings. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (!settings) return;
    
    const { name, value } = e.target;
    setSettings({
      ...settings,
      [name]: value
    });
  };
  
  const handleSwitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!settings) return;
    
    const { name, checked } = e.target;
    setSettings({
      ...settings,
      [name]: checked
    });
  };
  
  const handleAddFaq = () => {
    if (newFaq.question.trim() === '' || newFaq.answer.trim() === '') {
      toast({
        title: 'Empty fields',
        description: 'Question and answer cannot be empty.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setFaqs([...faqs, { ...newFaq }]);
    setNewFaq({ question: '', answer: '' });
  };
  
  const handleDeleteFaq = (index: number) => {
    const updatedFaqs = [...faqs];
    updatedFaqs.splice(index, 1);
    setFaqs(updatedFaqs);
  };
  
  const handleEditFaq = (index: number) => {
    setEditingIndex(index);
    setNewFaq({ ...faqs[index] });
  };
  
  const handleSaveEdit = () => {
    if (editingIndex === null) return;
    
    if (newFaq.question.trim() === '' || newFaq.answer.trim() === '') {
      toast({
        title: 'Empty fields',
        description: 'Question and answer cannot be empty.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    const updatedFaqs = [...faqs];
    updatedFaqs[editingIndex] = { ...newFaq };
    setFaqs(updatedFaqs);
    setNewFaq({ question: '', answer: '' });
    setEditingIndex(null);
  };
  
  const handleCancelEdit = () => {
    setNewFaq({ question: '', answer: '' });
    setEditingIndex(null);
  };
  
  if (isLoading) {
    return (
      <Box p={5}>
        <Skeleton height="30px" mb={4} />
        <Skeleton height="20px" mb={2} />
        <Skeleton height="40px" mb={4} />
        <Skeleton height="20px" mb={2} />
        <Skeleton height="40px" mb={4} />
        <Skeleton height="20px" mb={2} />
        <Skeleton height="40px" mb={4} />
      </Box>
    );
  }
  
  if (!settings) {
    return (
      <Box p={5}>
        <Text color="red.500">Error loading settings. Please refresh the page.</Text>
      </Box>
    );
  }
  
  return (
    <VStack spacing={6} align="stretch" w="100%">
      <Card>
        <CardBody>
          <Heading size="md" mb={4}>General Settings</Heading>
          
          <FormControl display="flex" alignItems="center" mb={4}>
            <FormLabel htmlFor="is_enabled" mb="0">
              Enable Chatbot
            </FormLabel>
            <Switch 
              id="is_enabled" 
              name="is_enabled"
              isChecked={settings.is_enabled}
              onChange={handleSwitchChange}
            />
          </FormControl>
          
          <FormControl mb={4}>
            <FormLabel>Welcome Message</FormLabel>
            <Textarea
              name="welcome_message"
              value={settings.welcome_message}
              onChange={handleInputChange}
              placeholder="Hello! How can I help you today?"
            />
          </FormControl>
          
          <FormControl mb={4}>
            <FormLabel>Conversation Tone</FormLabel>
            <Select
              name="tone"
              value={settings.tone}
              onChange={handleInputChange}
            >
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="casual">Casual</option>
            </Select>
          </FormControl>
          
          <FormControl display="flex" alignItems="center" mb={4}>
            <FormLabel htmlFor="lead_capture_enabled" mb="0">
              Enable Lead Capture
            </FormLabel>
            <Switch 
              id="lead_capture_enabled" 
              name="lead_capture_enabled"
              isChecked={settings.lead_capture_enabled}
              onChange={handleSwitchChange}
            />
          </FormControl>
          
          <FormControl mb={4}>
            <FormLabel>Max Message History</FormLabel>
            <Input
              name="max_history_length"
              type="number"
              min={1}
              max={20}
              value={settings.max_history_length}
              onChange={handleInputChange}
            />
            <Text fontSize="sm" color="gray.500">
              Number of previous messages to include for context (1-20)
            </Text>
          </FormControl>
        </CardBody>
      </Card>
      
      <Card>
        <CardBody>
          <Heading size="md" mb={4}>Frequently Asked Questions</Heading>
          <Text mb={4} color="gray.600">
            Add custom FAQs to help your chatbot respond to common questions quickly without using the AI model.
          </Text>
          
          <VStack spacing={3} align="stretch" mb={6}>
            <FormControl>
              <FormLabel>Question</FormLabel>
              <Input
                value={newFaq.question}
                onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                placeholder="Enter a question"
              />
            </FormControl>
            
            <FormControl>
              <FormLabel>Answer</FormLabel>
              <Textarea
                value={newFaq.answer}
                onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
                placeholder="Enter the answer"
              />
            </FormControl>
            
            <Flex justify="flex-end" mt={2}>
              {editingIndex !== null ? (
                <>
                  <Button 
                    leftIcon={<FaSave />} 
                    colorScheme="blue" 
                    mr={2}
                    onClick={handleSaveEdit}
                  >
                    Save Edit
                  </Button>
                  <Button 
                    leftIcon={<FaTimes />} 
                    variant="outline"
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button 
                  leftIcon={<FaPlus />} 
                  colorScheme="green"
                  onClick={handleAddFaq}
                >
                  Add FAQ
                </Button>
              )}
            </Flex>
          </VStack>
          
          <Divider mb={4} />
          
          {faqs.length > 0 ? (
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Question</Th>
                  <Th>Answer</Th>
                  <Th width="100px">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {faqs.map((faq, index) => (
                  <Tr key={index}>
                    <Td>{faq.question}</Td>
                    <Td>{faq.answer.length > 50 ? `${faq.answer.substring(0, 50)}...` : faq.answer}</Td>
                    <Td>
                      <HStack spacing={2}>
                        <IconButton
                          aria-label="Edit FAQ"
                          icon={<FaEdit />}
                          size="sm"
                          onClick={() => handleEditFaq(index)}
                        />
                        <IconButton
                          aria-label="Delete FAQ"
                          icon={<FaTrash />}
                          size="sm"
                          colorScheme="red"
                          onClick={() => handleDeleteFaq(index)}
                        />
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          ) : (
            <Text color="gray.500" textAlign="center" py={4}>
              No FAQs added yet. Add some to improve your chatbot responses.
            </Text>
          )}
        </CardBody>
      </Card>
      
      <Flex justify="flex-end" mt={4}>
        <Button
          colorScheme="blue"
          size="lg"
          onClick={handleSaveSettings}
          isLoading={isSaving}
          loadingText="Saving..."
        >
          Save Settings
        </Button>
      </Flex>
    </VStack>
  );
};

export default ChatbotSettings; 