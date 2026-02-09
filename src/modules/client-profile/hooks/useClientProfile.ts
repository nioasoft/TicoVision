/**
 * Hook for loading all client profile data in parallel
 */

import { useState, useEffect, useCallback } from 'react';
import { clientService } from '@/services';
import { annualBalanceService } from '@/modules/annual-balance/services/annual-balance.service';
import type { ClientProfileData } from '../types/client-profile.types';

export function useClientProfile(clientId: string | undefined): ClientProfileData & { refresh: () => void } {
  const [data, setData] = useState<ClientProfileData>({
    client: null,
    contacts: [],
    phones: [],
    balanceSheets: [],
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    if (!clientId) return;

    setData((prev) => ({ ...prev, loading: true, error: null }));

    const results = await Promise.allSettled([
      clientService.getById(clientId),
      clientService.getClientContacts(clientId),
      clientService.getClientPhones(clientId),
      annualBalanceService.getByClientId(clientId),
    ]);

    const [clientResult, contactsResult, phonesResult, balanceResult] = results;

    const client = clientResult.status === 'fulfilled' ? clientResult.value.data : null;
    const contacts = contactsResult.status === 'fulfilled' ? contactsResult.value.data ?? [] : [];
    const phones = phonesResult.status === 'fulfilled' ? phonesResult.value.data ?? [] : [];
    const balanceSheets = balanceResult.status === 'fulfilled' ? balanceResult.value.data ?? [] : [];

    if (!client) {
      setData({
        client: null,
        contacts: [],
        phones: [],
        balanceSheets: [],
        loading: false,
        error: 'לקוח לא נמצא',
      });
      return;
    }

    setData({
      client,
      contacts,
      phones,
      balanceSheets,
      loading: false,
      error: null,
    });
  }, [clientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...data, refresh: fetchData };
}
