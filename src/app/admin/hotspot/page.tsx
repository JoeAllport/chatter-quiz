"use client";

import { useEffect, useRef, useState } from "react";

type Shape = "rect" | "circle";
type Region =
  | { id: string; shape: "rect"; x: number; y: number; w: number; h: number; label?: string }
  | { id: string; shape: "circle"; cx: number; cy: number; r: number; label?: string };

export default function HotspotBuilder({
  searchParams,
}: {
  searchParams?: { img?: string; width?: string; height?: string };
}) {
  const imgSrc = searchParams?.img ?? "/media/example.jpg";
  const naturalW = Number(searchParams?.width ?? 1600);
  const naturalH = Number(searchParams?.height ?? 900);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [shape, setShape] = useState<Shape>("rect");
  const [regions, setRegions] = useState<Region[]>([]);
  const [drawing, setDrawing] = useState<{ x: number; y: number } | null>(null);

  // keep scale in sync with wrapper width
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setScale((el.clientWidth || naturalW) / naturalW);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [naturalW]);

  function clientToImageCoords(e: React.MouseEvent<HTMLDivElement>) {
    const b = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = (e.clientX - b.left) / scale;
    const y = (e.clientY - b.top) / scale;
    return { x: Math.max(0, Math.min(naturalW, x)), y: Math.max(0, Math.min(naturalH, y)) };
    }

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const p = clientToImageCoords(e);
    setDrawing({ x: p.x, y: p.y });
  };

  const onMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!drawing) return;
    const p = clientToImageCoords(e);
    if (shape === "rect") {
      const x = Math.min(drawing.x, p.x);
      const y = Math.min(drawing.y, p.y);
      const w = Math.abs(p.x - drawing.x);
      const h = Math.abs(p.y - drawing.y);
      if (w > 6 && h > 6) {
        setRegions((r) => [...r, { id: `r${r.length + 1}`, shape: "rect", x, y, w, h }]);
      }
    } else {
      const dx = p.x - drawing.x;
      const dy = p.y - drawing.y;
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r > 6)
        setRegions((R) => [...R, { id: `c${R.length + 1}`, shape: "circle", cx: drawing.x, cy: drawing.y, r }]);
    }
    setDrawing(null);
  };

  const removeAt = (id: string) => setRegions((r) => r.filter((x) => x.id !== id));

  const exportJSON = () =>
    JSON.stringify(
      {
        hotspotImage: { src: imgSrc, width: naturalW, height: naturalH },
        regions,
      },
      null,
      2
    );

  return (
    <main style={{ padding: 20, maxWidth: 980, margin: "0 auto" }}>
      <h1>Hotspot Builder</h1>
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <label>
          Shape:&nbsp;
          <select value={shape} onChange={(e) => setShape(e.target.value as Shape)}>
            <option value="rect">Rectangle</option>
            <option value="circle">Circle</option>
          </select>
        </label>
        <button
          onClick={() => setRegions([])}
          style={{ border: "1px solid #ddd", borderRadius: 8, padding: "6px 10px", background: "#fff" }}
        >
          Clear
        </button>
      </div>

      <div
        ref={wrapRef}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: `${naturalW}/${naturalH}`,
          borderRadius: 12,
          overflow: "hidden",
          background: "#f8fafc",
          cursor: "crosshair",
          marginBottom: 12,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />

        {/* regions */}
        {regions.map((r) =>
          r.shape === "rect" ? (
            <div
              key={r.id}
              title="Click to remove"
              onClick={(e) => {
                e.stopPropagation();
                removeAt(r.id);
              }}
              style={{
                position: "absolute",
                left: r.x * scale,
                top: r.y * scale,
                width: r.w * scale,
                height: r.h * scale,
                border: "2px dashed rgba(37,99,235,.6)",
                background: "rgba(37,99,235,.12)",
                borderRadius: 10,
              }}
            />
          ) : (
            <div
              key={r.id}
              title="Click to remove"
              onClick={(e) => {
                e.stopPropagation();
                removeAt(r.id);
              }}
              style={{
                position: "absolute",
                left: (r.cx - r.r) * scale,
                top: (r.cy - r.r) * scale,
                width: r.r * 2 * scale,
                height: r.r * 2 * scale,
                border: "2px dashed rgba(16,185,129,.7)",
                background: "rgba(16,185,129,.12)",
                borderRadius: "50%",
              }}
            />
          )
        )}
      </div>

      <p style={{ fontSize: 12, opacity: 0.7 }}>
        Tip: draw by dragging; click a region to remove. This exports image-relative coordinates.
      </p>

      <textarea
        value={exportJSON()}
        readOnly
        rows={10}
        style={{ width: "100%", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13 }}
      />

      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
        <button
          onClick={() => navigator.clipboard.writeText(exportJSON())}
          style={{ border: "1px solid #ddd", borderRadius: 8, padding: "8px 12px", background: "#fff" }}
        >
          Copy JSON
        </button>
      </div>
    </main>
  );
}
