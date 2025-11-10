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

  // Convert CID references to web URLs for proper image display
  const convertHtmlForDisplay = (html: string): string => {
    const baseUrl = import.meta.env.VITE_APP_URL || 'https://ticovision.vercel.app';

    return html
      .replace(/cid:tico_logo_new/g, `${baseUrl}/brand/Tico_logo_png_new.png`)
      .replace(/cid:franco_logo_new/g, `${baseUrl}/brand/Tico_franco_co.png`)
      .replace(/cid:tagline/g, `${baseUrl}/brand/tagline.png`)
      .replace(/cid:bullet_star_blue/g, `${baseUrl}/brand/Bullet_star_blue.png`)
      .replace(/cid:tico_logo/g, `${baseUrl}/brand/tico_logo_240.png`)
      .replace(/cid:franco_logo/g, `${baseUrl}/brand/franco-logo-hires.png`)
      .replace(/cid:bullet_star/g, `${baseUrl}/brand/bullet-star.png`);
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
  );
}
