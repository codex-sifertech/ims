import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Panel,
  MarkerType,
  ReactFlowProvider
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, ListTodo, Activity, Anchor, HelpCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import AdvancedStepNode from './AdvancedStepNode';
import useStore from '../../../store/useStore';

function WorkflowContent({ projectId }) {
  const nodeTypes = useMemo(() => ({ step: AdvancedStepNode }), []);
  const { setProjectNodes } = useStore();

  const [nodes, setNodes] = useState([
    {
      id: 'step-1',
      type: 'step',
      position: { x: 400, y: 100 },
      data: { 
        stepNumber: 1, 
        title: 'Project Kickoff', 
        description: 'Initial requirements gathering and client alignment.',
        status: 'pending',
        assignee: 'Manager',
        duration: '2h',
        audioBlob: null,
      },
    }
  ]);

  // Sync nodes with global store for chat mentions
  useEffect(() => {
    const mentionNodes = nodes.map(n => ({
      id: n.id,
      label: n.data.title || `Step ${n.data.stepNumber}`,
      type: 'workflow'
    }));
    setProjectNodes(mentionNodes);
  }, [nodes, setProjectNodes]);

  const [edges, setEdges] = useState([]);
  const [stepCount, setStepCount] = useState(1);
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

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
        style: { stroke: '#4f46e5', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#4f46e5' }
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
      const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });

      const newCount = stepCount + 1;
      const newNode = {
        id: uuidv4(),
        type: 'step',
        position,
        data: { 
          stepNumber: newCount,
          title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
          description: '',
          status: 'pending',
          assignee: '',
          duration: '',
          audioBlob: null,
          onChange: (data) => onNodeDataChange(newNode.id, data)
        }
      };

      setNodes((nds) => nds.concat(newNode));
      setStepCount(newCount);
    },
    [reactFlowInstance, stepCount, onNodeDataChange]
  );

  useMemo(() => {
    nodes.forEach(node => {
        if(!node.data.onChange) {
            node.data.onChange = (data) => onNodeDataChange(node.id, data);
        }
    });
  }, [nodes, onNodeDataChange]);

  const addSequentialStep = () => {
    const lastNode = nodes[nodes.length - 1];
    const position = lastNode 
        ? { x: lastNode.position.x, y: lastNode.position.y + 350 }
        : { x: 400, y: 100 };

    const newCount = stepCount + 1;
    const id = uuidv4();
    const newNode = {
      id,
      type: 'step',
      position,
      data: { 
          stepNumber: newCount,
          title: `Sequence Step ${newCount}`,
          description: '',
          status: 'pending',
          assignee: '',
          audioBlob: null,
          onChange: (data) => onNodeDataChange(id, data)
      }
    };

    setNodes((nds) => nds.concat(newNode));
    setStepCount(newCount);

    if (lastNode) {
        setEdges((eds) => addEdge({
            id: `edge-${lastNode.id}-${id}`,
            source: lastNode.id,
            target: id,
            animated: true,
            style: { stroke: '#4f46e5', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#4f46e5' }
        }, eds));
    }
  };

  return (
    <div className="flex w-full h-full bg-dark-950 overflow-hidden rounded-2xl border border-dark-800">
      {/* Sidebar for Workflow Toolkit */}
      <div className="w-64 bg-dark-900 border-r border-dark-800 p-4 flex flex-col gap-4 overflow-y-auto z-10 blur-backdrop">
        <div>
          <h3 className="text-white font-bold text-sm mb-1">Workflow Steps</h3>
          <p className="text-[10px] text-slate-500 mb-4 uppercase tracking-widest font-bold">Standard Operations</p>
        </div>

        <div className="space-y-2">
           <DraggableStep type="action" label="Action Step" icon={<Activity size={16} />} color="bg-primary-500" />
           <DraggableStep type="milestone" label="Milestone" icon={<Anchor size={16} />} color="bg-emerald-500" />
           <DraggableStep type="review" label="Review Point" icon={<HelpCircle size={16} />} color="bg-amber-500" />
        </div>

        <div className="mt-8">
            <button 
                onClick={addSequentialStep}
                className="w-full py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary-600/20"
            >
                <Plus size={16} /> Add Next Step
            </button>
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
          fitViewOptions={{ padding: 0.3 }}
          className="bg-dark-950"
        >
          <Background color="#1e293b" gap={20} size={1} />
          <Controls className="bg-dark-800 border-dark-700 fill-slate-300" />
        </ReactFlow>
      </div>
    </div>
  );
}

function DraggableStep({ type, label, icon, color }) {
  return (
    <div
      onDragStart={(e) => {
          e.dataTransfer.setData('application/reactflow', type);
          e.dataTransfer.effectAllowed = 'move';
      }}
      draggable
      className="flex items-center gap-3 p-3 bg-dark-800 border border-dark-700 rounded-xl cursor-grab hover:border-slate-500 transition-all group"
    >
      <div className={`p-2 rounded-lg ${color} text-white group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <span className="text-xs font-semibold text-slate-300 group-hover:text-white">{label}</span>
    </div>
  );
}

export default function WorkflowEditor(props) {
    return (
        <ReactFlowProvider>
            <WorkflowContent {...props} />
        </ReactFlowProvider>
    );
}

