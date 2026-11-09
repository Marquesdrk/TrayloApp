import { useEffect, useRef, useState } from "react"
import maplibregl from "maplibre-gl"
import type { Coord } from "@/lib/geo"
import { cn } from "@/lib/utils"

export interface MapMarker { id: string; lng: number; lat: number; kind: "depot" | "stop" | "dest"; n?: number; label?: string; tag?: string; active?: boolean }
interface Props {
  className?: string
  markers?: MapMarker[]
  routeTodo?: Coord[]
  routeDone?: Coord[]
  courier?: { pos: Coord; bearing: number } | null
  /** "follow" = câmera 3D seguindo o veículo (estilo navegação); "overview" = enquadra a rota. */
  mode?: "overview" | "follow"
  fitKey?: string
  padding?: { top: number; bottom: number; left: number; right: number }
}

const STYLE = {
  light: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
}
const isDark = () => document.documentElement.classList.contains("dark")
const EMPTY = { type: "FeatureCollection", features: [] } as GeoJSON.FeatureCollection
const line = (c?: Coord[]): GeoJSON.FeatureCollection =>
  c && c.length > 1 ? { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: c } }] } : EMPTY

function markerEl(m: MapMarker) {
  const el = document.createElement("div")
  if (m.kind === "depot") {
    el.innerHTML = `<div style="width:36px;height:36px;border-radius:12px;background:linear-gradient(135deg,#1f5bff,#00d4b8);border:2.5px solid #fff;box-shadow:0 0 22px rgba(31,91,255,.75);display:grid;place-items:center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-6 9 6v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21V12h6v9"/></svg></div>`
  } else if (m.kind === "dest") {
    el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 4px 6px rgba(0,0,0,.35))"><svg width="34" height="44" viewBox="0 0 34 44"><path d="M17 43C17 43 3 28 3 17a14 14 0 0 1 28 0c0 11-14 26-14 26z" fill="#ff2e63" stroke="#fff" stroke-width="2.5"/><circle cx="17" cy="17" r="5.5" fill="#fff"/></svg></div>`
  } else {
    const bg = m.active ? "linear-gradient(135deg,#2f6bff,#6aa0ff)" : "linear-gradient(135deg,#00d4b8,#00b6d6)"
    const glow = m.active ? "rgba(47,107,255,.85)" : "rgba(0,212,184,.7)"
    el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:4px"><div style="width:${m.n ? 30 : 22}px;height:${m.n ? 30 : 22}px;border-radius:50%;background:${bg};color:#fff;border:2.5px solid #fff;box-shadow:0 0 18px ${glow};display:grid;place-items:center;font:800 13px 'Plus Jakarta Sans',system-ui">${m.n ?? ""}</div>${m.tag ? `<span style="position:absolute;top:100%;margin-top:4px;white-space:nowrap;padding:2px 8px;border-radius:99px;background:rgba(0,0,0,.78);color:#fff;border:1px solid rgba(255,255,255,.18);font:700 10.5px 'Plus Jakarta Sans',system-ui;letter-spacing:.02em">${m.tag}</span>` : ""}</div>`
  }
  if (m.label) el.title = m.label
  return el
}
function courierEl() {
  const el = document.createElement("div")
  el.style.cssText = "width:44px;height:44px;position:relative"
  el.innerHTML = `<div class="pulse-ring" style="position:absolute;inset:6px;border-radius:50%;background:#2f7bff"></div><svg width="44" height="44" viewBox="0 0 44 44" style="position:absolute;inset:0;filter:drop-shadow(0 0 10px rgba(47,123,255,.9))"><circle cx="22" cy="22" r="11" fill="#2f7bff" stroke="#fff" stroke-width="3.5"/><path d="M22 3.5l7 11h-14z" fill="#2f7bff" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></svg>`
  return el
}

