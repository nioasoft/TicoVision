import { useState } from 'react';
import { logger } from '@/lib/logger';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { registrationService } from '@/services/registration.service';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/types/user-role';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  // Registration form state
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCompanyName, setRegCompanyName] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('client');
  const [regTaxId, setRegTaxId] = useState('');
  const [regMessage, setRegMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signIn(email, password);
      toast.success('התחברת בהצלחה!');
      navigate('/');
    } catch (error) {
      toast.error('שגיאה בהתחברות. אנא בדוק את הפרטים ונסה שוב.');
      logger.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error('אנא הזן את כתובת הדוא"ל שלך');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/set-password`
      });

      if (error) throw error;

      toast.success('נשלח קישור לאיפוס סיסמה לכתובת הדוא"ל שלך');
      setIsForgotPassword(false);
    } catch (error) {
      toast.error('שגיאה בשליחת קישור לאיפוס סיסמה');
      logger.error('Forgot password error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate required fields
      if (!regFullName || !regEmail || !regPassword) {
        toast.error('אנא מלא את כל השדות החובה');
        return;
      }

      // Validate password strength
      if (regPassword.length < 8) {
        toast.error('הסיסמה חייבת להכיל לפחות 8 תווים');
        return;
      }

      // Validate password confirmation
      if (regPassword !== regConfirmPassword) {
        toast.error('הסיסמאות אינן תואמות');
        return;
      }

      // Check email availability
      const availability = await registrationService.checkEmailAvailability(regEmail);
      if (!availability.available) {
        if (availability.reason === 'pending_registration') {
          toast.error('כבר קיימת בקשת הרשמה ממתינה עם כתובת דוא"ל זו');
        } else if (availability.reason === 'already_registered') {
          toast.error('כתובת הדוא"ל כבר רשומה במערכת');
        } else {
          toast.error('כתובת הדוא"ל אינה זמינה');
        }
        return;
      }

      // Submit registration
      const { error } = await registrationService.submitRegistration({
        email: regEmail,
        full_name: regFullName,
        password: regPassword, // User's chosen password
        phone: regPhone,
        company_name: regCompanyName,
        requested_role: regRole,
        tax_id: regTaxId,
        message: regMessage
      });

      if (error) {
        throw error;
      }

      toast.success('בקשת ההרשמה נשלחה בהצלחה! מנהל המערכת יאשר אותה בקרוב.');

      // Clear form
      setRegFullName('');
      setRegEmail('');
      setRegPassword('');
      setRegConfirmPassword('');
      setRegPhone('');
      setRegCompanyName('');
      setRegRole('client');
      setRegTaxId('');
      setRegMessage('');
    } catch (error) {
      // Check for duplicate email error (PostgreSQL unique constraint)
      const err = error as { code?: string; message?: string };
      if (err?.code === '23505') {
        toast.error('כתובת הדוא"ל כבר קיימת במערכת');
      } else {
        toast.error('שגיאה בשליחת בקשת ההרשמה');
      }
      logger.error('Registration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
      <div className="w-full max-w-md px-4">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">TicoVision AI</CardTitle>
            <CardDescription className="text-center">
              מערכת ניהול משרד רואי חשבון
            </CardDescription>
          </CardHeader>
          
          <Tabs defaultValue="login" className="w-full" dir="rtl">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">התחברות</TabsTrigger>
              <TabsTrigger value="register">הרשמה</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">דוא"ל</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">סיסמה</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col space-y-2">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? 'מתחבר...' : 'התחבר'}
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm text-muted-foreground"
                    onClick={handleForgotPassword}
                    disabled={isLoading}
                  >
                    שכחת סיסמה?
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleRegistration}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name">שם מלא *</Label>
                    <Input
                      id="reg-name"
                      type="text"
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">דוא"ל *</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-password">סיסמה *</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-confirm-password">אימות סיסמה *</Label>
                    <Input
                      id="reg-confirm-password"
                      type="password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-phone">טלפון</Label>
                    <Input
                      id="reg-phone"
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      disabled={isLoading}
                      dir="ltr"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reg-role">סוג משתמש *</Label>
                    <Select 
                      value={regRole} 
                      onValueChange={(value) => setRegRole(value as UserRole)}
                      disabled={isLoading}
                      dir="rtl"
                    >
                      <SelectTrigger id="reg-role" dir="rtl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="client">לקוח</SelectItem>
                        <SelectItem value="accountant">רואה חשבון</SelectItem>
                        <SelectItem value="bookkeeper">מנהלת חשבונות</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {regRole === 'client' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="reg-company">שם החברה</Label>
                        <Input
                          id="reg-company"
                          type="text"
                          value={regCompanyName}
                          onChange={(e) => setRegCompanyName(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="reg-tax">מספר ח.פ / עוסק מורשה</Label>
                        <Input
                          id="reg-tax"
                          type="text"

                          value={regTaxId}
                          onChange={(e) => setRegTaxId(e.target.value)}
                          disabled={isLoading}
                          dir="ltr"
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="reg-message">הודעה למנהל (אופציונלי)</Label>
                    <Textarea
                      id="reg-message"
                      value={regMessage}
                      onChange={(e) => setRegMessage(e.target.value)}
                      disabled={isLoading}
                      rows={3}
                    />
                  </div>
                </CardContent>
                
                <CardFooter>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? 'שולח בקשה...' : 'שלח בקשת הרשמה'}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
        
        <p className="text-center text-sm text-muted-foreground mt-4">
          © 2025 TicoVision - מערכת לניהול משרד רואי חשבון
        </p>
      </div>
    </div>
  );
}