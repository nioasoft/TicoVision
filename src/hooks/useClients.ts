import { useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '@/lib/logger';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/use-toast';
import {
  clientService,
  type Client,
  type CreateClientDto,
  type UpdateClientDto,
  type ClientContact,
  type CreateClientContactDto,
} from '@/services';

export interface ClientFilters {
  companyStatus: string;
  clientType: string;
  companySubtype: string;
  groupId: string;
}

export interface UseClientsReturn {
  // State
  clients: Client[];
  selectedClients: string[];
  loading: boolean;
  totalClients: number;
  currentPage: number;
  totalPages: number;

  // Search & Filters
  searchQuery: string;
  filters: ClientFilters;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<ClientFilters>) => void;
  resetFilters: () => void;

  // CRUD Operations
  loadClients: () => Promise<void>;
  createClient: (data: CreateClientDto) => Promise<boolean>;
  updateClient: (id: string, data: UpdateClientDto, originalClient: Client) => Promise<boolean>;
  deleteClient: (client: Client) => Promise<boolean>;

  // Bulk Operations
  bulkUpdateStatus: (status: 'active' | 'inactive' | 'pending') => Promise<boolean>;

  // Selection & Pagination
  toggleClientSelection: (clientId: string) => void;
  toggleSelectAll: () => void;
  clearSelection: () => void;
  setCurrentPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;

  // Contact Management
  clientContacts: ClientContact[];
  loadClientContacts: (clientId: string) => Promise<void>;
  addContact: (clientId: string, contactData: CreateClientContactDto) => Promise<boolean>;
  updateContact: (contactId: string, contactData: Partial<CreateClientContactDto>) => Promise<boolean>;
  deleteContact: (contactId: string) => Promise<boolean>;
  setPrimaryContact: (contactId: string) => Promise<boolean>;
}

const DEFAULT_FILTERS: ClientFilters = {
  companyStatus: 'active',
  clientType: 'all',
  companySubtype: 'all',
  groupId: 'all',
};

const PAGE_SIZE = 20;

