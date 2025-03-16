import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Flex,
  Text,
  Avatar,
  VStack,
  Button,
  Fade,
  Spinner,
  useColorModeValue,
  useDisclosure,
  CloseButton,
  ButtonGroup
} from '@chakra-ui/react';
import { FaPaperPlane, FaComments, FaThumbsUp, FaThumbsDown } from 'react-icons/fa';
import { v4 as uuidv4 } from 'uuid';

interface ChatbotWidgetProps {
  businessId: string;
  businessName: string;
  businessLogo?: string;
  accentColor?: string;
  widgetPosition?: 'bottom-right' | 'bottom-left';
  welcomeMessage?: string;
}

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  logId?: string;
  feedbackGiven?: boolean;
}

const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({
  businessId,
  businessName,
  businessLogo,
  accentColor = '#3182CE',
  widgetPosition = 'bottom-right',
  welcomeMessage
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isOpen, onToggle } = useDisclosure();
  
  const backgroundColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const botBgColor = useColorModeValue('gray.100', 'gray.700');
  const userBgColor = accentColor;
  const userTextColor = 'white';
  
  // Initialize session ID and welcome message
  useEffect(() => {
    // Create or restore session ID
    let existingSessionId = localStorage.getItem(`chatbot_session_${businessId}`);
    if (!existingSessionId) {
      existingSessionId = `session_${uuidv4()}`;
      localStorage.setItem(`chatbot_session_${businessId}`, existingSessionId);
    }
    setSessionId(existingSessionId);
    
    // Add welcome message
    if (welcomeMessage) {
      setMessages([
        {
          id: `welcome_${Date.now()}`,
          content: welcomeMessage,
          sender: 'bot',
          timestamp: new Date()
        }
      ]);
    }
  }, [businessId, welcomeMessage]);
  
  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);
  
  // Send message to API
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      content: inputValue,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          businessId,
          message: userMessage.content,
          sessionId
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to get response');
      }
      
      const data = await response.json();
      
      const botMessage: Message = {
        id: `bot_${Date.now()}`,
        content: data.reply,
        sender: 'bot',
        timestamp: new Date(),
        logId: data.logId
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message
      setMessages(prev => [
        ...prev,
        {
          id: `error_${Date.now()}`,
          content: "I'm sorry, I'm having trouble connecting. Please try again later.",
          sender: 'bot',
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Submit on Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };
  
  // Submit feedback
  const handleFeedback = async (messageId: string, logId: string | undefined, wasHelpful: boolean) => {
    if (!logId) return;
    
    // Update message to show feedback was given
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId ? { ...msg, feedbackGiven: true } : msg
      )
    );
    
    try {
      await fetch('/api/chatbot/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          businessId,
          sessionId,
          logId,
          wasHelpful
        })
      });
    } catch (error) {
      console.error('Error sending feedback:', error);
    }
  };
  
  return (
    <>
      {/* Chatbot toggle button */}
      <IconButton
        aria-label="Open chat"
        icon={<FaComments />}
        size="lg"
        position="fixed"
        bottom={4}
        right={widgetPosition === 'bottom-right' ? 4 : 'auto'}
        left={widgetPosition === 'bottom-left' ? 4 : 'auto'}
        borderRadius="full"
        bg={accentColor}
        color="white"
        _hover={{ bg: `${accentColor}` }}
        boxShadow="lg"
        onClick={onToggle}
        zIndex={999}
      />
      
      {/* Chat window */}
      <Fade in={isOpen}>
        <Box
          position="fixed"
          bottom={20}
          right={widgetPosition === 'bottom-right' ? 4 : 'auto'}
          left={widgetPosition === 'bottom-left' ? 4 : 'auto'}
          width="350px"
          height="500px"
          bg={backgroundColor}
          borderRadius="md"
          boxShadow="lg"
          display={isOpen ? 'flex' : 'none'}
          flexDirection="column"
          zIndex={999}
          borderWidth="1px"
          borderColor={borderColor}
          overflow="hidden"
        >
          {/* Header */}
          <Flex
            p={3}
            borderBottomWidth="1px"
            borderColor={borderColor}
            bg={accentColor}
            color="white"
            alignItems="center"
            justifyContent="space-between"
          >
            <Flex alignItems="center">
              <Avatar 
                size="sm" 
                name={businessName}
                src={businessLogo} 
                mr={2}
              />
              <Text fontWeight="bold">{businessName} Assistant</Text>
            </Flex>
            <CloseButton onClick={onToggle} color="white" />
          </Flex>
          
          {/* Messages */}
          <VStack
            flex={1}
            overflowY="auto"
            p={4}
            spacing={4}
            alignItems="flex-start"
            width="100%"
          >
            {messages.map((message) => (
              <Flex
                key={message.id}
                alignSelf={message.sender === 'user' ? 'flex-end' : 'flex-start'}
                flexDirection="column"
                maxWidth="80%"
                width="fit-content"
              >
                <Box
                  bg={message.sender === 'user' ? userBgColor : botBgColor}
                  color={message.sender === 'user' ? userTextColor : 'inherit'}
                  borderRadius="lg"
                  px={3}
                  py={2}
                  mb={1}
                >
                  <Text fontSize="sm">{message.content}</Text>
                </Box>
                
                {/* Feedback buttons for bot messages */}
                {message.sender === 'bot' && message.logId && !message.feedbackGiven && (
                  <Flex justifyContent="flex-end" mt={1}>
                    <ButtonGroup size="xs" isAttached variant="outline">
                      <IconButton
                        aria-label="Helpful"
                        icon={<FaThumbsUp />}
                        size="xs"
                        onClick={() => handleFeedback(message.id, message.logId, true)}
                      />
                      <IconButton
                        aria-label="Not helpful"
                        icon={<FaThumbsDown />}
                        size="xs"
                        onClick={() => handleFeedback(message.id, message.logId, false)}
                      />
                    </ButtonGroup>
                  </Flex>
                )}
                
                {/* Display "Thanks for feedback" message */}
                {message.sender === 'bot' && message.feedbackGiven && (
                  <Text fontSize="xs" color="gray.500" textAlign="right" mt={1}>
                    Thanks for your feedback
                  </Text>
                )}
              </Flex>
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <Flex alignSelf="flex-start" maxWidth="80%">
                <Box
                  bg={botBgColor}
                  borderRadius="lg"
                  px={3}
                  py={2}
                  display="flex"
                  alignItems="center"
                >
                  <Spinner size="sm" mr={2} />
                  <Text fontSize="sm">Typing...</Text>
                </Box>
              </Flex>
            )}
            
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </VStack>
          
          {/* Input area */}
          <Flex
            p={3}
            borderTopWidth="1px"
            borderColor={borderColor}
            bg={backgroundColor}
          >
            <InputGroup>
              <Input
                ref={inputRef}
                placeholder="Type your message..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                borderRadius="full"
              />
              <InputRightElement>
                <IconButton
                  aria-label="Send message"
                  icon={<FaPaperPlane />}
                  size="sm"
                  isRound
                  onClick={handleSendMessage}
                  colorScheme="blue"
                  disabled={!inputValue.trim() || isLoading}
                  mr={1}
                />
              </InputRightElement>
            </InputGroup>
          </Flex>
        </Box>
      </Fade>
    </>
  );
};

export default ChatbotWidget; 