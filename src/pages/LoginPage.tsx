import { useState } from 'react';
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
import type { UserRole } from '@/types/user-role';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  // Registration form state
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
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
      navigate('/dashboard');
    } catch (error) {
      toast.error('שגיאה בהתחברות. אנא בדוק את הפרטים ונסה שוב.');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate required fields
      if (!regFullName || !regEmail) {
        toast.error('אנא מלא את כל השדות החובה');
        return;
      }

      // Check email availability
      const availability = await registrationService.checkEmailAvailability(regEmail);
      if (!availability.available) {
        if (availability.reason === 'pending_registration') {
          toast.error('כבר קיימת בקשת הרשמה עם כתובת דוא"ל זו');
        } else {
          toast.error('כתובת הדוא"ל כבר רשומה במערכת');
        }
        return;
      }

      // Submit registration
      const { error } = await registrationService.submitRegistration({
        email: regEmail,
        full_name: regFullName,
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
      setRegPhone('');
      setRegCompanyName('');
      setRegRole('client');
      setRegTaxId('');
      setRegMessage('');
    } catch (error) {
      toast.error('שגיאה בשליחת בקשת ההרשמה');
      console.error('Registration error:', error);
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
          
          <Tabs defaultValue="login" className="w-full">
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
                      placeholder="your@email.com"
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
                      placeholder="הכנס סיסמה"
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
                    onClick={() => toast.info('יש ליצור קשר עם מנהל המערכת')}
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
                      placeholder="ישראל ישראלי"
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
                      placeholder="your@email.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
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
                      placeholder="050-1234567"
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
                    >
                      <SelectTrigger id="reg-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
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
                          placeholder="חברת הדוגמה בע״מ"
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
                          placeholder="123456789"
                          value={regTaxId}
                          onChange={(e) => setRegTaxId(e.target.value)}
                          disabled={isLoading}
                          dir="ltr"
                        />
                      </div>
                    </>
                  )}
                  
                  {(regRole === 'accountant' || regRole === 'bookkeeper') && (
                    <div className="space-y-2">
                      <Label htmlFor="reg-company">שם המשרד</Label>
                      <Input
                        id="reg-company"
                        type="text"
                        placeholder="משרד רואי חשבון"
                        value={regCompanyName}
                        onChange={(e) => setRegCompanyName(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="reg-message">הודעה למנהל (אופציונלי)</Label>
                    <Textarea
                      id="reg-message"
                      placeholder="מידע נוסף שתרצה לשתף..."
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