import { useMemo } from 'react';
import { useAnimationStore } from '@/stores/animationStore';
import {
  File,
  Folder,
  Tree,
  type TreeViewElement,
} from '@/components/ui/file-tree';

function parseSvgToTree(svgContent: string): TreeViewElement[] {
  if (!svgContent) return [];
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svgEl = doc.documentElement; // <svg>

    const walk = (node: Element, path: string): TreeViewElement => {
      const nameParts: string[] = [node.tagName.toLowerCase()];
      const idAttr = node.getAttribute('id');
      if (idAttr) nameParts.push(`#${idAttr}`);
      const classAttr = node.getAttribute('class');
      if (classAttr) nameParts.push(`.${classAttr.split(/\s+/).join('.')}`);
      const name = nameParts.join('');

      const elementChildren = Array.from(node.children) as Element[];
      const children: TreeViewElement[] = elementChildren.map((child, index) =>
        walk(child, path ? `${path}/${index}` : `${index}`)
      );

      return {
        id: path,
        name,
        isSelectable: true,
        children: children.length ? children : undefined,
      };
    };

    const root = walk(svgEl, '0');
    return [root];
  } catch (_e) {
    return [];
  }
}

export function SvgInspector() {
  const { svgContent, selectedSvgPath, setSelectedSvgPath } =
    useAnimationStore();

  const elements = useMemo(() => parseSvgToTree(svgContent), [svgContent]);

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
            element={root.name}
            isSelect={root.id === selectedSvgPath}
          >
            {root.children?.map(child => (
              <TreeNode
                key={child.id}
                node={child}
                selectedPath={selectedSvgPath}
                onSelect={setSelectedSvgPath}
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
}: {
  node: TreeViewElement;
  selectedPath: string | null;
  onSelect: (path: string | null) => void;
}) {
  if (node.children && node.children.length) {
    return (
      <Folder
        value={node.id}
        element={node.name}
        isSelect={node.id === selectedPath}
      >
        {node.children.map(child => (
          <TreeNode
            key={child.id}
            node={child}
            selectedPath={selectedPath}
            onSelect={onSelect}
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
    >
      <p>{node.name}</p>
    </File>
  );
}

export default SvgInspector;
