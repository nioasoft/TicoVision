/**
 * GroupProfileHero - Identity header for group profile
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Pencil, Presentation } from 'lucide-react';
import { GoogleDriveIcon } from '@/components/icons/GoogleDriveIcon';
import { useNavigate } from 'react-router-dom';
import type { ClientGroup } from '@/services';

interface GroupProfileHeroProps {
  group: ClientGroup;
  memberCount: number;
  onEdit: () => void;
}

export function GroupProfileHero({ group, memberCount, onEdit }: GroupProfileHeroProps) {
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border border-t-4 border-t-indigo-500 bg-card shadow-sm p-4">
      <div className="flex items-start justify-between">
        {/* Right side - identity info */}
        <div className="space-y-2 flex-1">
          {/* Row 1: Name */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => navigate('/client-groups')}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold tracking-tight">{group.group_name_hebrew}</h1>
            <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
              {memberCount} חברים
            </Badge>
          </div>

          {/* Row 2: Owner + links */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            {group.primary_owner && (
              <span>בעל שליטה: <span className="font-medium text-foreground">{group.primary_owner}</span></span>
            )}
            {group.secondary_owners && group.secondary_owners.length > 0 && (
              <span>בעלי מניות נוספים: {group.secondary_owners.join(', ')}</span>
            )}
          </div>

          {/* Row 3: Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {group.combined_billing && (
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                חיוב מאוחד
              </Badge>
            )}
            {group.combined_letters && (
              <Badge variant="outline" className="text-xs bg-sky-50 text-sky-700 border-sky-200">
                מכתבים מאוחדים
              </Badge>
            )}
            {group.google_drive_link && (
              <a
                href={group.google_drive_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-0.5 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <GoogleDriveIcon className="h-4 w-4" />
                Google Drive
              </a>
            )}
            {group.company_structure_link && (
              <a
                href={group.company_structure_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-0.5 text-sm font-medium text-purple-700 border border-purple-300 hover:bg-purple-100 transition-colors cursor-pointer"
              >
                <Presentation className="h-4 w-4 text-purple-600" />
                מצגת החזקות
              </a>
            )}
          </div>
        </div>

        {/* Left side - actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4 ms-1.5" />
            עריכה
          </Button>
        </div>
      </div>
    </div>
  );
}
