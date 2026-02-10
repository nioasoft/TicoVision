/**
 * BalanceChatSheet - Side panel for balance-scoped chat
 *
 * Composes BalanceChatMessages and BalanceChatInput into a Sheet panel
 * that slides in from the left side (secondary side in RTL layout).
 *
 * Features:
 * - Fetches messages when opened for a specific balance case
 * - Real-time message delivery via Supabase Realtime subscription
 * - Optimistic message sending with dedup against Realtime race
 * - Sender enrichment for incoming Realtime messages via userMap
 * - Error state with retry on fetch failure
 * - Send failure toast with retry action preserving message content
 * - Offline detection with yellow banner and disabled input
 * - Loading and empty states
 * - Hebrew RTL layout throughout
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { WifiOff } from 'lucide-react';
import { balanceChatService } from '../services/balance-chat.service';
import type { BalanceChatMessageRow, BalanceChatMessageWithSender } from '../types/balance-chat.types';
import type { AnnualBalanceSheetWithClient } from '../types/annual-balance.types';
import { canAccessBalanceChat } from '../types/annual-balance.types';
import { BalanceChatMessages } from './BalanceChatMessages';
import { BalanceChatInput } from './BalanceChatInput';

interface BalanceChatSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balanceCase: AnnualBalanceSheetWithClient | null;
}

export const BalanceChatSheet: React.FC<BalanceChatSheetProps> = ({
  open,
  onOpenChange,
  balanceCase,
}) => {
  const { user, tenantId, role } = useAuth();
  const [messages, setMessages] = useState<BalanceChatMessageWithSender[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasMore, setHasMore] = useState(false);
  const userMapRef = useRef<Map<string, { name: string; email: string }>>(new Map());
  const pendingOptimisticRef = useRef<Set<string>>(new Set());

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Stable fetchMessages callback for retry support
  const fetchMessages = useCallback(async () => {
    if (!balanceCase?.id) return;
    setLoading(true);
    setError(null);
    const result = await balanceChatService.getMessages(balanceCase.id);

    if (result.error) {
      setError('שגיאה בטעינת ההודעות');
    } else {
      setMessages(result.data ?? []);
      setHasMore((result.data ?? []).length >= 100);

      // Build user map for Realtime message enrichment
      const map = new Map<string, { name: string; email: string }>();
      for (const msg of result.data ?? []) {
        if (!map.has(msg.user_id)) {
          map.set(msg.user_id, { name: msg.sender_name, email: msg.sender_email });
        }
      }
      if (user) {
        map.set(user.id, {
          name: (user.user_metadata?.full_name as string) || user.email || '',
          email: user.email || '',
        });
      }
      userMapRef.current = map;
    }
    setLoading(false);

    // Mark as read AFTER messages are loaded (minimizes race condition window)
    if (!result.error) {
      balanceChatService.markAsRead(balanceCase.id);
    }
  }, [balanceCase?.id, user]);

  // Fetch messages when sheet opens for a balance case
  useEffect(() => {
    if (!open || !balanceCase?.id) return;
    fetchMessages();
  }, [open, balanceCase?.id, fetchMessages]);

  // Load earlier messages (cursor-based pagination)
  const handleLoadEarlier = useCallback(async () => {
    if (!balanceCase?.id || messages.length === 0) return;

    const oldestTimestamp = messages[0].created_at;
    const result = await balanceChatService.getMessages(
      balanceCase.id,
      100,
      oldestTimestamp
    );

    if (result.error) {
      toast.error('שגיאה בטעינת הודעות קודמות');
      return;
    }

    if (result.data && result.data.length > 0) {
      setMessages(prev => [...result.data!, ...prev]);
      setHasMore(result.data.length >= 100);
    } else {
      setHasMore(false);
    }
  }, [balanceCase?.id, messages]);

  // Optimistic send handler
  const handleSend = useCallback(async (content: string) => {
    if (!balanceCase || !user) return;

    const optimisticMsg: BalanceChatMessageWithSender = {
      id: crypto.randomUUID(),
      tenant_id: '',
      balance_id: balanceCase.id,
      user_id: user.id,
      content,
      message_type: 'user',
      is_deleted: false,
      deleted_at: null,
      deleted_by: null,
      created_at: new Date().toISOString(),
      sender_name: (user.user_metadata?.full_name as string) || user.email || '',
      sender_email: user.email || '',
    };

    // Track this send so Realtime callback skips it
    const fingerprint = `${user.id}:${content}`;
    pendingOptimisticRef.current.add(fingerprint);

    // Immediately add to UI
    setMessages(prev => [...prev, optimisticMsg]);

    // Send to server
    const result = await balanceChatService.sendMessage(balanceCase.id, content);

    if (result.error) {
      // Revert: remove optimistic message
      pendingOptimisticRef.current.delete(fingerprint);
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      toast.error('שגיאה בשליחת ההודעה', {
        action: {
          label: 'נסה שוב',
          onClick: () => handleSend(content),
        },
      });
    } else if (result.data) {
      // Replace optimistic message and remove any Realtime duplicate
      pendingOptimisticRef.current.delete(fingerprint);
      setMessages(prev => {
        const withoutDupes = prev.filter(m => m.id !== optimisticMsg.id && m.id !== result.data!.id);
        return [...withoutDupes, result.data!];
      });
    }
  }, [balanceCase, user]);

  // Handle incoming Realtime messages with dedup and sender enrichment
  const handleRealtimeMessage = useCallback((rawMsg: BalanceChatMessageRow) => {
    // Skip if this is our own message that we already show optimistically
    const fingerprint = `${rawMsg.user_id}:${rawMsg.content}`;
    if (pendingOptimisticRef.current.has(fingerprint)) {
      return;
    }

    setMessages(prev => {
      // Dedup: skip if message ID already exists (from reconnection)
      if (prev.some(m => m.id === rawMsg.id)) {
        return prev;
      }

      // Enrich with sender info from userMap
      const sender = userMapRef.current.get(rawMsg.user_id);
      const enriched: BalanceChatMessageWithSender = {
        ...rawMsg,
        sender_name: sender?.name ?? 'משתמש',
        sender_email: sender?.email ?? '',
      };

      return [...prev, enriched];
    });
  }, []);

  // Realtime subscription: subscribe when sheet opens, clean up when it closes
  useEffect(() => {
    if (!open || !balanceCase?.id || !tenantId) return;

    const channel = balanceChatService.subscribeToBalanceChat(
      tenantId,
      balanceCase.id,
      handleRealtimeMessage
    );

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, balanceCase?.id, tenantId, handleRealtimeMessage]);

  const hasAccess = balanceCase
    ? canAccessBalanceChat(role || '', user?.id || '', { auditor_id: balanceCase.auditor_id })
    : false;

  if (!hasAccess && open) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-[400px] sm:max-w-[420px] p-0 flex flex-col" dir="rtl">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="text-right">שיחה</SheetTitle>
            <SheetDescription className="text-right">
              {balanceCase?.client?.company_name || ''}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 flex items-center justify-center p-6 text-center">
            <p className="text-muted-foreground">אין לך הרשאה לצפות בשיחה זו</p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-[400px] sm:max-w-[420px] p-0 flex flex-col"
        dir="rtl"
      >
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="text-right">
            שיחה - {balanceCase?.client?.company_name || ''}
          </SheetTitle>
          <SheetDescription className="text-right">
            {balanceCase?.client?.tax_id || ''} | שנת {balanceCase?.year || ''}
          </SheetDescription>
        </SheetHeader>

        {!isOnline && (
          <div className="text-xs text-amber-600 flex items-center gap-1.5 px-4 py-1.5 bg-amber-50 border-b">
            <WifiOff className="h-3 w-3 shrink-0" />
            <span>אין חיבור לאינטרנט</span>
          </div>
        )}

        <BalanceChatMessages
          messages={messages}
          loading={loading}
          currentUserId={user?.id || ''}
          error={error}
          onRetry={fetchMessages}
          hasMore={hasMore}
          onLoadEarlier={handleLoadEarlier}
        />

        <BalanceChatInput
          onSend={handleSend}
          disabled={!balanceCase || !isOnline}
        />
      </SheetContent>
    </Sheet>
  );
};
