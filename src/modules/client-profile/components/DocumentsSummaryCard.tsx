/**
 * DocumentsSummaryCard - All 14 file categories with counts + recent files + link to file manager
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FolderOpen, FileIcon, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { formatIsraeliDate } from '@/lib/formatters';

interface DocumentsSummaryCardProps {
  clientId: string;
}

const FILE_CATEGORIES = [
  // מסמכי מס וכספים
  { key: 'financial_report', label: 'דו"ח כספי מבוקר אחרון', dot: 'bg-green-400' },
  { key: 'bookkeeping_card', label: 'כרטיסי הנהח"ש אצלנו', dot: 'bg-purple-400' },
  { key: 'quote_invoice', label: 'הצעות מחיר / תעודות חיוב', dot: 'bg-amber-400' },
  { key: 'payment_proof_2026', label: 'אסמכתאות תשלום 2026', dot: 'bg-emerald-400' },
  { key: 'tax_withholding_exemption', label: 'פטור מניכוי מס במקור', dot: 'bg-lime-400' },
  { key: 'tax_account_status', label: 'מצב חשבון מס הכנסה', dot: 'bg-yellow-400' },
  // מסמכי חברה ומשפט
  { key: 'company_registry', label: 'רשם החברות', dot: 'bg-blue-400' },
  { key: 'holdings_presentation', label: 'מצגת החזקות', dot: 'bg-rose-400' },
  { key: 'protocols', label: 'פרוטוקולים', dot: 'bg-indigo-400' },
  { key: 'agreements', label: 'הסכמים', dot: 'bg-orange-400' },
  // תפעול ושונות
  { key: 'letters', label: 'מכתבים / תכתובות', dot: 'bg-teal-400' },
  { key: 'foreign_worker_docs', label: 'אישורי עובדים זרים', dot: 'bg-cyan-400' },
  { key: 'shaagat_haari_grant', label: 'מתווה מענק שאגת הארי', dot: 'bg-pink-400' },
  { key: 'general', label: 'כללי', dot: 'bg-gray-400' },
] as const;

interface RecentFile {
  id: string;
  file_name: string;
  file_category: string;
  created_at: string;
}

export function DocumentsSummaryCard({ clientId }: DocumentsSummaryCardProps) {
  const navigate = useNavigate();
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const [countsResult, recentResult] = await Promise.all([
        supabase
          .from('client_attachments')
          .select('file_category')
          .eq('client_id', clientId)
          .eq('is_latest', true),
        supabase
          .from('client_attachments')
          .select('id, file_name, file_category, created_at')
          .eq('client_id', clientId)
          .eq('is_latest', true)
          .order('created_at', { ascending: false })
          .limit(3),
      ]);

      const counts: Record<string, number> = {};
      if (countsResult.data) {
        for (const row of countsResult.data) {
          const cat = row.file_category || 'general';
          counts[cat] = (counts[cat] || 0) + 1;
        }
      }
      setCategoryCounts(counts);

      if (recentResult.data) {
        setRecentFiles(recentResult.data as RecentFile[]);
      }

      setLoading(false);
    }

    fetchData();
  }, [clientId]);

  const totalFiles = Object.values(categoryCounts).reduce((sum, c) => sum + c, 0);

  const getCategoryLabel = (key: string) =>
    FILE_CATEGORIES.find((c) => c.key === key)?.label || key;

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            מסמכים
            {totalFiles > 0 && (
              <span className="text-xs text-muted-foreground font-normal">({totalFiles})</span>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => navigate(`/files?clientId=${clientId}`)}
          >
            מנהל קבצים
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {loading ? (
          <div className="space-y-1.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 bg-muted/50 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {/* All categories */}
            <div className="space-y-0.5">
              {FILE_CATEGORIES.map(({ key, label, dot }) => {
                const count = categoryCounts[key] || 0;
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between py-1 text-xs"
                  >
                    <div className="flex items-center gap-1.5">
                      <div className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                      <span className={count === 0 ? 'text-muted-foreground' : ''}>
                        {label}
                      </span>
                    </div>
                    <span className={`tabular-nums ${count === 0 ? 'text-muted-foreground' : 'font-medium'}`}>
                      {count || '—'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Recent files */}
            {recentFiles.length > 0 && (
              <div className="border-t pt-2">
                <div className="text-xs font-medium text-muted-foreground mb-1.5">
                  קבצים אחרונים
                </div>
                <div className="space-y-1">
                  {recentFiles.map((file) => (
                    <div key={file.id} className="flex items-center gap-2 py-0.5">
                      <FileIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs truncate">{file.file_name}</div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <span>{getCategoryLabel(file.file_category)}</span>
                          <span>·</span>
                          <span>{formatIsraeliDate(file.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
