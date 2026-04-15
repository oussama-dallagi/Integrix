import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

import { PointIntegrationMethod } from '../lib/numericalMethods';

interface PointsChartProps {
  pointsX: number[];
  pointsY: number[];
  n: number;
  method: PointIntegrationMethod;
}

export const PointsChart: React.FC<PointsChartProps> = ({ pointsX, pointsY, n, method }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

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
    if (!svgRef.current || pointsX.length < 2 || dimensions.width === 0 || dimensions.height === 0) {
      if (svgRef.current) d3.select(svgRef.current).selectAll("*").remove();
      return;
    }

    const margin = { top: 30, right: 40, bottom: 40, left: 50 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", dimensions.width)
      .attr("height", dimensions.height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xMin = d3.min<number>(pointsX) ?? 0;
    const xMax = d3.max<number>(pointsX) ?? 1;
    const yMin = d3.min<number>(pointsY) ?? 0;
    const yMax = d3.max<number>(pointsY) ?? 1;

    const xPadding = (xMax - xMin) * 0.1 || 1;
    const yPadding = (yMax - yMin) * 0.1 || 1;

    const xScale = d3.scaleLinear()
      .domain([xMin - xPadding, xMax + xPadding])
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
      .attr("font-size", "10px");

    svg.append("g")
      .call(d3.axisLeft(yScale).ticks(8))
      .attr("font-family", "inherit")
      .attr("font-size", "10px");

    // Zero line
    if (yMin - yPadding < 0 && yMax + yPadding > 0) {
      svg.append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", yScale(0))
        .attr("y2", yScale(0))
        .attr("stroke", "#94a3b8")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4 4");
    }

    // Draw Approximation Shapes
    const nToUse = Math.min(n, pointsX.length - 1);
    const accentColor = "#2563eb";

    // Helper for linear interpolation within the chart
    const getInterpolatedY = (xVal: number) => {
      const i = pointsX.findIndex((val, idx) => val <= xVal && (pointsX[idx+1] === undefined || pointsX[idx+1] >= xVal));
      if (i === -1) return pointsY[0];
      if (i === pointsX.length - 1) return pointsY[pointsY.length - 1];
      
      const x0 = pointsX[i];
      const x1 = pointsX[i+1];
      const y0 = pointsY[i];
      const y1 = pointsY[i+1];
      
      if (x1 === x0) return y0;
      return y0 + (xVal - x0) * (y1 - y0) / (x1 - x0);
    };

    for (let i = 0; i < nToUse; i++) {
      const x1 = pointsX[i];
      const x2 = pointsX[i+1];
      const y1 = pointsY[i];
      const y2 = pointsY[i+1];

      let polyPoints = "";
      
      if (method === 'rectangle_gauche_points') {
        polyPoints = `${xScale(x1)},${yScale(0)} ${xScale(x1)},${yScale(y1)} ${xScale(x2)},${yScale(y1)} ${xScale(x2)},${yScale(0)}`;
      } else if (method === 'rectangle_droite_points') {
        polyPoints = `${xScale(x1)},${yScale(0)} ${xScale(x1)},${yScale(y2)} ${xScale(x2)},${yScale(y2)} ${xScale(x2)},${yScale(0)}`;
      } else if (method === 'point_milieu_points') {
        const yMid = getInterpolatedY((x1 + x2) / 2);
        polyPoints = `${xScale(x1)},${yScale(0)} ${xScale(x1)},${yScale(yMid)} ${xScale(x2)},${yScale(yMid)} ${xScale(x2)},${yScale(0)}`;
      } else if (method === 'trapeze_points' || method === 'romberg_points') {
        polyPoints = `${xScale(x1)},${yScale(0)} ${xScale(x1)},${yScale(y1)} ${xScale(x2)},${yScale(y2)} ${xScale(x2)},${yScale(0)}`;
      } else if (method === 'simpson_points' || method === 'rk4_points') {
        // Visualize with trapezoids for simplicity, but solid line
        polyPoints = `${xScale(x1)},${yScale(0)} ${xScale(x1)},${yScale(y1)} ${xScale(x2)},${yScale(y2)} ${xScale(x2)},${yScale(0)}`;
      }
      
      svg.append("polygon")
        .attr("points", polyPoints)
        .attr("fill", accentColor)
        .attr("fill-opacity", 0.12)
        .attr("stroke", accentColor)
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", (method === 'simpson_points' || method === 'rk4_points') ? "none" : "3 2");
    }

    // Draw Line connecting points
    const line = d3.line<number>()
      .x((_, i) => xScale(pointsX[i]))
      .y((_, i) => yScale(pointsY[i]));

    svg.append("path")
      .datum(pointsX)
      .attr("fill", "none")
      .attr("stroke", "#0f172a")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Draw Points
    svg.selectAll(".dot")
      .data(pointsX)
      .enter()
      .append("circle")
      .attr("cx", (d: number) => xScale(d))
      .attr("cy", (_, i) => yScale(pointsY[i]))
      .attr("r", 4)
      .attr("fill", "#0f172a")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

  }, [pointsX, pointsY, n, dimensions]);

  return (
    <div ref={containerRef} className="w-full h-full bg-card relative overflow-hidden">
      <svg ref={svgRef} className="block" />
      <div className="absolute top-4 right-4 bg-white/95 p-3 border border-border rounded-lg shadow-sm text-[10px] flex flex-col gap-2 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full bg-[#0f172a] border-2 border-white"></span>
          <span className="font-semibold text-foreground">Points de données</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 bg-[#2563eb]/10 border border-[#2563eb] border-dashed rounded-sm"></span>
          <span className="font-semibold text-muted-foreground">
            Approximation ({method.split('_')[0].charAt(0).toUpperCase() + method.split('_')[0].slice(1)})
          </span>
        </div>
      </div>
    </div>
  );
};
