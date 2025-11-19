import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FileText, Sparkles, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LetterBuilderV2 } from '../components/LetterBuilderV2';
import { UniversalBuilderV2 } from '../components/UniversalBuilderV2';

export default function LetterTemplatesPageV2() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'fee' | 'universal'>('fee');

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* V2 Banner */}
      <Alert className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <Sparkles className="h-4 w-4 text-blue-600" />
        <AlertDescription className="rtl:text-right ltr:text-left">
          <div className="flex items-center justify-between">
            <span className="text-sm">
              🚀 <strong>זו הגרסה החדשה של מערכת המכתבים</strong> - אחידות מלאה, PDF אוטומטי, ועריכה פשוטה
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/letters')}
              className="rtl:mr-4 ltr:ml-4"
            >
              <ArrowLeft className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
              חזרה לגרסה הישנה
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="rtl:text-right ltr:text-left">
          <h1 className="text-3xl font-bold">מכתבים V2</h1>
          <p className="text-muted-foreground mt-1">
            מערכת אחידה ליצירה, עריכה ושליחת מכתבים
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium rtl:text-right ltr:text-left">
              מכתבים שנשלחו החודש
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold rtl:text-right ltr:text-left">0</div>
            <p className="text-xs text-muted-foreground rtl:text-right ltr:text-left">
              מערכת חדשה - נתונים יצטברו
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium rtl:text-right ltr:text-left">
              PDFs שנוצרו
            </CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold rtl:text-right ltr:text-left">0</div>
            <p className="text-xs text-muted-foreground rtl:text-right ltr:text-left">
              יצירה אוטומטית לפי דרישה
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium rtl:text-right ltr:text-left">
              מכתבים בעריכה
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold rtl:text-right ltr:text-left">0</div>
            <p className="text-xs text-muted-foreground rtl:text-right ltr:text-left">
              גרסאות וטיוטות
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'fee' | 'universal')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="fee" className="gap-2">
            <FileText className="h-4 w-4" />
            מכתבי שכר טרחה
          </TabsTrigger>
          <TabsTrigger value="universal" className="gap-2">
            <Sparkles className="h-4 w-4" />
            בונה מכתבים אוניברסלי
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fee" className="mt-6">
          <LetterBuilderV2 />
        </TabsContent>

        <TabsContent value="universal" className="mt-6">
          <UniversalBuilderV2 />
        </TabsContent>
      </Tabs>
    </div>
  );
}
