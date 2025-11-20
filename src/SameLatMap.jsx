import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as topojson from "topojson-client";
import MapLayer, { MAP_DIMENSIONS } from "./MapLayer";

const dataUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";
const usStatesUrl = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

function normalizeRotation(value) {
  const wrapped = ((value % 360) + 360) % 360;
  return wrapped > 180 ? wrapped - 360 : wrapped;
}

export default function SameLatMap() {
  const [features, setFeatures] = useState([]);
  const [stateFeatures, setStateFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [flipPoles, setFlipPoles] = useState(false);
  const dragBarRef = useRef(null);
  const mapContainerRef = useRef(null);
  const panFrameRef = useRef(null);
  const panWorkingRef = useRef(panOffset);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const [worldRes, statesRes] = await Promise.all([
          fetch(dataUrl),
          fetch(usStatesUrl),
        ]);
        if (!worldRes.ok) throw new Error(`Request failed: ${worldRes.status}`);
        if (!statesRes.ok)
          throw new Error(`Request failed: ${statesRes.status}`);
        const [worldTopo, statesTopo] = await Promise.all([
          worldRes.json(),
          statesRes.json(),
        ]);
        if (cancelled) return;
        const countries = topojson.feature(
          worldTopo,
          worldTopo.objects.countries
        );
        const states = topojson.feature(statesTopo, statesTopo.objects.states);
        setFeatures(countries.features);
        setStateFeatures(states.features);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const accentLatitudes = useMemo(() => [-60, -30, 0, 30, 60], []);
  const MIN_ZOOM = 0.8;
  const MAX_ZOOM = 10;
  const ZOOM_STEP = 1.2;

  const ENABLE_WHEEL_ZOOM = false;

  useEffect(() => {
    panWorkingRef.current = panOffset;
    return () => {
      if (panFrameRef.current !== null) {
        cancelAnimationFrame(panFrameRef.current);
        panFrameRef.current = null;
      }
    };
  }, [panOffset]);

  const adjustZoom = useCallback(
    (newZoom, anchor) => {
      let boundZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));
      let nextZoom = Number(boundZoom.toFixed(2));
      if (Math.abs(nextZoom - zoom) < 1e-4) {
        return;
      }
      let zoomRatio = nextZoom / zoom;
      setPanOffset((prev) => {
        if (!anchor) {
          return {
            x: prev.x * zoomRatio,
            y: prev.y * zoomRatio,
          };
        }
        return {
          x: (prev.x - anchor.x) * zoomRatio + anchor.x,
          y: (prev.y - anchor.y) * zoomRatio + anchor.y,
        };
      });
      setZoom(nextZoom);
    },
    [zoom]
  );

  const handleWheelZoom = useCallback(
    (event) => {
      if (!ENABLE_WHEEL_ZOOM || !mapContainerRef.current) return;
      event.preventDefault();
      const zoomFactor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      const rect = mapContainerRef.current.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      const offsetX = pointerX - rect.width / 2;
      const offsetY = pointerY - rect.height / 2;

      const scaleX = MAP_DIMENSIONS.width / rect.width;
      const scaleY = MAP_DIMENSIONS.height / rect.height;
      const anchor = {
        x: offsetX * scaleX,
        y: offsetY * scaleY,
      };

      adjustZoom(zoom * zoomFactor, anchor);
    },
    [zoom, adjustZoom]
  );

  const handlePanDrag = useCallback((dx, dy) => {
    panWorkingRef.current = {
      x: panWorkingRef.current.x + dx,
      y: panWorkingRef.current.y + dy,
    };

    if (panFrameRef.current !== null) return;

    panFrameRef.current = requestAnimationFrame(() => {
      setPanOffset(panWorkingRef.current);
      panFrameRef.current = null;
    });
  }, []);

  const handleDragBarPointerDown = useCallback(
    (event) => {
      if (!dragBarRef.current) return;
      event.preventDefault();
      dragBarRef.current.setPointerCapture?.(event.pointerId);

      const startX = event.clientX;
      const startRotation = rotation;
      const { width } = dragBarRef.current.getBoundingClientRect();
      const pixelsPerFullRotation = width || 1;
      const baseDegreesPerPixel = 360 / pixelsPerFullRotation;
      const degreesPerPixel = baseDegreesPerPixel / zoom;

      const handlePointerMove = (moveEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const nextRotation = normalizeRotation(
          startRotation + deltaX * degreesPerPixel
        );
        setRotation(nextRotation);
      };

      const cleanup = () => {
        dragBarRef.current?.releasePointerCapture?.(event.pointerId);
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", cleanup);
        window.removeEventListener("pointercancel", cleanup);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", cleanup);
      window.addEventListener("pointercancel", cleanup);
    },
    [rotation, zoom]
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-center text-slate-200 shadow-xl">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-300">
          Same latitude explorer
        </p>
        <p className="mt-2 text-sm text-slate-200">Loading world data…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-center text-slate-200 shadow-xl">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-300">
          Same latitude explorer
        </p>
        <p className="mt-2 text-sm text-red-300">
          Could not load map data: {error.message}
        </p>
        <p className="mt-1 text-sm text-slate-300">
          Check your connection and reload.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div
        ref={mapContainerRef}
        className="relative overflow-hidden aspect-2/1"
        onWheel={ENABLE_WHEEL_ZOOM ? handleWheelZoom : undefined}
      >
        <MapLayer
          isOverlay={false}
          features={features}
          stateFeatures={stateFeatures}
          rotation={0}
          zoom={zoom}
          panOffset={panOffset}
          accentLatitudes={accentLatitudes}
          label=""
          className="absolute inset-0 pointer-events-none"
        />
        <MapLayer
          isOverlay={true}
          features={features}
          stateFeatures={stateFeatures}
          rotation={rotation}
          zoom={zoom}
          panOffset={panOffset}
          flipPoles={flipPoles}
          onPan={handlePanDrag}
          interactive
          accentLatitudes={accentLatitudes}
          label=""
          className="absolute inset-0 opacity-70 mix-blend-screen cursor-grab active:cursor-grabbing"
        />

        <div className="absolute top-3 right-3 flex flex-col gap-2 text-slate-100">
          <div className=" flex items-center gap-2">
            <button
              type="button"
              onClick={() => adjustZoom(zoom / ZOOM_STEP)}
              disabled={zoom <= MIN_ZOOM + 1e-3}
              className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-100 shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Zoom out"
            >
              -
            </button>

            <button
              type="button"
              onClick={() => adjustZoom(zoom * ZOOM_STEP)}
              disabled={zoom >= MAX_ZOOM - 1e-3}
              className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-100 shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Zoom in"
            >
              +
            </button>
          </div>
        </div>
      </div>
      <div
        id={"drag-bar"}
        ref={dragBarRef}
        onPointerDown={handleDragBarPointerDown}
        className="h-8 w-full bg-slate-700 rounded-xl flex flex-row items-center justify-center select-none cursor-ew-resize mt-2"
      >
        Drag along this bar to adjust the overlay map
      </div>
      <div className="mt-2 flex gap-2">
        <button
          className="rounded bg-slate-700 px-3 py-1 text-sm font-semibold text-white transition hover:bg-slate-600 disabled:opacity-50"
          onClick={() => setRotation(0)}
          disabled={rotation === 0}
        >
          Reset
        </button>
        <button
          className="rounded bg-slate-800 px-3 py-1 text-sm font-semibold text-white transition hover:bg-slate-700"
          onClick={() => setFlipPoles((prev) => !prev)}
          aria-pressed={flipPoles}
        >
          {flipPoles ? "Unflip" : "Flip"}
        </button>
      </div>
    </div>
  );
}
