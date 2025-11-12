/**
 * Universal Letter Builder Page
 * Create custom letters with WYSIWYG editor
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { UniversalLetterBuilder } from '@/modules/letters/components/UniversalLetterBuilder';

export function LetterTemplatesPage() {
  const location = useLocation();
  const [editLetterId, setEditLetterId] = useState<string | null>(null);

  // Handle navigation from history page with edit intent
  useEffect(() => {
    const state = location.state as { editLetterId?: string } | null;

    if (state?.editLetterId) {
      setEditLetterId(state.editLetterId);

      // Clear navigation state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  return (
    <div dir="rtl">
      {/* Universal Letter Builder */}
      <UniversalLetterBuilder editLetterId={editLetterId} />
    </div>
  );
}
