import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Panel,
  MiniMap,
  ReactFlowProvider
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, Image as ImageIcon, Type, Trash2, StickyNote, CheckSquare } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import AdvancedMindMapNode from './AdvancedMindMapNode';
import useStore from '../../../store/useStore';

const initialNodes = [
  {
    id: 'root',
    type: 'advanced',
    position: { x: 400, y: 300 },
    data: { 
      label: 'Main Concept',
      desc: 'Base node for the mind map',
      priority: 'high',
      assignee: 'Project Lead',
      subtasks: []
    }
  },
];

const initialEdges = [];

function MindMapContent({ projectId }) {
  const nodeTypes = useMemo(() => ({ advanced: AdvancedMindMapNode }), []);
  
  const { setProjectNodes } = useStore();
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  // Sync nodes with global store for chat mentions
  useEffect(() => {
    const mentionNodes = nodes.map(n => ({
      id: n.id,
      label: n.data.label || 'Unnamed Node',
      type: 'mindmap'
    }));
    setProjectNodes(mentionNodes);
  }, [nodes, setProjectNodes]);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ 
      ...params, 
      animated: true, 
      style: { stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '5,5' } 
    }, eds)),
    []
  );

  const onNodeDataChange = useCallback((nodeId, newData) => {
    setNodes((nds) => nds.map(node => {
      if (node.id === nodeId) {
        return { ...node, data: newData };
      }
      return node;
    }));
  }, []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      if (!reactFlowInstance) return;

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: uuidv4(),
        type: 'advanced',
        position,
        data: { 
          label: type === 'sticky' ? '💡 New Note' : 'New Idea',
          desc: '',
          priority: 'medium',
          assignee: '',
          subtasks: [],
          onChange: (data) => onNodeDataChange(newNode.id, data)
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, onNodeDataChange]
  );

  // Re-inject onChange when nodes are created or initial nodes loaded
  useMemo(() => {
    nodes.forEach(node => {
        if(!node.data.onChange) {
            node.data.onChange = (data) => onNodeDataChange(node.id, data);
        }
    });
  }, [nodes, onNodeDataChange]);

  return (
    <div className="flex w-full h-full bg-dark-950 overflow-hidden rounded-2xl border border-dark-800">
      {/* Sidebar Panel for Drag-and-Drop */}
      <div className="w-64 bg-dark-900 border-r border-dark-800 p-4 flex flex-col gap-4 overflow-y-auto z-10 blur-backdrop">
        <div>
          <h3 className="text-white font-bold text-sm mb-1">Node Toolkit</h3>
          <p className="text-[10px] text-slate-500 mb-4 uppercase tracking-widest font-bold">Drag components onto canvas</p>
        </div>

        <div className="space-y-2">
          <DraggableItem type="concept" label="Idea Card" icon={<Type size={16} />} color="bg-primary-500" />
          <DraggableItem type="task" label="Task Node" icon={<CheckSquare size={16} />} color="bg-emerald-500" />
          <DraggableItem type="sticky" label="Sticky Note" icon={<StickyNote size={16} />} color="bg-amber-500" />
          <DraggableItem type="image" label="Image Asset" icon={<ImageIcon size={16} />} color="bg-violet-500" />
        </div>

        <div className="mt-auto pt-4 border-t border-dark-800">
          <h4 className="text-xs text-slate-400 font-medium mb-2 uppercase tracking-tighter">Instructions</h4>
          <ul className="text-[10px] text-slate-500 space-y-2 list-disc pl-3">
             <li>Drag handles to connect ideas</li>
             <li>Click nodes to edit details</li>
             <li>Press Delete to remove node</li>
             <li>Use mouse wheel to zoom</li>
          </ul>
        </div>
      </div>

      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          className="bg-dark-950"
        >
          <Background color="#1e293b" gap={20} size={1} />
          <Controls className="bg-dark-800 border-dark-700 fill-slate-300 shadow-2xl" />
          <MiniMap 
            nodeColor={(n) => n.data.priority === 'high' ? '#ef4444' : '#4f46e5'} 
            maskColor="rgba(15, 23, 42, 0.8)" 
            className="bg-dark-900 border border-dark-700 rounded-xl" 
          />
        </ReactFlow>
      </div>
    </div>
  );
}

function DraggableItem({ type, label, icon, color }) {
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      onDragStart={(event) => onDragStart(event, type)}
      draggable
      className="flex items-center gap-3 p-3 bg-dark-800 border border-dark-700 rounded-xl cursor-grab hover:border-slate-500 transition-all group"
    >
      <div className={`p-2 rounded-lg ${color} text-white shadow-lg shadow-black/20 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <span className="text-sm font-medium text-slate-300 group-hover:text-white">{label}</span>
    </div>
  );
}

export default function MindMapEditor(props) {
    return (
        <ReactFlowProvider>
            <MindMapContent {...props} />
        </ReactFlowProvider>
    );
}

