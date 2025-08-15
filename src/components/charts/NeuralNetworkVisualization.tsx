import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';

interface NeuralNetworkVisualizationProps {
  isActive: boolean;
  confidence: number;
}

interface Synapse {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  active: boolean;
  delay: number;
}

interface Neuron {
  id: string;
  x: number;
  y: number;
  size: number;
  active: boolean;
  intensity: number;
  delay: number;
}

export function NeuralNetworkVisualization({ isActive, confidence }: NeuralNetworkVisualizationProps) {
  const [neurons, setNeurons] = useState<Neuron[]>([]);
  const [synapses, setSynapses] = useState<Synapse[]>([]);
  const [phase, setPhase] = useState(0);
  const [pulseIndex, setPulseIndex] = useState(0);

  // Initialize brain structure
  useEffect(() => {
    // Create brain-like neuron network
    const brainNeurons: Neuron[] = [
      // Frontal cortex (top area - decision making)
      { id: 'f1', x: 180, y: 60, size: 8, active: false, intensity: 0, delay: 0 },
      { id: 'f2', x: 220, y: 50, size: 6, active: false, intensity: 0, delay: 100 },
      { id: 'f3', x: 160, y: 80, size: 7, active: false, intensity: 0, delay: 200 },
      { id: 'f4', x: 240, y: 75, size: 5, active: false, intensity: 0, delay: 150 },
      
      // Temporal lobe (sides - pattern recognition)
      { id: 't1', x: 120, y: 120, size: 6, active: false, intensity: 0, delay: 300 },
      { id: 't2', x: 280, y: 125, size: 6, active: false, intensity: 0, delay: 350 },
      { id: 't3', x: 100, y: 150, size: 5, active: false, intensity: 0, delay: 400 },
      { id: 't4', x: 300, y: 145, size: 5, active: false, intensity: 0, delay: 450 },
      
      // Central processing (middle - main computation)
      { id: 'c1', x: 200, y: 120, size: 10, active: false, intensity: 0, delay: 500 },
      { id: 'c2', x: 180, y: 140, size: 8, active: false, intensity: 0, delay: 550 },
      { id: 'c3', x: 220, y: 135, size: 8, active: false, intensity: 0, delay: 600 },
      { id: 'c4', x: 200, y: 160, size: 7, active: false, intensity: 0, delay: 650 },
      
      // Memory centers (deeper areas)
      { id: 'm1', x: 150, y: 180, size: 6, active: false, intensity: 0, delay: 700 },
      { id: 'm2', x: 250, y: 175, size: 6, active: false, intensity: 0, delay: 750 },
      { id: 'm3', x: 200, y: 200, size: 5, active: false, intensity: 0, delay: 800 },
      
      // Output neurons (bottom - final decision)
      { id: 'o1', x: 190, y: 230, size: 12, active: false, intensity: 0, delay: 900 },
      { id: 'o2', x: 210, y: 235, size: 8, active: false, intensity: 0, delay: 950 },
    ];

    // Create synaptic connections between neurons
    const brainSynapses: Synapse[] = [
      // Frontal to temporal connections
      { id: 's1', startX: 180, startY: 60, endX: 120, endY: 120, active: false, delay: 0 },
      { id: 's2', startX: 220, startY: 50, endX: 280, endY: 125, active: false, delay: 50 },
      { id: 's3', startX: 160, startY: 80, endX: 100, endY: 150, active: false, delay: 100 },
      { id: 's4', startX: 240, startY: 75, endX: 300, endY: 145, active: false, delay: 150 },
      
      // Temporal to central connections
      { id: 's5', startX: 120, startY: 120, endX: 200, endY: 120, active: false, delay: 200 },
      { id: 's6', startX: 280, startY: 125, endX: 200, endY: 120, active: false, delay: 250 },
      { id: 's7', startX: 100, startY: 150, endX: 180, endY: 140, active: false, delay: 300 },
      { id: 's8', startX: 300, startY: 145, endX: 220, endY: 135, active: false, delay: 350 },
      
      // Central processing interconnections
      { id: 's9', startX: 200, startY: 120, endX: 180, endY: 140, active: false, delay: 400 },
      { id: 's10', startX: 200, startY: 120, endX: 220, endY: 135, active: false, delay: 450 },
      { id: 's11', startX: 180, startY: 140, endX: 220, endY: 135, active: false, delay: 500 },
      { id: 's12', startX: 220, startY: 135, endX: 200, endY: 160, active: false, delay: 550 },
      
      // Central to memory connections
      { id: 's13', startX: 180, startY: 140, endX: 150, endY: 180, active: false, delay: 600 },
      { id: 's14', startX: 220, startY: 135, endX: 250, endY: 175, active: false, delay: 650 },
      { id: 's15', startX: 200, startY: 160, endX: 200, endY: 200, active: false, delay: 700 },
      
      // Memory to output connections
      { id: 's16', startX: 150, startY: 180, endX: 190, endY: 230, active: false, delay: 750 },
      { id: 's17', startX: 250, startY: 175, endX: 210, endY: 235, active: false, delay: 800 },
      { id: 's18', startX: 200, startY: 200, endX: 190, endY: 230, active: false, delay: 850 },
      { id: 's19', startX: 200, startY: 200, endX: 210, endY: 235, active: false, delay: 900 },
    ];

    setNeurons(brainNeurons);
    setSynapses(brainSynapses);
  }, []);

  // Animation sequence
  useEffect(() => {
    if (!isActive) {
      setPhase(0);
      setPulseIndex(0);
      setNeurons(prev => prev.map(n => ({ ...n, active: false, intensity: 0 })));
      setSynapses(prev => prev.map(s => ({ ...s, active: false })));
      return;
    }

    const animateBrain = async () => {
      // Phase 1: Brain activation wave
      setPhase(1);
      
      for (let i = 0; i < neurons.length; i++) {
        setTimeout(() => {
          setNeurons(prev => prev.map((neuron, index) => 
            index === i 
              ? { 
                  ...neuron, 
                  active: true, 
                  intensity: 0.3 + Math.random() * 0.7 
                }
              : neuron
          ));
        }, neurons[i].delay);
      }

      // Phase 2: Synaptic activation
      setTimeout(() => {
        setPhase(2);
        synapses.forEach((synapse, index) => {
          setTimeout(() => {
            setSynapses(prev => prev.map((s, i) => 
              i === index ? { ...s, active: true } : s
            ));
          }, synapse.delay);
        });
      }, 1000);

      // Phase 3: Processing pulses
      setTimeout(() => {
        setPhase(3);
        const pulseInterval = setInterval(() => {
          setPulseIndex(prev => {
            const next = prev + 1;
            if (next >= 8) {
              clearInterval(pulseInterval);
              setPhase(4);
              return 0;
            }
            return next;
          });
        }, 300);
      }, 2500);

      // Phase 4: Final result
      setTimeout(() => {
        setPhase(4);
        // Highlight output neurons based on confidence
        setNeurons(prev => prev.map(neuron => 
          neuron.id.startsWith('o') 
            ? { 
                ...neuron, 
                active: true, 
                intensity: confidence / 100 
              }
            : neuron
        ));
      }, 5000);
    };

    animateBrain();
  }, [isActive, neurons.length, synapses.length, confidence]);

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
        <h3 className="font-semibold text-sm">Cerveau IA - Analyse Prédictive</h3>
        {phase > 0 && (
          <div className="ml-auto text-xs text-muted-foreground animate-fade-in">
            {phase === 1 && "Activation neuronale..."}
            {phase === 2 && "Connexions synaptiques..."}
            {phase === 3 && "Traitement en cours..."}
            {phase === 4 && "Analyse terminée"}
          </div>
        )}
      </div>
      
      <div className="relative h-80 bg-gradient-to-br from-background to-muted/20 rounded-lg overflow-hidden">
        <svg width="100%" height="100%" viewBox="0 0 400 300">
          {/* Brain outline */}
          <path
            d="M80 120 Q60 80 100 60 Q140 40 180 50 Q220 35 260 50 Q300 40 320 80 Q340 120 320 160 Q300 200 280 220 Q250 240 200 245 Q150 250 120 220 Q80 180 80 120 Z"
            fill="hsl(var(--muted))"
            opacity="0.1"
            stroke="hsl(var(--primary))"
            strokeWidth="1"
            strokeDasharray="5,5"
            className="animate-pulse"
          />

          {/* Render synapses */}
          {synapses.map((synapse) => (
            <g key={synapse.id}>
              <line
                x1={synapse.startX}
                y1={synapse.startY}
                x2={synapse.endX}
                y2={synapse.endY}
                stroke={synapse.active ? 'hsl(var(--primary))' : 'hsl(var(--muted))'}
                strokeWidth={synapse.active ? 2 : 1}
                opacity={synapse.active ? 0.8 : 0.3}
                className={synapse.active ? 'animate-pulse' : ''}
              />
              
              {/* Synaptic pulse animation */}
              {synapse.active && phase === 3 && (
                <circle
                  r="3"
                  fill="hsl(var(--primary))"
                  opacity="0.8"
                >
                  <animateMotion
                    dur="1s"
                    repeatCount="indefinite"
                    path={`M${synapse.startX},${synapse.startY} L${synapse.endX},${synapse.endY}`}
                  />
                </circle>
              )}
            </g>
          ))}

          {/* Render neurons */}
          {neurons.map((neuron) => (
            <g key={neuron.id}>
              <circle
                cx={neuron.x}
                cy={neuron.y}
                r={neuron.active ? neuron.size + 2 : neuron.size}
                fill={neuron.active ? 'hsl(var(--primary))' : 'hsl(var(--muted))'}
                opacity={neuron.active ? 0.7 + neuron.intensity * 0.3 : 0.4}
                className={neuron.active ? 'animate-pulse' : ''}
                style={{
                  filter: neuron.active 
                    ? `drop-shadow(0 0 ${4 + neuron.intensity * 6}px hsl(var(--primary)))` 
                    : 'none',
                  transition: 'all 0.3s ease-in-out'
                }}
              />
              
              {/* Neuron activation rings */}
              {neuron.active && phase >= 2 && (
                <circle
                  cx={neuron.x}
                  cy={neuron.y}
                  r={neuron.size + 8}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="1"
                  opacity="0.3"
                  className="animate-ping"
                />
              )}
              
              {/* Special highlighting for output neurons */}
              {neuron.id.startsWith('o') && phase === 4 && (
                <text
                  x={neuron.x}
                  y={neuron.y + 20}
                  textAnchor="middle"
                  fontSize="10"
                  fill="hsl(var(--primary))"
                  fontWeight="bold"
                  className="animate-fade-in"
                >
                  {Math.round(neuron.intensity * 100)}%
                </text>
              )}
            </g>
          ))}

          {/* Brain activity indicator */}
          {phase >= 3 && (
            <g>
              <text x="200" y="30" textAnchor="middle" fontSize="12" fill="hsl(var(--primary))" fontWeight="bold">
                🧠 Activité Cérébrale
              </text>
              <text x="200" y="45" textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground))">
                {phase === 3 ? "Traitement des données..." : `Confiance: ${confidence}%`}
              </text>
            </g>
          )}
        </svg>

        {/* Status indicators */}
        <div className="absolute bottom-4 left-4 right-4">
          {phase < 4 ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex gap-1">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      i < phase ? 'bg-primary' : 'bg-muted'
                    } ${i === phase - 1 ? 'animate-pulse' : ''}`}
                  />
                ))}
              </div>
              <span>Analyse neuronale en cours...</span>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-green-500">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>Cerveau IA activé</span>
              </div>
              <div className="text-primary font-bold">
                🎯 Verdict: {confidence}% de confiance
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}