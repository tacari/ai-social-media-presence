'use client';

import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  FormControl,
  FormLabel,
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Select,
  Stack,
  Heading,
  Text,
  Flex,
  useSteps,
  Step,
  StepIcon,
  StepIndicator,
  StepNumber,
  StepSeparator,
  StepStatus,
  StepTitle,
  Stepper,
  Spinner,
  Alert,
  AlertIcon,
  Badge,
  Divider,
  SimpleGrid,
  Tag,
  TagLabel,
  useToast,
} from '@chakra-ui/react';
import { MdAdd, MdAutoAwesome, MdCampaign, MdCheck, MdEdit, MdLocationOn } from 'react-icons/md';

interface CampaignWizardProps {
  businessId: string;
  businessName: string;
}

interface Location {
  id: number;
  name: string;
}

// Sample location data (would come from an API in production)
const sampleLocations: Location[] = [
  { id: 1001, name: 'New York, NY' },
  { id: 1002, name: 'Los Angeles, CA' },
  { id: 1003, name: 'Chicago, IL' },
  { id: 1004, name: 'Houston, TX' },
  { id: 1005, name: 'Miami, FL' },
];

// Sample industry options
const industries = [
  'Automotive',
  'Beauty & Personal Care',
  'Education',
  'Financial Services',
  'Food & Restaurant',
  'Healthcare',
  'Home Services',
  'Legal Services',
  'Real Estate',
  'Retail',
  'Technology',
  'Travel & Hospitality',
];

const steps = [
  { title: 'Campaign Details', description: 'Set up your campaign' },
  { title: 'Targeting', description: 'Choose your audience' },
  { title: 'Budget', description: 'Set your spending limits' },
  { title: 'Review', description: 'Finalize and launch' },
];

