import React from 'react';
import { Button } from '@/components/ui/button';

interface BulkActionsBarProps {
  selectedCount: number;
  onActivate: () => void;
  onDeactivate: () => void;
  onClearSelection: () => void;
}

export const BulkActionsBar = React.memo<BulkActionsBarProps>(({
  selectedCount,
  onActivate,
  onDeactivate,
  onClearSelection,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-blue-50 p-4 rounded-lg flex items-center justify-between" dir="rtl">
      <span className="text-sm">{selectedCount} לקוחות נבחרו</span>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onActivate}>
          הפעל
        </Button>
        <Button size="sm" variant="outline" onClick={onDeactivate}>
          השבת
        </Button>
        <Button size="sm" variant="outline" onClick={onClearSelection}>
          ביטול בחירה
        </Button>
      </div>
    </div>
  );
});

BulkActionsBar.displayName = 'BulkActionsBar';
