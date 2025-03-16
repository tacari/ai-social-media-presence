import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Button,
  Text,
  Spinner,
  HStack,
  VStack,
  Flex,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
  Select,
  InputGroup,
  Input,
  InputRightElement,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  Card,
  CardBody,
  useColorModeValue,
  Tooltip,
  Skeleton,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Textarea,
  Divider
} from '@chakra-ui/react';
import { 
  FaSearch, 
  FaChevronDown, 
  FaChevronLeft, 
  FaChevronRight, 
  FaEllipsisV, 
  FaPhone, 
  FaEnvelope,
  FaUser,
  FaCalendarAlt,
  FaNotesMedical,
  FaEdit,
  FaTrash,
  FaFileExport,
  FaFilter,
  FaEye
} from 'react-icons/fa';
import { ChatbotLead } from '@/app/lib/chatbot';
import { createClient } from '@/utils/supabase/client';

interface ChatbotLeadsProps {
  businessId: string;
}

interface LeadStatistics {
  new?: number;
  contacted?: number;
  qualified?: number;
  converted?: number;
  rejected?: number;
  [key: string]: number | undefined;
}

const ChatbotLeads: React.FC<ChatbotLeadsProps> = ({ businessId }) => {
  const [leads, setLeads] = useState<ChatbotLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLeads, setTotalLeads] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingLead, setEditingLead] = useState<ChatbotLead | null>(null);
  const [viewingLead, setViewingLead] = useState<ChatbotLead | null>(null);
  const [statistics, setStatistics] = useState<LeadStatistics>({});
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const { isOpen: isViewOpen, onOpen: onViewOpen, onClose: onViewClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const toast = useToast();
  const supabase = createClient();
  
  const cardBg = useColorModeValue('white', 'gray.800');
  
  // Load leads on component mount or when filters change
  useEffect(() => {
    fetchLeads();
  }, [businessId, currentPage, statusFilter]);
  
  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      const queryParams = new URLSearchParams({
        businessId,
        page: currentPage.toString(),
        limit: '10'
      });

      if (statusFilter) {
        queryParams.append('status', statusFilter);
      }

      if (searchTerm) {
        // Client-side filtering will be applied after data is fetched
      }

      const { data, error } = await supabase
        .from('chatbot_leads')
        .select('*', { count: 'exact' })
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate some statistics
      const statusCounts: Record<string, number> = {};
      data.forEach(lead => {
        statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
      });
      setStatistics({
        total: data.length,
        ...statusCounts
      });

      // Apply client-side filtering for search
      let filteredLeads = data;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredLeads = data.filter(lead => 
          (lead.name?.toLowerCase().includes(term) || 
           lead.email?.toLowerCase().includes(term) ||
           lead.phone?.toLowerCase().includes(term) ||
           lead.notes?.toLowerCase().includes(term))
        );
      }

      // Apply status filtering (could be done via API but doing client-side for now)
      if (statusFilter) {
        filteredLeads = filteredLeads.filter(lead => lead.status === statusFilter);
      }

      // Paginate results
      const startIndex = (currentPage - 1) * 10;
      const paginatedLeads = filteredLeads.slice(startIndex, startIndex + 10);
      
      setLeads(paginatedLeads);
      setTotalPages(Math.max(1, Math.ceil(filteredLeads.length / 10)));
      setTotalLeads(data.length);
    } catch (error) {
      console.error('Error fetching chatbot leads:', error);
      toast({
        title: 'Error',
        description: 'Failed to load leads',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleStatusChange = async (lead: ChatbotLead, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('chatbot_leads')
        .update({ status: newStatus })
        .eq('id', lead.id)
        .eq('business_id', businessId);

      if (error) throw error;
      
      setLeads(leads.map(l => l.id === lead.id ? { ...l, status: newStatus as any } : l));
      
      toast({
        title: 'Status updated',
        description: `Lead status has been updated to ${newStatus}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error updating lead status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update lead status',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };
  
  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    
    try {
      const { error } = await supabase
        .from('chatbot_leads')
        .delete()
        .eq('id', leadId)
        .eq('business_id', businessId);

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Lead deleted',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
      
      // Remove the lead from the UI
      setLeads(prevLeads => prevLeads.filter(lead => lead.id !== leadId));
      
      // Refresh leads to update statistics
      fetchLeads();
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete lead',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };
  
  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      new: 'blue',
      contacted: 'purple',
      qualified: 'orange',
      converted: 'green',
      rejected: 'red'
    };
    
    return (
      <Badge colorScheme={statusColors[status] || 'gray'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const handleSearch = () => {
    // Reset to first page when searching
    setCurrentPage(1);
    fetchLeads();
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  const handleEditSave = async () => {
    if (!editingLead) return;
    
    try {
      const { error } = await supabase
        .from('chatbot_leads')
        .update({
          name: editingLead.name,
          email: editingLead.email,
          phone: editingLead.phone,
          notes: editingLead.notes,
          status: editingLead.status
        })
        .eq('id', editingLead.id)
        .eq('business_id', businessId);

      if (error) throw error;
      
      setLeads(leads.map(l => l.id === editingLead.id ? editingLead : l));
      onEditClose();
      
      toast({
        title: 'Lead updated',
        description: 'Lead information has been updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error updating lead:', error);
      toast({
        title: 'Error',
        description: 'Failed to update lead information',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };
  
  const handleDelete = async () => {
    if (!editingLead) return;
    
    try {
      const { error } = await supabase
        .from('chatbot_leads')
        .delete()
        .eq('id', editingLead.id)
        .eq('business_id', businessId);

      if (error) throw error;
      
      setLeads(leads.filter(l => l.id !== editingLead.id));
      onDeleteClose();
      
      toast({
        title: 'Lead deleted',
        description: 'Lead has been deleted successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete lead',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };
  
  const exportLeads = () => {
    // Create CSV content
    const headers = ['Name', 'Email', 'Phone', 'Status', 'Notes', 'Created At'];
    const csvContent = [
      headers.join(','),
      ...leads.map(lead => [
        lead.name ? `"${lead.name.replace(/"/g, '""')}"` : '',
        lead.email ? `"${lead.email.replace(/"/g, '""')}"` : '',
        lead.phone ? `"${lead.phone.replace(/"/g, '""')}"` : '',
        lead.status ? `"${lead.status.replace(/"/g, '""')}"` : '',
        lead.notes ? `"${lead.notes.replace(/"/g, '""')}"` : '',
        lead.created_at ? new Date(lead.created_at).toLocaleString() : ''
      ].join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `chatbot-leads-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: 'Leads exported',
      description: 'Your leads have been exported to CSV',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };
  
  if (isLoading && currentPage === 1) {
    return (
      <Box p={5}>
        <Skeleton height="40px" mb={6} />
        <Skeleton height="20px" mb={2} />
        <Skeleton height="20px" mb={2} />
        <Skeleton height="20px" mb={4} />
        <Skeleton height="40px" mb={4} />
        <Skeleton height="400px" />
      </Box>
    );
  }
  
  return (
    <VStack spacing={6} align="stretch" w="100%">
      {/* Statistics Cards */}
      <Flex flexWrap="wrap" gap={4}>
        <Card minW="160px" flex="1">
          <CardBody>
            <Heading size="md" color="blue.500">{statistics.total || 0}</Heading>
            <Text>Total Leads</Text>
          </CardBody>
        </Card>
        <Card minW="160px" flex="1">
          <CardBody>
            <Heading size="md" color="blue.500">{statistics.new || 0}</Heading>
            <Text>New Leads</Text>
          </CardBody>
        </Card>
        <Card minW="160px" flex="1">
          <CardBody>
            <Heading size="md" color="green.500">{statistics.qualified || 0}</Heading>
            <Text>Qualified Leads</Text>
          </CardBody>
        </Card>
        <Card minW="160px" flex="1">
          <CardBody>
            <Heading size="md" color="purple.500">{statistics.converted || 0}</Heading>
            <Text>Converted</Text>
          </CardBody>
        </Card>
      </Flex>

      {/* Search and Filters */}
      <Card>
        <CardBody>
          <Flex direction={{ base: 'column', md: 'row' }} gap={4}>
            <InputGroup flex="3">
              <InputLeftElement pointerEvents="none">
                <FaSearch color="gray.300" />
              </InputLeftElement>
              <Input 
                placeholder="Search leads by name, email, or phone..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </InputGroup>
            
            <Select 
              flex="1"
              placeholder="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              icon={<FaFilter />}
            >
              <option value="">All Status</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="converted">Converted</option>
              <option value="rejected">Rejected</option>
            </Select>
            
            <Button 
              leftIcon={<FaFileExport />} 
              colorScheme="green"
              onClick={exportLeads}
            >
              Export
            </Button>
          </Flex>
        </CardBody>
      </Card>

      {/* Leads Table */}
      <Card flex="1">
        <CardBody>
          <Box overflowX="auto">
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Contact Info</Th>
                  <Th>Status</Th>
                  <Th>Created</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {leads.length > 0 ? (
                  leads.map((lead) => (
                    <Tr key={lead.id}>
                      <Td>{lead.name || 'Not provided'}</Td>
                      <Td>
                        <VStack align="start" spacing={1}>
                          {lead.email && <Text fontSize="sm">{lead.email}</Text>}
                          {lead.phone && <Text fontSize="sm">{lead.phone}</Text>}
                          {!lead.email && !lead.phone && <Text fontSize="sm" color="gray.400">No contact info</Text>}
                        </VStack>
                      </Td>
                      <Td>
                        <Menu>
                          <MenuButton as={Button} rightIcon={<FaChevronDown />} size="sm">
                            <Badge colorScheme={getStatusBadge(lead.status)}>
                              {getStatusBadge(lead.status)}
                            </Badge>
                          </MenuButton>
                          <MenuList>
                            <MenuItem onClick={() => handleStatusChange(lead, 'new')}>New</MenuItem>
                            <MenuItem onClick={() => handleStatusChange(lead, 'contacted')}>Contacted</MenuItem>
                            <MenuItem onClick={() => handleStatusChange(lead, 'qualified')}>Qualified</MenuItem>
                            <MenuItem onClick={() => handleStatusChange(lead, 'converted')}>Converted</MenuItem>
                            <MenuItem onClick={() => handleStatusChange(lead, 'rejected')}>Rejected</MenuItem>
                          </MenuList>
                        </Menu>
                      </Td>
                      <Td>{formatDate(lead.created_at as string)}</Td>
                      <Td>
                        <HStack spacing={2}>
                          <IconButton
                            aria-label="View lead"
                            icon={<FaEye />}
                            size="sm"
                            onClick={() => {
                              setViewingLead(lead);
                              onViewOpen();
                            }}
                          />
                          <IconButton
                            aria-label="Edit lead"
                            icon={<FaEdit />}
                            size="sm"
                            onClick={() => {
                              setEditingLead(lead);
                              onEditOpen();
                            }}
                          />
                          <IconButton
                            aria-label="Delete lead"
                            icon={<FaTrash />}
                            size="sm"
                            colorScheme="red"
                            onClick={() => {
                              setEditingLead(lead);
                              onDeleteOpen();
                            }}
                          />
                        </HStack>
                      </Td>
                    </Tr>
                  ))
                ) : (
                  <Tr>
                    <Td colSpan={5} textAlign="center" py={4}>
                      No leads found {statusFilter && `with status "${statusFilter}"`} {searchTerm && `matching "${searchTerm}"`}
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </Box>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <Flex justify="space-between" align="center" mt={4}>
              <Text fontSize="sm">
                Page {currentPage} of {totalPages}
              </Text>
              <HStack>
                <Button
                  leftIcon={<FaChevronLeft />}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  isDisabled={currentPage === 1}
                  size="sm"
                >
                  Previous
                </Button>
                <Button
                  rightIcon={<FaChevronRight />}
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  isDisabled={currentPage === totalPages}
                  size="sm"
                >
                  Next
                </Button>
              </HStack>
            </Flex>
          )}
        </CardBody>
      </Card>

      {/* View Lead Modal */}
      <Modal isOpen={isViewOpen} onClose={onViewClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Lead Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {viewingLead && (
              <VStack spacing={4} align="stretch">
                <Box>
                  <Heading size="sm">Name</Heading>
                  <Text>{viewingLead.name || 'Not provided'}</Text>
                </Box>
                
                <Box>
                  <Heading size="sm">Email</Heading>
                  <Text>{viewingLead.email || 'Not provided'}</Text>
                </Box>
                
                <Box>
                  <Heading size="sm">Phone</Heading>
                  <Text>{viewingLead.phone || 'Not provided'}</Text>
                </Box>
                
                <Box>
                  <Heading size="sm">Status</Heading>
                  <Badge colorScheme={getStatusBadge(viewingLead.status)}>
                    {getStatusBadge(viewingLead.status)}
                  </Badge>
                </Box>
                
                <Box>
                  <Heading size="sm">Notes</Heading>
                  <Text whiteSpace="pre-wrap">{viewingLead.notes || 'No notes'}</Text>
                </Box>
                
                <Box>
                  <Heading size="sm">Session ID</Heading>
                  <Text fontSize="sm" color="gray.600">{viewingLead.session_id}</Text>
                </Box>
                
                <Divider />
                
                <Box>
                  <Heading size="sm">Created</Heading>
                  <Text>
                    {viewingLead.created_at 
                      ? new Date(viewingLead.created_at).toLocaleString() 
                      : 'Unknown'}
                  </Text>
                </Box>
                
                {viewingLead.updated_at && viewingLead.updated_at !== viewingLead.created_at && (
                  <Box>
                    <Heading size="sm">Updated</Heading>
                    <Text>
                      {new Date(viewingLead.updated_at).toLocaleString()}
                    </Text>
                  </Box>
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={() => {
              if (viewingLead) {
                setEditingLead(viewingLead);
                onViewClose();
                onEditOpen();
              }
            }}>
              Edit
            </Button>
            <Button onClick={onViewClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Lead Modal */}
      <Modal isOpen={isEditOpen} onClose={onEditClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Lead</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {editingLead && (
              <VStack spacing={4} align="stretch">
                <FormControl>
                  <FormLabel>Name</FormLabel>
                  <Input 
                    value={editingLead.name || ''} 
                    onChange={(e) => setEditingLead({...editingLead, name: e.target.value})}
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel>Email</FormLabel>
                  <Input 
                    type="email"
                    value={editingLead.email || ''} 
                    onChange={(e) => setEditingLead({...editingLead, email: e.target.value})}
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel>Phone</FormLabel>
                  <Input 
                    value={editingLead.phone || ''} 
                    onChange={(e) => setEditingLead({...editingLead, phone: e.target.value})}
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel>Status</FormLabel>
                  <Select 
                    value={editingLead.status} 
                    onChange={(e) => setEditingLead({...editingLead, status: e.target.value as any})}
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="converted">Converted</option>
                    <option value="rejected">Rejected</option>
                  </Select>
                </FormControl>
                
                <FormControl>
                  <FormLabel>Notes</FormLabel>
                  <Textarea 
                    value={editingLead.notes || ''} 
                    onChange={(e) => setEditingLead({...editingLead, notes: e.target.value})}
                    rows={4}
                  />
                </FormControl>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={handleEditSave}>
              Save
            </Button>
            <Button onClick={onEditClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete Lead</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            Are you sure you want to delete this lead? This action cannot be undone.
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="red" mr={3} onClick={handleDelete}>
              Delete
            </Button>
            <Button onClick={onDeleteClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
};

export default ChatbotLeads; 