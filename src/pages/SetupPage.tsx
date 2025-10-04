import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

/**
 * ⚠️ WARNING: This setup page is currently NOT FUNCTIONAL
 *
 * It previously relied on supabaseAdmin (Service Role Key) which has been removed
 * for security reasons. Initial setup should now be done via:
 *
 * 1. Supabase Dashboard - manually create tenant and first admin user
 * 2. SQL migrations - run setup scripts directly on database
 * 3. TODO: Create dedicated SECURITY DEFINER RPC functions for setup operations
 *
 * @deprecated Use alternative setup methods
 */

export function SetupPage() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [email] = useState('benatia.asaf@gmail.com');
  const [password] = useState('Aa589525!');
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSetup = async () => {
    setLoading(true);
    
    try {
      // Step 1: Create tenant using admin client
      if (step === 1) {
        if (!supabaseAdmin) {
          throw new Error('Service role key not configured for setup');
        }
        
        const { error: tenantError } = await supabaseAdmin.from('tenants').insert({
          id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          name: 'TicoVision Main',
          type: 'internal',
          status: 'active',
          subscription_plan: 'enterprise',
          settings: {
            company_name: 'TicoVision AI',
            admin_email: 'benatia.asaf@gmail.com',
            language: 'he',
            timezone: 'Asia/Jerusalem'
          }
        });

        if (tenantError && !tenantError.message.includes('duplicate')) {
          throw tenantError;
        }

        toast({
          title: 'הצלחה',
          description: 'Tenant נוצר בהצלחה',
        });
        setStep(2);
      }
      
      // Step 2: Sign up admin user
      else if (step === 2) {
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              tenant_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
              role: 'admin',
              full_name: 'Asaf Benatia'
            }
          }
        });

        if (signUpError) {
          // If user already exists, try to sign in
          if (signUpError.message.includes('already registered')) {
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email,
              password
            });

            if (signInError) {
              throw signInError;
            }
          } else {
            throw signUpError;
          }
        }

        // Get the user ID
        const userId = authData?.user?.id || (await supabase.auth.getUser()).data.user?.id;

        if (userId) {
          // Step 3: Add user to users table using admin client
          const { error: userError } = await supabaseAdmin!.from('users').upsert({
            id: userId,
            tenant_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            role: 'admin',
            full_name: 'Asaf Benatia',
            phone: '050-1234567',
            permissions: {
              all_access: true,
              manage_users: true,
              manage_tenants: true,
              view_all_data: true,
              system_settings: true
            },
            is_active: true
          });

          if (userError && !userError.message.includes('duplicate')) {
            console.error('User error:', userError);
          }

          // Step 4: Auto-confirm the user's email using admin client
          try {
            const { error: confirmError } = await supabaseAdmin!.auth.admin.updateUserById(
              userId,
              { 
                email_confirm: true 
              }
            );
            
            if (confirmError) {
              console.error('Email confirmation error:', confirmError);
            } else {
              console.log('Email auto-confirmed for user:', userId);
            }
          } catch (confirmError) {
            console.error('Failed to confirm email:', confirmError);
          }
        }

        toast({
          title: 'הצלחה',
          description: 'חשבון Admin נוצר בהצלחה!',
        });
        
        setStep(3);
        
        // Add demo data
        await addDemoData();
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    } catch (error: any) {
      console.error('Setup error:', error);
      toast({
        title: 'שגיאה',
        description: error.message || 'אירעה שגיאה בהגדרת המערכת',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addDemoData = async () => {
    try {
      // Add demo clients using admin client
      if (!supabaseAdmin) {
        throw new Error('Service role key not configured for demo data');
      }
      
      await supabaseAdmin.from('clients').insert([
        {
          tenant_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          company_name: 'Tech Solutions Ltd',
          tax_id: '123456789',
          contact_name: 'ישראל ישראלי',
          contact_email: 'israel@techsolutions.co.il',
          contact_phone: '03-1234567',
          address: {
            street: 'רחוב הטכנולוגיה 15',
            city: 'תל אביב',
            postal_code: '6423915'
          },
          status: 'active',
          internal_external: 'internal',
          collection_responsibility: 'tiko'
        },
        {
          tenant_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          company_name: 'Global Imports',
          tax_id: '987654321',
          contact_name: 'שרה כהן',
          contact_email: 'sarah@globalimports.co.il',
          contact_phone: '04-9876543',
          address: {
            street: 'שדרות בן גוריון 123',
            city: 'חיפה',
            postal_code: '3200003'
          },
          status: 'active',
          internal_external: 'external',
          collection_responsibility: 'shani'
        },
        {
          tenant_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          company_name: 'StartUp Nation',
          tax_id: '456789123',
          contact_name: 'דוד לוי',
          contact_email: 'david@startupnation.co.il',
          contact_phone: '02-4567891',
          address: {
            street: 'רחוב הסטארטאפ 7',
            city: 'ירושלים',
            postal_code: '9142001'
          },
          status: 'pending',
          internal_external: 'internal',
          collection_responsibility: 'tiko'
        }
      ]);

      console.log('Demo clients added successfully');

      console.log('Demo data added successfully');
    } catch (error) {
      console.error('Error adding demo data:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">הגדרת מערכת TicoVision</CardTitle>
          <CardDescription>
            הגדרה ראשונית של המערכת וחשבון Admin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Progress Steps */}
            <div className="flex justify-between mb-8">
              <div className={`flex items-center ${step >= 1 ? 'text-primary' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                  step > 1 ? 'bg-primary border-primary text-white' : step === 1 ? 'border-primary' : 'border-gray-400'
                }`}>
                  {step > 1 ? <CheckCircle className="h-5 w-5" /> : '1'}
                </div>
                <span className="mr-2 text-sm">יצירת Tenant</span>
              </div>
              <div className={`flex items-center ${step >= 2 ? 'text-primary' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                  step > 2 ? 'bg-primary border-primary text-white' : step === 2 ? 'border-primary' : 'border-gray-400'
                }`}>
                  {step > 2 ? <CheckCircle className="h-5 w-5" /> : '2'}
                </div>
                <span className="mr-2 text-sm">חשבון Admin</span>
              </div>
              <div className={`flex items-center ${step >= 3 ? 'text-primary' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                  step === 3 ? 'bg-primary border-primary text-white' : 'border-gray-400'
                }`}>
                  {step === 3 ? <CheckCircle className="h-5 w-5" /> : '3'}
                </div>
                <span className="mr-2 text-sm">סיום</span>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">דוא״ל</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  dir="ltr"
                />
              </div>
              <div>
                <Label htmlFor="password">סיסמה</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  disabled
                  dir="ltr"
                />
              </div>
            </div>

            {/* Action Button */}
            {step < 3 ? (
              <Button
                onClick={handleSetup}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    מעבד...
                  </>
                ) : (
                  step === 1 ? 'צור Tenant והמשך' : 'צור חשבון Admin'
                )}
              </Button>
            ) : (
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-semibold">המערכת הוגדרה בהצלחה!</p>
                <p className="text-sm text-gray-500 mt-2">מעביר אותך לדשבורד...</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}