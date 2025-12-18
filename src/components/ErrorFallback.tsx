import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface ErrorFallbackProps {
  error: Error | null;
  resetError?: () => void;
}

/**
 * Checks if the error is related to chunk loading failure (version mismatch after deployment)
 */
const isChunkError = (error: Error | null): boolean => {
  if (!error) return false;
  return (
    error.name === 'ChunkLoadError' ||
    error.message.includes('Failed to fetch dynamically imported module') ||
    error.message.includes('Loading chunk') ||
    error.message.includes('Expected a JavaScript-or-Wasm module') ||
    error.message.includes('Loading CSS chunk')
  );
};

/**
 * Fallback UI component displayed when an error is caught by ErrorBoundary
 * Provides user-friendly error message and recovery options
 */
export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const isVersionMismatch = isChunkError(error);

  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl">
            {isVersionMismatch ? 'גרסה חדשה זמינה' : 'משהו השתבש'}
          </CardTitle>
          <CardDescription className="text-right">
            {isVersionMismatch
              ? 'עודכנה גרסה חדשה של האפליקציה. אנא רענן את העמוד לטעינת הגרסה החדשה.'
              : 'אירעה שגיאה בלתי צפויה. אנחנו עובדים על זה.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error details (only in development) */}
          {import.meta.env.DEV && error && (
            <div className="p-4 bg-muted rounded-lg text-right">
              <p className="text-sm font-medium mb-2">פרטי שגיאה (מצב פיתוח):</p>
              <pre className="text-xs text-muted-foreground overflow-auto max-h-32 text-left">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </div>
          )}

          {/* Recovery actions */}
          <div className="flex flex-col gap-2">
            {/* For version mismatch, reload is the primary action */}
            <Button
              onClick={handleReload}
              variant={isVersionMismatch ? 'default' : 'outline'}
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 ml-2" />
              {isVersionMismatch ? 'טען את הגרסה החדשה' : 'טען מחדש את העמוד'}
            </Button>
            {/* Only show "Try Again" for non-chunk errors */}
            {!isVersionMismatch && resetError && (
              <Button
                onClick={resetError}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 ml-2" />
                נסה שוב
              </Button>
            )}
            <Button
              onClick={handleGoHome}
              variant="ghost"
              className="w-full"
            >
              <Home className="w-4 h-4 ml-2" />
              חזור לדף הבית
            </Button>
          </div>

          {/* Help text */}
          <p className="text-sm text-muted-foreground text-center">
            אם הבעיה נמשכת, אנא צור קשר עם התמיכה הטכנית
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
