import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';

interface NeuralNetworkVisualizationProps {
  isActive: boolean;
  confidence: number;
}

interface Node {
  id: string;
  x: number;
  y: number;
  layer: number;
  active: boolean;
  value: number;
}

interface Connection {
  from: string;
  to: string;
  weight: number;
  active: boolean;
}

export function NeuralNetworkVisualization({ isActive, confidence }: NeuralNetworkVisualizationProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [animationPhase, setAnimationPhase] = useState(0);

  // Initialize network structure
  useEffect(() => {
    const inputNodes: Node[] = [
      { id: 'i1', x: 50, y: 60, layer: 0, active: false, value: 0 },
      { id: 'i2', x: 50, y: 120, layer: 0, active: false, value: 0 },
      { id: 'i3', x: 50, y: 180, layer: 0, active: false, value: 0 },
      { id: 'i4', x: 50, y: 240, layer: 0, active: false, value: 0 },
    ];

    const hiddenNodes: Node[] = [
      { id: 'h1', x: 150, y: 80, layer: 1, active: false, value: 0 },
      { id: 'h2', x: 150, y: 140, layer: 1, active: false, value: 0 },
      { id: 'h3', x: 150, y: 200, layer: 1, active: false, value: 0 },
      { id: 'h4', x: 250, y: 100, layer: 2, active: false, value: 0 },
      { id: 'h5', x: 250, y: 160, layer: 2, active: false, value: 0 },
    ];

    const outputNode: Node[] = [
      { id: 'o1', x: 350, y: 150, layer: 3, active: false, value: 0 },
    ];

    const allNodes = [...inputNodes, ...hiddenNodes, ...outputNode];
    
    // Create connections
    const allConnections: Connection[] = [];
    
    // Input to first hidden layer
    inputNodes.forEach(input => {
      hiddenNodes.slice(0, 3).forEach(hidden => {
        allConnections.push({
          from: input.id,
          to: hidden.id,
          weight: Math.random() * 0.8 + 0.2,
          active: false
        });
      });
    });

    // First hidden to second hidden layer
    hiddenNodes.slice(0, 3).forEach(hidden1 => {
      hiddenNodes.slice(3).forEach(hidden2 => {
        allConnections.push({
          from: hidden1.id,
          to: hidden2.id,
          weight: Math.random() * 0.8 + 0.2,
          active: false
        });
      });
    });

    // Second hidden to output
    hiddenNodes.slice(3).forEach(hidden => {
      allConnections.push({
        from: hidden.id,
        to: 'o1',
        weight: Math.random() * 0.8 + 0.2,
        active: false
      });
    });

    setNodes(allNodes);
    setConnections(allConnections);
  }, []);

  // Animation sequence
  useEffect(() => {
    if (!isActive) return;

    const animateNetwork = async () => {
      // Phase 1: Activate input nodes
      setAnimationPhase(1);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setNodes(prev => prev.map(node => 
        node.layer === 0 
          ? { ...node, active: true, value: Math.random() * 0.8 + 0.2 }
          : node
      ));

      // Phase 2: Propagate through first hidden layer
      setAnimationPhase(2);
      await new Promise(resolve => setTimeout(resolve, 400));
      
      setNodes(prev => prev.map(node => 
        node.layer === 1 && node.id !== 'h4' && node.id !== 'h5'
          ? { ...node, active: true, value: Math.random() * 0.8 + 0.2 }
          : node
      ));

      setConnections(prev => prev.map(conn => {
        const fromNode = nodes.find(n => n.id === conn.from);
        const toNode = nodes.find(n => n.id === conn.to);
        if (fromNode?.layer === 0 && toNode?.layer === 1) {
          return { ...conn, active: true };
        }
        return conn;
      }));

      // Phase 3: Propagate through second hidden layer
      setAnimationPhase(3);
      await new Promise(resolve => setTimeout(resolve, 400));
      
      setNodes(prev => prev.map(node => 
        node.layer === 2
          ? { ...node, active: true, value: Math.random() * 0.8 + 0.2 }
          : node
      ));

      setConnections(prev => prev.map(conn => {
        const fromNode = nodes.find(n => n.id === conn.from);
        const toNode = nodes.find(n => n.id === conn.to);
        if (fromNode?.layer === 1 && toNode?.layer === 2) {
          return { ...conn, active: true };
        }
        return conn;
      }));

      // Phase 4: Final output
      setAnimationPhase(4);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setNodes(prev => prev.map(node => 
        node.layer === 3
          ? { ...node, active: true, value: confidence / 100 }
          : node
      ));

      setConnections(prev => prev.map(conn => {
        const fromNode = nodes.find(n => n.id === conn.from);
        const toNode = nodes.find(n => n.id === conn.to);
        if (fromNode?.layer === 2 && toNode?.layer === 3) {
          return { ...conn, active: true };
        }
        return conn;
      }));

      setAnimationPhase(5);
    };

    animateNetwork();
  }, [isActive, confidence, nodes]);

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
        <h3 className="font-semibold text-sm">Réseau de Neurones IA</h3>
        {animationPhase > 0 && (
          <div className="ml-auto text-xs text-muted-foreground animate-fade-in">
            Phase {animationPhase}/5
          </div>
        )}
      </div>
      
      <div className="relative h-80 bg-gradient-to-br from-background to-muted/20 rounded-lg overflow-hidden">
        <svg width="100%" height="100%" viewBox="0 0 400 300">
          {/* Render connections */}
          {connections.map((conn, index) => {
            const fromNode = nodes.find(n => n.id === conn.from);
            const toNode = nodes.find(n => n.id === conn.to);
            if (!fromNode || !toNode) return null;

            return (
              <line
                key={`${conn.from}-${conn.to}`}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke={conn.active ? 'hsl(var(--primary))' : 'hsl(var(--muted))'}
                strokeWidth={conn.active ? 2 * conn.weight : 1}
                opacity={conn.active ? 0.8 : 0.3}
                className={conn.active ? 'animate-pulse' : ''}
                style={{
                  filter: conn.active ? 'drop-shadow(0 0 4px hsl(var(--primary)))' : 'none',
                  transition: 'all 0.3s ease-in-out'
                }}
              />
            );
          })}

          {/* Render nodes */}
          {nodes.map((node) => (
            <g key={node.id}>
              <circle
                cx={node.x}
                cy={node.y}
                r={node.active ? 8 + node.value * 4 : 6}
                fill={node.active ? 'hsl(var(--primary))' : 'hsl(var(--muted))'}
                opacity={node.active ? 0.9 : 0.4}
                className={node.active ? 'animate-pulse' : ''}
                style={{
                  filter: node.active ? 'drop-shadow(0 0 8px hsl(var(--primary)))' : 'none',
                  transition: 'all 0.3s ease-in-out'
                }}
              />
              {node.active && node.value > 0 && (
                <text
                  x={node.x}
                  y={node.y + 2}
                  textAnchor="middle"
                  fontSize="8"
                  fill="hsl(var(--primary-foreground))"
                  fontWeight="bold"
                >
                  {Math.round(node.value * 100)}
                </text>
              )}
            </g>
          ))}

          {/* Input labels */}
          <text x="15" y="65" fontSize="10" fill="hsl(var(--muted-foreground))">Forme</text>
          <text x="10" y="125" fontSize="10" fill="hsl(var(--muted-foreground))">H2H</text>
          <text x="15" y="185" fontSize="10" fill="hsl(var(--muted-foreground))">Stats</text>
          <text x="8" y="245" fontSize="10" fill="hsl(var(--muted-foreground))">Context</text>

          {/* Output label */}
          <text x="365" y="155" fontSize="12" fill="hsl(var(--primary))" fontWeight="bold">
            {animationPhase >= 4 ? `${confidence}%` : '...'}
          </text>
          
          {/* Verdict label */}
          {animationPhase >= 5 && (
            <text x="365" y="170" fontSize="10" fill="hsl(var(--muted-foreground))" textAnchor="middle">
              Confiance
            </text>
          )}
        </svg>

        {/* Processing indicator */}
        {isActive && animationPhase < 5 && (
          <div className="absolute bottom-4 left-4 flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            Calcul en cours...
          </div>
        )}
        
        {/* Final verdict */}
        {isActive && animationPhase >= 5 && (
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-green-500">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              Analyse terminée
            </div>
            <div className="text-primary font-bold">
              Score: {confidence}%
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}