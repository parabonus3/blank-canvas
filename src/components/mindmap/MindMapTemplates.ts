import type { Node, Edge } from '@xyflow/react';

export type NodeShape = 'rounded' | 'square' | 'pill' | 'circle';

export interface MindMapTemplate {
  id: string;
  nameKey: string;
  descKey: string;
  icon: string;
  nodes: Node[];
  edges: Edge[];
}

const COLORS = {
  blue: 'hsl(199 89% 48%)',
  orange: 'hsl(25 95% 53%)',
  green: 'hsl(142 76% 36%)',
  purple: 'hsl(262 83% 58%)',
  pink: 'hsl(330 81% 60%)',
  cyan: 'hsl(192 91% 36%)',
  red: 'hsl(0 84% 60%)',
  yellow: 'hsl(38 92% 50%)',
  navy: 'hsl(220 70% 35%)',
  teal: 'hsl(174 72% 40%)',
  slate: 'hsl(215 20% 50%)',
  emerald: 'hsl(160 84% 39%)',
  lime: 'hsl(84 81% 44%)',
  amber: 'hsl(45 93% 47%)',
  rose: 'hsl(350 89% 60%)',
  indigo: 'hsl(239 84% 67%)',
};

export const NODE_COLORS = [
  COLORS.blue, COLORS.orange, COLORS.green, COLORS.purple,
  COLORS.pink, COLORS.cyan, COLORS.red, COLORS.yellow,
];

export const PASTEL_COLORS = [
  'hsl(199 89% 85%)', 'hsl(25 95% 85%)', 'hsl(142 76% 80%)', 'hsl(262 83% 85%)',
  'hsl(330 81% 85%)', 'hsl(192 91% 80%)', 'hsl(0 84% 85%)', 'hsl(38 92% 80%)',
];

export const SHAPES: NodeShape[] = ['rounded', 'square', 'pill', 'circle'];

function makeNode(id: string, label: string, x: number, y: number, color: string, type: 'root' | 'branch' | 'sub-branch' | 'leaf' = 'branch', shape: NodeShape = 'rounded'): Node {
  return {
    id,
    type: 'mindMapNode',
    position: { x, y },
    data: { label, color, nodeType: type, shape, notes: '' },
  };
}

function makeEdge(id: string, source: string, target: string, color: string): Edge {
  return { id, source, target, type: 'mindMapEdge', data: { color } };
}

