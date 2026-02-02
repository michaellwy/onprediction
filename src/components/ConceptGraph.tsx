"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import { motion, AnimatePresence } from "framer-motion";
import { ConceptGraphData, ConceptNode } from "@/types/concept";
import { getConnectedConcepts } from "@/lib/concepts";
import { getArticles } from "@/lib/articles";
import { cn } from "@/lib/utils";

interface ConceptGraphProps {
  graphData: ConceptGraphData;
}

interface SimulationNode extends ConceptNode {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  targetRadius?: number;
}

interface SimulationEdge {
  source: SimulationNode | string;
  target: SimulationNode | string;
  weight: number;
}

interface TooltipData {
  node: ConceptNode;
  x: number;
  y: number;
  connections: { concept: string; weight: number }[];
}

function getNodeRadius(frequency: number): number {
  return 5 + Math.sqrt(frequency) * 3;
}

export function ConceptGraph({ graphData }: ConceptGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const selectedNodeRef = useRef<string | null>(null);

  const articles = useMemo(() => getArticles(), []);
  const articleMap = useMemo(() => {
    const map = new Map<number, { title: string; url: string | null }>();
    articles.forEach((a) => map.set(a.id, { title: a.title || "", url: a.url }));
    return map;
  }, [articles]);

  // Frequency stats for scaling
  const maxFreq = useMemo(() => Math.max(...graphData.nodes.map((n) => n.frequency)), [graphData.nodes]);
  const minFreq = useMemo(() => Math.min(...graphData.nodes.map((n) => n.frequency)), [graphData.nodes]);

  // Color scale - warm colors for high frequency, cool for low
  const colorScale = useMemo(
    () => d3.scaleSequential(d3.interpolateYlOrRd).domain([minFreq, maxFreq]),
    [minFreq, maxFreq]
  );

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Initialize D3 simulation
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = dimensions;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) * 0.42;

    // Create deep copies for simulation
    // Calculate target radius based on frequency (high freq = center, low freq = edge)
    const nodes: SimulationNode[] = graphData.nodes.map((n) => {
      // Invert: high frequency = small radius (center), low frequency = large radius (edge)
      const normalizedFreq = (n.frequency - minFreq) / (maxFreq - minFreq || 1);
      const targetRadius = maxRadius * (1 - normalizedFreq * 0.85); // Keep some minimum distance from center
      return { ...n, targetRadius };
    });

    const edges: SimulationEdge[] = graphData.edges.map((e) => ({
      source: e.source,
      target: e.target,
      weight: e.weight,
    }));

    // Create container group for zoom
    const g = svg.append("g");

    // Zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.4, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Draw concentric guide rings
    const rings = g.append("g").attr("class", "rings");
    [0.25, 0.5, 0.75, 1].forEach((r, i) => {
      rings
        .append("circle")
        .attr("cx", centerX)
        .attr("cy", centerY)
        .attr("r", maxRadius * r)
        .attr("fill", "none")
        .attr("stroke", "hsl(var(--border))")
        .attr("stroke-opacity", 0.3)
        .attr("stroke-dasharray", i === 3 ? "none" : "4,4");
    });

    // Add ring labels
    rings
      .append("text")
      .attr("x", centerX)
      .attr("y", centerY - maxRadius * 0.12)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("fill", "hsl(var(--muted-foreground))")
      .attr("opacity", 0.5)
      .text("Core Concepts");

    rings
      .append("text")
      .attr("x", centerX)
      .attr("y", centerY - maxRadius * 0.95)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("fill", "hsl(var(--muted-foreground))")
      .attr("opacity", 0.5)
      .text("Emerging / Niche");

    // Radial force - pulls nodes toward their target radius from center
    function radialForce(alpha: number) {
      for (const node of nodes) {
        const dx = (node.x || centerX) - centerX;
        const dy = (node.y || centerY) - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const targetDist = node.targetRadius || maxRadius * 0.5;

        // Calculate force to move toward target radius
        const forceMagnitude = (targetDist - dist) * alpha * 0.1;
        const fx = (dx / dist) * forceMagnitude;
        const fy = (dy / dist) * forceMagnitude;

        node.vx = (node.vx || 0) + fx;
        node.vy = (node.vy || 0) + fy;
      }
    }

    // Create simulation
    const simulation = d3
      .forceSimulation<SimulationNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<SimulationNode, SimulationEdge>(edges)
          .id((d) => d.id)
          .distance(60)
          .strength((d) => Math.min(d.weight / 12, 0.5))
      )
      .force("charge", d3.forceManyBody().strength(-80).distanceMax(150))
      .force(
        "collision",
        d3.forceCollide<SimulationNode>().radius((d) => getNodeRadius(d.frequency) + 3).strength(0.7)
      )
      .force("radial", radialForce)
      .alphaDecay(0.02)
      .alphaMin(0.001)
      .velocityDecay(0.4);

    // Draw edges
    const link = g
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(edges)
      .join("line")
      .attr("stroke", "hsl(var(--muted-foreground))")
      .attr("stroke-opacity", (d) => Math.min(0.1 + d.weight * 0.08, 0.5))
      .attr("stroke-width", (d) => Math.min(0.5 + d.weight * 0.3, 2.5));

    // Draw nodes
    const nodeGroup = g.append("g").attr("class", "nodes");

    const node = nodeGroup
      .selectAll<SVGGElement, SimulationNode>("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer");

    // Add drag behavior
    const dragBehavior = d3
      .drag<SVGGElement, SimulationNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    node.call(dragBehavior);

    // Node circles colored by frequency
    node
      .append("circle")
      .attr("r", (d) => getNodeRadius(d.frequency))
      .attr("fill", (d) => colorScale(d.frequency))
      .attr("stroke", "hsl(var(--background))")
      .attr("stroke-width", 1.5)
      .attr("opacity", 0.9);

    // Node labels for high-frequency nodes
    node
      .filter((d) => d.frequency >= 5)
      .append("text")
      .text((d) => d.name.length > 18 ? d.name.slice(0, 16) + "..." : d.name)
      .attr("text-anchor", "middle")
      .attr("dy", (d) => getNodeRadius(d.frequency) + 10)
      .attr("font-size", "9px")
      .attr("font-weight", "500")
      .attr("fill", "hsl(var(--foreground))")
      .attr("opacity", 0.8)
      .attr("pointer-events", "none");

    // Helper functions
    const getConnectedIds = (nodeId: string) => {
      const connectedIds = new Set<string>([nodeId]);
      edges.forEach((e) => {
        const sourceId = typeof e.source === "string" ? e.source : e.source.id;
        const targetId = typeof e.target === "string" ? e.target : e.target.id;
        if (sourceId === nodeId) connectedIds.add(targetId);
        if (targetId === nodeId) connectedIds.add(sourceId);
      });
      return connectedIds;
    };

    const highlightNode = (nodeId: string, event?: MouseEvent) => {
      const connectedIds = getConnectedIds(nodeId);

      node.style("opacity", (n) => (connectedIds.has(n.id) ? 1 : 0.12));
      link.style("opacity", (l) => {
        const sourceId = typeof l.source === "string" ? l.source : l.source.id;
        const targetId = typeof l.target === "string" ? l.target : l.target.id;
        return sourceId === nodeId || targetId === nodeId ? 0.8 : 0.03;
      });

      node.select("circle")
        .attr("stroke", (n) => n.id === nodeId ? "hsl(var(--foreground))" : "hsl(var(--background))")
        .attr("stroke-width", (n) => n.id === nodeId ? 2.5 : 1.5);

      if (event) {
        const nodeData = nodes.find((n) => n.id === nodeId);
        if (nodeData) {
          const connections = getConnectedConcepts(nodeId, graphData);
          setTooltip({
            node: nodeData,
            x: event.pageX,
            y: event.pageY,
            connections,
          });
        }
      }
    };

    const resetHighlighting = () => {
      node.style("opacity", 1);
      link.style("opacity", (d) => Math.min(0.1 + d.weight * 0.08, 0.5));
      node.select("circle")
        .attr("stroke", "hsl(var(--background))")
        .attr("stroke-width", 1.5);
      setTooltip(null);
    };

    // Interactions
    node
      .on("mouseenter", function (event, d) {
        if (selectedNodeRef.current) return;
        highlightNode(d.id, event);
      })
      .on("mouseleave", function () {
        if (selectedNodeRef.current) return;
        resetHighlighting();
      })
      .on("click", function (event, d) {
        event.stopPropagation();
        if (selectedNodeRef.current === d.id) {
          selectedNodeRef.current = null;
          resetHighlighting();
        } else {
          selectedNodeRef.current = d.id;
          highlightNode(d.id, event);
        }
      });

    svg.on("click", () => {
      if (selectedNodeRef.current) {
        selectedNodeRef.current = null;
        resetHighlighting();
      }
    });

    // Update positions on tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as SimulationNode).x!)
        .attr("y1", (d) => (d.source as SimulationNode).y!)
        .attr("x2", (d) => (d.target as SimulationNode).x!)
        .attr("y2", (d) => (d.target as SimulationNode).y!);

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    // Initial zoom
    svg.call(
      zoom.transform,
      d3.zoomIdentity.translate(0, 0).scale(1)
    );

    return () => {
      simulation.stop();
    };
  }, [graphData, dimensions, colorScale, maxFreq, minFreq]);

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[500px]">
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} className="bg-background" />

      {/* Tooltip */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "fixed z-50 max-w-xs p-3 rounded-lg shadow-lg",
              "bg-card border border-border/50"
            )}
            style={{
              left: Math.min(tooltip.x + 10, dimensions.width - 280),
              top: tooltip.y + 10,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-3 h-3 rounded-full"
                style={{ background: colorScale(tooltip.node.frequency) }}
              />
              <h4 className="font-serif font-semibold text-foreground">
                {tooltip.node.name}
              </h4>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Mentioned in {tooltip.node.frequency} article{tooltip.node.frequency !== 1 ? "s" : ""}
            </p>

            {tooltip.connections.length > 0 && (
              <div className="mb-2">
                <p className="text-xs text-muted-foreground mb-1">Often appears with:</p>
                <div className="flex flex-wrap gap-1">
                  {tooltip.connections.slice(0, 5).map((conn) => (
                    <span
                      key={conn.concept}
                      className="px-1.5 py-0.5 text-[10px] bg-foreground/[0.06] rounded text-foreground/70"
                    >
                      {conn.concept} ({conn.weight})
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs text-muted-foreground mb-1">Sample articles:</p>
              <ul className="space-y-0.5">
                {tooltip.node.articles.slice(0, 3).map((articleId) => {
                  const article = articleMap.get(articleId);
                  if (!article) return null;
                  return (
                    <li key={articleId} className="text-xs text-foreground/70 line-clamp-1">
                      {article.title}
                    </li>
                  );
                })}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 p-3 bg-card/90 backdrop-blur-sm rounded-lg border border-border/50">
        <p className="text-[10px] text-muted-foreground mb-2 font-medium uppercase tracking-wide">Frequency</p>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-muted-foreground">{minFreq}</span>
          <div
            className="w-20 h-2 rounded-full"
            style={{
              background: `linear-gradient(to right, ${colorScale(minFreq)}, ${colorScale(maxFreq)})`
            }}
          />
          <span className="text-[9px] text-muted-foreground">{maxFreq}</span>
        </div>
        <p className="text-[9px] text-muted-foreground/60 mt-2 pt-2 border-t border-border/30">
          Center = core topics · Edge = emerging/niche
        </p>
        <p className="text-[9px] text-muted-foreground/60">
          Drag nodes · Scroll to zoom
        </p>
      </div>
    </div>
  );
}
