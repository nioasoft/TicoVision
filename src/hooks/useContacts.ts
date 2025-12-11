/**
 * useContacts Hook
 * Manages contacts state, CRUD operations, and filtering
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { TenantContactService } from '@/services/tenant-contact.service';
import type {
  TenantContact,
  ContactSearchResult,
  CreateTenantContactDto,
  UpdateTenantContactDto,
  ClientContactAssignment,
  UpdateAssignmentDto,
} from '@/types/tenant-contact.types';

const PAGE_SIZE = 20;

interface ContactFilters {
  contactType: string;
}

interface ContactWithAssignments {
  contact: TenantContact;
  assignments: Array<ClientContactAssignment & {
    client: { id: string; company_name: string; company_name_hebrew: string | null };
  }>;
}

export interface UseContactsReturn {
  // State
  contacts: ContactSearchResult[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  totalContacts: number;

  // Search & Filters
  searchQuery: string;
  filters: ContactFilters;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<ContactFilters>) => void;
  resetFilters: () => void;

  // CRUD
  loadContacts: () => Promise<void>;
  createContact: (data: CreateTenantContactDto) => Promise<{ success: boolean; contact?: TenantContact }>;
  updateContact: (id: string, data: UpdateTenantContactDto) => Promise<boolean>;
  deleteContact: (id: string) => Promise<boolean>;

  // Contact Details
  selectedContact: ContactWithAssignments | null;
  loadingContact: boolean;
  loadContactDetails: (contactId: string) => Promise<void>;
  clearSelectedContact: () => void;

  // Assignment Management
  updateAssignment: (assignmentId: string, data: UpdateAssignmentDto) => Promise<boolean>;
  unassignFromClient: (assignmentId: string) => Promise<boolean>;

  // Pagination
  setCurrentPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
}

const DEFAULT_FILTERS: ContactFilters = {
  contactType: 'all',
};

export function useContacts(): UseContactsReturn {
  const { toast } = useToast();

  // State
  const [contacts, setContacts] = useState<ContactSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalContacts, setTotalContacts] = useState(0);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFiltersState] = useState<ContactFilters>(DEFAULT_FILTERS);

  // Contact Details
  const [selectedContact, setSelectedContact] = useState<ContactWithAssignments | null>(null);
  const [loadingContact, setLoadingContact] = useState(false);

  // Refs to track current values without causing re-renders
  const searchQueryRef = useRef(searchQuery);
  const filtersRef = useRef(filters);
  const currentPageRef = useRef(currentPage);

  // Update refs when values change
  useEffect(() => { searchQueryRef.current = searchQuery; }, [searchQuery]);
  useEffect(() => { filtersRef.current = filters; }, [filters]);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);

  // Calculate total pages
  const totalPages = useMemo(() => Math.ceil(totalContacts / PAGE_SIZE), [totalContacts]);

  // Internal load function - uses refs to get current values
  const doLoadContacts = useCallback(async (page?: number) => {
    const pageToLoad = page ?? currentPageRef.current;
    const search = searchQueryRef.current;
    const contactType = filtersRef.current.contactType;

    setLoading(true);
    try {
      const result = await TenantContactService.getAll({
        page: pageToLoad,
        pageSize: PAGE_SIZE,
        searchQuery: search.trim() || undefined,
        contactType: contactType !== 'all' ? contactType : undefined,
      });

      setContacts(result.contacts);
      setTotalContacts(result.total);
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast({
        title: 'שגיאה',
        description: 'לא הצלחנו לטעון את אנשי הקשר',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Public load function
  const loadContacts = useCallback(async () => {
    await doLoadContacts();
  }, [doLoadContacts]);

  // Load on mount
  useEffect(() => {
    doLoadContacts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when search or filters change
  useEffect(() => {
    // Skip initial mount (handled above)
    const isInitial = searchQuery === '' && filters.contactType === 'all';
    if (!isInitial || currentPage !== 1) {
      setCurrentPage(1);
      currentPageRef.current = 1;
      doLoadContacts(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filters.contactType]);

  // Set filters
  const setFilters = useCallback((newFilters: Partial<ContactFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Reset filters
  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    setSearchQuery('');
  }, []);

  // Create contact
  const createContact = useCallback(async (data: CreateTenantContactDto): Promise<{ success: boolean; contact?: TenantContact }> => {
    try {
      const contact = await TenantContactService.createOrGet(data);
      if (contact) {
        toast({
          title: 'הצלחה',
          description: 'איש הקשר נוצר בהצלחה',
        });
        await doLoadContacts();
        return { success: true, contact };
      }
      return { success: false };
    } catch (error) {
      console.error('Error creating contact:', error);
      toast({
        title: 'שגיאה',
        description: 'לא הצלחנו ליצור את איש הקשר',
        variant: 'destructive',
      });
      return { success: false };
    }
  }, [toast, doLoadContacts]);

  // Load contact details with assignments
  const loadContactDetails = useCallback(async (contactId: string) => {
    setLoadingContact(true);
    try {
      const result = await TenantContactService.getContactWithAssignments(contactId);
      if (result) {
        setSelectedContact(result);
      } else {
        toast({
          title: 'שגיאה',
          description: 'לא הצלחנו לטעון את פרטי איש הקשר',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading contact details:', error);
      toast({
        title: 'שגיאה',
        description: 'לא הצלחנו לטעון את פרטי איש הקשר',
        variant: 'destructive',
      });
    } finally {
      setLoadingContact(false);
    }
  }, [toast]);

  // Update contact
  const updateContact = useCallback(async (id: string, data: UpdateTenantContactDto): Promise<boolean> => {
    try {
      const updated = await TenantContactService.update(id, data);
      if (updated) {
        toast({
          title: 'הצלחה',
          description: 'איש הקשר עודכן בהצלחה',
        });
        await doLoadContacts();
        // Refresh selected contact if it's the one being edited
        if (selectedContact?.contact.id === id) {
          await loadContactDetails(id);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating contact:', error);
      toast({
        title: 'שגיאה',
        description: 'לא הצלחנו לעדכן את איש הקשר',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, doLoadContacts, selectedContact, loadContactDetails]);

  // Delete contact
  const deleteContact = useCallback(async (id: string): Promise<boolean> => {
    try {
      const deleted = await TenantContactService.delete(id);
      if (deleted) {
        toast({
          title: 'הצלחה',
          description: 'איש הקשר נמחק בהצלחה',
        });
        await doLoadContacts();
        return true;
      } else {
        toast({
          title: 'לא ניתן למחוק',
          description: 'איש הקשר מקושר ללקוחות. יש לנתק אותו קודם.',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast({
        title: 'שגיאה',
        description: 'לא הצלחנו למחוק את איש הקשר',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, doLoadContacts]);

  // Clear selected contact
  const clearSelectedContact = useCallback(() => {
    setSelectedContact(null);
  }, []);

  // Update assignment
  const updateAssignment = useCallback(async (assignmentId: string, data: UpdateAssignmentDto): Promise<boolean> => {
    try {
      const updated = await TenantContactService.updateAssignment(assignmentId, data);
      if (updated) {
        toast({
          title: 'הצלחה',
          description: 'ההקצאה עודכנה בהצלחה',
        });
        // Refresh contact details
        if (selectedContact) {
          await loadContactDetails(selectedContact.contact.id);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast({
        title: 'שגיאה',
        description: 'לא הצלחנו לעדכן את ההקצאה',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, selectedContact, loadContactDetails]);

  // Unassign from client
  const unassignFromClient = useCallback(async (assignmentId: string): Promise<boolean> => {
    try {
      const success = await TenantContactService.unassignFromClient(assignmentId);
      if (success) {
        toast({
          title: 'הצלחה',
          description: 'איש הקשר נותק מהלקוח',
        });
        // Refresh contact details and contacts list
        if (selectedContact) {
          await loadContactDetails(selectedContact.contact.id);
        }
        await doLoadContacts();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error unassigning from client:', error);
      toast({
        title: 'שגיאה',
        description: 'לא הצלחנו לנתק את איש הקשר',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, selectedContact, loadContactDetails, doLoadContacts]);

  // Pagination
  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      currentPageRef.current = newPage;
      doLoadContacts(newPage);
    }
  }, [currentPage, totalPages, doLoadContacts]);

  const previousPage = useCallback(() => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      currentPageRef.current = newPage;
      doLoadContacts(newPage);
    }
  }, [currentPage, doLoadContacts]);

  // Handle page change from pagination component
  const handleSetCurrentPage = useCallback((page: number) => {
    setCurrentPage(page);
    currentPageRef.current = page;
    doLoadContacts(page);
  }, [doLoadContacts]);

  return {
    // State
    contacts,
    loading,
    currentPage,
    totalPages,
    totalContacts,

    // Search & Filters
    searchQuery,
    filters,
    setSearchQuery,
    setFilters,
    resetFilters,

    // CRUD
    loadContacts,
    createContact,
    updateContact,
    deleteContact,

    // Contact Details
    selectedContact,
    loadingContact,
    loadContactDetails,
    clearSelectedContact,

    // Assignment Management
    updateAssignment,
    unassignFromClient,

    // Pagination
    setCurrentPage: handleSetCurrentPage,
    nextPage,
    previousPage,
  };
}
