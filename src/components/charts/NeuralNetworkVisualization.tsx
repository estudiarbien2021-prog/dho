import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';

interface NeuralNetworkVisualizationProps {
  isActive: boolean;
  confidence: number;
}

interface Neuron {
  id: string;
  x: number;
  y: number;
  size: number;
  active: boolean;
  intensity: number;
  color: string;
  type: 'input' | 'processing' | 'memory' | 'output';
}

interface Connection {
  id: string;
  from: string;
  to: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  active: boolean;
  strength: number;
}

export function NeuralNetworkVisualization({ isActive, confidence }: NeuralNetworkVisualizationProps) {
  const [neurons, setNeurons] = useState<Neuron[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [animationPhase, setAnimationPhase] = useState(0);
  const [pulseWave, setPulseWave] = useState(0);

  // Initialize beautiful brain structure
  useEffect(() => {
    const brainNeurons: Neuron[] = [
      // Input layer (sensory cortex) - Blue/Cyan
      { id: 'i1', x: 100, y: 120, size: 8, active: false, intensity: 0, color: '#06b6d4', type: 'input' },
      { id: 'i2', x: 120, y: 100, size: 6, active: false, intensity: 0, color: '#0ea5e9', type: 'input' },
      { id: 'i3', x: 140, y: 140, size: 7, active: false, intensity: 0, color: '#0284c7', type: 'input' },
      { id: 'i4', x: 80, y: 150, size: 6, active: false, intensity: 0, color: '#0369a1', type: 'input' },

      // Processing layer (frontal cortex) - Purple/Magenta  
      { id: 'p1', x: 200, y: 80, size: 10, active: false, intensity: 0, color: '#8b5cf6', type: 'processing' },
      { id: 'p2', x: 180, y: 110, size: 9, active: false, intensity: 0, color: '#a855f7', type: 'processing' },
      { id: 'p3', x: 220, y: 120, size: 8, active: false, intensity: 0, color: '#9333ea', type: 'processing' },
      { id: 'p4', x: 200, y: 150, size: 9, active: false, intensity: 0, color: '#7c3aed', type: 'processing' },
      { id: 'p5', x: 240, y: 100, size: 7, active: false, intensity: 0, color: '#6d28d9', type: 'processing' },

      // Memory layer (hippocampus) - Green/Emerald
      { id: 'm1', x: 160, y: 180, size: 7, active: false, intensity: 0, color: '#10b981', type: 'memory' },
      { id: 'm2', x: 200, y: 200, size: 8, active: false, intensity: 0, color: '#059669', type: 'memory' },
      { id: 'm3', x: 240, y: 185, size: 6, active: false, intensity: 0, color: '#047857', type: 'memory' },

      // Output layer (motor cortex) - Orange/Red
      { id: 'o1', x: 320, y: 130, size: 12, active: false, intensity: 0, color: '#f59e0b', type: 'output' },
      { id: 'o2', x: 300, y: 160, size: 10, active: false, intensity: 0, color: '#ea580c', type: 'output' },
    ];

    const brainConnections: Connection[] = [
      // Input to processing
      { id: 'c1', from: 'i1', to: 'p1', startX: 100, startY: 120, endX: 200, endY: 80, active: false, strength: 0.8 },
      { id: 'c2', from: 'i1', to: 'p2', startX: 100, startY: 120, endX: 180, endY: 110, active: false, strength: 0.9 },
      { id: 'c3', from: 'i2', to: 'p1', startX: 120, startY: 100, endX: 200, endY: 80, active: false, strength: 0.7 },
      { id: 'c4', from: 'i2', to: 'p5', startX: 120, startY: 100, endX: 240, endY: 100, active: false, strength: 0.6 },
      { id: 'c5', from: 'i3', to: 'p3', startX: 140, startY: 140, endX: 220, endY: 120, active: false, strength: 0.8 },
      { id: 'c6', from: 'i4', to: 'p2', startX: 80, startY: 150, endX: 180, endY: 110, active: false, strength: 0.7 },

      // Processing interconnections
      { id: 'c7', from: 'p1', to: 'p2', startX: 200, startY: 80, endX: 180, endY: 110, active: false, strength: 0.9 },
      { id: 'c8', from: 'p2', to: 'p3', startX: 180, startY: 110, endX: 220, endY: 120, active: false, strength: 0.8 },
      { id: 'c9', from: 'p3', to: 'p4', startX: 220, startY: 120, endX: 200, endY: 150, active: false, strength: 0.9 },
      { id: 'c10', from: 'p1', to: 'p5', startX: 200, startY: 80, endX: 240, endY: 100, active: false, strength: 0.7 },

      // Processing to memory
      { id: 'c11', from: 'p2', to: 'm1', startX: 180, startY: 110, endX: 160, endY: 180, active: false, strength: 0.8 },
      { id: 'c12', from: 'p3', to: 'm2', startX: 220, startY: 120, endX: 200, endY: 200, active: false, strength: 0.9 },
      { id: 'c13', from: 'p4', to: 'm2', startX: 200, startY: 150, endX: 200, endY: 200, active: false, strength: 0.8 },
      { id: 'c14', from: 'p5', to: 'm3', startX: 240, startY: 100, endX: 240, endY: 185, active: false, strength: 0.7 },

      // Memory to output
      { id: 'c15', from: 'm1', to: 'o1', startX: 160, startY: 180, endX: 320, endY: 130, active: false, strength: 0.9 },
      { id: 'c16', from: 'm2', to: 'o1', startX: 200, startY: 200, endX: 320, endY: 130, active: false, strength: 0.8 },
      { id: 'c17', from: 'm2', to: 'o2', startX: 200, startY: 200, endX: 300, endY: 160, active: false, strength: 0.9 },
      { id: 'c18', from: 'm3', to: 'o2', startX: 240, startY: 185, endX: 300, endY: 160, active: false, strength: 0.7 },

      // Processing to output (direct paths)
      { id: 'c19', from: 'p3', to: 'o1', startX: 220, startY: 120, endX: 320, endY: 130, active: false, strength: 0.6 },
      { id: 'c20', from: 'p4', to: 'o2', startX: 200, startY: 150, endX: 300, endY: 160, active: false, strength: 0.5 },
    ];

    setNeurons(brainNeurons);
    setConnections(brainConnections);
  }, []);

  // Sophisticated animation sequence
  useEffect(() => {
    if (!isActive) {
      setAnimationPhase(0);
      setPulseWave(0);
      setNeurons(prev => prev.map(n => ({ ...n, active: false, intensity: 0 })));
      setConnections(prev => prev.map(c => ({ ...c, active: false })));
      return;
    }

    const runAnimation = async () => {
      // Phase 1: Input activation
      setAnimationPhase(1);
      const inputNeurons = neurons.filter(n => n.type === 'input');
      for (let i = 0; i < inputNeurons.length; i++) {
        setTimeout(() => {
          setNeurons(prev => prev.map(n => 
            n.id === inputNeurons[i].id 
              ? { ...n, active: true, intensity: 0.7 + Math.random() * 0.3 }
              : n
          ));
        }, i * 200);
      }

      // Phase 2: Processing activation
      setTimeout(() => {
        setAnimationPhase(2);
        
        // Activate input-to-processing connections
        const inputConnections = connections.filter(c => c.from.startsWith('i'));
        inputConnections.forEach((conn, i) => {
          setTimeout(() => {
            setConnections(prev => prev.map(c => 
              c.id === conn.id ? { ...c, active: true } : c
            ));
          }, i * 100);
        });

        // Activate processing neurons
        const processingNeurons = neurons.filter(n => n.type === 'processing');
        processingNeurons.forEach((neuron, i) => {
          setTimeout(() => {
            setNeurons(prev => prev.map(n => 
              n.id === neuron.id 
                ? { ...n, active: true, intensity: 0.8 + Math.random() * 0.2 }
                : n
            ));
          }, 300 + i * 150);
        });
      }, 1000);

      // Phase 3: Memory integration
      setTimeout(() => {
        setAnimationPhase(3);
        
        // Activate processing connections
        const processingConnections = connections.filter(c => 
          c.from.startsWith('p') && (c.to.startsWith('p') || c.to.startsWith('m'))
        );
        processingConnections.forEach((conn, i) => {
          setTimeout(() => {
            setConnections(prev => prev.map(c => 
              c.id === conn.id ? { ...c, active: true } : c
            ));
          }, i * 80);
        });

        // Activate memory neurons
        const memoryNeurons = neurons.filter(n => n.type === 'memory');
        memoryNeurons.forEach((neuron, i) => {
          setTimeout(() => {
            setNeurons(prev => prev.map(n => 
              n.id === neuron.id 
                ? { ...n, active: true, intensity: 0.6 + Math.random() * 0.4 }
                : n
            ));
          }, 400 + i * 200);
        });
      }, 2500);

      // Phase 4: Output and final decision
      setTimeout(() => {
        setAnimationPhase(4);
        
        // Activate all remaining connections
        setConnections(prev => prev.map(c => ({ ...c, active: true })));

        // Activate output neurons with confidence-based intensity
        const outputNeurons = neurons.filter(n => n.type === 'output');
        outputNeurons.forEach((neuron, i) => {
          setTimeout(() => {
            setNeurons(prev => prev.map(n => 
              n.id === neuron.id 
                ? { ...n, active: true, intensity: (confidence / 100) * 0.8 + 0.2 }
                : n
            ));
          }, i * 300);
        });

        // Start pulse wave effect
        const pulseInterval = setInterval(() => {
          setPulseWave(prev => (prev + 1) % 4);
        }, 600);

        setTimeout(() => {
          clearInterval(pulseInterval);
          setAnimationPhase(5);
        }, 3000);
      }, 4000);
    };

    runAnimation();
  }, [isActive, neurons.length, connections.length, confidence]);

  return (
    <Card className="p-6 bg-gradient-to-br from-slate-900/50 to-purple-900/20 border-purple-500/20">
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <div className="w-3 h-3 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full animate-pulse" />
          <div className="absolute inset-0 w-3 h-3 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full animate-ping opacity-30" />
        </div>
        <h3 className="font-semibold text-sm bg-gradient-to-r from-cyan-300 to-purple-400 bg-clip-text text-transparent">
          Cerveau IA - Analyse Prédictive
        </h3>
        <div className="ml-auto flex items-center gap-2">
          {animationPhase > 0 && (
            <div className="text-xs text-slate-400 animate-fade-in">
              {animationPhase === 1 && "🔍 Perception..."}
              {animationPhase === 2 && "⚡ Traitement..."}
              {animationPhase === 3 && "🧠 Analyse..."}
              {animationPhase === 4 && "🎯 Décision..."}
              {animationPhase === 5 && "✅ Terminé"}
            </div>
          )}
        </div>
      </div>
      
      <div className="relative h-80 bg-gradient-to-br from-slate-800/30 to-purple-800/10 rounded-xl overflow-hidden border border-purple-500/10">
        <svg width="100%" height="100%" viewBox="0 0 400 300">
          {/* Beautiful brain outline with gradient */}
          <defs>
            <linearGradient id="brainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgb(6, 182, 212)" stopOpacity="0.1" />
              <stop offset="50%" stopColor="rgb(139, 92, 246)" stopOpacity="0.1" />
              <stop offset="100%" stopColor="rgb(245, 158, 11)" stopOpacity="0.1" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          <path
            d="M70 140 Q50 100 90 80 Q130 60 170 70 Q210 55 250 70 Q290 60 330 100 Q350 140 330 180 Q310 220 270 240 Q230 250 190 245 Q150 250 110 230 Q70 190 70 140 Z"
            fill="url(#brainGradient)"
            stroke="rgba(139, 92, 246, 0.3)"
            strokeWidth="2"
            strokeDasharray={animationPhase > 0 ? "none" : "8,4"}
            className={animationPhase > 0 ? "animate-pulse" : ""}
          />

          {/* Render connections with beautiful gradients */}
          {connections.map((conn) => (
            <g key={conn.id}>
              <line
                x1={conn.startX}
                y1={conn.startY}
                x2={conn.endX}
                y2={conn.endY}
                stroke={conn.active ? `rgba(139, 92, 246, ${0.4 + conn.strength * 0.4})` : 'rgba(100, 116, 139, 0.2)'}
                strokeWidth={conn.active ? 2 + conn.strength : 1}
                className={conn.active ? 'animate-pulse' : ''}
                filter={conn.active ? "url(#glow)" : "none"}
              />
              
              {/* Data flow animation */}
              {conn.active && animationPhase >= 4 && (
                <circle
                  r="2"
                  fill="rgb(139, 92, 246)"
                  opacity="0.8"
                >
                  <animateMotion
                    dur="2s"
                    repeatCount="indefinite"
                    path={`M${conn.startX},${conn.startY} L${conn.endX},${conn.endY}`}
                  />
                </circle>
              )}
            </g>
          ))}

          {/* Render neurons with beautiful effects */}
          {neurons.map((neuron) => (
            <g key={neuron.id}>
              {/* Outer glow ring */}
              {neuron.active && (
                <circle
                  cx={neuron.x}
                  cy={neuron.y}
                  r={neuron.size + 8 + (pulseWave === Math.abs(neuron.x + neuron.y) % 4 ? 4 : 0)}
                  fill="none"
                  stroke={neuron.color}
                  strokeWidth="1"
                  opacity={0.2 + neuron.intensity * 0.3}
                  className="animate-pulse"
                />
              )}
              
              {/* Main neuron */}
              <circle
                cx={neuron.x}
                cy={neuron.y}
                r={neuron.active ? neuron.size + neuron.intensity * 3 : neuron.size * 0.6}
                fill={neuron.active ? neuron.color : 'rgba(100, 116, 139, 0.4)'}
                opacity={neuron.active ? 0.8 + neuron.intensity * 0.2 : 0.3}
                filter={neuron.active ? "url(#glow)" : "none"}
                className={neuron.active ? 'animate-pulse' : ''}
                style={{
                  transition: 'all 0.5s ease-in-out'
                }}
              />

              {/* Inner core */}
              {neuron.active && (
                <circle
                  cx={neuron.x}
                  cy={neuron.y}
                  r={neuron.size * 0.4}
                  fill="white"
                  opacity={0.6 + neuron.intensity * 0.4}
                  className="animate-pulse"
                />
              )}

              {/* Output neuron labels */}
              {neuron.type === 'output' && neuron.active && animationPhase >= 4 && (
                <text
                  x={neuron.x}
                  y={neuron.y + neuron.size + 15}
                  textAnchor="middle"
                  fontSize="11"
                  fill={neuron.color}
                  fontWeight="bold"
                  className="animate-fade-in"
                >
                  {Math.round(neuron.intensity * 100)}%
                </text>
              )}
            </g>
          ))}

          {/* Status display */}
          {animationPhase >= 4 && (
            <g>
              <rect
                x="20"
                y="20"
                width="120"
                height="40"
                rx="8"
                fill="rgba(0, 0, 0, 0.7)"
                stroke="rgba(139, 92, 246, 0.5)"
                strokeWidth="1"
              />
              <text x="30" y="35" fontSize="10" fill="rgb(139, 92, 246)" fontWeight="bold">
                🧠 Activité Cérébrale
              </text>
              <text x="30" y="50" fontSize="9" fill="rgb(156, 163, 175)">
                Confiance: {confidence}%
              </text>
            </g>
          )}
        </svg>

        {/* Beautiful status bar */}
        <div className="absolute bottom-4 left-4 right-4">
          {animationPhase < 5 ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        i < animationPhase 
                          ? 'bg-gradient-to-r from-cyan-400 to-purple-500 shadow-lg' 
                          : 'bg-slate-600'
                      } ${i === animationPhase - 1 ? 'animate-pulse scale-125' : ''}`}
                    />
                  ))}
                </div>
                <div className="text-xs text-slate-300 font-medium">
                  Analyse neuronale en cours...
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg border border-green-500/30">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm text-green-300 font-medium">Cerveau IA Activé</span>
              </div>
              <div className="text-sm font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                🎯 Verdict: {confidence}% de confiance
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}