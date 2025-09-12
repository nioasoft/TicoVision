import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, Calculator, FileText, DollarSign, ArrowUp, ArrowDown } from 'lucide-react';
// Import only the charts we actually use to reduce bundle size
import { 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { cn } from '@/lib/utils';
import { feeService } from '@/services/fee.service';
import { clientService } from '@/services/client.service';

export function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState([
    {
      title: 'הכנסות החודש',
      value: '₪0',
      change: '0%',
      trend: 'up',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'לקוחות פעילים',
      value: '0',
      change: '0',
      trend: 'up',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'חשבונות ממתינים',
      value: '0',
      change: '0%',
      trend: 'neutral',
      icon: Calculator,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      title: 'מכתבים נשלחו',
      value: '0',
      change: 'החודש',
      trend: 'up',
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ]);

  const [recentPayments, setRecentPayments] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [paymentStatusData, setPaymentStatusData] = useState([]);
  const [clientGrowthData, setClientGrowthData] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Load real data from services
      const [clientsResponse, feesResponse] = await Promise.all([
        clientService.getClients(),
        feeService.getSummary()
      ]);

      // Update stats based on real data
      if (clientsResponse.data && clientsResponse.data.clients) {
        const activeClients = clientsResponse.data.clients.filter(c => c.status === 'active').length;
        setStats(prev => prev.map(stat => {
          if (stat.title === 'לקוחות פעילים') {
            return { ...stat, value: activeClients.toString(), change: `+${Math.floor(activeClients * 0.1)}` };
          }
          return stat;
        }));
      }

      if (feesResponse.data) {
        const summary = feesResponse.data;
        const totalRevenue = summary.total_paid || 0;
        const pendingCount = summary.count_pending || 0;
        const totalPending = summary.total_pending || 0;
        const collectionRate = summary.total_paid && (summary.total_paid + summary.total_pending) > 0 
          ? (summary.total_paid / (summary.total_paid + summary.total_pending)) * 100 
          : 0;

        setStats(prev => prev.map(stat => {
          if (stat.title === 'הכנסות החודש') {
            return { 
              ...stat, 
              value: new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(totalRevenue),
              change: `+${collectionRate.toFixed(1)}%`
            };
          }
          if (stat.title === 'חשבונות ממתינים') {
            return { 
              ...stat, 
              value: pendingCount.toString(),
              change: `₪${new Intl.NumberFormat('he-IL').format(totalPending)}`
            };
          }
          return stat;
        }));
      }

      // Generate chart data
      generateChartData();

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateChartData = () => {
    // Monthly revenue data (mock for now - will be replaced with real data)
    const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני'];
    const revenueData = months.map(month => ({
      month,
      תקציב: Math.floor(Math.random() * 50000) + 100000,
      בפועל: Math.floor(Math.random() * 45000) + 95000,
    }));
    setMonthlyRevenue(revenueData);

    // Payment status pie chart data
    const statusData = [
      { name: 'שולם', value: 65, color: '#10b981' },
      { name: 'ממתין', value: 25, color: '#f59e0b' },
      { name: 'באיחור', value: 10, color: '#ef4444' },
    ];
    setPaymentStatusData(statusData);

    // Client growth data
    const growthData = months.map((month, index) => ({
      month,
      לקוחות: 500 + (index * 30) + Math.floor(Math.random() * 20),
    }));
    setClientGrowthData(growthData);

    // Recent payments (mock data)
    const payments = [
      { client: 'חברת ABC בע"מ', amount: '₪5,000', date: '15/12/2024', status: 'שולם' },
      { client: 'עו"ד כהן ושות\'', amount: '₪3,500', date: '14/12/2024', status: 'שולם' },
      { client: 'מסעדת הגינה', amount: '₪2,800', date: '13/12/2024', status: 'ממתין' },
      { client: 'קליניקה רפואית', amount: '₪4,200', date: '12/12/2024', status: 'שולם' },
      { client: 'חנות הספרים', amount: '₪1,900', date: '11/12/2024', status: 'באיחור' },
    ];
    setRecentPayments(payments);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {new Intl.NumberFormat('he-IL').format(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

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
              <div className="flex items-center mt-1">
                {stat.trend === 'up' && <ArrowUp className="h-3 w-3 text-green-600 ml-1" />}
                {stat.trend === 'down' && <ArrowDown className="h-3 w-3 text-red-600 ml-1" />}
                <p className="text-xs text-gray-500">
                  <span className={stat.trend === 'up' ? 'text-green-600' : stat.trend === 'down' ? 'text-red-600' : ''}>
                    {stat.change}
                  </span>
                  {stat.title === 'הכנסות החודש' && ' מהחודש הקודם'}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>הכנסות חודשיות</CardTitle>
            <CardDescription>השוואה בין תקציב לביצוע בפועל</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyRevenue}>
                <defs>
                  <linearGradient id="colorBudget" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area type="monotone" dataKey="תקציב" stroke="#8884d8" fillOpacity={1} fill="url(#colorBudget)" />
                <Area type="monotone" dataKey="בפועל" stroke="#82ca9d" fillOpacity={1} fill="url(#colorActual)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>סטטוס תשלומים</CardTitle>
            <CardDescription>התפלגות תשלומים לפי סטטוס</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={paymentStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paymentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Client Growth and Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle>גידול בלקוחות</CardTitle>
            <CardDescription>מספר לקוחות פעילים לאורך זמן</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={clientGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="לקוחות" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

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
                      payment.status === 'שולם' && 'bg-green-100 text-green-800',
                      payment.status === 'ממתין' && 'bg-yellow-100 text-yellow-800',
                      payment.status === 'באיחור' && 'bg-red-100 text-red-800'
                    )}>
                      {payment.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>פעילות אחרונה</CardTitle>
          <CardDescription>פעולות שבוצעו במערכת</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">לקוח חדש נוסף - חברת XYZ בע"מ</p>
                <p className="text-xs text-gray-500">לפני 2 שעות</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">תשלום התקבל - ₪5,000 מחברת ABC</p>
                <p className="text-xs text-gray-500">לפני 4 שעות</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">מכתב נשלח - תזכורת תשלום ל-15 לקוחות</p>
                <p className="text-xs text-gray-500">אתמול ב-14:30</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}