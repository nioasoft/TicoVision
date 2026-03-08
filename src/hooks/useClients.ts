import { useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '@/lib/logger';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import {
  clientService,
  type Client,
  type CreateClientDto,
  type UpdateClientDto,
  type ClientContact,
  type CreateClientContactDto,
  type ClientStatusSummary,
} from '@/services';

export type WorkflowTab = 'all' | 'balance_24' | 'balance_25' | 'fee_paid' | 'fee_partial' | 'fee_unpaid' | 'fee_exempt';

export interface ClientFilters {
  companyStatus: string;
  clientType: string;
  companySubtype: string;
  groupId: string;
  status: string; // Client status: all, active, inactive, pending, adhoc
  balanceStatus: string; // Balance status filter
  tab: WorkflowTab; // Workflow tab
  accountantName: string; // Accountant name filter
  internalExternal: string; // Internal/external bookkeeping filter
}

export interface TabCounts {
  all: number;
  balance_24: number;
  balance_25: number;
  fee_paid: number;
  fee_partial: number;
  fee_unpaid: number;
  fee_exempt: number;
}

export interface UseClientsReturn {
  // State
  clients: Client[];
  selectedClients: string[];
  loading: boolean;
  totalClients: number;
  currentPage: number;
  totalPages: number;

  // Client type counts for filter cards
  clientTypeCounts: Record<string, number>;
  totalClientCount: number;

  // Status map
  clientStatusMap: Record<string, ClientStatusSummary>;

  // Tab counts
  tabCounts: TabCounts;

  // Sorting
  sortField: string;
  sortOrder: 'asc' | 'desc';
  toggleSort: (field: string) => void;

  // Accountant names for filter dropdown
  accountantNames: string[];

  // Search & Filters
  searchQuery: string;
  filters: ClientFilters;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<ClientFilters>) => void;
  resetFilters: () => void;

  // CRUD Operations
  loadClients: () => Promise<void>;
  createClient: (data: CreateClientDto) => Promise<{ success: boolean; clientId?: string }>;
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
  status: 'active',
  balanceStatus: 'all',
  tab: 'all',
  accountantName: 'all',
  internalExternal: 'all',
};

const PAGE_SIZE = 20;

export interface UseClientsOptions {
  excludeFreelancers?: boolean;
}

