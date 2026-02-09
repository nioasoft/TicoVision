/**
 * BalanceChatInput - Text input with send button for balance chat
 *
 * Provides a message composition area with:
 * - Text input with Hebrew placeholder
 * - Send button with loading state
 * - Enter-to-send (Shift+Enter for newline)
 * - Disabled state while sending or when chat is unavailable
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2 } from 'lucide-react';

interface BalanceChatInputProps {
  onSend: (content: string) => Promise<void>;
  disabled?: boolean;
}

export const BalanceChatInput: React.FC<BalanceChatInputProps> = ({
  onSend,
  disabled = false,
}) => {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setSending(true);
    try {
      await onSend(trimmed);
      setText('');
    } finally {
      setSending(false);
    }
  }, [text, onSend]);

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
        disabled={sending || disabled}
      />
      <Button
        size="icon"
        onClick={handleSend}
        disabled={sending || !text.trim() || disabled}
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
