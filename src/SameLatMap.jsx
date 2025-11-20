import { useCallback, useEffect, useMemo, useState } from "react";
import * as topojson from "topojson-client";
import MapLayer from "./MapLayer";

const dataUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";
const usStatesUrl = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

export default function SameLatMap() {
  const [features, setFeatures] = useState([]);
  const [stateFeatures, setStateFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [flipPoles, setFlipPoles] = useState(false);

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
        if (!statesRes.ok) throw new Error(`Request failed: ${statesRes.status}`);
        const [worldTopo, statesTopo] = await Promise.all([
          worldRes.json(),
          statesRes.json(),
        ]);
        if (cancelled) return;
        const countries = topojson.feature(worldTopo, worldTopo.objects.countries);
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

  const adjustZoom = (newZoom) => {
    let boundZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));
    let nextZoom = Number(boundZoom.toFixed(2));
    let zoomRatio = nextZoom / zoom;
    setPanOffset((prev) => ({
      x: prev.x * zoomRatio,
      y: prev.y * zoomRatio,
    }));
    setZoom(nextZoom);
  };

  const handleWheelPan = useCallback((event) => {
    event.preventDefault();
    setPanOffset((prev) => ({
      x: prev.x - event.deltaX,
      y: prev.y - event.deltaY,
    }));
  }, []);

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
        onWheel={handleWheelPan}
        className="relative overflow-hidden aspect-2/1"
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
          onRotate={setRotation}
          interactive
          accentLatitudes={accentLatitudes}
          label=""
          className="absolute inset-0 opacity-70 mix-blend-screen cursor-grab active:cursor-grabbing"
        />
        <div className="absolute top-3 right-3 flex flex-col gap-2 text-slate-100">
          <div className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 shadow-xl backdrop-blur">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
              Zoom
            </p>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => adjustZoom(zoom / ZOOM_STEP)}
                disabled={zoom <= MIN_ZOOM + 1e-3}
                className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-sm font-semibold text-slate-100 shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Zoom out"
              >
                -
              </button>
              <span className="min-w-14 text-center text-sm font-semibold text-slate-50">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => adjustZoom(zoom * ZOOM_STEP)}
                disabled={zoom >= MAX_ZOOM - 1e-3}
                className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-sm font-semibold text-slate-100 shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Zoom in"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>
      <p className="pt-3 text-sm text-slate-300">
        Drag to overlay locations of the same latitude.
      </p>
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
