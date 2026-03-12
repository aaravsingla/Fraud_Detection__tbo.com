import { useEffect, useRef, useState } from "react";
import { NetworkNode } from "../types";
import { motion } from "motion/react";
import { AlertTriangle, Wifi, Globe } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface NetworkGraphProps {
  nodes: NetworkNode[];
}

interface GraphNode extends NetworkNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export function NetworkGraph({ nodes }: NetworkGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  // Initialize graph layout
  useEffect(() => {
    const width = 800;
    const height = 600;
    const centerX = width / 2;
    const centerY = height / 2;

    const initialized = nodes.map((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI;
      const radius = node.type === "agency" ? 200 : 120;

      return {
        ...node,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
      };
    });

    setGraphNodes(initialized);
  }, [nodes]);

  // Simple force-directed layout simulation
  useEffect(() => {
    const animate = () => {
      setGraphNodes((prevNodes) => {
        const updated = prevNodes.map((node) => ({ ...node }));

        // Apply forces
        for (let i = 0; i < updated.length; i++) {
          const node = updated[i];
          let fx = 0;
          let fy = 0;

          // Repulsion between all nodes
          for (let j = 0; j < updated.length; j++) {
            if (i === j) continue;
            const other = updated[j];
            const dx = node.x - other.x;
            const dy = node.y - other.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = 1000 / (dist * dist);
            fx += (dx / dist) * force;
            fy += (dy / dist) * force;
          }

          // Attraction along connections
          node.connections.forEach((connId) => {
            const connected = updated.find((n) => n.id === connId);
            if (connected) {
              const dx = connected.x - node.x;
              const dy = connected.y - node.y;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              const force = dist * 0.01;
              fx += (dx / dist) * force;
              fy += (dy / dist) * force;
            }
          });

          // Center gravity
          const centerX = 400;
          const centerY = 300;
          const dx = centerX - node.x;
          const dy = centerY - node.y;
          fx += dx * 0.001;
          fy += dy * 0.001;

          // Update velocity and position
          node.vx = (node.vx + fx) * 0.85;
          node.vy = (node.vy + fy) * 0.85;
          node.x += node.vx;
          node.y += node.vy;

          // Keep in bounds
          node.x = Math.max(50, Math.min(750, node.x));
          node.y = Math.max(50, Math.min(550, node.y));
        }

        return updated;
      });
    };

    const interval = setInterval(animate, 50);
    return () => clearInterval(interval);
  }, []);

  // Render graph
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw connections
    graphNodes.forEach((node) => {
      node.connections.forEach((connId) => {
        const connected = graphNodes.find((n) => n.id === connId);
        if (connected) {
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(connected.x, connected.y);
          ctx.strokeStyle = node.isFraudulent || connected.isFraudulent
            ? "#C62828"
            : "#E0E0E0";
          ctx.lineWidth = node.isFraudulent || connected.isFraudulent ? 2 : 1;
          ctx.stroke();
        }
      });
    });

    // Draw nodes
    graphNodes.forEach((node) => {
      const size = node.type === "agency" ? 30 : 20;
      const isHovered = hoveredNode?.id === node.id;
      const isSelected = selectedNode?.id === node.id;

      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
      
      if (node.isFraudulent) {
        ctx.fillStyle = "#C62828";
      } else {
        const alpha = node.trustLevel / 100;
        ctx.fillStyle = `rgba(46, 125, 50, ${alpha})`;
      }
      
      ctx.fill();
      ctx.strokeStyle = isSelected || isHovered ? "#003366" : "#ffffff";
      ctx.lineWidth = isSelected || isHovered ? 3 : 2;
      ctx.stroke();

      // Trust level ring
      if (!node.isFraudulent) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, size + 4, 0, (node.trustLevel / 100) * 2 * Math.PI);
        ctx.strokeStyle = "#2E7D32";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  }, [graphNodes, selectedNode, hoveredNode]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clicked = graphNodes.find((node) => {
      const size = node.type === "agency" ? 30 : 20;
      const dist = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2);
      return dist <= size;
    });

    setSelectedNode(clicked || null);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hovered = graphNodes.find((node) => {
      const size = node.type === "agency" ? 30 : 20;
      const dist = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2);
      return dist <= size;
    });

    setHoveredNode(hovered || null);
    canvas.style.cursor = hovered ? "pointer" : "default";
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case "device":
        return <Wifi className="w-4 h-4" />;
      case "ip":
        return <Globe className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Network Graph</h3>
          <p className="text-xs text-gray-500">Fraud ring detection & connection analysis</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#2E7D32]" />
            <span>Trusted</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#C62828]" />
            <span>Fraudulent</span>
          </div>
        </div>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          className="border rounded bg-gray-50"
        />

        {/* Node Details Panel */}
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute top-4 right-4 bg-white border rounded-lg shadow-lg p-4 w-64"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {getNodeIcon(selectedNode.type)}
                <div>
                  <h4 className="font-semibold text-sm">{selectedNode.name}</h4>
                  <p className="text-xs text-gray-500 capitalize">{selectedNode.type}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close details"
              >
                ×
              </button>
            </div>

            {selectedNode.isFraudulent && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#C62828]" />
                <span className="text-xs text-[#C62828] font-medium">Fraud Alert</span>
              </div>
            )}

            <div className="space-y-2">
              <div>
                <div className="text-xs text-gray-500">Trust Level</div>
                <div className="font-semibold">{selectedNode.trustLevel}%</div>
              </div>
              {selectedNode.transactionVolume > 0 && (
                <div>
                  <div className="text-xs text-gray-500">Transaction Volume</div>
                  <div className="font-semibold">
                    ₹{(selectedNode.transactionVolume / 100000).toFixed(1)}L
                  </div>
                </div>
              )}
              <div>
                <div className="text-xs text-gray-500 mb-1">Connections</div>
                <div className="text-xs space-y-1">
                  {selectedNode.connections.slice(0, 5).map((connId) => {
                    const conn = graphNodes.find((n) => n.id === connId);
                    return conn ? (
                      <div
                        key={connId}
                        className="flex items-center justify-between p-1.5 bg-gray-50 rounded"
                      >
                        <span>{conn.name}</span>
                        {conn.isFraudulent && (
                          <AlertTriangle className="w-3 h-3 text-[#C62828]" />
                        )}
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
