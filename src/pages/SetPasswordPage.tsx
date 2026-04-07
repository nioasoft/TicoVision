import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Eye, EyeOff, Lock, CheckCircle, Loader2 } from 'lucide-react';

export function SetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const navigate = useNavigate();

  // Check if user came from password reset link
  useEffect(() => {
    let isMounted = true;
    let sessionChecked = false;

    // Timeout fallback - if no session after 5 seconds, redirect to login
    const timeout = setTimeout(() => {
      if (isMounted && !sessionChecked) {
        logger.warn('Password reset session timeout - no valid session found');
        toast.error('קישור פג תוקף או לא תקין. אנא בקש קישור חדש');
        setTimeout(() => navigate('/login'), 1500);
      }
    }, 5000);

    // Listen for auth state changes - this is crucial for password recovery!
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      // PASSWORD_RECOVERY event is fired when Supabase detects recovery token in URL
      if (event === 'PASSWORD_RECOVERY') {
        clearTimeout(timeout);
        sessionChecked = true;
        setHasValidSession(true);
        setIsCheckingSession(false);
      }
      // Or if user is already signed in with a valid session
      else if (event === 'SIGNED_IN' && session) {
        clearTimeout(timeout);
        sessionChecked = true;
        setHasValidSession(true);
        setIsCheckingSession(false);
      }
      // If signed out, redirect to login
      else if (event === 'SIGNED_OUT') {
        clearTimeout(timeout);
        if (!sessionChecked) {
          toast.error('קישור לא תקין. אנא בקש קישור חדש לאיפוס סיסמה');
          setTimeout(() => navigate('/login'), 1500);
        }
      }
    });

    // Also check current session as a fallback (in case recovery already processed)
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!isMounted) return;

      if (error) {
        logger.error('Error getting session:', error);
        return;
      }

      if (session && !sessionChecked) {
        clearTimeout(timeout);
        sessionChecked = true;
        setHasValidSession(true);
        setIsCheckingSession(false);
      }
    });

    // Cleanup function
    return () => {
      isMounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [navigate]);

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
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      toast.success('הסיסמה הוגדרה בהצלחה! מעביר להתחברות...');

      // Sign out to force login with new password
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

  // Show loader while checking session
  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">טוען...</p>
        </div>
      </div>
    );
  }

  // Don't show form if no valid session
  if (!hasValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
        <div className="text-center">
          <p className="text-muted-foreground">מעביר להתחברות...</p>
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
