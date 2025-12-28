/**
 * Submission Screenshot Link Component
 * Displays a link/button to view the submission proof screenshot
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { FileImage, ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { capitalDeclarationService } from '@/services/capital-declaration.service';
import { toast } from 'sonner';

interface SubmissionScreenshotLinkProps {
  storagePath: string | null;
  variant?: 'icon' | 'button' | 'link';
  size?: 'sm' | 'default';
}

export function SubmissionScreenshotLink({
  storagePath,
  variant = 'icon',
  size = 'default',
}: SubmissionScreenshotLinkProps) {
  const [loading, setLoading] = useState(false);

  if (!storagePath) {
    return null;
  }

  const handleClick = async () => {
    setLoading(true);
    try {
      const { data: url, error } = await capitalDeclarationService.getSubmissionScreenshotUrl(storagePath);

      if (error) {
        toast.error('שגיאה בטעינת הקובץ');
        return;
      }

      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch {
      toast.error('שגיאה בטעינת הקובץ');
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'icon') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClick}
              disabled={loading}
              className={cn(
                'text-green-600 hover:text-green-700 hover:bg-green-50',
                size === 'sm' && 'h-7 w-7'
              )}
            >
              {loading ? (
                <Loader2 className={cn('animate-spin', size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
              ) : (
                <FileImage className={cn(size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="rtl:text-right">
            צפה בצילום הגשה
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === 'button') {
    return (
      <Button
        variant="outline"
        size={size === 'sm' ? 'sm' : 'default'}
        onClick={handleClick}
        disabled={loading}
        className="gap-2"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileImage className="h-4 w-4" />
        )}
        צילום הגשה
        <ExternalLink className="h-3 w-3 opacity-50" />
      </Button>
    );
  }

  // variant === 'link'
  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={cn(
        'inline-flex items-center gap-1 text-green-600 hover:text-green-700 hover:underline',
        size === 'sm' && 'text-sm'
      )}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <FileImage className="h-3 w-3" />
      )}
      צילום הגשה
    </button>
  );
}