export function useClients(options: UseClientsOptions = {}): UseClientsReturn {
  const { excludeFreelancers = false } = options;
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
  const [clientTypeCounts, setClientTypeCounts] = useState<Record<string, number>>({});
  const [totalClientCount, setTotalClientCount] = useState(0);
  const [clientStatusMap, setClientStatusMap] = useState<Record<string, ClientStatusSummary>>({});
  const [allClientsForCounts, setAllClientsForCounts] = useState<Client[]>([]);
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [accountantNames, setAccountantNames] = useState<string[]>([]);
  // Balance year data: which clients have balance records + their status per year
  const currentYear = new Date().getFullYear();
  const taxYear = currentYear - 1;
  const previousTaxYear = currentYear - 2;
  const [balanceClientIds, setBalanceClientIds] = useState<{ year2024: Set<string>; year2025: Set<string> }>({
    year2024: new Set(),
    year2025: new Set(),
  });
  const [balanceStatusByYear, setBalanceStatusByYear] = useState<Record<string, { [year: number]: string }>>({});

  // Debounce search query to reduce API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Computed
  const totalPages = useMemo(
    () => Math.ceil(totalClients / PAGE_SIZE),
    [totalClients]
  );

  // Compute tab counts from allClientsForCounts + clientStatusMap + balanceClientIds
  const tabCounts = useMemo<TabCounts>(() => {
    const counts: TabCounts = {
      all: allClientsForCounts.length,
      balance_24: 0,
      balance_25: 0,
      fee_paid: 0,
      fee_partial: 0,
      fee_unpaid: 0,
      fee_exempt: 0,
    };

    for (const client of allClientsForCounts) {
      if (balanceClientIds.year2024.has(client.id)) counts.balance_24++;
      if (balanceClientIds.year2025.has(client.id)) counts.balance_25++;

      if (!client.pays_fees) {
        counts.fee_exempt++;
      } else {
        const statusInfo = clientStatusMap[client.id];
        if (statusInfo?.fee_status) {
          if (statusInfo.fee_status === 'paid') counts.fee_paid++;
          else if (statusInfo.fee_status === 'partial_paid') counts.fee_partial++;
          else if (['draft', 'sent', 'overdue'].includes(statusInfo.fee_status)) counts.fee_unpaid++;
        }
      }
    }

    return counts;
  }, [allClientsForCounts, clientStatusMap, balanceClientIds]);

  // Load client type counts for filter cards
  const loadClientTypeCounts = useCallback(async () => {
    try {
      let query = supabase
        .from('clients')
        .select('client_type', { count: 'exact', head: false });

      // Respect companyStatus filter
      if (filters.companyStatus !== 'all') {
        query = query.eq('company_status', filters.companyStatus);
      }

      // Exclude freelancers if on the clients page
      if (excludeFreelancers) {
        query = query.neq('client_type', 'freelancer');
      }

      const { data, error } = await query;
      if (error) {
        logger.error('Error loading client type counts:', error);
        return;
      }

      const counts: Record<string, number> = {};
      let total = 0;
      if (data) {
        for (const row of data) {
          const type = row.client_type || 'unknown';
          counts[type] = (counts[type] || 0) + 1;
          total++;
        }
      }

      setClientTypeCounts(counts);
      setTotalClientCount(total);
    } catch (error) {
      logger.error('Error loading client type counts:', error);
    }
  }, [filters.companyStatus, excludeFreelancers]);

  // Load all clients for tab counting (applies non-tab filters for dynamic counts)
  const loadAllClientsForCounts = useCallback(async () => {
    try {
      let query = supabase
        .from('clients')
        .select('id, status, pays_fees');

      if (excludeFreelancers) {
        query = query.neq('client_type', 'freelancer');
      }

      // Apply all non-tab filters so counts reflect the current filter state
      if (filters.companyStatus !== 'all') query = query.eq('company_status', filters.companyStatus);
      if (filters.clientType !== 'all') query = query.eq('client_type', filters.clientType);
      if (filters.companySubtype !== 'all') query = query.eq('company_subtype', filters.companySubtype);
      if (filters.groupId === 'none') query = query.is('group_id', null);
      else if (filters.groupId !== 'all') query = query.eq('group_id', filters.groupId);
      if (filters.status !== 'all') query = query.eq('status', filters.status);
      if (filters.accountantName !== 'all') query = query.eq('accountant_name', filters.accountantName);
      if (filters.internalExternal !== 'all') query = query.eq('internal_external', filters.internalExternal);

      // Apply search filter for counts too
      if (debouncedSearchQuery) {
        query = query.or(`company_name.ilike.%${debouncedSearchQuery}%,tax_id.ilike.%${debouncedSearchQuery}%,contact_name.ilike.%${debouncedSearchQuery}%`);
      }

      const { data, error } = await query;
      if (error) {
        logger.error('Error loading clients for counts:', error);
        return;
      }

      setAllClientsForCounts((data || []) as Client[]);
    } catch (error) {
      logger.error('Error loading clients for counts:', error);
    }
  }, [excludeFreelancers, filters.companyStatus, filters.clientType, filters.companySubtype, filters.groupId, filters.status, filters.accountantName, filters.internalExternal, debouncedSearchQuery]);

  // Load status summary for all clients
  const loadClientStatusSummary = useCallback(async () => {
    const response = await clientService.getClientsStatusSummary();
    if (response.data) {
      const map: Record<string, ClientStatusSummary> = {};
      for (const item of response.data) {
        map[item.client_id] = item;
      }
      setClientStatusMap(map);
    }
  }, []);

  // Load balance year data (which clients have annual_balance_sheets for 2024/2025)
  const loadBalanceYearData = useCallback(async () => {
    try {
      // Fetch each year separately to avoid Supabase default 1000-row limit
      const [res1, res2] = await Promise.all([
        supabase.from('annual_balance_sheets').select('client_id, year, status').eq('year', previousTaxYear),
        supabase.from('annual_balance_sheets').select('client_id, year, status').eq('year', taxYear),
      ]);

      const error = res1.error || res2.error;
      const data = [...(res1.data || []), ...(res2.data || [])];

      if (error) {
        logger.error('Error loading balance year data:', error);
        return;
      }

      const year2024 = new Set<string>();
      const year2025 = new Set<string>();
      const statusMap: Record<string, { [year: number]: string }> = {};
      for (const row of data || []) {
        if (row.year === previousTaxYear) year2024.add(row.client_id);
        if (row.year === taxYear) year2025.add(row.client_id);
        if (!statusMap[row.client_id]) statusMap[row.client_id] = {};
        statusMap[row.client_id][row.year] = row.status;
      }
      setBalanceClientIds({ year2024, year2025 });
      setBalanceStatusByYear(statusMap);
    } catch (error) {
      logger.error('Error loading balance year data:', error);
    }
  }, [previousTaxYear, taxYear]);

  // Load distinct accountant names for filter dropdown
  const loadAccountantNames = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('accountant_name')
        .not('accountant_name', 'is', null)
        .neq('accountant_name', '');

      if (error) {
        logger.error('Error loading accountant names:', error);
        return;
      }

      const names = [...new Set((data || []).map(r => r.accountant_name as string))].sort();
      setAccountantNames(names);
    } catch (error) {
      logger.error('Error loading accountant names:', error);
    }
  }, []);

  // Refetch counts when companyStatus changes
  useEffect(() => {
    loadClientTypeCounts();
  }, [loadClientTypeCounts]);

  // Load status summary, balance year data, and accountant names on mount
  useEffect(() => {
    loadClientStatusSummary();
    loadBalanceYearData();
    loadAccountantNames();
  }, [loadClientStatusSummary, loadBalanceYearData, loadAccountantNames]);

  // Reload counts when non-tab filters change
  useEffect(() => {
    loadAllClientsForCounts();
  }, [loadAllClientsForCounts]);

  // Load clients whenever search/filters/page/sort changes
  useEffect(() => {
    loadClients();
  }, [debouncedSearchQuery, filters.companyStatus, filters.clientType, filters.companySubtype, filters.groupId, filters.status, filters.tab, filters.balanceStatus, filters.accountantName, filters.internalExternal, currentPage, sortField, sortOrder]);

  // Load clients
  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      let response;

      if (debouncedSearchQuery) {
        response = await clientService.search(debouncedSearchQuery);
        if (response.data) {
          let filtered = response.data;
          filtered = applyClientSideFilters(filtered);
          setClients(filtered);
          setTotalClients(filtered.length);
        }
      } else {
        // Build filters object with all active filters
        const apiFilters: Record<string, string> = {};
        if (filters.companyStatus !== 'all') apiFilters.company_status = filters.companyStatus;
        if (filters.clientType !== 'all') apiFilters.client_type = filters.clientType;
        if (filters.companySubtype !== 'all') apiFilters.company_subtype = filters.companySubtype;
        if (filters.groupId === 'none') apiFilters.group_id = 'null';
        else if (filters.groupId !== 'all') apiFilters.group_id = filters.groupId;
        if (filters.status !== 'all') apiFilters.status = filters.status;
        if (filters.accountantName !== 'all') apiFilters.accountant_name = filters.accountantName;
        if (filters.internalExternal !== 'all') apiFilters.internal_external = filters.internalExternal;

        // Exclude freelancers if requested (used on Companies page)
        if (excludeFreelancers) apiFilters.client_type_neq = 'freelancer';

        // For tab filters that need client-side filtering (fee/balance status),
        // we need to load more data and filter client-side
        const needsClientSideFilter = ['balance_24', 'balance_25', 'fee_unpaid', 'fee_paid', 'fee_partial', 'fee_exempt'].includes(filters.tab) || filters.balanceStatus !== 'all';

        if (needsClientSideFilter) {
          // Load all matching clients (no pagination) for client-side filtering
          response = await clientService.list(
            { page: 1, pageSize: 1000, sortBy: sortField, sortOrder },
            Object.keys(apiFilters).length > 0 ? apiFilters : undefined
          );
          if (response.data) {
            let filtered = response.data.clients;
            filtered = applyClientSideFilters(filtered);
            // Manual pagination
            const start = (currentPage - 1) * PAGE_SIZE;
            setTotalClients(filtered.length);
            setClients(filtered.slice(start, start + PAGE_SIZE));
          }
        } else {
          response = await clientService.list(
            { page: currentPage, pageSize: PAGE_SIZE, sortBy: sortField, sortOrder },
            Object.keys(apiFilters).length > 0 ? apiFilters : undefined
          );
          if (response.data) {
            setClients(response.data.clients);
            setTotalClients(response.data.total);
          }
        }
      }

      if (response?.error) {
        toast({
          title: 'שגיאה בטעינת לקוחות',
          description: response.error.message || 'לא הצלחנו לטעון את רשימת הלקוחות',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Error loading clients:', error);
      toast({
        title: 'שגיאה בטעינת לקוחות',
        description: 'לא הצלחנו לטעון את רשימת הלקוחות. נסה לרענן את הדף.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchQuery, filters, currentPage, toast, excludeFreelancers, clientStatusMap, sortField, sortOrder, balanceClientIds]);

  // Apply client-side filters (tab-based fee/balance status, balance status dropdown)
  const applyClientSideFilters = useCallback((clientsList: Client[]): Client[] => {
    let filtered = clientsList;

    // Tab-based filters
    if (filters.tab === 'balance_24') {
      filtered = filtered.filter(c => balanceClientIds.year2024.has(c.id));
    } else if (filters.tab === 'balance_25') {
      filtered = filtered.filter(c => balanceClientIds.year2025.has(c.id));
    } else if (filters.tab === 'fee_paid') {
      filtered = filtered.filter(c => {
        const s = clientStatusMap[c.id];
        return s?.fee_status === 'paid';
      });
    } else if (filters.tab === 'fee_partial') {
      filtered = filtered.filter(c => {
        const s = clientStatusMap[c.id];
        return s?.fee_status === 'partial_paid';
      });
    } else if (filters.tab === 'fee_unpaid') {
      filtered = filtered.filter(c => {
        const s = clientStatusMap[c.id];
        return s?.fee_status && ['draft', 'sent', 'overdue'].includes(s.fee_status);
      });
    } else if (filters.tab === 'fee_exempt') {
      filtered = filtered.filter(c => !c.pays_fees);
    }

    // Balance status dropdown filter
    if (filters.balanceStatus !== 'all') {
      filtered = filtered.filter(c => {
        const s = clientStatusMap[c.id];
        return s?.balance_status === filters.balanceStatus;
      });
    }

    return filtered;
  }, [filters.tab, filters.balanceStatus, clientStatusMap, balanceClientIds]);

  // Create client
  const createClient = useCallback(async (data: CreateClientDto): Promise<{ success: boolean; clientId?: string }> => {
    const response = await clientService.create(data);
    if (response.error) {
      toast({
        title: 'שגיאה ביצירת לקוח',
        description: response.error.message || 'לא הצלחנו ליצור את הלקוח. נסה שוב.',
        variant: 'destructive',
      });
      return { success: false };
    }

    toast({
      title: 'לקוח נוסף בהצלחה',
      description: `${data.company_name} נוסף למערכת`,
    });

    await loadClients();
    return { success: true, clientId: response.data?.id };
  }, [toast, loadClients]);

  // Update client
  const updateClient = useCallback(
    async (id: string, data: UpdateClientDto, originalClient: Client): Promise<boolean> => {
      // Don't send tax_id if it hasn't changed (to avoid validation on old invalid tax IDs)
      const updateData: UpdateClientDto = { ...data };
      if (updateData.tax_id === originalClient.tax_id) {
        delete updateData.tax_id;
      }

      const response = await clientService.update(id, updateData);

      if (response.error) {
        toast({
          title: 'שגיאה בעדכון לקוח',
          description: response.error.message || 'לא הצלחנו לעדכן את פרטי הלקוח. נסה שוב.',
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
          title: 'שגיאה במחיקת לקוח',
          description: response.error.message || 'לא הצלחנו למחוק את הלקוח. נסה שוב.',
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
          title: 'לא נבחרו לקוחות',
          description: 'יש לבחור לפחות לקוח אחד לעדכון',
          variant: 'destructive',
        });
        return false;
      }

      const response = await clientService.bulkUpdateStatus(selectedClients, status);

      if (response.error) {
        toast({
          title: 'שגיאה בעדכון סטטוס',
          description: response.error.message || 'לא הצלחנו לעדכן את הסטטוס. נסה שוב.',
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
          title: 'שגיאה בהוספת איש קשר',
          description: response.error.message || 'לא הצלחנו להוסיף את איש הקשר. נסה שוב.',
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
    async (clientId: string, contactId: string, contactData: Partial<CreateClientContactDto>): Promise<boolean> => {
      const response = await clientService.updateContact(contactId, contactData);
      if (response.error) {
        toast({
          title: 'שגיאה בעדכון איש קשר',
          description: response.error.message || 'לא הצלחנו לעדכן את איש הקשר. נסה שוב.',
          variant: 'destructive',
        });
        return false;
      }

      await loadClientContacts(clientId);
      toast({
        title: 'איש קשר עודכן',
        description: 'פרטי איש הקשר עודכנו בהצלחה',
      });
      return true;
    },
    [toast, loadClientContacts]
  );

  // Delete contact
  const deleteContact = useCallback(
    async (clientId: string, contactId: string): Promise<boolean> => {
      const response = await clientService.deleteContact(contactId);
      if (response.error) {
        toast({
          title: 'שגיאה במחיקת איש קשר',
          description: response.error.message || 'לא הצלחנו למחוק את איש הקשר. נסה שוב.',
          variant: 'destructive',
        });
        return false;
      }

      await loadClientContacts(clientId);
      toast({
        title: 'איש קשר נמחק',
        description: 'איש הקשר נמחק בהצלחה',
      });
      return true;
    },
    [toast, loadClientContacts]
  );

  // Set primary contact
  const setPrimaryContact = useCallback(
    async (clientId: string, contactId: string): Promise<boolean> => {
      const response = await clientService.setPrimaryContact(contactId);
      if (response.error) {
        toast({
          title: 'שגיאה בהגדרת איש קשר ראשי',
          description: response.error.message || 'לא הצלחנו להגדיר את איש הקשר כראשי. נסה שוב.',
          variant: 'destructive',
        });
        return false;
      }

      await loadClientContacts(clientId);
      toast({
        title: 'איש קשר ראשי הוגדר',
        description: 'איש הקשר הוגדר כראשי',
      });
      return true;
    },
    [toast, loadClientContacts]
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

  // Sort toggle
  const toggleSort = useCallback((field: string) => {
    setSortField(prev => {
      if (prev === field) {
        setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
        return prev;
      }
      setSortOrder('asc');
      return field;
    });
    setCurrentPageState(1);
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

    // Client type counts
    clientTypeCounts,
    totalClientCount,

    // Status map
    clientStatusMap,

    // Tab counts
    tabCounts,

    // Sorting
    sortField,
    sortOrder,
    toggleSort,

    // Accountant names for filter dropdown
    accountantNames,

    // Balance status per year per client
    balanceStatusByYear,
    taxYear,
    previousTaxYear,

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
