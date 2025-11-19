import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from './button';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';

export function VersionSwitcher() {
  const location = useLocation();
  const navigate = useNavigate();

  // Show only on letters pages
  const isV1 = location.pathname.startsWith('/letters') && !location.pathname.includes('-v2');
  const isV2 = location.pathname.includes('/letters-v2');

  if (!isV1 && !isV2) return null;

  const toggleVersion = () => {
    if (isV1) {
      // V1 → V2
      const newPath = location.pathname.replace('/letters', '/letters-v2');
      navigate(newPath);
    } else {
      // V2 → V1
      const newPath = location.pathname.replace('/letters-v2', '/letters');
      navigate(newPath);
    }
  };

  return (
    <Button
      variant={isV2 ? 'default' : 'outline'}
      size="sm"
      onClick={toggleVersion}
      className="fixed bottom-6 left-6 z-50 shadow-lg"
    >
      {isV2 ? (
        <>
          <ArrowLeft className="h-4 w-4 ml-2" />
          חזרה לגרסה ישנה
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4 ml-2" />
          נסה גרסה חדשה
          <ArrowRight className="h-4 w-4 mr-2" />
        </>
      )}
    </Button>
  );
}
