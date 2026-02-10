/**
 * ChatNotificationToast - RTL-aware custom toast for chat message notifications
 *
 * Rendered inside Sonner's toast.custom() when a new chat message arrives
 * for a balance the current user has access to. Shows sender name, client name,
 * and a truncated message preview. Clicking opens the chat sheet for that balance.
 */

import { MessageCircle, X } from 'lucide-react';

interface ChatNotificationToastProps {
  senderName: string;
  clientName: string;
  preview: string;
  onDismiss: () => void;
  onClick: () => void;
}

export function ChatNotificationToast({
  senderName,
  clientName,
  preview,
  onDismiss,
  onClick,
}: ChatNotificationToastProps) {
  return (
    <div
      dir="rtl"
      className="w-[356px] bg-background border border-border rounded-lg shadow-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <MessageCircle className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-sm font-medium truncate">{senderName}</span>
            <span className="text-xs text-muted-foreground truncate">
              · {clientName}
            </span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{preview}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="shrink-0 p-0.5 rounded-sm hover:bg-muted"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
