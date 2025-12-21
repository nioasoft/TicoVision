import { AlertTriangle } from 'lucide-react';

interface UnsavedChangesIndicatorProps {
  show: boolean;
}

/**
 * Visual indicator for unsaved changes in dialogs
 * Displays a yellow banner at the top of the dialog content
 */
export function UnsavedChangesIndicator({ show }: UnsavedChangesIndicatorProps) {
  if (!show) return null;

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center gap-2 text-yellow-800 text-sm -mx-6 -mt-6 mb-4">
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <span>יש שינויים שלא נשמרו</span>
    </div>
  );
}
