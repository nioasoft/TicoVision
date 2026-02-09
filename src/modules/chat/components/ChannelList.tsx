/**
 * ChannelList - Shows available channels with unread indicators
 */

import { useEffect, useState, useCallback } from 'react';
import { useChatStore } from '../store/chatStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Hash, MessageCircle, User, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { chatService } from '../services/chat.service';
import type { ChannelType } from '../types/chat.types';

const channelTypeIcons: Record<ChannelType, React.ElementType> = {
  general: Hash,
  client: MessageCircle,
  direct: User,
};

export const ChannelList: React.FC = () => {
  const { channels, activeChannelId, readStatus, fetchChannels, setActiveChannel } = useChatStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const readChannelIds = new Set(readStatus.map((r) => r.channel_id));

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const result = await chatService.createChannel(newName.trim(), 'general');
    if (result.data) {
      await fetchChannels();
      setActiveChannel(result.data.id);
      setNewName('');
      setCreateOpen(false);
    }
    setCreating(false);
  }, [newName, fetchChannels, setActiveChannel]);

  return (
    <div className="w-full border-b lg:border-b-0 lg:border-l lg:w-56 flex flex-col">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="text-sm font-semibold">ערוצים</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {channels.length === 0 ? (
          <p className="text-xs text-muted-foreground p-3">אין ערוצים. צור ערוץ חדש.</p>
        ) : (
          <ul className="py-1">
            {channels.map((ch) => {
              const Icon = channelTypeIcons[ch.channel_type] || Hash;
              const hasUnread = !readChannelIds.has(ch.id);
              const isActive = ch.id === activeChannelId;

              return (
                <li key={ch.id}>
                  <button
                    onClick={() => setActiveChannel(ch.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-sm text-right transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-gray-50 text-gray-700'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{ch.name}</span>
                    {hasUnread && (
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Create channel dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent dir="rtl" className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>ערוץ חדש</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">שם הערוץ:</label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="שם הערוץ"
              className="rtl:text-right"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
              }}
            />
          </div>
          <DialogFooter className="flex gap-2 rtl:flex-row-reverse">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'צור ערוץ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
