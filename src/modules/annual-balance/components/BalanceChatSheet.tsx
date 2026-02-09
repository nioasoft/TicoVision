/**
 * BalanceChatSheet - Side panel for balance-scoped chat
 *
 * Composes BalanceChatMessages and BalanceChatInput into a Sheet panel
 * that slides in from the left side (secondary side in RTL layout).
 *
 * Features:
 * - Fetches messages when opened for a specific balance case
 * - Optimistic message sending (immediate UI update, revert on error)
 * - Loading and empty states
 * - Hebrew RTL layout throughout
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { balanceChatService } from '../services/balance-chat.service';
import type { BalanceChatMessageWithSender } from '../types/balance-chat.types';
import type { AnnualBalanceSheetWithClient } from '../types/annual-balance.types';
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
  const { user } = useAuth();
  const [messages, setMessages] = useState<BalanceChatMessageWithSender[]>([]);
  const [loading, setLoading] = useState(false);

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
      }
      setLoading(false);
    };

    fetchMessages();

    return () => {
      cancelled = true;
    };
  }, [open, balanceCase?.id]);

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

    // Immediately add to UI
    setMessages(prev => [...prev, optimisticMsg]);

    // Send to server
    const result = await balanceChatService.sendMessage(balanceCase.id, content);

    if (result.error) {
      // Revert: remove optimistic message
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      toast.error('שגיאה בשליחת ההודעה');
    } else if (result.data) {
      // Replace optimistic with real server data
      setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? result.data! : m));
    }
  }, [balanceCase, user]);

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
