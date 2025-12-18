import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Users,
  FileText,
  BarChart3,
  Sparkles,
  Zap,
  Shield,
  TrendingUp
} from 'lucide-react';

/**
 * Welcome Page - The first page users see after login
 * Features a stunning, futuristic design with the Tico logo
 */
export function WelcomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Update time every minute
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'בוקר טוב';
    if (hour < 17) return 'צהריים טובים';
    if (hour < 21) return 'ערב טוב';
    return 'לילה טוב';
  };

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ||
                    user?.email?.split('@')[0] ||
                    'משתמש';

  const quickActions = [
    { icon: Users, label: 'לקוחות', path: '/clients', color: 'from-blue-500 to-cyan-500' },
    { icon: FileText, label: 'מכתבים', path: '/letters', color: 'from-purple-500 to-pink-500' },
    { icon: BarChart3, label: 'דשבורד', path: '/dashboard', color: 'from-orange-500 to-red-500' },
    { icon: TrendingUp, label: 'גבייה', path: '/collections', color: 'from-green-500 to-emerald-500' },
  ];

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-950 dark:via-blue-950/30 dark:to-purple-950/20" />

      {/* Floating orbs */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-br from-pink-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-cyan-400/10 to-blue-400/10 rounded-full blur-3xl" />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Main content */}
      <div className={`relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

        {/* Logo with glow effect */}
        <div className="relative mb-8 group">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/30 to-blue-500/30 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 scale-150" />
          <img
            src="/brand/tico_logo_transparent.png"
            alt="Tico Vision"
            className="h-32 md:h-40 relative z-10 drop-shadow-2xl transition-transform duration-500 hover:scale-105"
          />
        </div>

        {/* Vision text */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 mb-4">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              מערכת ניהול חכמה למשרדי רואי חשבון
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold">
            <span className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 dark:from-white dark:via-slate-200 dark:to-white bg-clip-text text-transparent">
              {getGreeting()}, {firstName}
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            ברוכים הבאים ל
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mx-2">
              Tico Vision
            </span>
            <br />
            העתיד של ניהול משרדי רואי חשבון מתחיל כאן
          </p>
        </div>

        {/* Feature highlights */}
        <div className="flex flex-wrap justify-center gap-6 mb-12">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="p-1.5 rounded-full bg-green-500/10">
              <Shield className="w-4 h-4 text-green-500" />
            </div>
            <span>אבטחה מתקדמת</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="p-1.5 rounded-full bg-blue-500/10">
              <Zap className="w-4 h-4 text-blue-500" />
            </div>
            <span>ביצועים מהירים</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="p-1.5 rounded-full bg-purple-500/10">
              <Sparkles className="w-4 h-4 text-purple-500" />
            </div>
            <span>חוויה חכמה</span>
          </div>
        </div>

        {/* Quick actions grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 w-full max-w-3xl">
          {quickActions.map((action, index) => (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className={`group relative p-6 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-300 hover:scale-105 hover:shadow-xl`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
              <div className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                {action.label}
              </span>
            </button>
          ))}
        </div>

        {/* CTA Button */}
        <Button
          size="lg"
          onClick={() => navigate('/clients')}
          className="group relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 px-8 py-6 text-lg rounded-xl"
        >
          <span className="relative z-10 flex items-center gap-2">
            בואו נתחיל
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </Button>

        {/* Bottom tagline */}
        <p className="mt-12 text-sm text-muted-foreground/60">
          מופעל על ידי טכנולוגיה מתקדמת • עיצוב לעתיד
        </p>
      </div>
    </div>
  );
}
