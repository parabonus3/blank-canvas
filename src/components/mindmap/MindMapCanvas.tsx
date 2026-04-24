import { useCallback, useRef, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  MiniMap,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  type Connection,
  type Node,
  type Edge,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import MindMapNodeComponent from './MindMapNode';
import MindMapEdgeComponent from './MindMapEdge';
import { MindMapToolbar } from './MindMapToolbar';
import { NODE_COLORS, type NodeShape } from './MindMapTemplates';
import { useIsMobile } from '@/hooks/use-mobile';
import jsPDF from 'jspdf';

const nodeTypes = { mindMapNode: MindMapNodeComponent };
const edgeTypes = { mindMapEdge: MindMapEdgeComponent };

type NodeType = 'root' | 'branch' | 'sub-branch' | 'leaf';

interface MindMapCanvasProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  onSave: (nodes: Node[], edges: Edge[], viewport: { x: number; y: number; zoom: number }) => void;
}

/** Walk edges upward to find depth of a node in the tree */
function getNodeDepth(nodeId: string, edges: Edge[]): number {
  let depth = 0;
  let current = nodeId;
  const visited = new Set<string>();
  while (true) {
    if (visited.has(current)) break;
    visited.add(current);
    const parentEdge = edges.find(e => e.target === current);
    if (!parentEdge) break;
    current = parentEdge.source;
    depth++;
  }
  return depth;
}