export function useClients(): UseClientsReturn {
  const { toast } = useToast();

  // State
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalClients, setTotalClients] = useState(0);
  const [currentPage, setCurrentPageState] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFiltersState] = useState<ClientFilters>(DEFAULT_FILTERS);
  const [clientContacts, setClientContacts] = useState<ClientContact[]>([]);

  // Debounce search query to reduce API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Computed
  const totalPages = useMemo(
    () => Math.ceil(totalClients / PAGE_SIZE),
    [totalClients]
  );

  // Load clients whenever search/filters/page changes
  useEffect(() => {
    loadClients();
  }, [debouncedSearchQuery, filters.companyStatus, filters.clientType, filters.companySubtype, filters.groupId, currentPage]);

  // Load clients
  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      let response;

      if (debouncedSearchQuery) {
        response = await clientService.search(debouncedSearchQuery);
        if (response.data) {
          setClients(response.data);
          setTotalClients(response.data.length);
        }
      } else {
        // Build filters object with all active filters
        const apiFilters: Record<string, string> = {};
        if (filters.companyStatus !== 'all') apiFilters.company_status = filters.companyStatus;
        if (filters.clientType !== 'all') apiFilters.client_type = filters.clientType;
        if (filters.companySubtype !== 'all') apiFilters.company_subtype = filters.companySubtype;
        if (filters.groupId === 'none') apiFilters.group_id = 'null';
        else if (filters.groupId !== 'all') apiFilters.group_id = filters.groupId;

        response = await clientService.list(
          { page: currentPage, pageSize: PAGE_SIZE, sortBy: 'created_at', sortOrder: 'desc' },
          Object.keys(apiFilters).length > 0 ? apiFilters : undefined
        );
        if (response.data) {
          setClients(response.data.clients);
          setTotalClients(response.data.total);
        }
      }

      if (response.error) {
        toast({
          title: 'שגיאה בטעינת לקוחות',
          description: response.error.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Error loading clients:', error);
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה בטעינת הלקוחות',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchQuery, filters, currentPage, toast]);

  // Create client
  const createClient = useCallback(async (data: CreateClientDto): Promise<boolean> => {
    const response = await clientService.create(data);
    if (response.error) {
      toast({
        title: 'שגיאה',
        description: response.error.message,
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'לקוח נוסף בהצלחה',
      description: `${data.company_name} נוסף למערכת`,
    });

    await loadClients();
    return true;
  }, [toast, loadClients]);

  // Update client
  const updateClient = useCallback(
    async (id: string, data: UpdateClientDto, originalClient: Client): Promise<boolean> => {
      // Remove old contact fields - they're managed through client_contacts table now
      const { contact_name, contact_email, contact_phone, ...clientData } = data;

      // Don't send tax_id if it hasn't changed (to avoid validation on old invalid tax IDs)
      const updateData: UpdateClientDto = { ...clientData };
      if (updateData.tax_id === originalClient.tax_id) {
        delete updateData.tax_id;
      }

      const response = await clientService.update(id, updateData);

      if (response.error) {
        toast({
          title: 'שגיאה',
          description: response.error.message,
          variant: 'destructive',
        });
        return false;
      }

      toast({
        title: 'לקוח עודכן בהצלחה',
        description: `הפרטים של ${data.company_name} עודכנו`,
      });

      await loadClients();
      return true;
    },
    [toast, loadClients]
  );

  // Delete client
  const deleteClient = useCallback(
    async (client: Client): Promise<boolean> => {
      const response = await clientService.delete(client.id);

      if (response.error) {
        toast({
          title: 'שגיאה',
          description: response.error.message,
          variant: 'destructive',
        });
        return false;
      }

      toast({
        title: 'לקוח נמחק',
        description: `${client.company_name} הוסר מהמערכת`,
      });

      await loadClients();
      return true;
    },
    [toast, loadClients]
  );

  // Bulk update status
  const bulkUpdateStatus = useCallback(
    async (status: 'active' | 'inactive' | 'pending'): Promise<boolean> => {
      if (selectedClients.length === 0) {
        toast({
          title: 'שגיאה',
          description: 'אנא בחר לקוחות לעדכון',
          variant: 'destructive',
        });
        return false;
      }

      const response = await clientService.bulkUpdateStatus(selectedClients, status);

      if (response.error) {
        toast({
          title: 'שגיאה',
          description: response.error.message,
          variant: 'destructive',
        });
        return false;
      }

      toast({
        title: 'סטטוס עודכן',
        description: `סטטוס עודכן עבור ${selectedClients.length} לקוחות`,
      });

      setSelectedClients([]);
      await loadClients();
      return true;
    },
    [selectedClients, toast, loadClients]
  );

  // Load client contacts
  const loadClientContacts = useCallback(
    async (clientId: string): Promise<void> => {
      const contactsResponse = await clientService.getClientContacts(clientId);
      if (contactsResponse.data) {
        setClientContacts(contactsResponse.data);
      }
    },
    []
  );

  // Add contact
  const addContact = useCallback(
    async (clientId: string, contactData: CreateClientContactDto): Promise<boolean> => {
      const response = await clientService.addContact(clientId, contactData);
      if (response.error) {
        toast({
          title: 'שגיאה',
          description: response.error.message,
          variant: 'destructive',
        });
        return false;
      }

      await loadClientContacts(clientId);
      toast({
        title: 'איש קשר נוסף',
        description: `${contactData.full_name} נוסף בהצלחה`,
      });
      return true;
    },
    [toast, loadClientContacts]
  );

  // Update contact
  const updateContact = useCallback(
    async (contactId: string, contactData: Partial<CreateClientContactDto>): Promise<boolean> => {
      const response = await clientService.updateContact(contactId, contactData);
      if (response.error) {
        toast({
          title: 'שגיאה',
          description: response.error.message,
          variant: 'destructive',
        });
        return false;
      }

      toast({
        title: 'איש קשר עודכן',
        description: 'פרטי איש הקשר עודכנו בהצלחה',
      });
      return true;
    },
    [toast]
  );

  // Delete contact
  const deleteContact = useCallback(
    async (contactId: string): Promise<boolean> => {
      const response = await clientService.deleteContact(contactId);
      if (response.error) {
        toast({
          title: 'שגיאה',
          description: response.error.message,
          variant: 'destructive',
        });
        return false;
      }

      toast({
        title: 'איש קשר נמחק',
        description: 'איש הקשר נמחק בהצלחה',
      });
      return true;
    },
    [toast]
  );

  // Set primary contact
  const setPrimaryContact = useCallback(
    async (contactId: string): Promise<boolean> => {
      const response = await clientService.setPrimaryContact(contactId);
      if (response.error) {
        toast({
          title: 'שגיאה',
          description: response.error.message,
          variant: 'destructive',
        });
        return false;
      }

      toast({
        title: 'איש קשר ראשי הוגדר',
        description: 'איש הקשר הוגדר כראשי',
      });
      return true;
    },
    [toast]
  );

  // Selection management
  const toggleClientSelection = useCallback((clientId: string) => {
    setSelectedClients((prev) =>
      prev.includes(clientId) ? prev.filter((id) => id !== clientId) : [...prev, clientId]
    );
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedClients((prev) =>
      prev.length === clients.length ? [] : clients.map((c) => c.id)
    );
  }, [clients]);

  const clearSelection = useCallback(() => {
    setSelectedClients([]);
  }, []);

  // Filters management
  const setFilters = useCallback((newFilters: Partial<ClientFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
    setCurrentPageState(1); // Reset to page 1 when filters change
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    setCurrentPageState(1);
  }, []);

  // Pagination
  const setCurrentPage = useCallback((page: number) => {
    setCurrentPageState(page);
  }, []);

  const nextPage = useCallback(() => {
    setCurrentPageState((prev) => Math.min(totalPages, prev + 1));
  }, [totalPages]);

  const previousPage = useCallback(() => {
    setCurrentPageState((prev) => Math.max(1, prev - 1));
  }, []);

  return {
    // State
    clients,
    selectedClients,
    loading,
    totalClients,
    currentPage,
    totalPages,

    // Search & Filters
    searchQuery,
    filters,
    setSearchQuery,
    setFilters,
    resetFilters,

    // CRUD Operations
    loadClients,
    createClient,
    updateClient,
    deleteClient,

    // Bulk Operations
    bulkUpdateStatus,

    // Selection & Pagination
    toggleClientSelection,
    toggleSelectAll,
    clearSelection,
    setCurrentPage,
    nextPage,
    previousPage,

    // Contact Management
    clientContacts,
    loadClientContacts,
    addContact,
    updateContact,
    deleteContact,
    setPrimaryContact,
  };
}
