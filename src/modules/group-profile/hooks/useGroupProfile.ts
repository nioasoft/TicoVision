/**
 * Hook for loading all group profile data in parallel
 */

import { useState, useEffect, useCallback } from 'react';
import { clientService } from '@/services';
import TenantContactService from '@/services/tenant-contact.service';
import { supabase } from '@/lib/supabase';
import type { GroupProfileData } from '../types/group-profile.types';

const EMPTY_STATE: GroupProfileData = {
  group: null,
  members: [],
  contacts: [],
  feeCalculations: [],
  letters: [],
  loading: true,
  error: null,
};

export function useGroupProfile(groupId: string | undefined): GroupProfileData & { refresh: () => void } {
  const [data, setData] = useState<GroupProfileData>(EMPTY_STATE);

  const fetchData = useCallback(async () => {
    if (!groupId) return;

    setData((prev) => ({ ...prev, loading: true, error: null }));

    const results = await Promise.allSettled([
      clientService.getGroupById(groupId),
      clientService.getClientsByGroup(groupId),
      TenantContactService.getGroupContacts(groupId),
      supabase
        .from('group_fee_calculations')
        .select('*')
        .eq('group_id', groupId)
        .order('year', { ascending: false }),
      supabase
        .from('generated_letters')
        .select('id, client_id, name, subject, document_type_id, status, created_at, open_count, recipient_emails, fee_calculation_id')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    const [
      groupResult,
      membersResult,
      contactsResult,
      feesResult,
      lettersResult,
    ] = results;

    const group = groupResult.status === 'fulfilled' ? groupResult.value.data : null;
    const members = membersResult.status === 'fulfilled' ? membersResult.value.data ?? [] : [];
    const contacts = contactsResult.status === 'fulfilled' ? contactsResult.value ?? [] : [];
    const feeCalculations = feesResult.status === 'fulfilled' ? feesResult.value.data ?? [] : [];
    const letters = lettersResult.status === 'fulfilled' ? lettersResult.value.data ?? [] : [];

    if (!group) {
      setData({ ...EMPTY_STATE, loading: false, error: 'קבוצה לא נמצאה' });
      return;
    }

    setData({
      group,
      members,
      contacts,
      feeCalculations,
      letters,
      loading: false,
      error: null,
    });
  }, [groupId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...data, refresh: fetchData };
}
