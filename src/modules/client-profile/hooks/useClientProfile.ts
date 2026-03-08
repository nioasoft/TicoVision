/**
 * Hook for loading all client profile data in parallel
 */

import { useState, useEffect, useCallback } from 'react';
import { clientService, feeService } from '@/services';
import { annualBalanceService } from '@/modules/annual-balance/services/annual-balance.service';
import { letterHistoryService } from '@/services/letter-history.service';
import { supabase } from '@/lib/supabase';
import type { ClientProfileData } from '../types/client-profile.types';

const EMPTY_STATE: ClientProfileData = {
  client: null,
  contacts: [],
  phones: [],
  balanceSheets: [],
  feeCalculations: [],
  actualPayments: [],
  letters: [],
  interactions: [],
  loading: true,
  error: null,
};

export function useClientProfile(clientId: string | undefined): ClientProfileData & { refresh: () => void } {
  const [data, setData] = useState<ClientProfileData>(EMPTY_STATE);

  const fetchData = useCallback(async () => {
    if (!clientId) return;

    setData((prev) => ({ ...prev, loading: true, error: null }));

    const results = await Promise.allSettled([
      clientService.getById(clientId),
      clientService.getClientContacts(clientId),
      clientService.getClientPhones(clientId),
      annualBalanceService.getByClientId(clientId),
      feeService.getByClient(clientId),
      supabase
        .from('actual_payments')
        .select('*')
        .eq('client_id', clientId)
        .order('payment_date', { ascending: false }),
      letterHistoryService.getLettersByClient(clientId, { page: 1, pageSize: 10 }),
      supabase
        .from('client_interactions')
        .select('*')
        .eq('client_id', clientId)
        .order('interacted_at', { ascending: false })
        .limit(10),
    ]);

    const [
      clientResult,
      contactsResult,
      phonesResult,
      balanceResult,
      feesResult,
      paymentsResult,
      lettersResult,
      interactionsResult,
    ] = results;

    const client = clientResult.status === 'fulfilled' ? clientResult.value.data : null;
    const contacts = contactsResult.status === 'fulfilled' ? contactsResult.value.data ?? [] : [];
    const phones = phonesResult.status === 'fulfilled' ? phonesResult.value.data ?? [] : [];
    const balanceSheets = balanceResult.status === 'fulfilled' ? balanceResult.value.data ?? [] : [];
    const feeCalculations = feesResult.status === 'fulfilled' ? feesResult.value.data ?? [] : [];
    const actualPayments = paymentsResult.status === 'fulfilled' ? paymentsResult.value.data ?? [] : [];
    const letters = lettersResult.status === 'fulfilled' ? lettersResult.value.data ?? [] : [];
    const interactions = interactionsResult.status === 'fulfilled' ? interactionsResult.value.data ?? [] : [];

    if (!client) {
      setData({ ...EMPTY_STATE, loading: false, error: 'לקוח לא נמצא' });
      return;
    }

    setData({
      client,
      contacts,
      phones,
      balanceSheets,
      feeCalculations,
      actualPayments,
      letters,
      interactions,
      loading: false,
      error: null,
    });
  }, [clientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...data, refresh: fetchData };
}
