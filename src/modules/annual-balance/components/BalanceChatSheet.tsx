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
  const userMapRef = useRef<Map<string, { name: string; email: string }>>(new Map());
  const pendingOptimisticRef = useRef<Set<string>>(new Set());

  // Fetch messages when sheet opens for a balance case
  useEffect(() => {
    if (!open || !balanceCase?.id) return;

    let cancelled = false;

    const fetchMessages = async () => {
      setLoading(true);
      const result = await balanceChatService.getMessages(balanceCase.id);

      if (cancelled) return;

      if (result.error) {
        toast.error('שגיאה בטעינת ההודעות');
      } else {
        setMessages(result.data ?? []);

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
      if (!cancelled) {
        balanceChatService.markAsRead(balanceCase.id);
      }
    };

    fetchMessages();

    return () => {
      cancelled = true;
    };
  }, [open, balanceCase?.id, user]);

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
      toast.error('שגיאה בשליחת ההודעה');
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

        <BalanceChatMessages
          messages={messages}
          loading={loading}
          currentUserId={user?.id || ''}
        />

        <BalanceChatInput
          onSend={handleSend}
          disabled={!balanceCase}
        />
      </SheetContent>
    </Sheet>
  );
};
