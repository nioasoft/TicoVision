import React from 'react';
import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';

interface BlueBulletButtonProps {
  editor: Editor;
}

export const BlueBulletButton: React.FC<BlueBulletButtonProps> = ({ editor }) => {
  const isActive = editor.isActive('blueBullet');

  return (
    <Button
      type="button"
      variant={isActive ? 'secondary' : 'ghost'}
      size="sm"
      onClick={() => editor.chain().focus().toggleBlueBullet().run()}
      title="bullet עם כוכב כחול"
      className="relative"
    >
      <Star className="h-4 w-4 fill-blue-500 text-blue-500" />
    </Button>
  );
};
