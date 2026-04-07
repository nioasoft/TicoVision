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
  const [currentTime, setCurrentTime] = useState(new Date());

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
    { icon: Users, label: 'לקוחות', sub: 'Come Together', path: '/clients', iconClassName: 'bg-primary/10 text-primary' },
    { icon: FileText, label: 'מכתבים', sub: 'Message in a Bottle', path: '/letters', iconClassName: 'bg-primary/10 text-primary' },
    { icon: BarChart3, label: 'דשבורד', sub: 'Paint It Black', path: '/dashboard', iconClassName: 'bg-amber-50 text-amber-700' },
    { icon: TrendingUp, label: 'גבייה', sub: 'Money Money Money', path: '/collections', iconClassName: 'bg-primary/10 text-primary' },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/30 px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-5xl flex-col items-center justify-center rounded-3xl border border-border/80 bg-background px-6 py-10 shadow-sm">
        <div className="mb-5 flex justify-center">
          <img
            src="/brand/tico_logo_transparent.png"
            alt="Tico Vision"
            className="h-28 md:h-36"
          />
        </div>

        <div className="mb-8 space-y-3 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-2 text-primary">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Light My Fire</span>
          </div>

          <h1 className="text-balance text-4xl font-bold text-foreground md:text-6xl">
            {getGreeting()}, {firstName}
          </h1>

          <p className="mx-auto max-w-2xl text-pretty text-xl leading-relaxed text-muted-foreground md:text-2xl">
            "I Can&apos;t Get No Satisfaction" until I open Tico Vision.
          </p>
        </div>

        <div className="mb-8 flex flex-wrap justify-center gap-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="rounded-full bg-primary/10 p-1.5">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <span>Sympathy for the Admin</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="rounded-full bg-primary/10 p-1.5">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <span>Born to be Organized</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="rounded-full bg-primary/10 p-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <span>Stairway to Dashboard</span>
          </div>
        </div>

        <div className="mb-6 grid w-full max-w-3xl grid-cols-2 gap-3 md:grid-cols-4">
          {quickActions.map((action) => (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className="rounded-2xl border border-border/90 bg-card p-5 text-center shadow-sm transition-colors hover:border-primary/20 hover:bg-primary/5"
            >
              <div className={`mx-auto mb-2 flex size-12 items-center justify-center rounded-xl ${action.iconClassName}`}>
                <action.icon className="h-6 w-6" />
              </div>
              <span className="block text-sm font-medium text-foreground">
                {action.label}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground/80">
                {action.sub}
              </span>
            </button>
          ))}
        </div>

        <Button
          variant="brand"
          size="lg"
          onClick={() => navigate('/clients')}
          className="px-8 py-4 text-lg"
        >
          <span className="flex items-center gap-2">
            Let&apos;s Rock
            <ArrowLeft className="h-5 w-5" />
          </span>
        </Button>

        <p className="mt-8 text-sm text-muted-foreground/70">
          The Show Must Go On - Powered by Tico Vision
        </p>
      </div>
    </div>
  );
}
