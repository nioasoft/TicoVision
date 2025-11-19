import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Clock, Eye } from 'lucide-react';

interface Version {
  id: string;
  version_number: number;
  created_at: string;
  is_latest: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  letterId: string;
  onSelectVersion: (versionId: string) => void;
}

export function VersionHistoryDialog({
  open,
  onClose,
  letterId,
  onSelectVersion
}: Props) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    loadVersions();
  }, [open, letterId]);

  const loadVersions = async () => {
    setLoading(true);

    try {
      // Get all versions (current + historical)
      const { data, error } = await supabase
        .from('generated_letters')
        .select('id, version_number, created_at, is_latest')
        .or(`id.eq.${letterId},parent_letter_id.eq.${letterId}`)
        .order('version_number', { ascending: false });

      if (error) throw error;

      setVersions(data || []);
    } catch (error) {
      console.error('Error loading versions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-right">
            היסטוריית גרסאות
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-96 overflow-auto">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              אין גרסאות קודמות
            </div>
          ) : (
            versions.map((version) => (
              <div
                key={version.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent"
              >
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">
                      גרסה {version.version_number}
                      {version.is_latest && (
                        <span className="mr-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                          נוכחית
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(version.created_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                    </div>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onSelectVersion(version.id);
                    onClose();
                  }}
                >
                  <Eye className="h-4 w-4 ml-2" />
                  צפה
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
