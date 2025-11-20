import { useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";

export const MAP_DIMENSIONS = { width: 700, height: 400 };
const { width, height } = MAP_DIMENSIONS;

export default function MapLayer({
  isOverlay,
  features,
  stateFeatures = [],
  rotation = 0,
  zoom = 1,
  panOffset = { x: 0, y: 0 },
  flipPoles = false,
  interactive = false,
  onPan,
  label,
  accentLatitudes = [],
  className = "",
  style,
}) {
  const svgRef = useRef(null);
  const layersRef = useRef(null);

  const graticule = useMemo(() => d3.geoGraticule().step([30, 15])(), []);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.style("cursor", interactive ? "grab" : null);

    if (!layersRef.current) {
      const ocean = svg.append("path").attr("stroke", "none");
      const graticulePath = svg
        .append("path")
        .attr("fill", "none")
        .attr("stroke-width", 0.6)
        .attr("stroke-dasharray", "2 3");
      const accentGroup = svg.append("g");
      const countriesGroup = svg.append("g");
      const statesGroup = svg.append("g");
      const labelElement = svg.append("text").attr("x", 16).attr("y", 28);

      layersRef.current = {
        ocean,
        graticulePath,
        accentGroup,
        countriesGroup,
        statesGroup,
        labelElement,
      };
    }

    const {
      ocean,
      graticulePath,
      accentGroup,
      countriesGroup,
      statesGroup,
      labelElement,
    } = layersRef.current;

    const baseProjection = d3
      .geoNaturalEarth1()
      .rotate([rotation, 0])
      .reflectY(flipPoles)
      .fitSize([width, height], { type: "Sphere" });

    const scaledProjection = baseProjection.scale(
      baseProjection.scale() * zoom
    );
    const [tx, ty] = baseProjection.translate();
    const projection = scaledProjection.translate([
      tx + panOffset.x,
      ty + panOffset.y,
    ]);

    const path = d3.geoPath(projection);

    ocean.attr("d", path({ type: "Sphere" })).attr(
      "fill",
      isOverlay ? "none" : "var(--map-ocean)"
    );

    graticulePath
      .attr("d", path(graticule))
      .attr("stroke", isOverlay ? "none" : "var(--map-grid)");

    accentGroup
      .selectAll("path")
      .data(accentLatitudes)
      .join(
        (enter) =>
          enter
            .append("path")
            .attr("fill", "none")
            .attr("stroke-width", 1.6)
            .attr("stroke-dasharray", "6 5"),
        (update) => update,
        (exit) => exit.remove()
      )
      .attr("stroke", isOverlay ? "none" : "var(--map-lat)")
      .attr("d", (lat) =>
        path({
          type: "LineString",
          coordinates: [
            [-180, lat],
            [180, lat],
          ],
        })
      );

    countriesGroup
      .selectAll("path")
      .data(features)
      .join(
        (enter) =>
          enter
            .append("path")
            .attr("stroke-width", 0.6)
            .attr("vector-effect", "non-scaling-stroke"),
        (update) => update,
        (exit) => exit.remove()
      )
      .attr("fill", isOverlay ? "var(--map-land-overlay)" : "var(--map-land)")
      .attr(
        "stroke",
        isOverlay ? "var(--map-outline-overlay)" : "var(--map-outline)"
      )
      .attr("d", path);

    statesGroup
      .selectAll("path")
      .data(stateFeatures)
      .join(
        (enter) =>
          enter
            .append("path")
            .attr("fill", "none")
            .attr("stroke-width", 0.4)
            .attr("vector-effect", "non-scaling-stroke"),
        (update) => update,
        (exit) => exit.remove()
      )
      .attr(
        "stroke",
        isOverlay
          ? "var(--map-state-outline-overlay)"
          : "var(--map-state-outline)"
      )
      .attr("d", path);

    if (label) {
      labelElement
        .attr("fill", "var(--text-weak)")
        .attr("font-size", 14)
        .attr("font-weight", 600)
        .attr("letter-spacing", 0.5)
        .text(label)
        .attr("display", null);
    } else {
      labelElement.text("").attr("display", "none");
    }
  }, [
    features,
    graticule,
    rotation,
    zoom,
    panOffset,
    flipPoles,
    stateFeatures,
    accentLatitudes,
    label,
    interactive,
    isOverlay,
  ]);

  useEffect(() => {
    if (!interactive || !onPan || !svgRef.current) return;

    const svg = d3.select(svgRef.current);

    const dragBehavior = d3
      .drag()
      .on("start", () => {
        svg.classed("is-dragging", true);
        svg.style("cursor", "grabbing");
      })
      .on("drag", (event) => {
        onPan(event.dx, event.dy);
      })
      .on("end", () => {
        svg.classed("is-dragging", false);
        svg.style("cursor", "grab");
      });

    svg.call(dragBehavior);
    return () => {
      svg.on(".drag", null);
    };
  }, [interactive, onPan]);

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
