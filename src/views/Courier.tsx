import { useMemo } from "react"
import { ArrowUp, ArrowUpLeft, ArrowUpRight, CornerUpLeft, CornerUpRight, Flag, LogOut, MapPin, Navigation, RefreshCw, Undo2, WifiOff, Wifi, CheckCircle2, Clock } from "lucide-react"
import { DEPOT, api, goOffline, goOnline, isOffline, nowMs, offlineCache, pushQueued, queueOf, setSession, type Order, type Session, type Status, type User } from "@/lib/api"
import { along, nearestOrder } from "@/lib/geo"
import { currentStep, useRoute, type Maneuver } from "@/lib/routing"
import { routeProgress, run, toast, useDbTick, useNow } from "@/lib/hooks"
import { cn, fmtDT, fmtTime, kmFmt } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { GpsMap, type MapMarker } from "@/components/GpsMap"
import { PhoneShell, Sheet } from "@/components/PhoneShell"

const ICON: Record<Maneuver, typeof ArrowUp> = { depart: ArrowUp, straight: ArrowUp, left: CornerUpLeft, right: CornerUpRight, "slight-left": ArrowUpLeft, "slight-right": ArrowUpRight, uturn: Undo2, roundabout: RefreshCw, arrive: Flag }

export function Courier({ user, session }: { user: User; session: Session | null }) {
  useDbTick(); const now = useNow(1000)
  const off = isOffline(), queue = queueOf(user.id)
  const base: Order[] = off ? offlineCache() : api.orders(session)
  const eff = (o: Order): Status => queue.filter((q) => q.id === o.id).pop()?.to ?? o.status
  const startOf = (o: Order) => queue.find((q) => q.id === o.id && q.to === "em_rota")?.at ?? o.events.find((e) => e.status === "em_rota")?.at ?? Date.now()

  const open = nearestOrder(DEPOT, base.filter((o) => ["aguardando_coleta", "em_rota"].includes(eff(o))))
  const active = open.find((o) => eff(o) === "em_rota")
  const doneCount = base.filter((o) => eff(o) === "entregue").length

  const pts = useMemo(() => (active ? [DEPOT, active.address] : open.length ? [DEPOT, ...open.map((o) => o.address)] : null), [active?.id, open.map((o) => o.id).join()])
  const route = useRoute(pts)
  const p = active ? routeProgress(startOf(active), now) : 0
  const geo = route ? along(route.coords, active ? p : 0) : null
  const nav = route && active && geo ? currentStep(route, geo.covered) : null
  const remainMin = route ? Math.max(1, Math.round((route.duration * (1 - p)) / 60)) : 0
  const arrived = !!active && p >= 0.98

  const markers: MapMarker[] = useMemo(() => [
    { id: "dep", kind: "depot", lng: DEPOT.lng, lat: DEPOT.lat },
    ...(active ? [{ id: active.id, kind: "dest" as const, lng: active.address.lng, lat: active.address.lat }] : open.map((o, i) => ({ id: o.id, kind: "stop" as const, n: i + 1, lng: o.address.lng, lat: o.address.lat, active: i === 0 }))),
  ], [active?.id, open.map((o) => o.id).join()])

  const act = (o: Order) => {
    const from = eff(o), to: Status = from === "aguardando_coleta" ? "em_rota" : "entregue"
    if (off) { pushQueued(user.id, { id: o.id, from, to, at: nowMs() }); toast("Salvo offline; será sincronizado.") }
    else run(() => api.advance(session, o.id, { from }))
  }
  const toggleOffline = () => {
    if (!off) { goOffline(session); toast("Sem sinal (simulado). Usando rota em cache.") }
    else { const r = goOnline(session); toast(`Sincronizado: ${r.ok} ação(ões)${r.conflicts ? `, ${r.conflicts} conflito(s) ignorado(s)` : ""}.`) }
  }
  const Ico = nav ? ICON[nav.step.maneuver] : Navigation

  return (
    <PhoneShell>
      <GpsMap className="absolute inset-0" mode={active ? "follow" : "overview"} markers={markers} routeTodo={geo?.todo} routeDone={active ? geo?.done : undefined} courier={active && geo ? { pos: geo.pos, bearing: geo.bearing } : null} fitKey={open.map((o) => o.id).join() + String(!!active)} padding={{ top: 110, bottom: 340, left: 40, right: 40 }} />

      {/* banner de navegação (estilo Maps/Waze) */}
      <div className="absolute inset-x-0 top-0 z-10 space-y-2 p-3">
        {nav ? (
          <div className="flex items-center gap-4 rounded-3xl border border-white/10 bg-black/85 p-4 text-white shadow-[0_20px_50px_-12px_rgba(0,0,0,.8)] backdrop-blur-xl">
            <span className="bg-brand grid h-[4.25rem] w-[4.25rem] shrink-0 place-items-center rounded-2xl shadow-[0_8px_24px_-6px_hsl(var(--primary)/.9)]"><Ico className="h-9 w-9" strokeWidth={2.8} /></span>
            <div className="min-w-0"><p className="text-[2rem] font-extrabold leading-none tracking-tight">{arrived ? "Chegou" : kmFmt(nav.toNext)}</p><p className="mt-1.5 line-clamp-2 text-[14px] font-medium leading-snug text-white/75">{arrived ? "Você está no destino da entrega" : nav.step.instruction}</p></div>
          </div>
        ) : (
          <div className="glass rounded-3xl px-5 py-4">
            <p className="eyebrow">Sua rota</p>
            <p className="mt-0.5 text-xl font-extrabold leading-tight">Olá, {user.name.split(" ")[0]}</p>
            <p className="mt-1 text-[13px] text-muted-foreground"><b className="text-foreground">{open.length}</b> {open.length === 1 ? "parada" : "paradas"}{route && !route.fallback ? <> · <b className="text-foreground">{kmFmt(route.distance)}</b> · ~<b className="text-foreground">{Math.round(route.duration / 60) + open.length * 4} min</b></> : ""} · {doneCount} {doneCount === 1 ? "concluída" : "concluídas"}</p>
          </div>
        )}
        <div className="flex items-center justify-between">
          <button onClick={toggleOffline} className={cn("flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold", off ? "bg-destructive text-destructive-foreground shadow-[0_0_20px_-4px_hsl(var(--destructive))]" : "glass")}>{off ? <WifiOff className="h-3.5 w-3.5" /> : <Wifi className="h-3.5 w-3.5 text-success" />}{off ? "Sem sinal · toque para sincronizar" : "Online"}</button>
          <button onClick={() => setSession(null)} aria-label="Sair" className="glass grid h-9 w-9 place-items-center rounded-full"><LogOut className="h-4 w-4" /></button>
        </div>
        {queue.length > 0 && <div className="rounded-xl border border-warning/30 bg-warning/15 px-3.5 py-2 text-xs font-bold text-warning backdrop-blur">{queue.length} {queue.length === 1 ? "ação aguardando" : "ações aguardando"} sincronização</div>}
      </div>

      <Sheet className="bottom-0 safe-b">
        {active ? (
          <div>
            <div className="mb-4 flex items-center justify-between"><p className="eyebrow">Entrega {active.id}</p><span className="flex items-center gap-1.5 text-xs font-bold text-success"><span className="live-dot h-2 w-2 rounded-full bg-success" />Em rota</span></div>
            <div className="mb-4 grid grid-cols-3 divide-x divide-border rounded-2xl border bg-card/60 py-3 text-center">
              {[[arrived ? "0" : String(remainMin), "min"], [route ? kmFmt(route.distance * (1 - p)).replace(" ", " ") : "—", "restante"], [fmtTime(Date.now() + remainMin * 60000), "chegada"]].map(([v, l]) => (
                <div key={l}><p className="text-xl font-extrabold leading-none tracking-tight">{v}</p><p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{l}</p></div>
              ))}
            </div>
            <div className="mb-4 flex items-start gap-3"><span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-destructive/15 text-destructive"><MapPin className="h-5 w-5" /></span><div className="min-w-0"><p className="text-[15px] font-bold leading-snug">{active.address.label}</p><p className="mt-0.5 text-[13px] text-muted-foreground">{active.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</p><p className="mt-0.5 text-xs text-muted-foreground">Entregar até {fmtDT(active.promisedAt)}</p></div></div>
            <Button className={cn("h-13 w-full rounded-2xl py-3.5 text-base font-bold", !arrived && "opacity-90")} onClick={() => act(active)}><CheckCircle2 className="mr-2 h-5 w-5" />Confirmar entrega</Button>
            {route?.fallback && <p className="mt-2 text-center text-[11px] text-muted-foreground">Serviço de rotas indisponível: exibindo trajeto aproximado.</p>}
          </div>
        ) : open.length ? (
          <div className="space-y-2">
            <p className="eyebrow">Paradas · melhor ordem</p>
            {open.map((o, i) => (
              <div key={o.id} className="flex items-center gap-3 rounded-2xl border bg-card/60 p-3.5">
                <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-extrabold text-white", i === 0 ? "bg-brand shadow-[0_0_16px_-2px_hsl(var(--primary))]" : "bg-muted-foreground/40")}>{i + 1}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-[15px] font-bold">{o.address.label.split(" — ")[0]}</p><p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />até {fmtTime(o.promisedAt)} · {o.address.label.split(" — ")[1] ?? o.id}</p></div>
                {i === 0 && <Button size="sm" className="rounded-full px-4 font-bold" onClick={() => act(o)}><Navigation className="mr-1.5 h-4 w-4" />Iniciar</Button>}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-success" /><p className="mt-2 font-semibold">Nenhuma entrega pendente</p><p className="text-sm text-muted-foreground">Peça ao administrador para atribuir pedidos a você.</p></div>
        )}
      </Sheet>
    </PhoneShell>
  )
}
