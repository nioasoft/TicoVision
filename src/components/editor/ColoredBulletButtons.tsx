import React from 'react';
import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Diamond } from 'lucide-react';

interface ColoredBulletButtonsProps {
  editor: Editor;
}

interface BulletButtonConfig {
  color: 'blue' | 'darkred' | 'black';
  extensionName: string;
  command: string;
  title: string;
  iconClass: string;
}

const BULLET_BUTTONS: BulletButtonConfig[] = [
  {
    color: 'blue',
    extensionName: 'blueBullet',
    command: 'toggleBlueBullet',
    title: 'בולט כחול',
    iconClass: 'fill-blue-500 text-blue-500',
  },
  {
    color: 'darkred',
    extensionName: 'darkRedBullet',
    command: 'toggleDarkRedBullet',
    title: 'בולט אדום כהה',
    iconClass: 'fill-red-900 text-red-900',
  },
  {
    color: 'black',
    extensionName: 'blackBullet',
    command: 'toggleBlackBullet',
    title: 'בולט שחור',
    iconClass: 'fill-black text-black',
  },
];

export const ColoredBulletButtons: React.FC<ColoredBulletButtonsProps> = ({
  editor,
}) => {
  return (
    <>
      {BULLET_BUTTONS.map((config) => {
        const isActive = editor.isActive(config.extensionName);

        return (
          <Button
            key={config.color}
            type="button"
            variant={isActive ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() =>
              editor.chain().focus()[config.command as keyof typeof editor.commands]().run()
            }
            title={config.title}
            className="relative"
          >
            <Diamond className={`h-4 w-4 ${config.iconClass}`} />
          </Button>
        );
      })}
    </>
  );
};

// Individual button exports for flexibility
export const BlueBulletButton: React.FC<{ editor: Editor }> = ({ editor }) => {
  const isActive = editor.isActive('blueBullet');

  return (
    <Button
      type="button"
      variant={isActive ? 'secondary' : 'ghost'}
      size="sm"
      onClick={() => editor.chain().focus().toggleBlueBullet().run()}
      title="בולט כחול"
      className="relative"
    >
      <Diamond className="h-4 w-4 fill-blue-500 text-blue-500" />
    </Button>
  );
};

export const DarkRedBulletButton: React.FC<{ editor: Editor }> = ({ editor }) => {
  const isActive = editor.isActive('darkRedBullet');

  return (
    <Button
      type="button"
      variant={isActive ? 'secondary' : 'ghost'}
      size="sm"
      onClick={() => editor.chain().focus().toggleDarkRedBullet().run()}
      title="בולט אדום כהה"
      className="relative"
    >
      <Diamond className="h-4 w-4 fill-red-900 text-red-900" />
    </Button>
  );
};

export const BlackBulletButton: React.FC<{ editor: Editor }> = ({ editor }) => {
  const isActive = editor.isActive('blackBullet');

  return (
    <Button
      type="button"
      variant={isActive ? 'secondary' : 'ghost'}
      size="sm"
      onClick={() => editor.chain().focus().toggleBlackBullet().run()}
      title="בולט שחור"
      className="relative"
    >
      <Diamond className="h-4 w-4 fill-black text-black" />
    </Button>
  );
};