export const templates: MindMapTemplate[] = [
  // Blank
  {
    id: 'blank',
    nameKey: 'mindmaps.templates.blank',
    descKey: 'mindmaps.templates.blank_desc',
    icon: '⬜',
    nodes: [makeNode('root', 'Ideia Central', 0, 0, COLORS.blue, 'root', 'rounded')],
    edges: [],
  },
  // Classic — radial rounded
  {
    id: 'classic',
    nameKey: 'mindmaps.templates.classic',
    descKey: 'mindmaps.templates.classic_desc',
    icon: '🧠',
    nodes: [
      makeNode('root', 'Tema Principal', 0, 0, COLORS.blue, 'root', 'pill'),
      makeNode('b1', 'Tópico 1', -300, -150, COLORS.orange, 'branch', 'rounded'),
      makeNode('b2', 'Tópico 2', 300, -150, COLORS.green, 'branch', 'rounded'),
      makeNode('b3', 'Tópico 3', -300, 150, COLORS.purple, 'branch', 'rounded'),
      makeNode('b4', 'Tópico 4', 300, 150, COLORS.pink, 'branch', 'rounded'),
    ],
    edges: [
      makeEdge('e1', 'root', 'b1', COLORS.orange),
      makeEdge('e2', 'root', 'b2', COLORS.green),
      makeEdge('e3', 'root', 'b3', COLORS.purple),
      makeEdge('e4', 'root', 'b4', COLORS.pink),
    ],
  },
  // Project — square corporate
  {
    id: 'project',
    nameKey: 'mindmaps.templates.project',
    descKey: 'mindmaps.templates.project_desc',
    icon: '📋',
    nodes: [
      makeNode('root', 'Projeto', 0, 0, COLORS.navy, 'root', 'square'),
      makeNode('b1', 'Tarefas', -350, -120, COLORS.blue, 'branch', 'square'),
      makeNode('b2', 'Prazos', 350, -120, COLORS.red, 'branch', 'square'),
      makeNode('b3', 'Recursos', -350, 120, COLORS.teal, 'branch', 'square'),
      makeNode('b4', 'Riscos', 350, 120, COLORS.amber, 'branch', 'square'),
      makeNode('l1', 'Tarefa 1', -550, -180, COLORS.blue, 'leaf', 'square'),
      makeNode('l2', 'Tarefa 2', -550, -60, COLORS.blue, 'leaf', 'square'),
      makeNode('l3', 'Marco 1', 550, -180, COLORS.red, 'leaf', 'square'),
      makeNode('l4', 'Marco 2', 550, -60, COLORS.red, 'leaf', 'square'),
    ],
    edges: [
      makeEdge('e1', 'root', 'b1', COLORS.blue),
      makeEdge('e2', 'root', 'b2', COLORS.red),
      makeEdge('e3', 'root', 'b3', COLORS.teal),
      makeEdge('e4', 'root', 'b4', COLORS.amber),
      makeEdge('e5', 'b1', 'l1', COLORS.blue),
      makeEdge('e6', 'b1', 'l2', COLORS.blue),
      makeEdge('e7', 'b2', 'l3', COLORS.red),
      makeEdge('e8', 'b2', 'l4', COLORS.red),
    ],
  },
  // Study — pill pastel
  {
    id: 'study',
    nameKey: 'mindmaps.templates.study',
    descKey: 'mindmaps.templates.study_desc',
    icon: '📚',
    nodes: [
      makeNode('root', 'Tema de Estudo', 0, 0, COLORS.cyan, 'root', 'pill'),
      makeNode('b1', 'Conceito A', -300, -180, COLORS.blue, 'branch', 'pill'),
      makeNode('b2', 'Conceito B', 300, -180, COLORS.emerald, 'branch', 'pill'),
      makeNode('b3', 'Conceito C', -300, 180, COLORS.purple, 'branch', 'pill'),
      makeNode('l1', 'Detalhe 1', -500, -240, COLORS.blue, 'leaf', 'pill'),
      makeNode('l2', 'Detalhe 2', -500, -120, COLORS.blue, 'leaf', 'pill'),
      makeNode('l3', 'Detalhe 3', 500, -240, COLORS.emerald, 'leaf', 'pill'),
      makeNode('l4', 'Detalhe 4', 500, -120, COLORS.emerald, 'leaf', 'pill'),
    ],
    edges: [
      makeEdge('e1', 'root', 'b1', COLORS.blue),
      makeEdge('e2', 'root', 'b2', COLORS.emerald),
      makeEdge('e3', 'root', 'b3', COLORS.purple),
      makeEdge('e4', 'b1', 'l1', COLORS.blue),
      makeEdge('e5', 'b1', 'l2', COLORS.blue),
      makeEdge('e6', 'b2', 'l3', COLORS.emerald),
      makeEdge('e7', 'b2', 'l4', COLORS.emerald),
    ],
  },
  // Brainstorm — circle neon
  {
    id: 'brainstorm',
    nameKey: 'mindmaps.templates.brainstorm',
    descKey: 'mindmaps.templates.brainstorm_desc',
    icon: '💡',
    nodes: [
      makeNode('root', 'Brainstorm', 0, 0, COLORS.yellow, 'root', 'circle'),
      makeNode('b1', 'Ideia 1', 0, -220, COLORS.indigo, 'branch', 'circle'),
      makeNode('b2', 'Ideia 2', 190, -110, COLORS.rose, 'branch', 'circle'),
      makeNode('b3', 'Ideia 3', 190, 110, COLORS.lime, 'branch', 'circle'),
      makeNode('b4', 'Ideia 4', 0, 220, COLORS.purple, 'branch', 'circle'),
      makeNode('b5', 'Ideia 5', -190, 110, COLORS.pink, 'branch', 'circle'),
      makeNode('b6', 'Ideia 6', -190, -110, COLORS.cyan, 'branch', 'circle'),
    ],
    edges: [
      makeEdge('e1', 'root', 'b1', COLORS.indigo),
      makeEdge('e2', 'root', 'b2', COLORS.rose),
      makeEdge('e3', 'root', 'b3', COLORS.lime),
      makeEdge('e4', 'root', 'b4', COLORS.purple),
      makeEdge('e5', 'root', 'b5', COLORS.pink),
      makeEdge('e6', 'root', 'b6', COLORS.cyan),
    ],
  },
  // Kanban — square columns
  {
    id: 'kanban',
    nameKey: 'mindmaps.templates.kanban',
    descKey: 'mindmaps.templates.kanban_desc',
    icon: '📊',
    nodes: [
      makeNode('root', 'Fluxo', 0, 0, COLORS.slate, 'root', 'square'),
      makeNode('b1', 'A Fazer', -350, 0, COLORS.orange, 'branch', 'square'),
      makeNode('b2', 'Fazendo', 0, 180, COLORS.cyan, 'branch', 'square'),
      makeNode('b3', 'Feito', 350, 0, COLORS.green, 'branch', 'square'),
      makeNode('l1', 'Item 1', -550, -60, COLORS.orange, 'leaf', 'square'),
      makeNode('l2', 'Item 2', -550, 60, COLORS.orange, 'leaf', 'square'),
      makeNode('l3', 'Item 3', -150, 240, COLORS.cyan, 'leaf', 'square'),
      makeNode('l4', 'Item 4', 150, 240, COLORS.cyan, 'leaf', 'square'),
      makeNode('l5', 'Item 5', 550, -60, COLORS.green, 'leaf', 'square'),
      makeNode('l6', 'Item 6', 550, 60, COLORS.green, 'leaf', 'square'),
    ],
    edges: [
      makeEdge('e1', 'root', 'b1', COLORS.orange),
      makeEdge('e2', 'root', 'b2', COLORS.cyan),
      makeEdge('e3', 'root', 'b3', COLORS.green),
      makeEdge('e4', 'b1', 'l1', COLORS.orange),
      makeEdge('e5', 'b1', 'l2', COLORS.orange),
      makeEdge('e6', 'b2', 'l3', COLORS.cyan),
      makeEdge('e7', 'b2', 'l4', COLORS.cyan),
      makeEdge('e8', 'b3', 'l5', COLORS.green),
      makeEdge('e9', 'b3', 'l6', COLORS.green),
    ],
  },
  // Organogram — top-down hierarchy
  {
    id: 'organogram',
    nameKey: 'mindmaps.templates.organogram',
    descKey: 'mindmaps.templates.organogram_desc',
    icon: '🏢',
    nodes: [
      makeNode('root', 'Diretor', 0, 0, COLORS.navy, 'root', 'square'),
      makeNode('b1', 'Gerente A', -250, 150, COLORS.blue, 'branch', 'square'),
      makeNode('b2', 'Gerente B', 250, 150, COLORS.teal, 'branch', 'square'),
      makeNode('s1', 'Coord. 1', -380, 300, COLORS.blue, 'sub-branch', 'square'),
      makeNode('s2', 'Coord. 2', -120, 300, COLORS.blue, 'sub-branch', 'square'),
      makeNode('s3', 'Coord. 3', 120, 300, COLORS.teal, 'sub-branch', 'square'),
      makeNode('s4', 'Coord. 4', 380, 300, COLORS.teal, 'sub-branch', 'square'),
      makeNode('l1', 'Membro', -380, 430, COLORS.slate, 'leaf', 'square'),
      makeNode('l2', 'Membro', -120, 430, COLORS.slate, 'leaf', 'square'),
      makeNode('l3', 'Membro', 120, 430, COLORS.slate, 'leaf', 'square'),
      makeNode('l4', 'Membro', 380, 430, COLORS.slate, 'leaf', 'square'),
    ],
    edges: [
      makeEdge('e1', 'root', 'b1', COLORS.blue),
      makeEdge('e2', 'root', 'b2', COLORS.teal),
      makeEdge('e3', 'b1', 's1', COLORS.blue),
      makeEdge('e4', 'b1', 's2', COLORS.blue),
      makeEdge('e5', 'b2', 's3', COLORS.teal),
      makeEdge('e6', 'b2', 's4', COLORS.teal),
      makeEdge('e7', 's1', 'l1', COLORS.slate),
      makeEdge('e8', 's2', 'l2', COLORS.slate),
      makeEdge('e9', 's3', 'l3', COLORS.slate),
      makeEdge('e10', 's4', 'l4', COLORS.slate),
    ],
  },
  // SMART Goals
  {
    id: 'smart',
    nameKey: 'mindmaps.templates.smart',
    descKey: 'mindmaps.templates.smart_desc',
    icon: '🎯',
    nodes: [
      makeNode('root', 'Meta SMART', 0, 0, COLORS.purple, 'root', 'pill'),
      makeNode('b1', 'Específica', -320, -180, COLORS.blue, 'branch', 'rounded'),
      makeNode('b2', 'Mensurável', 320, -180, COLORS.green, 'branch', 'rounded'),
      makeNode('b3', 'Atingível', -320, 180, COLORS.orange, 'branch', 'rounded'),
      makeNode('b4', 'Relevante', 320, 180, COLORS.pink, 'branch', 'rounded'),
      makeNode('b5', 'Temporal', 0, 280, COLORS.cyan, 'branch', 'rounded'),
      makeNode('l1', 'O quê?', -500, -240, COLORS.blue, 'leaf', 'rounded'),
      makeNode('l2', 'Como medir?', 500, -240, COLORS.green, 'leaf', 'rounded'),
      makeNode('l3', 'É possível?', -500, 240, COLORS.orange, 'leaf', 'rounded'),
      makeNode('l4', 'Por quê?', 500, 240, COLORS.pink, 'leaf', 'rounded'),
      makeNode('l5', 'Quando?', 0, 400, COLORS.cyan, 'leaf', 'rounded'),
    ],
    edges: [
      makeEdge('e1', 'root', 'b1', COLORS.blue),
      makeEdge('e2', 'root', 'b2', COLORS.green),
      makeEdge('e3', 'root', 'b3', COLORS.orange),
      makeEdge('e4', 'root', 'b4', COLORS.pink),
      makeEdge('e5', 'root', 'b5', COLORS.cyan),
      makeEdge('e6', 'b1', 'l1', COLORS.blue),
      makeEdge('e7', 'b2', 'l2', COLORS.green),
      makeEdge('e8', 'b3', 'l3', COLORS.orange),
      makeEdge('e9', 'b4', 'l4', COLORS.pink),
      makeEdge('e10', 'b5', 'l5', COLORS.cyan),
    ],
  },
  // List — vertical cascade
  {
    id: 'list',
    nameKey: 'mindmaps.templates.list',
    descKey: 'mindmaps.templates.list_desc',
    icon: '📝',
    nodes: [
      makeNode('root', 'Lista', 0, 0, COLORS.indigo, 'root', 'rounded'),
      makeNode('b1', 'Item 1', 0, 130, COLORS.blue, 'branch', 'rounded'),
      makeNode('b2', 'Item 2', 0, 260, COLORS.emerald, 'branch', 'rounded'),
      makeNode('b3', 'Item 3', 0, 390, COLORS.orange, 'branch', 'rounded'),
      makeNode('b4', 'Item 4', 0, 520, COLORS.purple, 'branch', 'rounded'),
      makeNode('l1', 'Detalhe', 220, 130, COLORS.blue, 'leaf', 'rounded'),
      makeNode('l2', 'Detalhe', 220, 260, COLORS.emerald, 'leaf', 'rounded'),
      makeNode('l3', 'Detalhe', 220, 390, COLORS.orange, 'leaf', 'rounded'),
      makeNode('l4', 'Detalhe', 220, 520, COLORS.purple, 'leaf', 'rounded'),
    ],
    edges: [
      makeEdge('e1', 'root', 'b1', COLORS.blue),
      makeEdge('e2', 'b1', 'b2', COLORS.emerald),
      makeEdge('e3', 'b2', 'b3', COLORS.orange),
      makeEdge('e4', 'b3', 'b4', COLORS.purple),
      makeEdge('e5', 'b1', 'l1', COLORS.blue),
      makeEdge('e6', 'b2', 'l2', COLORS.emerald),
      makeEdge('e7', 'b3', 'l3', COLORS.orange),
      makeEdge('e8', 'b4', 'l4', COLORS.purple),
    ],
  },
];

export function getTemplate(id: string): MindMapTemplate {
  return templates.find(t => t.id === id) || templates[0];
}
