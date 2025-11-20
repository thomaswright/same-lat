import { useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";

const width = 960;
const height = 320;

function normalizeRotation(value) {
  const wrapped = ((value % 360) + 360) % 360;
  return wrapped > 180 ? wrapped - 360 : wrapped;
}

export default function MapLayer({
  features,
  rotation = 0,
  interactive = false,
  onRotate,
  label,
  accentLatitudes = [],
  className = "",
  style,
}) {
  const svgRef = useRef(null);

  const graticule = useMemo(() => d3.geoGraticule().step([30, 15])(), []);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.style("cursor", interactive ? "grab" : null);
    svg.selectAll("*").remove();

    const projection = d3
      .geoNaturalEarth1()
      .rotate([rotation, 0])
      .fitSize([width, height], { type: "Sphere" });

    const path = d3.geoPath(projection);

    svg
      .append("path")
      .attr("d", path({ type: "Sphere" }))
      .attr("fill", "var(--map-ocean)")
      .attr("stroke", "none");

    svg
      .append("path")
      .attr("d", path(graticule))
      .attr("fill", "none")
      .attr("stroke", "var(--map-grid)")
      .attr("stroke-width", 0.6)
      .attr("stroke-dasharray", "2 3");

    accentLatitudes.forEach((lat) => {
      const latPath = path({
        type: "LineString",
        coordinates: [
          [-180, lat],
          [180, lat],
        ],
      });
      svg
        .append("path")
        .attr("d", latPath)
        .attr("fill", "none")
        .attr("stroke", "var(--map-lat)")
        .attr("stroke-width", 1.6)
        .attr("stroke-dasharray", "6 5");
    });

    svg
      .append("g")
      .selectAll("path")
      .data(features)
      .join("path")
      .attr("d", path)
      .attr("fill", "var(--map-land)")
      .attr("stroke", "var(--map-outline)")
      .attr("stroke-width", 0.6);

    if (label) {
      svg
        .append("text")
        .attr("x", 16)
        .attr("y", 28)
        .attr("fill", "var(--text-weak)")
        .attr("font-size", 14)
        .attr("font-weight", 600)
        .attr("letter-spacing", 0.5)
        .text(label);
    }
  }, [features, graticule, rotation, accentLatitudes, label]);

  useEffect(() => {
    if (!interactive || !onRotate || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const bbox = svgRef.current.getBoundingClientRect();
    const pixelsPerRotation = bbox.width / 360;

    const dragBehavior = d3
      .drag()
      .on("start", () => {
        svg.classed("is-dragging", true);
        svg.style("cursor", "grabbing");
      })
      .on("drag", (event) => {
        const delta = -1 * (event.dx / pixelsPerRotation);
        onRotate((prev) => normalizeRotation(prev - delta));
      })
      .on("end", () => {
        svg.classed("is-dragging", false);
        svg.style("cursor", "grab");
      });

    svg.call(dragBehavior);
    return () => {
      svg.on(".drag", null);
    };
  }, [interactive, onRotate]);

  const baseClasses = [
    "w-full",
    "h-full",
    "transition-transform",
    "duration-150",
    "ease-out",
    interactive ? "cursor-grab active:cursor-grabbing" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <svg
      ref={svgRef}
      role="img"
      aria-label={label}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className={baseClasses}
      style={style}
    />
  );
}
