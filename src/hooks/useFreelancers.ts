import { useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '@/lib/logger';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/use-toast';
import {
  clientService,
  type Client,
  type CreateClientDto,
  type UpdateClientDto,
} from '@/services';

export interface FreelancerFilters {
  isPassiveIncome: string; // 'all' | 'true' | 'false'
  linkedCompanyId: string; // 'all' | 'none' | uuid
}

export interface UseFreelancersReturn {
  // State
  freelancers: Client[];
  selectedFreelancers: string[];
  loading: boolean;
  totalFreelancers: number;
  currentPage: number;
  totalPages: number;

  // Search & Filters
  searchQuery: string;
  filters: FreelancerFilters;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<FreelancerFilters>) => void;
  resetFilters: () => void;

  // CRUD Operations
  loadFreelancers: () => Promise<void>;
  createFreelancer: (data: CreateClientDto) => Promise<{ success: boolean; freelancerId?: string }>;
  updateFreelancer: (id: string, data: UpdateClientDto, original: Client) => Promise<boolean>;
  deleteFreelancer: (freelancer: Client) => Promise<boolean>;

  // Selection & Pagination
  toggleFreelancerSelection: (freelancerId: string) => void;
  toggleSelectAll: () => void;
  clearSelection: () => void;
  setCurrentPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
}

const DEFAULT_FILTERS: FreelancerFilters = {
  isPassiveIncome: 'all',
  linkedCompanyId: 'all',
};

const PAGE_SIZE = 20;

