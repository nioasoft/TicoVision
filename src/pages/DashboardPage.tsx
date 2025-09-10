import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, Calculator, FileText, DollarSign } from 'lucide-react';

export function DashboardPage() {
  // Mock data - will be replaced with real data from Supabase
  const stats = [
    {
      title: 'הכנסות החודש',
      value: '₪125,430',
      change: '+12.5%',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'לקוחות פעילים',
      value: '546',
      change: '+23',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'חשבונות ממתינים',
      value: '87',
      change: '72% נגבו',
      icon: Calculator,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      title: 'מכתבים נשלחו',
      value: '234',
      change: 'החודש',
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  const recentPayments = [
    { client: 'חברת ABC בע"מ', amount: '₪5,000', date: '15/12/2024', status: 'שולם' },
    { client: 'עו"ד כהן ושות\'', amount: '₪3,500', date: '14/12/2024', status: 'שולם' },
    { client: 'מסעדת הגינה', amount: '₪2,800', date: '13/12/2024', status: 'ממתין' },
    { client: 'קליניקה רפואית', amount: '₪4,200', date: '12/12/2024', status: 'שולם' },
    { client: 'חנות הספרים', amount: '₪1,900', date: '11/12/2024', status: 'באיחור' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">לוח בקרה</h1>
        <p className="text-gray-500 mt-1">סקירה כללית של המערכת</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <div className={cn('p-2 rounded-lg', stat.bgColor)}>
                <stat.icon className={cn('h-4 w-4', stat.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-gray-500 mt-1">
                <span className={stat.change.includes('+') ? 'text-green-600' : ''}>
                  {stat.change}
                </span>
                {' מהחודש הקודם'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle>תשלומים אחרונים</CardTitle>
            <CardDescription>תשלומים שהתקבלו ב-7 הימים האחרונים</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPayments.map((payment, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{payment.client}</p>
                    <p className="text-sm text-gray-500">{payment.date}</p>
                  </div>
                  <div className="text-left">
                    <p className="font-medium">{payment.amount}</p>
                    <span className={cn(
                      'text-xs px-2 py-1 rounded-full',
                      payment.status === 'שולם' && 'bg-green-100 text-green-700',
                      payment.status === 'ממתין' && 'bg-yellow-100 text-yellow-700',
                      payment.status === 'באיחור' && 'bg-red-100 text-red-700',
                    )}>
                      {payment.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Collection Progress */}
        <Card>
          <CardHeader>
            <CardTitle>התקדמות גבייה</CardTitle>
            <CardDescription>יעד חודשי: ₪150,000</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>נגבה עד כה</span>
                  <span className="font-medium">₪125,430 (83.6%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-primary rounded-full h-2" style={{ width: '83.6%' }}></div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">₪125,430</p>
                  <p className="text-sm text-gray-500">נגבה</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-400">₪24,570</p>
                  <p className="text-sm text-gray-500">נותר לגבות</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">התפלגות לפי סטטוס:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">שולם במלואו</span>
                    <span className="font-medium">412 לקוחות</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">תשלום חלקי</span>
                    <span className="font-medium">67 לקוחות</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">טרם שולם</span>
                    <span className="font-medium">87 לקוחות</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}