/**
 * BalanceChatInput - Auto-expanding Textarea with send button for balance chat
 *
 * Provides a message composition area with:
 * - Auto-expanding Textarea (1 row to ~4 rows) with Hebrew placeholder
 * - Send button with loading state
 * - Enter-to-send (Shift+Enter for newline)
 * - Disabled state while sending or when chat is unavailable
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height based on content
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

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
    <div className="flex items-end gap-2 p-3 border-t">
      <Textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="כתוב הודעה..."
        className="rtl:text-right min-h-[38px] max-h-[120px] resize-none py-2 text-sm"
        disabled={sending || disabled}
        rows={1}
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
