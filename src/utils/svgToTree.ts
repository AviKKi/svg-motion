import type { TreeViewElement } from '@/components/ui/file-tree';

/**
 * Parse SVG content to a tree of elements
 * @param svgContent - The SVG content to parse
 * @returns A tree of elements
 */
export function parseSvgToTree(svgContent: string): TreeViewElement[] {
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
