/**
 * LetterViewer - Public Letter Viewing Page
 *
 * Purpose: Display letters publicly via shareable link
 * URL: /letters/view/:id
 * Auth: Not required (public access)
 * Tracking: Updates open_count and last_opened_at
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

// Print styles for clean printing
const printStyles = `
  @media print {
    /* Remove background colors */
    body {
      background-color: white !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Remove page margins and padding */
    .min-h-screen {
      min-height: auto !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    /* Remove shadows, rounded corners, and borders */
    .shadow-xl {
      box-shadow: none !important;
    }

    .rounded-lg {
      border-radius: 0 !important;
    }

    /* Remove backgrounds */
    .bg-gray-100 {
      background-color: white !important;
    }

    .bg-white {
      background-color: white !important;
    }

    .bg-gray-50 {
      background-color: white !important;
    }

    /* Remove borders */
    .border-t {
      border-top: none !important;
    }

    /* Optimize padding for print */
    .p-8 {
      padding: 1cm !important;
    }

    .px-6 {
      padding-left: 1cm !important;
      padding-right: 1cm !important;
    }

    .py-4 {
      padding-top: 0.5cm !important;
      padding-bottom: 0.5cm !important;
    }

    /* Hide footer completely */
    .bg-gray-50 {
      display: none !important;
    }

    /* Ensure text is black for printing */
    * {
      color: black !important;
    }

    /* Remove any remaining shadows */
    * {
      box-shadow: none !important;
      text-shadow: none !important;
    }

    /* Optimize for page breaks */
    .max-w-4xl {
      max-width: 100% !important;
      width: 100% !important;
      margin: 0 !important;
    }

    /* Ensure proper page breaks */
    .overflow-hidden {
      overflow: visible !important;
    }
  }
`;

interface GeneratedLetter {
  id: string;
  generated_content_html: string;
  subject?: string;
  created_at: string;
  open_count: number;
}

export default function LetterViewer() {
  const { id } = useParams<{ id: string }>();
  const [letter, setLetter] = useState<GeneratedLetter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Convert CID references to Supabase Storage URLs for proper image display
  const convertHtmlForDisplay = (html: string): string => {
    const baseUrl = import.meta.env.VITE_SUPABASE_URL.replace('/rest/v1', '');
    const bucket = 'letter-assets-v2';

    const imageMap: Record<string, string> = {
      'cid:tico_logo_new': `${baseUrl}/storage/v1/object/public/${bucket}/Tico_logo_png_new.png`,
      'cid:franco_logo_new': `${baseUrl}/storage/v1/object/public/${bucket}/Tico_franco_co.png`,
      'cid:tagline': `${baseUrl}/storage/v1/object/public/${bucket}/tagline.png`,
      'cid:tico_logo': `${baseUrl}/storage/v1/object/public/${bucket}/tico_logo_240.png`,
      'cid:franco_logo': `${baseUrl}/storage/v1/object/public/${bucket}/franco-logo-hires.png`,
      // Bullet star images for styled lists
      'cid:bullet_star_blue': `${baseUrl}/storage/v1/object/public/${bucket}/Bullet_star_blue.png`,
      'cid:bullet_star': `${baseUrl}/storage/v1/object/public/${bucket}/bullet-star.png`,
      'cid:bullet_star_darkred': `${baseUrl}/storage/v1/object/public/${bucket}/Bullet_star_darkred.png`,
    };

    let result = html;

    for (const [cid, url] of Object.entries(imageMap)) {
      result = result.replace(new RegExp(cid, 'g'), url);
    }

    return result;
  };

  useEffect(() => {
    if (!id) {
      setError('מזהה מכתב חסר');
      setLoading(false);
      return;
    }

    loadLetter(id);
  }, [id]);

  const loadLetter = async (letterId: string) => {
    try {
      setLoading(true);

      // Fetch letter from database
      const { data, error: fetchError } = await supabase
        .from('generated_letters')
        .select('id, generated_content_html, subject, created_at, open_count')
        .eq('id', letterId)
        .single();

      if (fetchError) {
        console.error('Error fetching letter:', fetchError);
        setError('שגיאה בטעינת המכתב');
        return;
      }

      if (!data) {
        setError('מכתב לא נמצא');
        return;
      }

      setLetter(data);

      // Track open (async, don't wait)
      trackLetterOpen(letterId, data.open_count);

    } catch (err) {
      console.error('Unexpected error loading letter:', err);
      setError('שגיאה בלתי צפויה בטעינת המכתב');
    } finally {
      setLoading(false);
    }
  };

  const trackLetterOpen = async (letterId: string, currentCount: number) => {
    try {
      // Update open tracking
      await supabase
        .from('generated_letters')
        .update({
          last_opened_at: new Date().toISOString(),
          open_count: currentCount + 1
        })
        .eq('id', letterId);
    } catch (err) {
      // Silent fail - tracking is not critical
      console.warn('Failed to track letter open:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">טוען מכתב...</p>
        </div>
      </div>
    );
  }

  if (error || !letter) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">שגיאה</h1>
          <p className="text-gray-600 mb-4" dir="rtl">
            {error || 'מכתב לא נמצא'}
          </p>
          <p className="text-sm text-gray-500" dir="rtl">
            נא לוודא שהקישור נכון ולנסות שוב.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{printStyles}</style>
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-lg overflow-hidden">
        {/* Letter Content */}
        <div
          className="p-8"
          dir="rtl"
          dangerouslySetInnerHTML={{ __html: letter.generated_content_html ? convertHtmlForDisplay(letter.generated_content_html) : '' }}
        />

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t">
          {/* Footer content removed - clean interface */}
        </div>
      </div>
    </div>
    </>
  );
}
