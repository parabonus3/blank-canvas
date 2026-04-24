import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

type NodeShape = 'rounded' | 'square' | 'pill' | 'circle';
type NodeType = 'root' | 'branch' | 'sub-branch' | 'leaf';

interface MindMapNodeData {
  label: string;
  color: string;
  nodeType: NodeType;
  shape?: NodeShape;
  notes?: string;
  [key: string]: unknown;
}

const shapeStyles: Record<NodeShape, string> = {
  rounded: 'rounded-xl',
  square: 'rounded-none',
  pill: 'rounded-full',
  circle: 'rounded-full aspect-square',
};

const sizeStyles: Record<NodeType, string> = {
  root: 'min-w-[160px] px-6 py-4 text-base font-bold',
  branch: 'min-w-[120px] px-5 py-2.5 text-sm font-semibold',
  'sub-branch': 'min-w-[90px] px-3.5 py-2 text-xs font-medium',
  leaf: 'min-w-[70px] px-3 py-1.5 text-[11px] font-normal',
};

function MindMapNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as MindMapNodeData;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(nodeData.label);
  const inputRef = useRef<HTMLInputElement>(null);
  const shape: NodeShape = nodeData.shape || 'rounded';
  const nodeType: NodeType = nodeData.nodeType || 'leaf';

  useEffect(() => { setText(nodeData.label); }, [nodeData.label]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const onDoubleClick = useCallback(() => setEditing(true), []);

  const commit = useCallback(() => {
    setEditing(false);
    if (text.trim() && text !== nodeData.label) {
      nodeData.label = text.trim();
    } else {
      setText(nodeData.label);
    }
  }, [text, nodeData]);

  const borderWidth = selected ? '3px' : nodeType === 'root' ? '3px' : '2px';
  const shadowBase = nodeType === 'root'
    ? '0 6px 20px rgba(0,0,0,0.2)'
    : nodeType === 'branch'
      ? '0 4px 14px rgba(0,0,0,0.15)'
      : '0 2px 8px rgba(0,0,0,0.1)';

  const opacity = nodeType === 'sub-branch' ? 0.9 : nodeType === 'leaf' ? 0.85 : 1;

  return (
    <div
      className={`transition-shadow hover:shadow-lg ${shapeStyles[shape]} ${sizeStyles[nodeType]} text-center cursor-grab flex items-center justify-center`}
      style={{
        background: nodeData.color,
        color: '#fff',
        opacity,
        border: `${borderWidth} solid ${selected ? '#fff' : nodeType === 'root' ? 'rgba(255,255,255,0.3)' : 'transparent'}`,
        boxShadow: selected ? `0 0 0 2px ${nodeData.color}, ${shadowBase}` : shadowBase,
      }}
      onDoubleClick={onDoubleClick}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-white/60 !border-none" />

      {editing ? (
        <input
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setText(nodeData.label); setEditing(false); } }}
          className="bg-transparent text-white text-center outline-none w-full placeholder:text-white/50"
          style={{ fontSize: 'inherit', fontWeight: 'inherit' }}
        />
      ) : (
        <span className="select-none whitespace-nowrap">{nodeData.label}</span>
      )}

      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-white/60 !border-none" />
    </div>
  );
}

export default memo(MindMapNodeComponent);
