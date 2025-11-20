import { useEffect, useMemo, useState } from "react";
import * as topojson from "topojson-client";
import MapLayer from "./MapLayer";

const dataUrl =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export default function SameLatMap() {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(dataUrl);
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const topo = await res.json();
        if (cancelled) return;
        const geo = topojson.feature(topo, topo.objects.countries);
        setFeatures(geo.features);
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
      <div className="relative overflow-hidden aspect-2/1">
        <MapLayer
          isOverlay={false}
          features={features}
          rotation={0}
          accentLatitudes={accentLatitudes}
          label=""
          className="absolute inset-0 pointer-events-none"
        />
        <MapLayer
          isOverlay={true}
          features={features}
          rotation={rotation}
          onRotate={setRotation}
          interactive
          accentLatitudes={accentLatitudes}
          label=""
          className="absolute inset-0 opacity-70 mix-blend-screen cursor-grab active:cursor-grabbing"
        />
      </div>
      <p className="pt-3 text-sm text-slate-300">
        Drag left or right—the map wraps so latitude lines stay aligned.
      </p>
    </div>
  );
}
