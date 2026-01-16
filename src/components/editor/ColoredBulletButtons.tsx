import React from 'react';
import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Diamond } from 'lucide-react';
import { NodeType } from '@tiptap/pm/model';

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
 * Apply bullet to all selected blocks.
 * Converts each paragraph/block in the selection to a colored bullet.
 */
const applyBulletToSelection = (
  editor: Editor,
  extensionName: string
) => {
  const { state } = editor;
  const { from, to } = state.selection;
  const bulletType = state.schema.nodes[extensionName];
  const paragraphType = state.schema.nodes.paragraph;

  if (!bulletType) {
    console.error(`Node type ${extensionName} not found`);
    return;
  }

  // Check if ALL selected blocks are already this bullet type
  let allAreBullets = true;
  state.doc.nodesBetween(from, to, (node) => {
    if (node.isBlock && node.type.name !== extensionName && node.isTextblock) {
      allAreBullets = false;
    }
  });

  // If all are already bullets of this type, convert back to paragraphs
  if (allAreBullets && editor.isActive(extensionName)) {
    convertBlocksInSelection(editor, from, to, paragraphType);
    return;
  }

  // Convert all text blocks to bullets
  convertBlocksInSelection(editor, from, to, bulletType);
};

/**
 * Convert all text blocks in selection to a specific node type
 */
const convertBlocksInSelection = (
  editor: Editor,
  from: number,
  to: number,
  targetType: NodeType
) => {
  const { state, view } = editor;
  let tr = state.tr;

  // Collect all block positions that need to be converted
  const blocksToConvert: { pos: number; node: typeof state.doc.firstChild }[] = [];

  state.doc.nodesBetween(from, to, (node, pos) => {
    // Only convert text-containing blocks (paragraphs, other bullets, etc.)
    if (node.isTextblock && node.type !== targetType) {
      blocksToConvert.push({ pos, node });
    }
  });

  // Convert blocks in reverse order to maintain position accuracy
  blocksToConvert.reverse().forEach(({ pos, node }) => {
    if (node) {
      const newNode = targetType.create(null, node.content, node.marks);
      tr = tr.replaceWith(pos, pos + node.nodeSize, newNode);
    }
  });

  if (tr.docChanged) {
    view.dispatch(tr);
  }
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
              applyBulletToSelection(editor, config.extensionName)
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
      onClick={() => applyBulletToSelection(editor, 'blueBullet')}
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
      onClick={() => applyBulletToSelection(editor, 'darkRedBullet')}
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
      onClick={() => applyBulletToSelection(editor, 'blackBullet')}
      title="בולט שחור"
      className="relative"
    >
      <Diamond className="h-4 w-4 fill-black text-black" />
    </Button>
  );
};