export function GpsMap({ className, markers = [], routeTodo, routeDone, courier, mode = "overview", fitKey, padding }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const mk = useRef<maplibregl.Marker[]>([])
  const cm = useRef<maplibregl.Marker | null>(null)
  const latest = useRef({ routeTodo, routeDone })
  latest.current = { routeTodo, routeDone }
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  const ensureLayers = () => {
    const m = map.current; if (!m) return
    const dark = isDark()
    if (!m.getSource("done")) m.addSource("done", { type: "geojson", data: line(latest.current.routeDone) })
    if (!m.getSource("todo")) m.addSource("todo", { type: "geojson", data: line(latest.current.routeTodo) })
    const lay = (id: string, src: string, paint: maplibregl.LineLayerSpecification["paint"]) => {
      if (!m.getLayer(id)) m.addLayer({ id, type: "line", source: src, layout: { "line-cap": "round", "line-join": "round" }, paint })
    }
    lay("done-case", "done", { "line-color": dark ? "#000000" : "#ffffff", "line-width": 9, "line-opacity": 0.9 })
    lay("done", "done", { "line-color": dark ? "#3a4252" : "#aab4c4", "line-width": 5.5 })
    lay("todo-glow", "todo", { "line-color": dark ? "#2f7bff" : "#1f5bff", "line-width": 20, "line-blur": 12, "line-opacity": dark ? 0.55 : 0.25 })
    lay("todo-case", "todo", { "line-color": dark ? "#000000" : "#ffffff", "line-width": 11 })
    lay("todo", "todo", { "line-color": dark ? "#4d8dff" : "#1f5bff", "line-width": 7 })
    lay("todo-core", "todo", { "line-color": dark ? "#9fc3ff" : "#5b8cff", "line-width": 2, "line-opacity": 0.8 })
    if (dark) { // preto puro no escuro: casa com o app
      const set = (id: string, prop: string, v: string) => { try { if (m.getLayer(id)) m.setPaintProperty(id, prop, v) } catch { /* camada ausente */ } }
      set("background", "background-color", "#000000"); set("water", "fill-color", "#040b1c")
    }
  }

  // criação do mapa
  useEffect(() => {
    if (!box.current) return
    try {
      const m = new maplibregl.Map({
        container: box.current, style: isDark() ? STYLE.dark : STYLE.light, center: [-51.1495, -29.7612], zoom: 12.5,
        attributionControl: { compact: true }, pitchWithRotate: true,
      })
      map.current = m
      m.on("load", () => { ensureLayers(); setReady(true) })
      m.on("error", (e) => { if ((e as { error?: Error }).error?.message?.includes("WebGL")) setFailed(true) })
      const obs = new MutationObserver(() => { m.setStyle(isDark() ? STYLE.dark : STYLE.light); m.once("style.load", ensureLayers) })
      obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
      const ro = new ResizeObserver(() => m.resize()); ro.observe(box.current)
      return () => { obs.disconnect(); ro.disconnect(); m.remove(); map.current = null; setReady(false) }
    } catch { setFailed(true) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // rota
  useEffect(() => {
    const m = map.current; if (!ready || !m) return
    ;(m.getSource("todo") as maplibregl.GeoJSONSource | undefined)?.setData(line(routeTodo))
    ;(m.getSource("done") as maplibregl.GeoJSONSource | undefined)?.setData(line(routeDone))
  }, [ready, routeTodo, routeDone])

  // marcadores
  useEffect(() => {
    const m = map.current; if (!ready || !m) return
    mk.current.forEach((x) => x.remove())
    mk.current = markers.map((d) => new maplibregl.Marker({ element: markerEl(d), anchor: d.kind === "dest" ? "bottom" : "center" }).setLngLat([d.lng, d.lat]).addTo(m))
  }, [ready, markers])

  // veículo
  useEffect(() => {
    const m = map.current; if (!ready || !m) return
    if (!courier) { cm.current?.remove(); cm.current = null; return }
    if (!cm.current) cm.current = new maplibregl.Marker({ element: courierEl(), rotationAlignment: "map", pitchAlignment: "map" }).setLngLat(courier.pos).addTo(m)
    cm.current.setLngLat(courier.pos).setRotation(courier.bearing)
    if (mode === "follow") m.easeTo({ center: courier.pos, zoom: 16.2, pitch: 55, bearing: courier.bearing, duration: 1100, easing: (t) => t, padding: { top: 140, bottom: 260, left: 0, right: 0 } })
  }, [ready, courier, mode])

  // enquadramento (visão geral)
  useEffect(() => {
    const m = map.current; if (!ready || !m || mode === "follow") return
    const pts: Coord[] = [...markers.map((d) => [d.lng, d.lat] as Coord), ...(routeTodo ?? []), ...(routeDone ?? [])]
    if (!pts.length) return
    const b = new maplibregl.LngLatBounds(pts[0], pts[0]); pts.forEach((p) => b.extend(p))
    m.easeTo({ pitch: 0, bearing: 0, duration: 400, padding: { top: 0, bottom: 0, left: 0, right: 0 } })
    m.fitBounds(b, { padding: padding ?? { top: 90, bottom: 280, left: 40, right: 40 }, maxZoom: 16, duration: 800 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, fitKey, mode, markers.length, routeTodo?.length === 0 ? 0 : (routeTodo?.length ?? 0) > 0 ? 1 : 0])

  if (failed) return <div className={cn("grid place-items-center bg-muted text-sm text-muted-foreground", className)}>Não foi possível carregar o mapa (WebGL indisponível).</div>
  return <div ref={box} className={cn("bg-muted", className)} />
}