function nodeTypeFromDepth(depth: number): NodeType {
  if (depth === 0) return 'root';
  if (depth === 1) return 'branch';
  if (depth === 2) return 'sub-branch';
  return 'leaf';
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export function MindMapCanvas({ initialNodes, initialEdges, onSave }: MindMapCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { fitView, zoomIn, zoomOut, getViewport, setViewport } = useReactFlow();
  const isMobile = useIsMobile();
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current && initialNodes.length > 0) {
      setNodes(initialNodes);
      setEdges(initialEdges);
      initializedRef.current = true;
      setTimeout(() => fitView({ padding: 0.3 }), 100);
    }
  }, [initialNodes, initialEdges, setNodes, setEdges, fitView]);

  // Debounced auto-save
  useEffect(() => {
    if (!initializedRef.current) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      onSave(nodes, edges, getViewport());
    }, 2000);
    return () => clearTimeout(saveTimer.current);
  }, [nodes, edges, onSave, getViewport]);

  const onConnect = useCallback(
    (conn: Connection) => {
      const sourceNode = nodes.find(n => n.id === conn.source);
      const color = (sourceNode?.data as any)?.color || NODE_COLORS[0];
      setEdges(eds => addEdge({ ...conn, type: 'mindMapEdge', data: { color } }, eds));
    },
    [setEdges, nodes]
  );

  const onSelectionChange = useCallback(({ nodes: sel }: { nodes: Node[] }) => {
    setSelectedNodeId(sel.length === 1 ? sel[0].id : null);
  }, []);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedColor = (selectedNode?.data as any)?.color || null;
  const selectedShape: NodeShape | null = (selectedNode?.data as any)?.shape || null;

  // ── Add Child (creates a node one level deeper than selected) ──
  const handleAddChild = useCallback(() => {
    const parentId = selectedNodeId || nodes[0]?.id;
    const parent = nodes.find(n => n.id === parentId);
    const id = `node-${Date.now()}`;
    const color = selectedColor || NODE_COLORS[Math.floor(Math.random() * NODE_COLORS.length)];
    const shape: NodeShape = (parent?.data as any)?.shape || 'rounded';

    const parentDepth = parentId ? getNodeDepth(parentId, edges) : 0;
    const childDepth = parentDepth + 1;
    const childNodeType = nodeTypeFromDepth(childDepth);

    const xSpread = childDepth <= 1 ? 300 : childDepth === 2 ? 200 : 150;
    const yOffset = childDepth <= 1 ? 150 : 120;

    const newNode: Node = {
      id,
      type: 'mindMapNode',
      position: {
        x: (parent?.position.x || 0) + (Math.random() - 0.5) * xSpread,
        y: (parent?.position.y || 0) + yOffset + Math.random() * 40,
      },
      data: { label: 'Novo', color, nodeType: childNodeType, shape, notes: '' },
    };

    setNodes(nds => [...nds, newNode]);
    if (parentId) {
      setEdges(eds => [
        ...eds,
        { id: `edge-${Date.now()}`, source: parentId, target: id, type: 'mindMapEdge', data: { color } },
      ]);
    }
  }, [nodes, edges, selectedNodeId, selectedColor, setNodes, setEdges]);

  // ── Add Sibling (creates a node at the same level, sharing the same parent) ──
  const handleAddSibling = useCallback(() => {
    if (!selectedNodeId) return;

    const parentEdge = edges.find(e => e.target === selectedNodeId);
    if (!parentEdge) {
      // Selected is root — can't create sibling of root, create child instead
      handleAddChild();
      return;
    }

    const parentId = parentEdge.source;
    const parent = nodes.find(n => n.id === parentId);
    const sibling = nodes.find(n => n.id === selectedNodeId);
    const id = `node-${Date.now()}`;
    const color = (sibling?.data as any)?.color || NODE_COLORS[Math.floor(Math.random() * NODE_COLORS.length)];
    const shape: NodeShape = (sibling?.data as any)?.shape || 'rounded';

    const siblingDepth = getNodeDepth(selectedNodeId, edges);
    const siblingNodeType = nodeTypeFromDepth(siblingDepth);

    const xSpread = siblingDepth <= 1 ? 250 : 180;

    const newNode: Node = {
      id,
      type: 'mindMapNode',
      position: {
        x: (sibling?.position.x || 0) + xSpread * (Math.random() > 0.5 ? 1 : -1),
        y: (sibling?.position.y || 0) + (Math.random() - 0.5) * 80,
      },
      data: { label: 'Novo', color, nodeType: siblingNodeType, shape, notes: '' },
    };

    setNodes(nds => [...nds, newNode]);
    setEdges(eds => [
      ...eds,
      { id: `edge-${Date.now()}`, source: parentId, target: id, type: 'mindMapEdge', data: { color } },
    ]);
  }, [nodes, edges, selectedNodeId, handleAddChild, setNodes, setEdges]);

  // ── Keyboard shortcuts: Tab = child, Enter = sibling ──
  useEffect(() => {
    if (!selectedNodeId) return;

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (isInput) return;

      if (e.key === 'Tab') {
        e.preventDefault();
        handleAddChild();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleAddSibling();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedNodeId, handleAddChild, handleAddSibling]);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedNodeId) return;
    setNodes(nds => nds.filter(n => n.id !== selectedNodeId));
    setEdges(eds => eds.filter(e => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  }, [selectedNodeId, setNodes, setEdges]);

  const handleChangeColor = useCallback(
    (color: string) => {
      if (!selectedNodeId) return;
      setNodes(nds => nds.map(n => n.id === selectedNodeId ? { ...n, data: { ...n.data, color } } : n));
      setEdges(eds => eds.map(e => e.source === selectedNodeId ? { ...e, data: { ...e.data, color } } : e));
    },
    [selectedNodeId, setNodes, setEdges]
  );

  const handleChangeShape = useCallback(
    (shape: NodeShape) => {
      if (!selectedNodeId) return;
      setNodes(nds => nds.map(n => n.id === selectedNodeId ? { ...n, data: { ...n.data, shape } } : n));
    },
    [selectedNodeId, setNodes]
  );

  // ── Export: fitView → delay → html2canvas with onclone to fix SVG edges ──
  const captureFullMap = useCallback(async (): Promise<HTMLCanvasElement> => {
    const el = document.querySelector('.react-flow') as HTMLElement;
    if (!el) throw new Error('No .react-flow element');

    const savedVp = getViewport();

    fitView({ padding: 0.15 });
    await delay(800);

    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(el, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
      foreignObjectRendering: false,
      onclone: (clonedDoc: Document) => {
        // Force SVG edge paths to have explicit inline styles so html2canvas renders them
        const svgPaths = clonedDoc.querySelectorAll('.react-flow__edge path, .react-flow__edge line, .react-flow__edge polyline');
        svgPaths.forEach((pathEl) => {
          const computed = window.getComputedStyle(pathEl as Element);
          const stroke = computed.stroke || pathEl.getAttribute('stroke') || '#888';
          const strokeWidth = computed.strokeWidth || pathEl.getAttribute('stroke-width') || '2';
          (pathEl as SVGElement).style.stroke = stroke;
          (pathEl as SVGElement).style.strokeWidth = strokeWidth;
          (pathEl as SVGElement).style.visibility = 'visible';
          (pathEl as SVGElement).style.opacity = '1';
          // Also set as attribute for maximum compatibility
          pathEl.setAttribute('stroke', stroke);
          pathEl.setAttribute('stroke-width', strokeWidth);
          pathEl.setAttribute('visibility', 'visible');
        });

        // Make sure SVG containers are visible
        const svgs = clonedDoc.querySelectorAll('.react-flow__edges, .react-flow__edge');
        svgs.forEach((svgEl) => {
          (svgEl as HTMLElement).style.visibility = 'visible';
          (svgEl as HTMLElement).style.opacity = '1';
          (svgEl as HTMLElement).style.overflow = 'visible';
        });
      },
    });

    setViewport(savedVp);
    return canvas;
  }, [getViewport, setViewport, fitView]);

  const handleExportPng = useCallback(async () => {
    try {
      const canvas = await captureFullMap();
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = 'mindmap.png';
      a.click();
    } catch (err) {
      console.error('Export PNG failed:', err);
    }
  }, [captureFullMap]);

  const handleExportPdf = useCallback(async () => {
    try {
      const canvas = await captureFullMap();
      const imgData = canvas.toDataURL('image/png');
      const imgW = canvas.width / 2;
      const imgH = canvas.height / 2;
      const isLandscape = imgW > imgH;
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'px',
        format: [imgW + 40, imgH + 40],
      });
      pdf.addImage(imgData, 'PNG', 20, 20, imgW, imgH);
      pdf.save('mindmap.pdf');
    } catch (err) {
      console.error('Export PDF failed:', err);
    }
  }, [captureFullMap]);

  return (
    <div className="w-full h-full relative">
      <MindMapToolbar
        onAddChild={handleAddChild}
        onAddSibling={handleAddSibling}
        onDeleteSelected={handleDeleteSelected}
        onZoomIn={() => zoomIn()}
        onZoomOut={() => zoomOut()}
        onFitView={() => fitView({ padding: 0.3 })}
        onExportPng={handleExportPng}
        onExportPdf={handleExportPdf}
        selectedNodeColor={selectedColor}
        selectedNodeShape={selectedShape}
        onChangeColor={handleChangeColor}
        onChangeShape={handleChangeShape}
        hasSelection={!!selectedNodeId}
      />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        deleteKeyCode="Delete"
        multiSelectionKeyCode="Shift"
        panOnScroll={!isMobile}
        zoomOnPinch
        minZoom={0.2}
        maxZoom={3}
        className="bg-background"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="!bg-background" />
        {!isMobile && <MiniMap className="!bg-card !border-border" pannable zoomable />}
        {!isMobile && <Controls className="!bg-card !border-border !shadow-md [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground" />}
      </ReactFlow>
    </div>
  );
}
