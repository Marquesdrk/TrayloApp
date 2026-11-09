import { useEffect, useState } from "react"

/** Re-renderiza quando o "banco" muda (nesta aba ou em outra) — tempo real simulado. */
export function useDbTick() {
  const [n, set] = useState(0)
  useEffect(() => {
    const f = () => set((x) => x + 1)
    window.addEventListener("storage", f); window.addEventListener("traylo:change", f)
    return () => { window.removeEventListener("storage", f); window.removeEventListener("traylo:change", f) }
  }, [])
  return n
}
export function useNow(ms = 1000) {
  const [t, set] = useState(Date.now())
  useEffect(() => { const i = setInterval(() => set(Date.now()), ms); return () => clearInterval(i) }, [ms])
  return t
}

/* toast mínimo */
type Listener = (m: string) => void
const ls = new Set<Listener>()
export const toast = (m: string) => ls.forEach((l) => l(m))
export function useToast() {
  const [msg, set] = useState("")
  useEffect(() => {
    let h: ReturnType<typeof setTimeout>
    const l: Listener = (m) => { set(m); clearTimeout(h); h = setTimeout(() => set(""), 3200) }
    ls.add(l); return () => { ls.delete(l); clearTimeout(h) }
  }, [])
  return msg
}
/** Executa uma ação da api exibindo o erro como toast. */
export function run<T>(fn: () => T): T | undefined {
  try { return fn() } catch (e) { toast((e as Error).message); return undefined }
}

/** Progresso simulado (0..1) de uma rota em andamento — igual para entregador e cliente. */
export const DEMO_ROUTE_MS = 150000
export const routeProgress = (startAt: number, now: number) => Math.min(1, Math.max(0, (now - startAt) / DEMO_ROUTE_MS))
