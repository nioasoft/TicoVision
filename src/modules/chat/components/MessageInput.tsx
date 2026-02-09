/**
 * MessageInput - Compose and send chat messages
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2 } from 'lucide-react';
import { useChatStore } from '../store/chatStore';

export const MessageInput: React.FC = () => {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const { sendMessage } = useChatStore();

  const handleSend = useCallback(async () => {
    if (!text.trim()) return;
    setSending(true);
    const success = await sendMessage(text.trim());
    if (success) setText('');
    setSending(false);
  }, [text, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="flex items-center gap-2 p-3 border-t">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="כתוב הודעה..."
        className="rtl:text-right"
        disabled={sending}
      />
      <Button
        size="icon"
        onClick={handleSend}
        disabled={sending || !text.trim()}
        className="shrink-0"
      >
        {sending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
};
