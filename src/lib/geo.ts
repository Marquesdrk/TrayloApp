import type { LatLng } from "./api"
export type Coord = [number, number] // [lng, lat]

export function haversine(a: LatLng, b: LatLng) {
  const R = 6371000, rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}
const dist = (a: Coord, b: Coord) => haversine({ lat: a[1], lng: a[0] }, { lat: b[1], lng: b[0] })
export function bearing(a: Coord, b: Coord) {
  const rad = Math.PI / 180, y = Math.sin((b[0] - a[0]) * rad) * Math.cos(b[1] * rad)
  const x = Math.cos(a[1] * rad) * Math.sin(b[1] * rad) - Math.sin(a[1] * rad) * Math.cos(b[1] * rad) * Math.cos((b[0] - a[0]) * rad)
  return (Math.atan2(y, x) / rad + 360) % 360
}

/** Posição ao longo da rota para um progresso t (0..1), com trecho já percorrido e restante. */
export function along(coords: Coord[], t: number) {
  if (coords.length < 2) return { pos: coords[0] ?? ([0, 0] as Coord), bearing: 0, done: [] as Coord[], todo: coords, covered: 0, total: 0 }
  const seg: number[] = []; let total = 0
  for (let i = 1; i < coords.length; i++) { const d = dist(coords[i - 1], coords[i]); seg.push(d); total += d }
  const target = Math.min(Math.max(t, 0), 1) * total
  let acc = 0, i = 0
  while (i < seg.length - 1 && acc + seg[i] < target) { acc += seg[i]; i++ }
  const f = seg[i] ? Math.min(1, (target - acc) / seg[i]) : 0
  const a = coords[i], b = coords[i + 1]
  const pos: Coord = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]
  return { pos, bearing: bearing(a, b), done: [...coords.slice(0, i + 1), pos], todo: [pos, ...coords.slice(i + 1)], covered: target, total }
}

/** Vizinho mais próximo a partir de uma origem. */
export function nearestOrder<T extends { address: LatLng }>(origin: LatLng, list: T[]): T[] {
  const rest = [...list], out: T[] = []; let cur = origin
  while (rest.length) {
    let bi = 0; rest.forEach((o, i) => { if (haversine(cur, o.address) < haversine(cur, rest[bi].address)) bi = i })
    const [n] = rest.splice(bi, 1); out.push(n); cur = n.address
  }
  return out
}
