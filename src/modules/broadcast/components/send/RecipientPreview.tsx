/**
 * Recipient Preview Component
 * Shows list of recipients before sending
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Search, ChevronDown, ChevronUp, Users, Mail } from 'lucide-react';
import type { RecipientSummary } from '../../types/broadcast.types';

interface RecipientPreviewProps {
  summary: RecipientSummary;
}

export const RecipientPreview: React.FC<RecipientPreviewProps> = ({ summary }) => {
  const [search, setSearch] = useState('');
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

  const filteredClients = summary.clients.filter((client) => {
    if (!search.trim()) return true;
    const searchLower = search.toLowerCase();
    return (
      client.company_name.toLowerCase().includes(searchLower) ||
      (client.company_name_hebrew && client.company_name_hebrew.includes(search)) ||
      client.contacts.some((c) =>
        c.full_name.toLowerCase().includes(searchLower) ||
        c.email.toLowerCase().includes(searchLower)
      )
    );
  });

  const toggleExpand = (clientId: string) => {
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
    }
    setExpandedClients(newExpanded);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base rtl:text-right">תצוגה מקדימה של נמענים</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש..."
            className="pr-9 h-8 text-sm rtl:text-right"
          />
        </div>

        {/* Summary */}
        <div className="text-xs text-muted-foreground rtl:text-right">
          מציג {filteredClients.length} מתוך {summary.total_clients} לקוחות
        </div>

        {/* Client List */}
        <ScrollArea className="h-[300px]">
          <div className="space-y-1">
            {filteredClients.map((client) => {
              const isExpanded = expandedClients.has(client.client_id);
              return (
                <Collapsible
                  key={client.client_id}
                  open={isExpanded}
                  onOpenChange={() => toggleExpand(client.client_id)}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        )}
                        <span className="text-sm font-medium truncate rtl:text-right">
                          {client.company_name_hebrew || client.company_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {client.contacts.length}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pr-6 pb-2 space-y-1">
                      {client.contacts.map((contact) => (
                        <div
                          key={contact.contact_id}
                          className="flex items-center justify-between text-xs text-muted-foreground p-1.5 bg-muted/30 rounded"
                        >
                          <span className="truncate rtl:text-right">{contact.full_name}</span>
                          <span className="font-mono text-[10px] truncate max-w-[150px]">
                            {contact.email}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