export function useFreelancers(): UseFreelancersReturn {
  const { toast } = useToast();

  // State
  const [freelancers, setFreelancers] = useState<Client[]>([]);
  const [selectedFreelancers, setSelectedFreelancers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalFreelancers, setTotalFreelancers] = useState(0);
  const [currentPage, setCurrentPageState] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFiltersState] = useState<FreelancerFilters>(DEFAULT_FILTERS);

  // Debounce search query to reduce API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Computed
  const totalPages = useMemo(
    () => Math.ceil(totalFreelancers / PAGE_SIZE),
    [totalFreelancers]
  );

  // Load freelancers whenever search/filters/page changes
  useEffect(() => {
    loadFreelancers();
  }, [debouncedSearchQuery, filters.isPassiveIncome, filters.linkedCompanyId, currentPage]);

  // Load freelancers
  const loadFreelancers = useCallback(async () => {
    setLoading(true);
    try {
      let response;

      if (debouncedSearchQuery) {
        // Search and then filter to freelancers only
        response = await clientService.search(debouncedSearchQuery);
        if (response.data) {
          const freelancersOnly = response.data.filter(c => c.client_type === 'freelancer');
          setFreelancers(freelancersOnly);
          setTotalFreelancers(freelancersOnly.length);
        }
      } else {
        // Build filters object - always filter for freelancers
        const apiFilters: Record<string, string> = {
          client_type: 'freelancer',
        };

        // Filter by passive income status
        if (filters.isPassiveIncome === 'true') {
          apiFilters.is_passive_income = 'true';
        } else if (filters.isPassiveIncome === 'false') {
          apiFilters.is_passive_income = 'false';
        }

        // Filter by linked company
        if (filters.linkedCompanyId === 'none') {
          apiFilters.linked_company_id = 'null';
        } else if (filters.linkedCompanyId !== 'all') {
          apiFilters.linked_company_id = filters.linkedCompanyId;
        }

        response = await clientService.list(
          { page: currentPage, pageSize: PAGE_SIZE, sortBy: 'created_at', sortOrder: 'desc' },
          apiFilters
        );
        if (response.data) {
          setFreelancers(response.data.clients);
          setTotalFreelancers(response.data.total);
        }
      }

      if (response.error) {
        toast({
          title: 'שגיאה בטעינת עצמאים',
          description: response.error.message || 'לא הצלחנו לטעון את רשימת העצמאים',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Error loading freelancers:', error);
      toast({
        title: 'שגיאה בטעינת עצמאים',
        description: 'לא הצלחנו לטעון את רשימת העצמאים. נסה לרענן את הדף.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchQuery, filters, currentPage, toast]);

  // Create freelancer
  const createFreelancer = useCallback(async (data: CreateClientDto): Promise<{ success: boolean; freelancerId?: string }> => {
    // Ensure client_type is freelancer
    const freelancerData: CreateClientDto = {
      ...data,
      client_type: 'freelancer',
    };

    const response = await clientService.create(freelancerData);
    if (response.error) {
      toast({
        title: 'שגיאה ביצירת עצמאי',
        description: response.error.message || 'לא הצלחנו ליצור את העצמאי. נסה שוב.',
        variant: 'destructive',
      });
      return { success: false };
    }

    toast({
      title: 'עצמאי נוסף בהצלחה',
      description: `${data.company_name} נוסף למערכת`,
    });

    await loadFreelancers();
    return { success: true, freelancerId: response.data?.id };
  }, [toast, loadFreelancers]);

  // Update freelancer
  const updateFreelancer = useCallback(
    async (id: string, data: UpdateClientDto, originalFreelancer: Client): Promise<boolean> => {
      // Don't send tax_id if it hasn't changed
      const updateData: UpdateClientDto = { ...data };
      if (updateData.tax_id === originalFreelancer.tax_id) {
        delete updateData.tax_id;
      }

      const response = await clientService.update(id, updateData);
      if (response.error) {
        toast({
          title: 'שגיאה בעדכון עצמאי',
          description: response.error.message || 'לא הצלחנו לעדכן את העצמאי. נסה שוב.',
          variant: 'destructive',
        });
        return false;
      }

      toast({
        title: 'עצמאי עודכן בהצלחה',
        description: `${originalFreelancer.company_name} עודכן`,
      });

      await loadFreelancers();
      return true;
    },
    [toast, loadFreelancers]
  );

  // Delete freelancer
  const deleteFreelancer = useCallback(
    async (freelancer: Client): Promise<boolean> => {
      const response = await clientService.delete(freelancer.id, freelancer.tenant_id);
      if (response.error) {
        toast({
          title: 'שגיאה במחיקת עצמאי',
          description: response.error.message || 'לא הצלחנו למחוק את העצמאי. נסה שוב.',
          variant: 'destructive',
        });
        return false;
      }

      toast({
        title: 'עצמאי נמחק',
        description: `${freelancer.company_name} הוסר מהמערכת`,
      });

      await loadFreelancers();
      return true;
    },
    [toast, loadFreelancers]
  );

  // Selection handlers
  const toggleFreelancerSelection = useCallback((freelancerId: string) => {
    setSelectedFreelancers((prev) =>
      prev.includes(freelancerId)
        ? prev.filter((id) => id !== freelancerId)
        : [...prev, freelancerId]
    );
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedFreelancers((prev) =>
      prev.length === freelancers.length ? [] : freelancers.map((f) => f.id)
    );
  }, [freelancers]);

  const clearSelection = useCallback(() => {
    setSelectedFreelancers([]);
  }, []);

  // Pagination handlers
  const setCurrentPage = useCallback((page: number) => {
    setCurrentPageState(page);
    clearSelection();
  }, [clearSelection]);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  }, [currentPage, totalPages, setCurrentPage]);

  const previousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage, setCurrentPage]);

  // Filter handlers
  const setFilters = useCallback((newFilters: Partial<FreelancerFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
    setCurrentPageState(1);
    clearSelection();
  }, [clearSelection]);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    setCurrentPageState(1);
    clearSelection();
  }, [clearSelection]);

  return {
    // State
    freelancers,
    selectedFreelancers,
    loading,
    totalFreelancers,
    currentPage,
    totalPages,

    // Search & Filters
    searchQuery,
    filters,
    setSearchQuery,
    setFilters,
    resetFilters,

    // CRUD Operations
    loadFreelancers,
    createFreelancer,
    updateFreelancer,
    deleteFreelancer,

    // Selection & Pagination
    toggleFreelancerSelection,
    toggleSelectAll,
    clearSelection,
    setCurrentPage,
    nextPage,
    previousPage,
  };
}
