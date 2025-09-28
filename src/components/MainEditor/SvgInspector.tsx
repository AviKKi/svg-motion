import { useMemo, useState, useEffect } from 'react';
import { useAnimationStore } from '@/stores/animationStore';
import {
  File,
  Folder,
  Tree,
  type TreeViewElement,
} from '@/components/ui/file-tree';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Edit2, SaveIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { parseSvgToTree } from '@/utils/svgToTree';

export function SvgInspector() {
  const {
    svgContent,
    selectedSvgPath,
    setSelectedSvgPath,
    namedNodes,
    setNodeName,
  } = useAnimationStore();
  const [nameDraft, setNameDraft] = useState('');

  const elements = useMemo(() => parseSvgToTree(svgContent), [svgContent]);
  console.log('namedNodes', namedNodes);
  useEffect(() => {
    if (selectedSvgPath) {
      setNameDraft(namedNodes[selectedSvgPath] ?? '');
    }
  }, [selectedSvgPath, namedNodes]);

  if (!svgContent) {
    return (
      <div className="h-full w-full flex items-center justify-center text-muted-foreground">
        No SVG loaded
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <Tree
        key={selectedSvgPath ?? 'root'}
        className="h-full w-full"
        elements={elements}
        initialSelectedId={selectedSvgPath ?? undefined}
        initialExpandedItems={selectedSvgPath ? [selectedSvgPath] : ['0']}
        onSelectItem={(id: string) => setSelectedSvgPath(id)}
      >
        {elements.map(root => (
          <Folder
            key={root.id}
            value={root.id}
            element={namedNodes[root.id] ?? root.name}
            isSelect={root.id === selectedSvgPath}
            rightSlot={
              root.id === selectedSvgPath ? (
                <NamingActions
                  nameDraft={nameDraft}
                  setNameDraft={setNameDraft}
                  onSave={() =>
                    selectedSvgPath &&
                    setNodeName(selectedSvgPath, nameDraft.trim())
                  }
                />
              ) : null
            }
          >
            {root.children?.map(child => (
              <TreeNode
                key={child.id}
                node={child}
                selectedPath={selectedSvgPath}
                onSelect={setSelectedSvgPath}
                nameDraft={nameDraft}
                setNameDraft={setNameDraft}
                onSave={() =>
                  selectedSvgPath &&
                  setNodeName(selectedSvgPath, nameDraft.trim())
                }
                namedNodes={namedNodes}
              />
            ))}
          </Folder>
        ))}
      </Tree>
    </div>
  );
}

function TreeNode({
  node,
  selectedPath,
  onSelect,
  nameDraft,
  setNameDraft,
  onSave,
  namedNodes,
}: {
  node: TreeViewElement;
  selectedPath: string | null;
  onSelect: (path: string | null) => void;
  nameDraft: string;
  setNameDraft: (v: string) => void;
  onSave: () => void;
  namedNodes: Record<string, string>;
}) {
  if (node.children && node.children.length) {
    return (
      <Folder
        value={node.id}
        element={namedNodes[node.id] ?? node.name}
        isSelect={node.id === selectedPath}
        rightSlot={
          node.id === selectedPath ? (
            <NamingActions
              nameDraft={nameDraft}
              setNameDraft={setNameDraft}
              onSave={onSave}
            />
          ) : null
        }
      >
        {node.children.map(child => (
          <TreeNode
            key={child.id}
            node={child}
            selectedPath={selectedPath}
            onSelect={onSelect}
            nameDraft={nameDraft}
            setNameDraft={setNameDraft}
            onSave={onSave}
            namedNodes={namedNodes}
          />
        ))}
      </Folder>
    );
  }
  return (
    <File
      value={node.id}
      isSelect={node.id === selectedPath}
      onClick={() => onSelect(node.id)}
      rightSlot={
        node.id === selectedPath ? (
          <NamingActions
            nameDraft={nameDraft}
            setNameDraft={setNameDraft}
            onSave={onSave}
          />
        ) : null
      }
    >
      <div className="flex items-center gap-2">
        <p className="truncate">{namedNodes[node.id] ?? node.name}</p>
      </div>
    </File>
  );
}

function NamingActions({
  nameDraft,
  setNameDraft,
  onSave,
}: {
  nameDraft: string;
  setNameDraft: (v: string) => void;
  onSave: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-1 absolute top-1 -right-6">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Tooltip>
            <TooltipContent>Give this a name for AI to animate.</TooltipContent>
            <TooltipTrigger>
              <div
                className="cursor-pointer text-black border-[1px] border-black rounded-md p-1"
                onClick={e => {
                  e.stopPropagation();
                  setOpen(true);
                }}
              >
                <Edit2 className="size-3 " />
              </div>
            </TooltipTrigger>
          </Tooltip>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Name</DialogTitle>
            <DialogDescription>
              Give this node a friendly name for AI to animate.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Input
              value={nameDraft}
              placeholder="Enter name"
              onChange={e => setNameDraft(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              size="sm"
              onClick={() => {
                onSave();
                setOpen(false);
              }}
            >
              <SaveIcon className="mr-1 size-3" /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SvgInspector;
