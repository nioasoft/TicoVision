import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { letterRenderingService } from '../services/letter-rendering.service';
import { Button } from '@/components/ui/button';
import { Printer, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function LetterViewerV2() {
  const { id } = useParams<{ id: string }>();
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadLetter();
      trackOpen();
    }
  }, [id]);

  const loadLetter = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      // Render for browser (public access, no auth needed)
      const renderedHtml = await letterRenderingService.renderForBrowser(id);
      setHtml(renderedHtml);
    } catch (err) {
      console.error('Error loading letter:', err);
      setError('לא הצלחנו לטעון את המכתב. ייתכן שהלינק לא תקין או שהמכתב נמחק.');
    } finally {
      setLoading(false);
    }
  };

  const trackOpen = async () => {
    if (!id) return;

    try {
      // Track open (increment counter)
      await supabase.rpc('increment_letter_opens', { letter_id: id });
    } catch (err) {
      // Silent fail - not critical
      console.error('Error tracking open:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">טוען מכתב...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="rtl:text-right ltr:text-left">
              {error}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - only show on screen, not in print */}
      <div className="bg-white border-b print:hidden sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="rtl:text-right ltr:text-left">
            <h1 className="text-xl font-bold">מכתב מ-TICO</h1>
            <p className="text-sm text-muted-foreground">
              צפייה ציבורית
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handlePrint} variant="outline" size="sm">
              <Printer className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
              הדפס / שמור כ-PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Letter Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
          <div
            dir="rtl"
            className="p-8"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
          .max-w-4xl {
            max-width: 100%;
          }
          .shadow-lg {
            box-shadow: none;
          }
          .rounded-lg {
            border-radius: 0;
          }
        }
      `}</style>
    </div>
  );
}
