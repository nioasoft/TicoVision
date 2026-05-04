import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { authService } from '@/services/auth.service';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Eye, EyeOff, Lock, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

type SessionState =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'error'; title: string; message: string };

const SESSION_TIMEOUT_MS = 4000;

/**
 * Maps Supabase error codes (returned in URL hash on failure) to Hebrew user messages.
 */
const mapHashError = (errorCode: string | null, errorDescription: string | null): { title: string; message: string } => {
  if (errorCode === 'otp_expired') {
    return {
      title: 'הקישור פג תוקף',
      message: 'הקישור לאיפוס הסיסמה כבר אינו תקף. אנא בקש קישור חדש.',
    };
  }
  if (errorCode === 'access_denied') {
    return {
      title: 'הקישור לא תקין',
      message: 'ייתכן שכבר השתמשת בקישור זה. אנא בקש קישור חדש לאיפוס סיסמה.',
    };
  }
  return {
    title: 'שגיאה באיפוס סיסמה',
    message: errorDescription || 'הקישור אינו תקין. אנא בקש קישור חדש.',
  };
};

export function SetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionState, setSessionState] = useState<SessionState>({ kind: 'loading' });
  const navigate = useNavigate();
  const resolvedRef = useRef(false);

  useEffect(() => {
    const resolve = (next: SessionState) => {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      setSessionState(next);
    };

    // 1. Check URL hash for explicit error from Supabase (e.g., expired/used link).
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    if (hash) {
      const params = new URLSearchParams(hash);
      const errorCode = params.get('error_code') || params.get('error');
      if (errorCode) {
        const errorDescription = params.get('error_description');
        logger.warn('Password reset hash error:', { errorCode, errorDescription });
        const mapped = mapHashError(errorCode, errorDescription);
        resolve({ kind: 'error', ...mapped });
        return;
      }
    }

    // 2. If URL contains ?code=, exchange it explicitly. This handles PKCE recovery.
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');

    if (code) {
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ error }) => {
          if (error) {
            logger.error('exchangeCodeForSession failed:', error);
            // Most common cause: PKCE code_verifier missing (link opened in different browser).
            const isPkceFailure =
              /code verifier|code_verifier|invalid request/i.test(error.message);
            resolve({
              kind: 'error',
              title: isPkceFailure ? 'הקישור נפתח בדפדפן שונה' : 'הקישור אינו תקין',
              message: isPkceFailure
                ? 'יש לפתוח את קישור איפוס הסיסמה באותו דפדפן בו ביקשת אותו. אנא בקש קישור חדש בדפדפן הזה.'
                : 'אירעה שגיאה בתהליך איפוס הסיסמה. אנא בקש קישור חדש.',
            });
          } else {
            // Clean up the code from URL so a refresh doesn't try to re-exchange.
            window.history.replaceState({}, '', '/set-password');
            resolve({ kind: 'ready' });
          }
        })
        .catch((error) => {
          logger.error('exchangeCodeForSession threw:', error);
          resolve({
            kind: 'error',
            title: 'שגיאה באיפוס סיסמה',
            message: 'לא הצלחנו לאמת את קישור איפוס הסיסמה. אנא בקש קישור חדש.',
          });
        });
      return;
    }

    // 3. No code, no error → check for existing session (legitimate password-change use case)
    //    or wait briefly for PASSWORD_RECOVERY event from older implicit-flow links.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      logger.info('SetPasswordPage auth event:', event);
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        resolve({ kind: 'ready' });
      }
    });

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (session) {
          resolve({ kind: 'ready' });
        }
      })
      .catch((error) => {
        logger.error('Error getting session in SetPasswordPage:', error);
      });

    const timeout = window.setTimeout(() => {
      resolve({
        kind: 'error',
        title: 'לא נמצא קישור איפוס תקף',
        message: 'יש לפתוח דף זה דרך הקישור שנשלח לדוא"ל. אנא בקש קישור חדש לאיפוס סיסמה.',
      });
    }, SESSION_TIMEOUT_MS);

    return () => {
      subscription.unsubscribe();
      window.clearTimeout(timeout);
    };
  }, []);

  const validatePassword = () => {
    if (password.length < 8) {
      toast.error('הסיסמה חייבת להכיל לפחות 8 תווים');
      return false;
    }
    if (password !== confirmPassword) {
      toast.error('הסיסמאות אינן תואמות');
      return false;
    }
    return true;
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePassword()) return;

    setIsLoading(true);

    try {
      const { success, error } = await authService.updatePassword(password);
      if (!success || error) throw error ?? new Error('Failed to update password');

      toast.success('הסיסמה הוגדרה בהצלחה! מעביר להתחברות...');

      // Force a fresh login with the new password
      await supabase.auth.signOut();

      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (error) {
      logger.error('Error setting password:', error);
      toast.error('שגיאה בהגדרת הסיסמה. אנא נסה שוב.');
    } finally {
      setIsLoading(false);
    }
  };

  const passwordRequirements = [
    { met: password.length >= 8, text: 'לפחות 8 תווים' },
    { met: password === confirmPassword && password.length > 0, text: 'הסיסמאות תואמות' },
  ];
  const requirementIconClassName = (met: boolean) => (met ? 'text-primary' : 'text-muted-foreground/40');
  const requirementTextClassName = (met: boolean) => (met ? 'text-primary' : 'text-muted-foreground');

  if (sessionState.kind === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">מאמת קישור איפוס...</p>
        </div>
      </div>
    );
  }

  if (sessionState.kind === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
        <div className="w-full max-w-md px-4">
          <Card className="border-border/90 bg-background/95 shadow-lg backdrop-blur">
            <CardHeader className="space-y-1">
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-destructive/20 bg-destructive/10">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-center rtl:text-right">
                {sessionState.title}
              </CardTitle>
              <CardDescription className="text-center rtl:text-right">
                {sessionState.message}
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-col gap-2">
              <Button
                type="button"
                variant="brand"
                className="w-full"
                onClick={() => navigate('/login')}
              >
                בקש קישור חדש לאיפוס סיסמה
              </Button>
            </CardFooter>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-4">
            © 2025 TicoVision - מערכת לניהול משרד רואי חשבון
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
      <div className="w-full max-w-md px-4">
        <Card className="border-border/90 bg-background/95 shadow-lg backdrop-blur">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/15 bg-primary/10">
                <Lock className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-center rtl:text-right">
              הגדרת סיסמה
            </CardTitle>
            <CardDescription className="text-center rtl:text-right">
              אנא בחר סיסמה חזקה לחשבון שלך
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSetPassword}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-right">סיסמה חדשה</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-right">אימות סיסמה</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Password Requirements */}
              <div className="space-y-2 rounded-xl border border-border/80 bg-muted/40 p-3">
                <p className="text-right text-sm font-medium text-foreground">דרישות סיסמה:</p>
                {passwordRequirements.map((req, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm justify-end">
                    <span className={requirementTextClassName(req.met)}>
                      {req.text}
                    </span>
                    <CheckCircle
                      className={`h-4 w-4 ${requirementIconClassName(req.met)}`}
                    />
                  </div>
                ))}
              </div>
            </CardContent>

            <CardFooter>
              <Button
                type="submit"
                variant="brand"
                className="w-full"
                disabled={isLoading || !password || !confirmPassword}
              >
                {isLoading ? 'שומר סיסמה...' : 'הגדר סיסמה'}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-4">
          © 2025 TicoVision - מערכת לניהול משרד רואי חשבון
        </p>
      </div>
    </div>
  );
}
