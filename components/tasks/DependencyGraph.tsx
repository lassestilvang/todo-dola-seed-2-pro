'use client';

import { useState, useEffect, useMemo } from 'react';
import { Task, TaskDependency, TaskLink } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RefreshCw, Link as LinkIcon, Unlink, ArrowLeftRight } from 'lucide-react';
import Link from 'next/link';

interface DependencyGraphProps {
  tasks: Task[];
  dependencies: TaskDependency[];
  taskLinks?: TaskLink[];
}

export default function DependencyGraph({ tasks, dependencies, taskLinks = [] }: DependencyGraphProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Calculate positions using a better DAG layout
  const nodePositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    const visited = new Set<string>();

    // Build adjacency list
    const graph: Record<string, string[]> = {};
    tasks.forEach(t => { graph[t.id] = []; });
    dependencies.forEach(dep => {
      if (!graph[dep.taskId]) graph[dep.taskId] = [];
      graph[dep.taskId].push(dep.dependsOnTaskId);
    });
    taskLinks.forEach(link => {
      if (!graph[link.taskId]) graph[link.taskId] = [];
      graph[link.taskId].push(link.linkedTaskId);
    });

    // Topological sort with level assignment
    const levels: Record<string, number> = {};
    const assignLevels = (taskId: string, level: number) => {
      if (levels[taskId] !== undefined && levels[taskId] <= level) return;
      levels[taskId] = level;
      (graph[taskId] || []).forEach(parentId => assignLevels(parentId, level + 1));
    };

    tasks.forEach(t => assignLevels(t.id, 0));

    // Group by levels
    const levelGroups: Record<number, string[]> = {};
    Object.entries(levels).forEach(([id, level]) => {
      if (!levelGroups[level]) levelGroups[level] = [];
      levelGroups[level].push(id);
    });

    // Position nodes
    Object.entries(levelGroups).forEach(([level, ids]) => {
      const y = parseInt(level, 10) * 120;
      const totalWidth = (ids.length - 1) * 250;
      ids.forEach((id, index) => {
        positions[id] = {
          x: index * 250 - totalWidth / 2 + totalWidth / 2,
          y,
        };
      });
    });

    return positions;
  }, [tasks, dependencies, taskLinks]);

  const handleZoomIn = () => setZoom(z => Math.min(3, z * 1.2));
  const handleZoomOut = () => setZoom(z => Math.max(0.3, z / 1.2));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getLinkStyle = (type: TaskLink['type']) => {
    switch (type) {
      case 'blocks': return { stroke: '#6366f1', strokeWidth: 3, strokeDasharray: 'none' };
      case 'depends_on': return { stroke: '#8b5cf6', strokeWidth: 2, strokeDasharray: 'none' };
      case 'duplicate': return { stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '4,4' };
      case 'related': return { stroke: '#10b981', strokeWidth: 2, strokeDasharray: '5,5' };
      default: return { stroke: '#6b7280', strokeWidth: 1, strokeDasharray: 'none' };
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Task Relationships</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="border rounded-lg p-4 h-96 overflow-hidden relative">
        <div
          className="w-full h-full"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: '0 0',
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <svg width="100%" height="100%">
            <defs>
              <marker id="arrowhead-dep" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
              </marker>
              <marker id="arrowhead-link" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#10b981" />
              </marker>
            </defs>

            {/* Render task links with type-specific styling */}
            {taskLinks.map(link => {
              const from = nodePositions[link.taskId];
              const to = nodePositions[link.linkedTaskId];
              if (!from || !to) return null;

              const style = getLinkStyle(link.type);
              const strokeDasharray = style.strokeDasharray ?? undefined;

              return (
                <line
                  key={`link-${link.id}`}
                  x1={from.x + 100}
                  y1={from.y + 40}
                  x2={to.x + 100}
                  y2={to.y + 40}
                  stroke={style.stroke}
                  strokeWidth={style.strokeWidth}
                  strokeDasharray={strokeDasharray}
                  markerEnd="url(#arrowhead-link)"
                />
              );
            })}

            {/* Render dependencies as blue lines */}
            {dependencies.map(dep => {
              const from = nodePositions[dep.taskId];
              const to = nodePositions[dep.dependsOnTaskId];
              if (!from || !to) return null;

              return (
                <line
                  key={dep.id}
                  x1={from.x + 100}
                  y1={from.y + 40}
                  x2={to.x + 100}
                  y2={to.y + 40}
                  stroke="#6366f1"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead-dep)"
                />
              );
            })}

            {/* Render task nodes */}
            {tasks.map(task => {
              const pos = nodePositions[task.id];
              if (!pos) return null;

              const priorityColor = getPriorityColor(task.priority);
              const completedCount = task.subtasks?.filter(s => s.completed).length || 0;
              const totalSubtasks = task.subtasks?.length || 0;

              return (
                <g key={task.id}>
                  <Link href={`/task/${task.id}`}>
                    <rect
                      x={pos.x}
                      y={pos.y}
                      width="200"
                      height="90"
                      rx="8"
                      className="fill-gray-800 stroke-2 hover:stroke-gray-400 cursor-pointer transition-colors"
                      style={{ stroke: priorityColor + '80' }}
                    />
                    <text x={pos.x + 100} y={pos.y + 20} textAnchor="middle" className="text-sm font-medium fill-white">
                      {task.name.substring(0, 25)}
                      {task.name.length > 25 ? '...' : ''}
                    </text>
                    <text x={pos.x + 100} y={pos.y + 40} textAnchor="middle" className="text-xs fill-gray-400">
                      {task.completed ? '✓ Completed' : '○ In Progress'}
                    </text>
                    {totalSubtasks > 0 && (
                      <text x={pos.x + 100} y={pos.y + 55} textAnchor="middle" className="text-xs fill-gray-500">
                        {completedCount}/{totalSubtasks} subtasks
                      </text>
                    )}
                  </Link>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5 bg-blue-500"></div>
          <span>Dependencies (blocks)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5 bg-gray-400" style={{ backgroundImage: 'linear-gradient(90deg, #6b7280 4px, transparent 4px)' }}></div>
          <span>Depends on</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5 bg-green-500" style={{ backgroundImage: 'linear-gradient(90deg, #10b981 4px, transparent 4px)' }}></div>
          <span>Related</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5 bg-red-500" style={{ backgroundImage: 'linear-gradient(90deg, #ef4444 4px, transparent 4px)' }}></div>
          <span>Duplicate</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-red-500 rounded-full"></span>
          <span>High priority</span>
          <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
          <span>Medium</span>
          <span className="w-3 h-3 bg-green-500 rounded-full"></span>
          <span>Low</span>
        </div>
      </div>
    </div>
  );
}