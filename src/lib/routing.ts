import { useEffect, useState } from "react"
import type { LatLng } from "./api"
import { haversine, type Coord } from "./geo"

export type Maneuver = "depart" | "straight" | "left" | "right" | "slight-left" | "slight-right" | "uturn" | "roundabout" | "arrive"
export interface Step { instruction: string; maneuver: Maneuver; distance: number; endAt: number } // endAt = metros acumulados
export interface Route { coords: Coord[]; distance: number; duration: number; steps: Step[]; fallback: boolean }

const cache = new Map<string, Route>()
const key = (p: LatLng[]) => p.map((x) => x.lat.toFixed(5) + "," + x.lng.toFixed(5)).join("|")

function toManeuver(type: string, mod?: string): Maneuver {
  if (type === "arrive") return "arrive"
  if (type === "depart") return "depart"
  if (type === "roundabout" || type === "rotary" || type === "roundabout turn") return "roundabout"
  switch (mod) {
    case "left": case "sharp left": return "left"
    case "right": case "sharp right": return "right"
    case "slight left": return "slight-left"
    case "slight right": return "slight-right"
    case "uturn": return "uturn"
    default: return "straight"
  }
}
function instructionPt(m: Maneuver, street: string) {
  const on = street ? ` na ${street}` : ""
  switch (m) {
    case "depart": return street ? `Siga pela ${street}` : "Siga em frente"
    case "left": return `Vire à esquerda${on}`
    case "right": return `Vire à direita${on}`
    case "slight-left": return `Mantenha-se à esquerda${on}`
    case "slight-right": return `Mantenha-se à direita${on}`
    case "uturn": return "Faça o retorno"
    case "roundabout": return `Entre na rotatória${street ? " e siga para " + street : ""}`
    case "arrive": return "Você chegou ao destino"
    default: return street ? `Continue pela ${street}` : "Continue em frente"
  }
}

function straight(points: LatLng[]): Route {
  const coords: Coord[] = []
  for (let i = 1; i < points.length; i++) {
    for (let k = 0; k < 20; k++) { const f = k / 20; coords.push([points[i - 1].lng + (points[i].lng - points[i - 1].lng) * f, points[i - 1].lat + (points[i].lat - points[i - 1].lat) * f]) }
  }
  const last = points[points.length - 1]; coords.push([last.lng, last.lat])
  let d = 0; for (let i = 1; i < points.length; i++) d += haversine(points[i - 1], points[i])
  return { coords, distance: d, duration: (d / 1000 / 25) * 3600, fallback: true, steps: [{ instruction: "Siga em direção ao destino", maneuver: "straight", distance: d, endAt: d }, { instruction: "Você chegou ao destino", maneuver: "arrive", distance: 0, endAt: d }] }
}

/** Rota real por vias (OSRM público); cai para linha reta se o serviço não responder. */
export async function fetchRoute(points: LatLng[]): Promise<Route> {
  const k = key(points); const hit = cache.get(k); if (hit) return hit
  try {
    const path = points.map((p) => `${p.lng},${p.lat}`).join(";")
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 8000)
    const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${path}?overview=full&geometries=geojson&steps=true`, { signal: ctl.signal })
    clearTimeout(to)
    const j = await r.json(); const rt = j.routes?.[0]; if (!rt) throw new Error("sem rota")
    let acc = 0; const steps: Step[] = []
    for (const leg of rt.legs) for (const s of leg.steps) {
      const m = toManeuver(s.maneuver.type, s.maneuver.modifier); acc += s.distance
      steps.push({ instruction: instructionPt(m, s.name || ""), maneuver: m, distance: s.distance, endAt: acc })
    }
    const out: Route = { coords: rt.geometry.coordinates, distance: rt.distance, duration: rt.duration, steps, fallback: false }
    cache.set(k, out); return out
  } catch {
    const out = straight(points); cache.set(k, out); return out
  }
}

export function useRoute(points: LatLng[] | null) {
  const [route, setRoute] = useState<Route | null>(null)
  const k = points ? key(points) : ""
  useEffect(() => {
    let live = true; setRoute(null)
    if (points && points.length > 1) fetchRoute(points).then((r) => live && setRoute(r))
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k])
  return route
}

/** Próxima manobra e distância até ela, dado o quanto da rota já foi percorrido (metros). */
export function currentStep(route: Route, covered: number) {
  const i = route.steps.findIndex((s) => s.endAt > covered)
  const idx = i < 0 ? route.steps.length - 1 : i
  const s = route.steps[idx]; const next = route.steps[Math.min(idx + 1, route.steps.length - 1)]
  return { step: next, current: s, toNext: Math.max(0, s.endAt - covered) }
}
