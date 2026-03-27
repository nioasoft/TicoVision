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

// Mobile-responsive styles for letter HTML content + print styles
const printStyles = `
  /* Mobile: force letter HTML tables/images to fit screen */
  @media (max-width: 640px) {
    .letter-content table {
      width: 100% !important;
      max-width: 100% !important;
    }
    .letter-content td {
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      box-sizing: border-box !important;
    }
    .letter-content img {
      max-width: 100% !important;
      height: auto !important;
    }
    .letter-content [width] {
      width: auto !important;
      max-width: 100% !important;
    }
    .letter-content [style*="width"] {
      max-width: 100% !important;
    }
  }

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
      // Signature
      'cid:tico_signature': `${baseUrl}/storage/v1/object/public/${bucket}/tico_signature.png`,
      // Bullet star images for styled lists
      'cid:bullet_star_blue': `${baseUrl}/storage/v1/object/public/${bucket}/Bullet_star_blue.png`,
      'cid:bullet_star': `${baseUrl}/storage/v1/object/public/${bucket}/bullet-star.png`,
      'cid:bullet_star_darkred': `${baseUrl}/storage/v1/object/public/${bucket}/Bullet_star_darkred.png`,
      // Footer contact icons
      'cid:icon_star': `${baseUrl}/storage/v1/object/public/${bucket}/icon-star.png`,
      'cid:icon_building': `${baseUrl}/storage/v1/object/public/${bucket}/icon-building.png`,
      'cid:icon_phone': `${baseUrl}/storage/v1/object/public/${bucket}/icon-phone.png`,
      'cid:icon_email': `${baseUrl}/storage/v1/object/public/${bucket}/icon-email.png`,
    };

    let result = html;

    for (const [cid, url] of Object.entries(imageMap)) {
      result = result.replace(new RegExp(cid, 'g'), url);
    }

    // Mobile: replace fixed pixel widths on tables with max-width for responsiveness
    // width="800" → width="100%" style="max-width:800px"
    result = result.replace(/(<table[^>]*?)width\s*=\s*"(\d{3,})"([^>]*?>)/gi,
      (match, before, width, after) => `${before}width="100%" style="max-width:${width}px"${after}`);
    // style="width: 800px" → style="width:100%;max-width:800px"
    result = result.replace(/style\s*=\s*"([^"]*?)width\s*:\s*(\d{3,})px([^"]*?)"/gi,
      (match, before, width, after) => `style="${before}width:100%;max-width:${width}px${after}"`);

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

  // Prepare letter HTML for iframe - inject mobile viewport + responsive overrides
  const getIframeHtml = (): string => {
    if (!letter.generated_content_html) return '';
    let html = convertHtmlForDisplay(letter.generated_content_html);

    // Inject mobile-responsive CSS before </head>
    const mobileCSS = `
      <style>
        @media (max-width: 640px) {
          body { padding: 0 !important; margin: 0 !important; }
          table[width] { width: 100% !important; max-width: 100% !important; }
          td { max-width: 100% !important; }
          img { max-width: 100% !important; height: auto !important; }
        }
      </style>
    `;
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${mobileCSS}</head>`);
    }

    // Ensure viewport meta exists
    if (!html.includes('viewport')) {
      html = html.replace('<head>', '<head><meta name="viewport" content="width=device-width, initial-scale=1.0">');
    }

    return html;
  };

  return (
    <>
      <style>{printStyles}</style>
      <div className="min-h-screen bg-gray-100">
        {/* Letter rendered in iframe for proper full-HTML rendering */}
        <iframe
          srcDoc={getIframeHtml()}
          title={letter.subject || 'מכתב'}
          className="w-full min-h-screen border-0"
          style={{ height: '100vh' }}
        />
      </div>
    </>
  );
}
