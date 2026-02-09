/**
 * UnreadBadge - Shows unread message count in navigation
 */

import { useEffect } from 'react';
import { useChatStore } from '../store/chatStore';

export const UnreadBadge: React.FC = () => {
  const { channels, fetchChannels, fetchReadStatus, getTotalUnread } = useChatStore();

  useEffect(() => {
    fetchChannels();
    fetchReadStatus();
  }, [fetchChannels, fetchReadStatus]);

  const count = getTotalUnread();

  if (count === 0 || channels.length === 0) return null;

  return (
    <span className="absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-medium">
      {count > 9 ? '9+' : count}
    </span>
  );
};
