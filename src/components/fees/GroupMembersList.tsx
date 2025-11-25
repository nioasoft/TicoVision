/**
 * Group Members List Component
 *
 * Displays a list of companies belonging to a selected group.
 * Used in FeesPage when group mode is selected.
 */

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Building2, AlertCircle, Users } from 'lucide-react';
import { groupFeeService, type ClientGroup, type GroupMemberClient } from '@/services/group-fee.service';
import { cn } from '@/lib/utils';

interface GroupMembersListProps {
  groupId: string | null;
  className?: string;
  compact?: boolean;
  showHeader?: boolean;
}

export function GroupMembersList({
  groupId,
  className = '',
  compact = false,
  showHeader = true
}: GroupMembersListProps) {
  const [group, setGroup] = useState<ClientGroup | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load group details when groupId changes
  useEffect(() => {
    if (groupId) {
      loadGroupDetails(groupId);
    } else {
      setGroup(null);
    }
  }, [groupId]);

  /**
   * Load group with its member clients
   */
  const loadGroupDetails = async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await groupFeeService.getGroupWithMembers(id);

      if (fetchError) throw fetchError;

      setGroup(data);
    } catch (err) {
      console.error('Error loading group details:', err);
      setError('שגיאה בטעינת פרטי הקבוצה');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get display name for a client
   */
  const getClientDisplayName = (client: GroupMemberClient): string => {
    return client.company_name_hebrew || client.company_name || 'ללא שם';
  };

  /**
   * Get internal/external badge color
   */
  const getTypeBadgeVariant = (type: 'internal' | 'external'): 'default' | 'secondary' => {
    return type === 'internal' ? 'secondary' : 'default';
  };

  // No group selected
  if (!groupId) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2 p-3 border rounded-md bg-gray-50', className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-gray-600">טוען חברות הקבוצה...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn('flex items-center gap-2 p-3 border border-red-200 rounded-md bg-red-50 text-red-600 text-sm text-right', className)}>
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
        {error}
      </div>
    );
  }

  // No group data
  if (!group) {
    return null;
  }

  const members = group.clients || [];

  // Compact mode - just chips
  if (compact) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center gap-2 text-sm text-gray-600 text-right">
          <Users className="h-4 w-4" />
          <span>{members.length} חברות בקבוצה</span>
        </div>
        <div className="flex flex-wrap gap-2" dir="rtl">
          {members.map((client) => (
            <Badge key={client.id} variant="outline" className="text-sm">
              {getClientDisplayName(client)}
            </Badge>
          ))}
        </div>
      </div>
    );
  }

  // Full mode - card with list
  return (
    <Card className={cn('', className)}>
      {showHeader && (
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-right flex items-center gap-2 justify-end">
            <span>חברות הקבוצה</span>
            <Users className="h-5 w-5" />
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        {members.length === 0 ? (
          <p className="text-sm text-gray-500 text-right">אין חברות בקבוצה זו</p>
        ) : (
          <div className="space-y-2">
            {/* Summary */}
            <div className="flex items-center justify-between text-sm text-gray-600 pb-2 border-b">
              <span className="text-right">{members.length} חברות</span>
              <div className="flex gap-2">
                <Badge variant="secondary" className="text-xs">
                  {members.filter(c => c.internal_external === 'internal').length} פנימי
                </Badge>
                <Badge variant="default" className="text-xs">
                  {members.filter(c => c.internal_external === 'external').length} חיצוני
                </Badge>
              </div>
            </div>

            {/* Member list */}
            <ul className="space-y-2" dir="rtl">
              {members.map((client) => (
                <li
                  key={client.id}
                  className="flex items-center justify-between p-2 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium">{getClientDisplayName(client)}</span>
                    {client.tax_id && (
                      <span className="text-xs text-gray-500">({client.tax_id})</span>
                    )}
                  </div>
                  <Badge
                    variant={getTypeBadgeVariant(client.internal_external)}
                    className="text-xs"
                  >
                    {client.internal_external === 'internal' ? 'פנימי' : 'חיצוני'}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
