(function () {
  'use strict';

  /**
   * Figma-like selection for injected SVG in #svg-container.
   * - First click selects the top-level element at point (closest to root under that path)
   * - Repeated clicks at the same point drill down to deeper child elements at that point
   * - Draws a selection rectangle around the currently selected element
   */

  /** @type {SVGSVGElement|null} */
  let rootSvg = null;
  /** @type {HTMLDivElement|null} */
  let overlayRoot = null;
  /** @type {HTMLDivElement|null} */
  let overlayRect = null;
  /** @type {Element|null} */
  let selectedElement = null;
  /** @type {string|null} */
  let selectedPath = null; // deterministic path like "0/2/1"

  /** State for drill-down behavior */
  let lastClickPoint = { x: 0, y: 0 };
  /** @type {Element[]} */
  let currentChain = [];
  let chainIndex = 0;

  const CLICK_TOLERANCE_PX = 4; // tolerance to consider clicks at the same spot

  function nearlySamePoint(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy <= CLICK_TOLERANCE_PX * CLICK_TOLERANCE_PX;
  }

  function isGraphicsElement(el) {
    // Limit to visible drawable SVG elements
    return (
      el instanceof SVGGraphicsElement &&
      el.tagName.toLowerCase() !== 'defs' &&
      el.tagName.toLowerCase() !== 'clipPath' &&
      el.tagName.toLowerCase() !== 'mask'
    );
  }

  function isWithinRootSvg(el) {
    return !!rootSvg && el instanceof Element && el.closest('svg') === rootSvg;
  }

  function ensureOverlay(svg) {
    if (overlayRoot && overlayRect) {
      return;
    }
    // Clean any previous overlay in case svg changed
    if (overlayRoot && overlayRoot.parentNode) {
      overlayRoot.parentNode.removeChild(overlayRoot);
    }

    // Create a body-level HTML overlay that covers the viewport
    overlayRoot = document.createElement('div');
    overlayRoot.setAttribute('id', 'mc-selection-overlay');
    overlayRoot.setAttribute('data-mc-overlay', '1');
    overlayRoot.style.position = 'fixed';
    overlayRoot.style.inset = '0';
    overlayRoot.style.pointerEvents = 'none';
    overlayRoot.style.zIndex = '9999';

    overlayRect = document.createElement('div');
    overlayRect.style.position = 'absolute';
    overlayRect.style.border = '1px dashed #3b82f6'; // Tailwind blue-500
    overlayRect.style.boxSizing = 'border-box';
    overlayRect.style.display = 'none';
    overlayRect.style.background = 'transparent';

    overlayRoot.appendChild(overlayRect);
    document.body.appendChild(overlayRoot);
  }

  function clearSelection() {
    selectedElement = null;
    selectedPath = null;
    if (overlayRect) overlayRect.style.display = 'none';
  }

  function computeAxisAlignedBBoxInRoot(element) {
    // Returns an axis-aligned bounding box (x, y, width, height) in rootSvg coordinates
    if (!rootSvg || !(element instanceof SVGGraphicsElement)) return null;
    let bbox;
    try {
      bbox = element.getBBox();
    } catch (e) {
      return null;
    }
    if (!bbox || !isFinite(bbox.width) || !isFinite(bbox.height)) return null;

    const rootScreenCTM = rootSvg.getScreenCTM();
    const elScreenCTM = element.getScreenCTM();
    if (!rootScreenCTM || !elScreenCTM) return null;

    // Transform from element local coords to root coords
    const toRoot = rootScreenCTM.inverse().multiply(elScreenCTM);

    const p = rootSvg.createSVGPoint();
    const corners = [
      { x: bbox.x, y: bbox.y },
      { x: bbox.x + bbox.width, y: bbox.y },
      { x: bbox.x, y: bbox.y + bbox.height },
      { x: bbox.x + bbox.width, y: bbox.y + bbox.height },
    ].map(c => {
      p.x = c.x;
      p.y = c.y;
      const t = p.matrixTransform(toRoot);
      return { x: t.x, y: t.y };
    });

    const xs = corners.map(c => c.x);
    const ys = corners.map(c => c.y);
    const minX = Math.min.apply(null, xs);
    const maxX = Math.max.apply(null, xs);
    const minY = Math.min.apply(null, ys);
    const maxY = Math.max.apply(null, ys);
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  function drawSelection(element) {
    if (!rootSvg || !overlayRect || !isGraphicsElement(element)) return;
    const rect = element.getBoundingClientRect();
    if (
      !rect ||
      !isFinite(rect.width) ||
      !isFinite(rect.height) ||
      rect.width <= 0 ||
      rect.height <= 0
    ) {
      overlayRect.style.display = 'none';
      return;
    }
    overlayRect.style.left = rect.left + 'px';
    overlayRect.style.top = rect.top + 'px';
    overlayRect.style.width = rect.width + 'px';
    overlayRect.style.height = rect.height + 'px';
    overlayRect.style.display = 'block';
  }

  function buildAncestorChainAtPoint(clientX, clientY) {
    if (!rootSvg) return [];

    const elements = document.elementsFromPoint(clientX, clientY);
    // Find the deepest leaf within this root svg (topmost in stacking order)
    const leaf = elements.find(
      el =>
        isWithinRootSvg(el) && isGraphicsElement(el) && !isOverlayElement(el)
    );
    if (!leaf) return [];

    // Build chain from leaf up to (but excluding) rootSvg
    /** @type {Element[]} */
    const chainReversed = [];
    let cur = leaf;
    while (cur && cur !== rootSvg) {
      if (isGraphicsElement(cur)) chainReversed.push(cur);
      cur = cur.parentElement;
    }
    // We want top-level first, then dive into children => reverse the list
    return chainReversed.reverse();
  }

  function computeDeterministicPathForElement(el) {
    if (!rootSvg || !el) return null;
    // Path is indexes from svg root element down via .children
    const path = [];
    let cur = el;
    while (cur && cur !== rootSvg) {
      const parent = cur.parentElement;
      if (!parent) break;
      const index = Array.from(parent.children).indexOf(cur);
      if (index < 0) break;
      path.push(index);
      cur = parent;
    }
    // include root level index under rootSvg's parent (#svg-container)
    if (rootSvg && cur === rootSvg) {
      const container = document.getElementById('svg-container');
      const idx = container
        ? Array.from(container.children).indexOf(rootSvg)
        : 0;
      path.push(idx >= 0 ? idx : 0);
    }
    return path.reverse().join('/');
  }

  function findElementByPath(path) {
    if (!rootSvg || !path) return null;
    const indexes = String(path)
      .split('/')
      .map(p => parseInt(p, 10));
    let node = rootSvg;
    // first index is root svg position; skip it because node is rootSvg
    for (let i = 1; i < indexes.length; i++) {
      const idx = indexes[i];
      if (!node || !node.children || idx < 0 || idx >= node.children.length)
        return null;
      node = node.children[idx];
    }
    return node instanceof Element ? node : null;
  }

  function isOverlayElement(el) {
    return (
      el instanceof Element &&
      (el.getAttribute('data-mc-overlay') === '1' ||
        el.closest('[data-mc-overlay="1"]'))
    );
  }

  function handleClick(evt) {
    if (!rootSvg) return;
    const point = { x: evt.clientX, y: evt.clientY };

    // If click is near the previous point, advance in the current chain.
    // Otherwise, build a new chain.
    if (!nearlySamePoint(point, lastClickPoint)) {
      currentChain = buildAncestorChainAtPoint(point.x, point.y);
      chainIndex = 0;
      lastClickPoint = point;
    } else {
      // Same spot: advance
      if (!currentChain || currentChain.length === 0) {
        currentChain = buildAncestorChainAtPoint(point.x, point.y);
        chainIndex = 0;
      } else {
        chainIndex = (chainIndex + 1) % currentChain.length;
      }
    }

    if (!currentChain || currentChain.length === 0) {
      clearSelection();
      return;
    }

    selectedElement = currentChain[chainIndex];
    selectedPath = computeDeterministicPathForElement(selectedElement);
    drawSelection(selectedElement);

    // notify parent window
    try {
      window.parent.postMessage(
        { type: 'svg-element-selected', path: selectedPath },
        '*'
      );
    } catch (_) {}
  }

  function handleResize() {
    if (selectedElement) {
      drawSelection(selectedElement);
    }
  }

  function setupSvg(svg) {
    rootSvg = svg;
    ensureOverlay(rootSvg);

    // Clean any prior listeners (in case of re-injection)
    rootSvg.removeEventListener('click', handleClick, true);
    window.removeEventListener('resize', handleResize);

    rootSvg.addEventListener('click', handleClick, true);
    window.addEventListener('resize', handleResize);
  }

  function discoverAndSetupSvg() {
    const container = document.getElementById('svg-container');
    if (!container) return;
    const svg = container.querySelector('svg');
    if (svg) setupSvg(svg);
  }

  // Observe for SVG content injection/replacement
  const observer = new MutationObserver(() => {
    const container = document.getElementById('svg-container');
    if (!container) return;
    const svg = container.querySelector('svg');
    if (svg && svg !== rootSvg) {
      setupSvg(svg);
    }
  });

  window.addEventListener('DOMContentLoaded', function () {
    const container = document.getElementById('svg-container');
    if (container) {
      observer.observe(container, { childList: true, subtree: true });
    }
    discoverAndSetupSvg();
  });

  // Listen to commands from parent for selection sync
  window.addEventListener('message', function (event) {
    const { type, data } = event.data || {};
    console.log('message', type, data);
    if (type === 'select-svg-path') {
      const path = data && data.path ? String(data.path) : null;
      if (!path) {
        clearSelection();
        return;
      }
      const el = findElementByPath(path);
      if (el && isWithinRootSvg(el) && isGraphicsElement(el)) {
        selectedElement = el;
        selectedPath = path;
        drawSelection(selectedElement);
      }
    }
  });
})();
