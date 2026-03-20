/**
 * RecentProtocols
 * Shows a compact list of recent protocols across all clients/groups
 * Displayed when no client/group is selected on the protocols page
 */

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, User, UsersRound, ScrollText, FileEdit, Lock } from 'lucide-react';
import { protocolService } from '../services/protocol.service';
import type { Protocol } from '../types/protocol.types';

/** Protocol with joined client/group names as returned by getProtocols query */
export interface ProtocolWithNames extends Protocol {
  client?: {
    id: string;
    company_name: string;
    company_name_hebrew: string | null;
  } | null;
  group?: {
    id: string;
    group_name_hebrew: string | null;
  } | null;
}

interface RecentProtocolsProps {
  onSelectProtocol: (protocol: ProtocolWithNames) => void;
}

const PAGE_SIZE = 50;

export function RecentProtocols({ onSelectProtocol }: RecentProtocolsProps) {
  const [protocols, setProtocols] = useState<ProtocolWithNames[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchPage = async (pageNum: number, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      const { data, error } = await protocolService.getProtocols({ page: pageNum, pageSize: PAGE_SIZE });
      if (error) {
        console.error('Failed to fetch recent protocols:', error);
        return;
      }
      if (data) {
        const fetched = data.protocols as ProtocolWithNames[];
        setProtocols((prev) => append ? [...prev, ...fetched] : fetched);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchPage(1);
  }, []);

  const hasMore = protocols.length < total;

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPage(nextPage, true);
  };

  const getDisplayName = (protocol: ProtocolWithNames): string => {
    if (protocol.client) {
      return protocol.client.company_name_hebrew || protocol.client.company_name;
    }
    if (protocol.group) {
      return protocol.group.group_name_hebrew || '';
    }
    return '';
  };

  const isGroupProtocol = (protocol: ProtocolWithNames): boolean => {
    return !!protocol.group_id;
  };

  if (loading) {
    return (
      <div className="rounded-md border bg-white">
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">פרוטוקולים אחרונים</h3>
        </div>
        <div className="p-3 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-32 flex-1" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (protocols.length === 0) {
    return (
      <div className="rounded-md border bg-white">
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">פרוטוקולים אחרונים</h3>
        </div>
        <div className="text-center py-8">
          <ScrollText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">אין פרוטוקולים אחרונים</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-white">
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">פרוטוקולים אחרונים</h3>
        <span className="text-xs text-muted-foreground">({total})</span>
      </div>
      <div className="divide-y max-h-[600px] overflow-y-auto">
        {protocols.map((protocol) => (
          <button
            key={protocol.id}
            type="button"
            onClick={() => onSelectProtocol(protocol)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-right hover:bg-gray-50 transition-colors cursor-pointer"
          >
            {isGroupProtocol(protocol) ? (
              <UsersRound className="h-4 w-4 text-indigo-500 shrink-0" />
            ) : (
              <User className="h-4 w-4 text-blue-500 shrink-0" />
            )}
            <span className="text-sm font-medium truncate min-w-0 max-w-[180px]">
              {getDisplayName(protocol)}
            </span>
            <span className="text-xs text-muted-foreground shrink-0">
              {format(new Date(protocol.meeting_date), 'dd/MM/yyyy', { locale: he })}
            </span>
            <span className="text-xs text-gray-600 truncate flex-1 min-w-0">
              {protocol.title || <span className="text-gray-400">ללא כותרת</span>}
            </span>
            <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0">
              {protocol.status === 'locked' ? (
                <><Lock className="h-3 w-3 ml-1" />נעול</>
              ) : (
                <><FileEdit className="h-3 w-3 ml-1" />טיוטה</>
              )}
            </Badge>
          </button>
        ))}
        {hasMore && (
          <div className="px-4 py-3 text-center">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:text-gray-400"
            >
              {loadingMore ? 'טוען...' : `טען עוד (${protocols.length} מתוך ${total})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
