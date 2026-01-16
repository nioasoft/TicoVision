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

/**
 * Apply bullet with auto-split for multi-line text.
 * If selected text contains newlines, splits into separate bullets per line.
 * If no newlines, applies bullet normally.
 */
const applyBulletWithSplit = (
  editor: Editor,
  command: string,
  extensionName: string
) => {
  const { state } = editor;
  const { from, to } = state.selection;

  // Get selected text (using newline as block separator)
  const selectedText = state.doc.textBetween(from, to, '\n');

  // If already active, just toggle off
  if (editor.isActive(extensionName)) {
    editor.chain().focus()[command as keyof typeof editor.commands]().run();
    return;
  }

  // Check if text contains newlines
  if (selectedText.includes('\n')) {
    const lines = selectedText.split('\n').filter((line) => line.trim());

    if (lines.length > 1) {
      // Delete the selected content first
      editor.chain().focus().deleteSelection().run();

      // Insert each line as a separate bullet
      lines.forEach((line, index) => {
        if (index > 0) {
          // Add a new paragraph before inserting the next bullet
          editor.chain().focus().splitBlock().run();
        }
        // Insert the line content and convert to bullet
        editor
          .chain()
          .focus()
          .insertContent(line.trim())
          [command as keyof typeof editor.commands]()
          .run();
      });
      return;
    }
  }

  // No newlines or single line - apply bullet normally
  editor.chain().focus()[command as keyof typeof editor.commands]().run();
};

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
              applyBulletWithSplit(editor, config.command, config.extensionName)
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
      onClick={() =>
        applyBulletWithSplit(editor, 'toggleBlueBullet', 'blueBullet')
      }
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
      onClick={() =>
        applyBulletWithSplit(editor, 'toggleDarkRedBullet', 'darkRedBullet')
      }
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
      onClick={() =>
        applyBulletWithSplit(editor, 'toggleBlackBullet', 'blackBullet')
      }
      title="בולט שחור"
      className="relative"
    >
      <Diamond className="h-4 w-4 fill-black text-black" />
    </Button>
  );
};