export default function CampaignWizard({ businessId, businessName }: CampaignWizardProps) {
  const { activeStep, setActiveStep } = useSteps({
    index: 0,
    count: steps.length,
  });
  
  const toast = useToast();
  
  // Form state
  const [campaignName, setCampaignName] = useState<string>(`${businessName} Campaign`);
  const [industry, setIndustry] = useState<string>('');
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([]);
  const [dailyBudget, setDailyBudget] = useState<number>(10);
  
  // UI state
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCampaign, setCreatedCampaign] = useState<any>(null);
  const [headlines, setHeadlines] = useState<string[]>([]);
  const [descriptions, setDescriptions] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  
  const handleNextStep = () => {
    if (activeStep === 0 && !campaignName) {
      toast({
        title: 'Campaign name required',
        description: 'Please enter a name for your campaign',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    if (activeStep === 1 && selectedLocations.length === 0) {
      toast({
        title: 'Location required',
        description: 'Please select at least one location to target',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    if (activeStep === 2 && (!dailyBudget || dailyBudget < 5)) {
      toast({
        title: 'Valid budget required',
        description: 'Please set a daily budget of at least $5',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };
  
  const handlePrevStep = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };
  
  const addLocation = (location: Location) => {
    if (!selectedLocations.find(loc => loc.id === location.id)) {
      setSelectedLocations([...selectedLocations, location]);
    }
  };
  
  const removeLocation = (locationId: number) => {
    setSelectedLocations(selectedLocations.filter(loc => loc.id !== locationId));
  };
  
  const handleCreateCampaign = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/googleads/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId,
          campaignName,
          dailyBudget,
          locations: selectedLocations.map(loc => loc.id),
          industry,
          generateAI: true,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setCreatedCampaign(data.campaign);
        if (data.headlines) setHeadlines(data.headlines);
        if (data.descriptions) setDescriptions(data.descriptions);
        if (data.keywords) setKeywords(data.keywords);
        
        toast({
          title: 'Campaign created!',
          description: 'Your AI-powered Google Ads campaign has been created successfully.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        setError(data.error || 'Failed to create campaign');
      }
    } catch (err) {
      setError('An error occurred while creating the campaign');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card p={6} shadow="md" borderRadius="lg" width="100%">
      <Heading size="md" mb={6}>Create AI-Powered Ad Campaign</Heading>
      
      <Stepper index={activeStep} mb={8} size="sm">
        {steps.map((step, index) => (
          <Step key={index}>
            <StepIndicator>
              <StepStatus
                complete={<StepIcon />}
                incomplete={<StepNumber />}
                active={<StepNumber />}
              />
            </StepIndicator>
            <Box flexShrink={0}>
              <StepTitle>{step.title}</StepTitle>
            </Box>
            <StepSeparator />
          </Step>
        ))}
      </Stepper>
      
      {error && (
        <Alert status="error" mb={4} borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      )}
      
      {activeStep === 0 && (
        <Stack spacing={4}>
          <Heading size="sm">Campaign Details</Heading>
          <FormControl>
            <FormLabel>Campaign Name</FormLabel>
            <Input
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Enter campaign name"
            />
          </FormControl>
          
          <FormControl>
            <FormLabel>Business Industry</FormLabel>
            <Select
              placeholder="Select industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            >
              {industries.map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </Select>
          </FormControl>
        </Stack>
      )}
      
      {activeStep === 1 && (
        <Stack spacing={4}>
          <Heading size="sm">Target Locations</Heading>
          <Text>Select the geographic areas where you want your ads to appear.</Text>
          
          <FormControl>
            <FormLabel>Add Location</FormLabel>
            <Select
              placeholder="Select a location"
              onChange={(e) => {
                const selectedId = parseInt(e.target.value);
                const location = sampleLocations.find(loc => loc.id === selectedId);
                if (location) {
                  addLocation(location);
                }
              }}
            >
              {sampleLocations.map((location) => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </Select>
          </FormControl>
          
          <Box>
            <Text fontWeight="bold" mb={2}>Selected Locations:</Text>
            <Flex wrap="wrap" gap={2}>
              {selectedLocations.length === 0 ? (
                <Text color="gray.500">No locations selected</Text>
              ) : (
                selectedLocations.map((location) => (
                  <Tag key={location.id} size="md" borderRadius="full" variant="solid" colorScheme="blue">
                    <TagLabel>{location.name}</TagLabel>
                    <Box
                      ml={1}
                      cursor="pointer"
                      onClick={() => removeLocation(location.id)}
                    >
                      ✕
                    </Box>
                  </Tag>
                ))
              )}
            </Flex>
          </Box>
        </Stack>
      )}
      
      {activeStep === 2 && (
        <Stack spacing={4}>
          <Heading size="sm">Budget Settings</Heading>
          <Text>Set your daily budget for this campaign.</Text>
          
          <FormControl>
            <FormLabel>Daily Budget (USD)</FormLabel>
            <NumberInput
              value={dailyBudget}
              onChange={(_, value) => setDailyBudget(value)}
              min={5}
              precision={2}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
            <Text fontSize="sm" color="gray.500" mt={1}>
              Minimum daily budget: $5.00
            </Text>
          </FormControl>
          
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            <Box>
              <Text fontWeight="bold">AI Budget Recommendation</Text>
              <Text fontSize="sm">
                Based on your industry and locations, we recommend a daily budget of ${(dailyBudget < 10 ? 10 : dailyBudget).toFixed(2)}.
                This should generate approximately {Math.round((dailyBudget < 10 ? 10 : dailyBudget) * 5)} clicks per day.
              </Text>
            </Box>
          </Alert>
        </Stack>
      )}
      
      {activeStep === 3 && (
        <Stack spacing={4}>
          <Heading size="sm">Review Your Campaign</Heading>
          
          {loading ? (
            <Flex justify="center" py={8}>
              <Spinner size="xl" />
            </Flex>
          ) : createdCampaign ? (
            <Box>
              <Alert status="success" mb={4} borderRadius="md">
                <AlertIcon />
                Campaign successfully created!
              </Alert>
              
              <SimpleGrid columns={2} spacing={4} mb={4}>
                <Box>
                  <Text fontWeight="bold">Campaign Name</Text>
                  <Text>{createdCampaign.campaign_name}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Daily Budget</Text>
                  <Text>${createdCampaign.daily_budget}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Start Date</Text>
                  <Text>{new Date(createdCampaign.start_date).toLocaleDateString()}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Status</Text>
                  <Badge colorScheme="green">Active</Badge>
                </Box>
              </SimpleGrid>
              
              <Divider my={4} />
              
              <Box mb={4}>
                <Heading size="xs" mb={2}>AI-Generated Headlines</Heading>
                <Stack>
                  {headlines.map((headline, index) => (
                    <Text key={index}>{headline}</Text>
                  ))}
                </Stack>
              </Box>
              
              <Box mb={4}>
                <Heading size="xs" mb={2}>AI-Generated Descriptions</Heading>
                <Stack>
                  {descriptions.map((description, index) => (
                    <Text key={index}>{description}</Text>
                  ))}
                </Stack>
              </Box>
              
              <Box>
                <Heading size="xs" mb={2}>AI-Suggested Keywords</Heading>
                <Flex wrap="wrap" gap={2}>
                  {keywords.map((keyword, index) => (
                    <Tag key={index} colorScheme="blue">{keyword}</Tag>
                  ))}
                </Flex>
              </Box>
              
              <Button 
                mt={6}
                colorScheme="blue"
                leftIcon={<MdCampaign />}
                onClick={() => window.location.href = `/businesses/${businessId}`}
              >
                View All Campaigns
              </Button>
            </Box>
          ) : (
            <>
              <SimpleGrid columns={2} spacing={4} mb={4}>
                <Box>
                  <Text fontWeight="bold">Campaign Name</Text>
                  <Text>{campaignName}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Industry</Text>
                  <Text>{industry}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Locations</Text>
                  <Text>{selectedLocations.map(loc => loc.name).join(', ')}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Daily Budget</Text>
                  <Text>${dailyBudget.toFixed(2)}</Text>
                </Box>
              </SimpleGrid>
              
              <Alert status="info" borderRadius="md" mb={4}>
                <AlertIcon />
                <Box>
                  <Text fontWeight="bold">What happens next?</Text>
                  <Text fontSize="sm">
                    When you launch, our AI will generate optimized ad copy, keywords, and bidding strategies
                    based on your business industry and target locations.
                  </Text>
                </Box>
              </Alert>
              
              <Button
                colorScheme="green"
                leftIcon={<MdAutoAwesome />}
                onClick={handleCreateCampaign}
                isLoading={loading}
                loadingText="Creating campaign..."
                size="lg"
                width="100%"
              >
                Launch AI-Powered Campaign
              </Button>
            </>
          )}
        </Stack>
      )}
      
      {!createdCampaign && (
        <Flex justify="space-between" mt={8}>
          <Button
            onClick={handlePrevStep}
            isDisabled={activeStep === 0}
            variant="outline"
          >
            Previous
          </Button>
          
          {activeStep < steps.length - 1 ? (
            <Button
              onClick={handleNextStep}
              colorScheme="blue"
              rightIcon={<MdCheck />}
            >
              Next
            </Button>
          ) : null}
        </Flex>
      )}
    </Card>
  );
} 