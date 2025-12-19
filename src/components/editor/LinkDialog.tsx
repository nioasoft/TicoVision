import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface LinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: { url: string; text: string; style: 'link' | 'button'; buttonColor?: string }) => void;
  initialText?: string;
  initialUrl?: string;
  mode?: 'link' | 'button';
}

const BUTTON_COLORS = [
  { value: '#395BF7', label: 'כחול', bg: '#395BF7', text: 'white' },
  { value: '#16A34A', label: 'ירוק', bg: '#16A34A', text: 'white' },
  { value: '#DC2626', label: 'אדום', bg: '#DC2626', text: 'white' },
  { value: '#000000', label: 'שחור', bg: '#000000', text: 'white' },
  { value: 'outline', label: 'מסגרת', bg: 'transparent', text: '#395BF7', border: '#395BF7' },
];

export function LinkDialog({
  open,
  onOpenChange,
  onConfirm,
  initialText = '',
  initialUrl = '',
  mode = 'link'
}: LinkDialogProps) {
  const [url, setUrl] = useState(initialUrl);
  const [text, setText] = useState(initialText);
  const [buttonColor, setButtonColor] = useState('#395BF7');

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setUrl(initialUrl);
      setText(initialText);
      setButtonColor('#395BF7');
    }
  }, [open, initialText, initialUrl]);

  const handleConfirm = () => {
    if (!url.trim()) return;

    // Add https:// if no protocol specified
    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    onConfirm({
      url: finalUrl,
      text: text.trim() || finalUrl,
      style: mode,
      buttonColor: mode === 'button' ? buttonColor : undefined,
    });

    onOpenChange(false);
  };

  const isButton = mode === 'button';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>
            {isButton ? 'הוסף כפתור עם קישור' : 'הוסף קישור'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="text">טקסט להצגה</Label>
            <Input
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              dir="rtl"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="url">כתובת URL</Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              dir="ltr"
              className="text-left"
            />
          </div>

          {isButton && (
            <div className="grid gap-2">
              <Label>צבע הכפתור</Label>
              <RadioGroup
                value={buttonColor}
                onValueChange={setButtonColor}
                className="flex flex-wrap gap-2"
              >
                {BUTTON_COLORS.map((color) => (
                  <div key={color.value} className="flex items-center">
                    <RadioGroupItem
                      value={color.value}
                      id={`color-${color.value}`}
                      className="sr-only"
                    />
                    <Label
                      htmlFor={`color-${color.value}`}
                      className={`
                        cursor-pointer px-3 py-1.5 rounded-md text-sm font-medium
                        transition-all border-2
                        ${buttonColor === color.value ? 'ring-2 ring-offset-2 ring-blue-500' : ''}
                      `}
                      style={{
                        backgroundColor: color.bg,
                        color: color.text,
                        borderColor: color.border || color.bg,
                      }}
                    >
                      {color.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Preview */}
          <div className="grid gap-2">
            <Label>תצוגה מקדימה</Label>
            <div className="p-4 bg-gray-50 rounded-lg flex justify-center">
              {isButton ? (
                <span
                  style={{
                    backgroundColor: buttonColor === 'outline' ? 'transparent' : buttonColor,
                    color: buttonColor === 'outline' ? '#395BF7' : 'white',
                    border: buttonColor === 'outline' ? '2px solid #395BF7' : 'none',
                    padding: '10px 24px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    display: 'inline-block',
                    fontWeight: 500,
                  }}
                >
                  {text || 'לחץ כאן'}
                </span>
              ) : (
                <span style={{ color: '#395BF7', textDecoration: 'underline' }}>
                  {text || url || 'טקסט הקישור'}
                </span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
          <Button onClick={handleConfirm} disabled={!url.trim()}>
            {isButton ? 'הוסף כפתור' : 'הוסף קישור'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
