/**
 * Client Multi-Select Component
 * Searchable list with checkboxes for selecting multiple clients
 * Shows expandable email details per client
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Search, Users, Mail, Check, X, ChevronDown, ChevronLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { EligibleClient } from '../../types/broadcast.types';

interface ClientEmail {
  contact_id: string;
  full_name: string;
  email: string;
  email_preference: string;
}

interface ClientMultiSelectProps {
  clients: EligibleClient[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export const ClientMultiSelect: React.FC<ClientMultiSelectProps> = ({
  clients,
  selectedIds,
  onChange,
}) => {
  const [search, setSearch] = useState('');
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [clientEmails, setClientEmails] = useState<Record<string, ClientEmail[]>>({});
  const [loadingEmails, setLoadingEmails] = useState<string | null>(null);

  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients;

    const searchLower = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.company_name.toLowerCase().includes(searchLower) ||
        (c.company_name_hebrew && c.company_name_hebrew.includes(search)) ||
        c.tax_id.includes(search)
    );
  }, [clients, search]);

  const handleToggle = (clientId: string) => {
    if (selectedIds.includes(clientId)) {
      onChange(selectedIds.filter((id) => id !== clientId));
    } else {
      onChange([...selectedIds, clientId]);
    }
  };

  const handleSelectAll = () => {
    const allFilteredIds = filteredClients.map((c) => c.client_id);
    const newSelected = new Set([...selectedIds, ...allFilteredIds]);
    onChange(Array.from(newSelected));
  };

  const handleDeselectAll = () => {
    const filteredIds = new Set(filteredClients.map((c) => c.client_id));
    onChange(selectedIds.filter((id) => !filteredIds.has(id)));
  };

  const toggleExpand = useCallback(async (clientId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (expandedClientId === clientId) {
      setExpandedClientId(null);
      return;
    }

    setExpandedClientId(clientId);

    // Load emails if not cached
    if (!clientEmails[clientId]) {
      setLoadingEmails(clientId);
      try {
        const { data } = await supabase.rpc('get_client_broadcast_emails', {
          p_client_id: clientId,
        });
        setClientEmails(prev => ({ ...prev, [clientId]: data || [] }));
      } catch (error) {
        console.error('Failed to load emails for client:', error);
        setClientEmails(prev => ({ ...prev, [clientId]: [] }));
      } finally {
        setLoadingEmails(null);
      }
    }
  }, [expandedClientId, clientEmails]);

  const selectedCount = selectedIds.length;
  const totalCount = clients.length;
  const filteredSelectedCount = filteredClients.filter((c) =>
    selectedIds.includes(c.client_id)
  ).length;

  return (
    <div className="border rounded-lg">
      {/* Search and Actions */}
      <div className="p-3 border-b space-y-2">
        <div className="relative">
          <label className="mb-2 block text-base font-semibold text-foreground rtl:text-right">חיפוש</label>
          <Search className="absolute right-3 top-[calc(50%+16px)] -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="חיפוש"
            className="search-box pr-9 rtl:text-right"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {filteredClients.length} מתוך {totalCount} לקוחות
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="text-xs"
            >
              <Check className="h-3 w-3 ml-1" />
              בחר הכל
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDeselectAll}
              className="text-xs"
            >
              <X className="h-3 w-3 ml-1" />
              בטל בחירה
            </Button>
          </div>
        </div>
      </div>

      {/* Client List */}
      <ScrollArea className="h-64">
        <div className="divide-y">
          {filteredClients.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">לא נמצאו לקוחות</p>
            </div>
          ) : (
            filteredClients.map((client) => {
              const isSelected = selectedIds.includes(client.client_id);
              const isExpanded = expandedClientId === client.client_id;
              const emails = clientEmails[client.client_id];
              const isLoadingThisClient = loadingEmails === client.client_id;

              return (
                <div key={client.client_id}>
                  <label
                    className={cn(
                      'flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors',
                      isSelected && 'bg-primary/5'
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggle(client.client_id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate rtl:text-right">
                        {client.company_name_hebrew || client.company_name}
                      </div>
                      <div className="text-xs text-muted-foreground rtl:text-right">
                        ח.פ: {client.tax_id}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {client.contact_count}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => toggleExpand(client.client_id, e)}
                        className={cn(
                          'flex items-center gap-1 hover:text-blue-600 transition-colors rounded px-1.5 py-0.5',
                          isExpanded && 'text-blue-600 bg-blue-50'
                        )}
                      >
                        <Mail className="h-3 w-3" />
                        {client.email_count}
                        {isExpanded
                          ? <ChevronDown className="h-3 w-3" />
                          : <ChevronLeft className="h-3 w-3" />
                        }
                      </button>
                    </div>
                  </label>

                  {/* Expanded Email Details */}
                  {isExpanded && (
                    <div className="bg-blue-50/50 border-t px-4 py-2">
                      {isLoadingThisClient ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          טוען מיילים...
                        </div>
                      ) : emails && emails.length > 0 ? (
                        <div className="space-y-1">
                          {emails.map((email) => (
                            <div
                              key={email.contact_id}
                              className="flex items-center gap-2 text-xs rtl:flex-row-reverse"
                            >
                              <Mail className="h-3 w-3 text-blue-500 shrink-0" />
                              <span className="text-gray-700 truncate">{email.full_name}</span>
                              <span dir="ltr" className="text-blue-600 truncate">{email.email}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground py-1">אין מיילים זמינים</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Selected Summary */}
      {selectedCount > 0 && (
        <div className="p-3 border-t bg-muted/30">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{selectedCount} לקוחות נבחרו</span>
            {search && filteredSelectedCount > 0 && (
              <span className="text-muted-foreground">
                ({filteredSelectedCount} בתוצאות החיפוש)
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
