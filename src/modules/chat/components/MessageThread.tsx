/**
 * MessageThread - Displays messages with auto-scroll to bottom
 */

import { useEffect, useRef } from 'react';
import { useChatStore } from '../store/chatStore';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'היום';
  if (date.toDateString() === yesterday.toDateString()) return 'אתמול';
  return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' });
}

export const MessageThread: React.FC = () => {
  const { messages, loading } = useChatStore();
  const { user } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        אין הודעות עדיין. התחל שיחה!
      </div>
    );
  }

  // Group messages by date
  let lastDate = '';

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2">
      {messages.map((msg) => {
        const isOwn = msg.sender_id === user?.id;
        const msgDate = formatDate(msg.created_at);
        const showDateSeparator = msgDate !== lastDate;
        lastDate = msgDate;

        return (
          <div key={msg.id}>
            {showDateSeparator && (
              <div className="flex items-center justify-center my-3">
                <span className="text-xs text-muted-foreground bg-gray-100 px-3 py-1 rounded-full">
                  {msgDate}
                </span>
              </div>
            )}
            <div className={cn('flex', isOwn ? 'justify-start' : 'justify-end')}>
              <div
                className={cn(
                  'max-w-[75%] rounded-lg px-3 py-2 text-sm',
                  isOwn
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-gray-100 text-gray-900'
                )}
              >
                {!isOwn && (
                  <p className="text-xs font-medium mb-1 opacity-70">
                    {msg.sender_name || msg.sender_email || 'משתמש'}
                  </p>
                )}
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                <p className={cn(
                  'text-[10px] mt-1',
                  isOwn ? 'opacity-70' : 'text-muted-foreground'
                )}>
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
};
