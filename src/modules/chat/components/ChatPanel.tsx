/**
 * ChatPanel - Slide-out sidebar for internal chat
 * Composes ChannelList + MessageThread + MessageInput
 */

import { useEffect, useCallback } from 'react';
import { useChatStore } from '../store/chatStore';
import { chatService } from '../services/chat.service';
import { ChannelList } from './ChannelList';
import { MessageThread } from './MessageThread';
import { MessageInput } from './MessageInput';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export const ChatPanel: React.FC = () => {
  const {
    panelOpen,
    setPanelOpen,
    activeChannelId,
    fetchChannels,
    fetchReadStatus,
    addRealtimeMessage,
  } = useChatStore();

  // Initialize: fetch channels + read status + subscribe to realtime
  useEffect(() => {
    if (!panelOpen) return;

    fetchChannels();
    fetchReadStatus();

    let subscription: ReturnType<typeof chatService.subscribeToMessages> | null = null;

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const tenantId = user?.user_metadata?.tenant_id;
      if (!tenantId) return;

      subscription = chatService.subscribeToMessages(tenantId, (message) => {
        addRealtimeMessage(message);
      });
    };

    setupRealtime();

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [panelOpen, fetchChannels, fetchReadStatus, addRealtimeMessage]);

  const handleClose = useCallback(() => {
    setPanelOpen(false);
  }, [setPanelOpen]);

  return (
    <>
      {/* Backdrop */}
      {panelOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={handleClose}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-[420px] max-w-[90vw] bg-white shadow-xl transform transition-transform duration-200 ease-in-out flex flex-col',
          panelOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b bg-primary/5">
          <h2 className="text-sm font-semibold">צ׳אט פנימי</h2>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          <ChannelList />
          <div className="flex-1 flex flex-col min-h-0">
            {activeChannelId ? (
              <>
                <MessageThread />
                <MessageInput />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                בחר ערוץ כדי להתחיל
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
