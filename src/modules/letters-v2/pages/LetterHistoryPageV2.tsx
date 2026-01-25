import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  ArrowLeft,
  Eye,
  FileText,
  Sparkles,
  Download,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { LetterDisplayDialog } from '../components/LetterDisplayDialog';
import type { GeneratedLetter } from '@/types/database.types';

interface ClientData {
  company_name: string;
  client_type: string;
}

interface LetterWithClient extends GeneratedLetter {
  clients: ClientData;
}

export default function LetterHistoryPageV2() {
  const navigate = useNavigate();
  const [letters, setLetters] = useState<LetterWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);

  useEffect(() => {
    loadLetters();
  }, []);

  const loadLetters = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('generated_letters')
        .select(`
          *,
          clients!inner(company_name, client_type)
        `)
        .eq('system_version', 'v2')
        .eq('is_latest', true)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setLetters((data || []) as LetterWithClient[]);
    } catch (error) {
      console.error('Error loading letters:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLetters = letters.filter(letter => {
    if (!searchQuery) return true;

    const searchLower = searchQuery.toLowerCase();
    const companyName = letter.clients?.company_name?.toLowerCase() || '';

    return companyName.includes(searchLower);
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default">נשלח</Badge>;
      case 'draft':
        return <Badge variant="secondary">טיוטה</Badge>;
      case 'archived':
        return <Badge variant="outline">ארכיון</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* V2 Banner */}
      <Alert className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <Sparkles className="h-4 w-4 text-blue-600" />
        <AlertDescription className="rtl:text-right ltr:text-left">
          <div className="flex items-center justify-between">
            <span className="text-sm">
              📊 היסטוריית מכתבים V2 - רק מכתבים שנוצרו במערכת החדשה
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/letters/history')}
              className="rtl:mr-4 ltr:ml-4"
            >
              <ArrowLeft className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
              היסטוריה ישנה
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="rtl:text-right ltr:text-left">
          <h1 className="text-3xl font-bold">היסטוריית מכתבים V2</h1>
          <p className="text-muted-foreground mt-1">
            {filteredLetters.length} מכתבים נמצאו
          </p>
        </div>

        <div className="flex gap-2">
          <div className="relative w-64">
            <Search className="absolute rtl:right-3 ltr:left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input

              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rtl:pr-10 ltr:pl-10 rtl:text-right ltr:text-left"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="rtl:text-right ltr:text-left">מכתבים אחרונים</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">טוען מכתבים...</p>
            </div>
          ) : filteredLetters.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'לא נמצאו מכתבים' : 'עדיין לא נוצרו מכתבים במערכת V2'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="rtl:text-right ltr:text-left">תאריך</TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">לקוח</TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">סוג מכתב</TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">סטטוס</TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">גרסה</TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">PDF</TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLetters.map((letter) => (
                  <TableRow key={letter.id}>
                    <TableCell className="rtl:text-right ltr:text-left">
                      {format(new Date(letter.created_at), 'dd/MM/yyyy', { locale: he })}
                    </TableCell>
                    <TableCell className="rtl:text-right ltr:text-left font-medium">
                      {letter.clients?.company_name || 'לא ידוע'}
                    </TableCell>
                    <TableCell className="rtl:text-right ltr:text-left">
                      {letter.letter_type === 'fee' ? 'שכר טרחה' : 'מותאם אישית'}
                    </TableCell>
                    <TableCell className="rtl:text-right ltr:text-left">
                      {getStatusBadge(letter.status || 'draft')}
                    </TableCell>
                    <TableCell className="rtl:text-right ltr:text-left">
                      <Badge variant="outline">v{letter.version_number || 1}</Badge>
                    </TableCell>
                    <TableCell className="rtl:text-right ltr:text-left">
                      {letter.pdf_url ? (
                        <Badge variant="default" className="gap-1">
                          <Download className="h-3 w-3" />
                          יש PDF
                        </Badge>
                      ) : (
                        <Badge variant="secondary">אין PDF</Badge>
                      )}
                    </TableCell>
                    <TableCell className="rtl:text-right ltr:text-left">
                      <div className="flex gap-2 rtl:justify-end ltr:justify-start">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedLetter(letter.id)}
                        >
                          <Eye className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                          צפה
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Letter Display Dialog */}
      {selectedLetter && (
        <LetterDisplayDialog
          open={!!selectedLetter}
          onClose={() => setSelectedLetter(null)}
          letterId={selectedLetter}
          mode="view"
          onEdit={() => {
            // TODO: Navigate to edit
          }}
        />
      )}
    </div>
  );
}
