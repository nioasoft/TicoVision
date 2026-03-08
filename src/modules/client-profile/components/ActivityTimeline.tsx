/**
 * ActivityTimeline - Recent client interactions timeline
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  Phone,
  Mail,
  Users,
  StickyNote,
  MessageCircle,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { formatIsraeliDate } from '@/lib/formatters';
import type { ClientInteraction } from '../types/client-profile.types';

interface ActivityTimelineProps {
  interactions: ClientInteraction[];
}

const INTERACTION_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  phone_call: { label: 'שיחת טלפון', icon: Phone, color: 'text-blue-500' },
  email_sent: { label: 'אימייל', icon: Mail, color: 'text-green-500' },
  meeting: { label: 'פגישה', icon: Users, color: 'text-purple-500' },
  note: { label: 'הערה', icon: StickyNote, color: 'text-yellow-600' },
  whatsapp: { label: 'וואטסאפ', icon: MessageCircle, color: 'text-emerald-500' },
  other: { label: 'אחר', icon: MoreHorizontal, color: 'text-gray-500' },
};

export function ActivityTimeline({ interactions }: ActivityTimelineProps) {
  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          פעילות אחרונה
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {interactions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">אין פעילות מתועדת</p>
        ) : (
          <div className="space-y-1">
            {interactions.map((interaction) => {
              const config =
                INTERACTION_CONFIG[interaction.interaction_type] || INTERACTION_CONFIG.other;
              const Icon = config.icon;
              const DirectionIcon =
                interaction.direction === 'outbound' ? ArrowUpRight : ArrowDownRight;

              return (
                <div
                  key={interaction.id}
                  className="flex items-start gap-3 py-2 border-b last:border-0"
                >
                  <div className={`mt-0.5 ${config.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{config.label}</span>
                      <DirectionIcon
                        className={`h-3 w-3 ${
                          interaction.direction === 'outbound'
                            ? 'text-orange-500'
                            : 'text-blue-500'
                        }`}
                      />
                    </div>
                    {interaction.subject && (
                      <p className="text-sm text-muted-foreground truncate">{interaction.subject}</p>
                    )}
                    {interaction.outcome && (
                      <Badge variant="outline" className="text-xs mt-1">
                        {interaction.outcome}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatIsraeliDate(interaction.interacted_at)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
