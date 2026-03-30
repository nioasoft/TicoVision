/**
 * ClientFilesTab - Display files organized by category groups
 */

import { FileDisplayWidget } from '@/components/files/FileDisplayWidget';
import { getCategoriesByGroup } from '@/types/file-attachment.types';

interface ClientFilesTabProps {
  clientId: string;
}

export const ClientFilesTab: React.FC<ClientFilesTabProps> = ({ clientId }) => {
  const groupedCategories = getCategoriesByGroup();

  return (
    <div className="space-y-6">
      {groupedCategories.map(({ group, categories }) => (
        <div key={group.key} className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">
            {group.label}
          </h3>
          <div className="space-y-3">
            {categories.map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <h4 className="text-sm font-medium text-muted-foreground">{label}</h4>
                <FileDisplayWidget
                  clientId={clientId}
                  category={key}
                  variant="compact"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
