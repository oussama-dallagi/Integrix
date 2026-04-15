import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { IntegrationMethod, isValidFunction } from '@/src/lib/numericalMethods';
import { create, all } from 'mathjs';

const math = create(all);

interface IntegrationChartProps {
  f: string;
  a: number;
  b: number;
  n: number;
  selectedMethod: IntegrationMethod;
}

export const IntegrationChart: React.FC<IntegrationChartProps> = ({ f, a, b, n, selectedMethod }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Handle Resize
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || !isValidFunction(f) || dimensions.width === 0 || dimensions.height === 0) {
      if (svgRef.current) d3.select(svgRef.current).selectAll("*").remove();
      return;
    }

    const margin = { top: 30, right: 40, bottom: 40, left: 50 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", dimensions.width)
      .attr("height", dimensions.height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Compile function for performance
    let evaluator: (x: number) => number;
    try {
      const node = math.parse(f);
      const code = node.compile();
      evaluator = (x: number) => {
        try {
          const val = code.evaluate({ x });
          return typeof val === 'number' ? val : NaN;
        } catch {
          return NaN;
        }
      };
    } catch {
      return;
    }

    // Data for the curve
    const xStart = Math.min(a, b);
    const xEnd = Math.max(a, b);
    const range = xEnd - xStart || 1;
    // Dynamic padding based on range
    const padding = range * 0.2; 
    const xMin = xStart - padding;
    const xMax = xEnd + padding;
    
    const points: { x: number, y: number }[] = [];
    const resolution = 600; // Increased resolution for better accuracy
    for (let i = 0; i <= resolution; i++) {
      const x = xMin + (i / resolution) * (xMax - xMin);
      const y = evaluator(x);
      // Filter out non-finite values and extreme values that break scaling
      if (!isNaN(y) && isFinite(y) && Math.abs(y) < 1e10) {
        points.push({ x, y });
      }
    }

    if (points.length === 0) return;

    // Robust Y scaling: use percentiles to ignore extreme asymptotic spikes
    const yValues = points.map(p => p.y).sort((a, b) => a - b);
    const p5 = yValues[Math.floor(yValues.length * 0.05)];
    const p95 = yValues[Math.floor(yValues.length * 0.95)];
    const yRange = p95 - p5 || 1;
    
    // Allow some overflow but clip extreme spikes
    const yMinLimit = p5 - yRange * 2;
    const yMaxLimit = p95 + yRange * 2;

    const finalPoints = points.filter(p => p.y >= yMinLimit && p.y <= yMaxLimit);
    
    const yMin = d3.min(finalPoints, d => d.y)!;
    const yMax = d3.max(finalPoints, d => d.y)!;
    const yPadding = (yMax - yMin) * 0.1 || 1;

    const xScale = d3.scaleLinear()
      .domain([xMin, xMax])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([yMin - yPadding, yMax + yPadding])
      .range([height, 0]);

    // Grid lines
    svg.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(10).tickSize(-height).tickFormat(() => ""))
      .attr("stroke", "#f1f5f9")
      .attr("stroke-opacity", 0.5);

    svg.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(yScale).ticks(10).tickSize(-width).tickFormat(() => ""))
      .attr("stroke", "#f1f5f9")
      .attr("stroke-opacity", 0.5);

    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(8))
      .attr("font-family", "inherit")
      .attr("font-size", "10px")
      .attr("color", "#64748b");

    svg.append("g")
      .call(d3.axisLeft(yScale).ticks(8))
      .attr("font-family", "inherit")
      .attr("font-size", "10px")
      .attr("color", "#64748b");

    // Zero line
    const yDomain = yScale.domain();
    if (yDomain[0] <= 0 && yDomain[1] >= 0) {
      svg.append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", yScale(0))
        .attr("y2", yScale(0))
        .attr("stroke", "#94a3b8")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4 4");
    }

    // Draw the area under the curve for the selected method
    const h = (b - a) / n;
    const methodGroup = svg.append("g").attr("class", "method-shapes");

    for (let i = 0; i < n; i++) {
      const x_i = a + i * h;
      const x_next = a + (i + 1) * h;
      const accentColor = "#2563eb";

      if (selectedMethod === 'rectangle_gauche') {
        const y = evaluator(x_i);
        drawRectangle(methodGroup, xScale(x_i), xScale(x_next), yScale(0), yScale(y), accentColor);
      } else if (selectedMethod === 'rectangle_droite') {
        const y = evaluator(x_next);
        drawRectangle(methodGroup, xScale(x_i), xScale(x_next), yScale(0), yScale(y), accentColor);
      } else if (selectedMethod === 'point_milieu') {
        const y = evaluator(x_i + h / 2);
        drawRectangle(methodGroup, xScale(x_i), xScale(x_next), yScale(0), yScale(y), accentColor);
      } else if (selectedMethod === 'trapeze' || selectedMethod === 'romberg' || selectedMethod === 'rk4') {
        const y1 = evaluator(x_i);
        const y2 = evaluator(x_next);
        drawTrapezoid(methodGroup, xScale(x_i), xScale(x_next), yScale(0), yScale(y1), yScale(y2), accentColor);
      } else if (selectedMethod === 'lin_log') {
        const y1 = evaluator(x_i);
        const y2 = evaluator(x_next);
        drawLinLog(methodGroup, x_i, x_next, y1, y2, xScale, yScale, accentColor);
      } else if (selectedMethod === 'simpson') {
        const y1 = evaluator(x_i);
        const y2 = evaluator(x_i + h / 2);
        const y3 = evaluator(x_next);
        drawParabola(methodGroup, x_i, x_i + h / 2, x_next, y1, y2, y3, xScale, yScale, accentColor);
      }
    }

    // Draw the main curve
    const line = d3.line<{ x: number, y: number }>()
      .x(d => xScale(d.x))
      .y(d => yScale(d.y))
      .curve(d3.curveLinear); // Use linear for exact plotting without smoothing artifacts

    svg.append("path")
      .datum(points)
      .attr("fill", "none")
      .attr("stroke", "#0f172a")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Helper functions
    function drawRectangle(group: any, x1: number, x2: number, yBase: number, yTop: number, color: string) {
      const yStart = Math.min(yBase, yTop);
      const height = Math.abs(yBase - yTop);
      group.append("rect")
        .attr("x", x1)
        .attr("y", yStart)
        .attr("width", x2 - x1)
        .attr("height", height)
        .attr("fill", color)
        .attr("fill-opacity", 0.12)
        .attr("stroke", color)
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "3 2");
    }

    function drawTrapezoid(group: any, x1: number, x2: number, yBase: number, y1: number, y2: number, color: string) {
      const points = `${x1},${yBase} ${x1},${y1} ${x2},${y2} ${x2},${yBase}`;
      group.append("polygon")
        .attr("points", points)
        .attr("fill", color)
        .attr("fill-opacity", 0.12)
        .attr("stroke", color)
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "3 2");
    }

    function drawParabola(group: any, x1: number, x2: number, x3: number, y1: number, y2: number, y3: number, xScale: any, yScale: any, color: string) {
      const parabolaPoints: {x: number, y: number}[] = [];
      const res = 15;
      for (let j = 0; j <= res; j++) {
        const x = x1 + (j / res) * (x3 - x1);
        const L1 = ((x - x2) * (x - x3)) / ((x1 - x2) * (x1 - x3));
        const L2 = ((x - x1) * (x - x3)) / ((x2 - x1) * (x2 - x3));
        const L3 = ((x - x1) * (x - x2)) / ((x3 - x1) * (x3 - x2));
        const y = y1 * L1 + y2 * L2 + y3 * L3;
        parabolaPoints.push({ x, y });
      }

      const areaPath = d3.area<{x: number, y: number}>()
        .x(d => xScale(d.x))
        .y0(yScale(0))
        .y1(d => yScale(d.y));

      group.append("path")
        .datum(parabolaPoints)
        .attr("fill", color)
        .attr("fill-opacity", 0.12)
        .attr("stroke", color)
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "3 2")
        .attr("d", areaPath);
    }

    function drawLinLog(group: any, x1: number, x2: number, y1: number, y2: number, xScale: any, yScale: any, color: string) {
      if (y1 <= 0 || y2 <= 0 || Math.abs(y1 - y2) < 1e-12) {
        drawTrapezoid(group, xScale(x1), xScale(x2), yScale(0), yScale(y1), yScale(y2), color);
        return;
      }

      const logPoints: {x: number, y: number}[] = [];
      const res = 15;
      const k = Math.log(y2 / y1) / (x2 - x1);
      
      for (let j = 0; j <= res; j++) {
        const x = x1 + (j / res) * (x2 - x1);
        const y = y1 * Math.exp(k * (x - x1));
        logPoints.push({ x, y });
      }

      const areaPath = d3.area<{x: number, y: number}>()
        .x(d => xScale(d.x))
        .y0(yScale(0))
        .y1(d => yScale(d.y));

      group.append("path")
        .datum(logPoints)
        .attr("fill", color)
        .attr("fill-opacity", 0.12)
        .attr("stroke", color)
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "3 2")
        .attr("d", areaPath);
    }

  }, [f, a, b, n, selectedMethod, dimensions]);

  return (
    <div ref={containerRef} className="w-full h-full bg-card relative overflow-hidden">
      <svg ref={svgRef} className="block" />
      <div className="absolute top-4 right-4 bg-white/95 p-3 border border-border rounded-lg shadow-sm text-[10px] flex flex-col gap-2 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="w-4 h-0.5 bg-[#0f172a]"></span>
          <span className="font-semibold text-foreground">f(x) = {f}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 bg-[#2563eb]/10 border border-[#2563eb] border-dashed rounded-sm"></span>
          <span className="font-semibold text-muted-foreground">Approximation</span>
        </div>
      </div>
    </div>
  );
};
