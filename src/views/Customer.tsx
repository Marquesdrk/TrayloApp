import { useMemo, useState } from "react"
import { Bell, ChevronDown, ChevronUp, Download, LogOut, MapPin, Minus, PackageCheck, Plus, ShieldCheck, Trash2, UserRound, X, Package } from "lucide-react"
import { ADDRESSES, CATALOG, DEPOT, FLOW, LABEL, api, isFinal, nowMs, setSession, type Order, type Session, type User } from "@/lib/api"
import { along } from "@/lib/geo"
import { useRoute } from "@/lib/routing"
import { run, toast, useDbTick, useNow, routeProgress } from "@/lib/hooks"
import { illustrations } from "@/lib/illustrations"
import { cn, fmtDT, fmtTime, kmFmt, money } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { StatusCard } from "@/components/ui/card-24"
import { OrderTracking } from "@/components/ui/order-tracking"
import { GpsMap, type MapMarker } from "@/components/GpsMap"
import { PhoneShell, Sheet } from "@/components/PhoneShell"
import { Logo } from "@/components/Logo"

type Tab = "pedidos" | "avisos" | "perfil"
const COPY: Record<Order["status"], { title: string; desc: string; art: keyof typeof illustrations }> = {
  pedido_recebido: { title: "Pedido confirmado", desc: "Já estamos preparando tudo por aqui.", art: "recebido" },
  em_separacao: { title: "Separando os itens", desc: "Nossa equipe está embalando seu pedido.", art: "separacao" },
  aguardando_coleta: { title: "Pronto para sair", desc: "O entregador vem buscar em instantes.", art: "coleta" },
  em_rota: { title: "A caminho de você", desc: "Seu pedido já está com o entregador.", art: "rota" },
  entregue: { title: "Entregue!", desc: "Tudo certo por aí? Aproveite.", art: "entregue" },
  cancelado: { title: "Pedido cancelado", desc: "Este pedido não será entregue.", art: "cancelado" },
}

export function Customer({ user, session }: { user: User; session: Session | null }) {
  useDbTick(); const now = useNow(1000)
  const [tab, setTab] = useState<Tab>("pedidos"), [selId, setSelId] = useState<string | null>(null)
  const [detail, setDetail] = useState(false), [newOpen, setNewOpen] = useState(false), [collapsed, setCollapsed] = useState(false)

  const orders = api.orders(session).slice().sort((a, b) => b.createdAt - a.createdAt)
  const sel = orders.find((o) => o.id === selId) ?? orders.find((o) => !isFinal(o)) ?? orders[0]

  const pts = useMemo(() => (sel && sel.status !== "cancelado" ? [DEPOT, sel.address] : null), [sel?.id, sel?.status === "cancelado"])
  const route = useRoute(pts)
  const startAt = sel?.events.find((e) => e.status === "em_rota")?.at
  const p = !sel ? 0 : sel.status === "entregue" ? 1 : sel.status === "em_rota" && startAt ? routeProgress(startAt, now) : 0
  const geo = route ? along(route.coords, p) : null
  const remaining = route ? Math.max(1, Math.round((route.duration * (1 - p)) / 60)) : null

  const markers: MapMarker[] = useMemo(() => sel && sel.status !== "cancelado" ? [{ id: "d", kind: "depot", lng: DEPOT.lng, lat: DEPOT.lat }, { id: "x", kind: "dest", lng: sel.address.lng, lat: sel.address.lat }] : [], [sel?.id, sel?.status === "cancelado"])
  const live = sel?.status === "em_rota" && geo

  return (
    <PhoneShell>
      <GpsMap className="absolute inset-0" markers={markers} routeTodo={geo?.todo} routeDone={geo?.done} courier={live ? { pos: geo.pos, bearing: geo.bearing } : null} fitKey={sel?.id + (sel?.status ?? "")} padding={{ top: 90, bottom: collapsed ? 140 : 380, left: 40, right: 40 }} />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between p-3">
        <div className="glass pointer-events-auto rounded-full py-1.5 pl-2 pr-4"><Logo size={26} /></div>
        {live && remaining != null && <div className="glass pointer-events-auto flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-bold"><span className="live-dot h-2 w-2 rounded-full bg-success shadow-[0_0_10px_hsl(var(--success))]" />Ao vivo</div>}
      </div>

      {tab === "pedidos" && (
        <Sheet className="bottom-16">
          {!sel ? (
            <div className="py-6 text-center"><Package className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-2 font-semibold">Nenhum pedido ainda</p><Button className="mt-3 rounded-xl" onClick={() => setNewOpen(true)}>Fazer um pedido</Button></div>
          ) : (
            <>
              <div className="no-scrollbar -mx-5 mb-4 flex gap-2 overflow-x-auto px-5">
                {orders.slice(0, 8).map((o) => (
                  <button key={o.id} onClick={() => { setSelId(o.id); setDetail(false) }} className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition", o.id === sel.id ? "bg-brand text-white shadow-[0_4px_14px_-4px_hsl(var(--primary)/.8)]" : "border bg-card/60 text-muted-foreground")}>{o.id}</button>
                ))}
              </div>
              {live && route && (
                <div className="mb-4">
                  <div className="flex items-end justify-between">
                    <p className="text-[2.6rem] font-extrabold leading-none tracking-tight"><span className="text-brand">{remaining}</span> <span className="text-xl font-bold text-muted-foreground">min</span></p>
                    <button className="pb-1 text-xs font-bold text-muted-foreground" onClick={() => setCollapsed((c) => !c)}>{collapsed ? "Expandir" : "Minimizar"}</button>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">Chega às <b className="text-foreground">{fmtTime(Date.now() + (remaining ?? 0) * 60000)}</b> · faltam <b className="text-foreground">{kmFmt(route.distance * (1 - p))}</b></p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-foreground/10"><div className="bg-brand h-full rounded-full transition-all duration-1000" style={{ width: `${Math.max(4, p * 100)}%` }} /></div>
                </div>
              )}
              {!collapsed && (
                <StatusCard className="max-w-none overflow-hidden border-primary/25 bg-gradient-to-br from-primary/20 via-card to-card p-5 pr-[8.5rem] shadow-none" icon={<p className="eyebrow flex items-center gap-1.5 text-primary"><PackageCheck className="h-4 w-4" />{sel.id} · {sel.items.reduce((a, i) => a + i.qty, 0)} {sel.items.reduce((a, i) => a + i.qty, 0) > 1 ? "itens" : "item"}</p>} title={COPY[sel.status].title} description={COPY[sel.status].desc} illustration={illustrations[COPY[sel.status].art]} illustrationAlt={COPY[sel.status].title}>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => setDetail((d) => !d)}>{detail ? <ChevronUp className="mr-1 h-4 w-4" /> : <ChevronDown className="mr-1 h-4 w-4" />}Detalhes</Button>
                    {["pedido_recebido", "em_separacao", "aguardando_coleta"].includes(sel.status) && (
                      <Button size="sm" variant="ghost" className="rounded-full text-destructive hover:text-destructive" onClick={() => { const r = window.prompt("Motivo do cancelamento (opcional):"); if (r === null) return; run(() => api.cancel(session, sel.id, r)); toast("Pedido cancelado.") }}>Cancelar</Button>
                    )}
                  </div>
                </StatusCard>
              )}
              {detail && !collapsed && (
                <div className="mt-4 rounded-3xl border bg-card/60 p-5">
                  <p className="eyebrow mb-1">Entrega em</p>
                  <p className="mb-5 flex items-start gap-2 text-[15px] font-semibold leading-snug"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />{sel.address.label}</p>
                  <OrderTracking steps={sel.status === "cancelado" ? sel.events.map((e) => ({ name: LABEL[e.status], timestamp: fmtDT(e.at), isCompleted: true })) : FLOW.map((st) => { const ev = sel.events.find((e) => e.status === st); return { name: LABEL[st], timestamp: ev ? fmtDT(ev.at) : "Pendente", isCompleted: !!ev } })} />
                  <div className="mt-1 space-y-1 border-t pt-4 text-sm">
                    {sel.items.map((i) => <p key={i.id} className="flex justify-between"><span>{i.qty}× {i.name}</span><span className="text-muted-foreground">{money(i.price * i.qty)}</span></p>)}
                    <p className="flex justify-between pt-1 font-bold"><span>Total</span><span>{money(sel.total)}</span></p>
                    <p className={cn("pt-2 text-xs", !isFinal(sel) && nowMs() > sel.promisedAt ? "font-semibold text-destructive" : "text-muted-foreground")}>Previsão de entrega: {fmtDT(sel.promisedAt)}{!isFinal(sel) && nowMs() > sel.promisedAt ? " · atrasado" : ""}</p>
                  </div>
                </div>
              )}
              <Button className="mt-3 h-11 w-full rounded-xl font-semibold" onClick={() => setNewOpen(true)}><Plus className="mr-1.5 h-4 w-4" />Novo pedido</Button>
            </>
          )}
        </Sheet>
      )}

      {tab === "avisos" && <Panel title="Notificações"><Notes session={session} /></Panel>}
      {tab === "perfil" && <Panel title="Perfil e privacidade"><Profile user={user} session={session} /></Panel>}
      {newOpen && <NewOrder session={session} onClose={() => setNewOpen(false)} onDone={(id) => { setSelId(id); setNewOpen(false); setTab("pedidos") }} />}

      <nav className="glass absolute inset-x-0 bottom-0 z-30 grid h-16 grid-cols-3 rounded-none border-x-0 border-b-0 safe-b">
        {([["pedidos", "Pedidos", MapPin], ["avisos", "Avisos", Bell], ["perfil", "Perfil", UserRound]] as const).map(([k, l, Icon]) => (
          <button key={k} onClick={() => setTab(k)} aria-current={tab === k} className={cn("relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition", tab === k ? "text-foreground" : "text-muted-foreground")}>{tab === k && <span className="bg-brand absolute top-0 h-[3px] w-8 rounded-b-full shadow-[0_0_14px_hsl(var(--primary))]" />}<Icon className={cn("h-5 w-5", tab === k && "text-primary")} />{l}</button>
        ))}
      </nav>
    </PhoneShell>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="aurora absolute inset-0 z-20 overflow-y-auto bg-background pb-24 pt-16"><div className="px-5"><p className="eyebrow mb-1">Traylo</p><h2 className="mb-5 text-[1.9rem] font-extrabold leading-tight">{title}</h2>{children}</div></div>
}

function Notes({ session }: { session: Session | null }) {
  const notes = api.myNotifications(session)
  if (!notes.length) return <p className="text-muted-foreground">Sem notificações ainda.</p>
  return <ul className="space-y-2">{notes.slice(0, 40).map((n) => (
    <li key={n.id} className="rounded-2xl border bg-card/70 p-4">
      <p className="text-[15px] font-semibold leading-snug">{n.msg}</p>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground"><span>{fmtDT(n.at)}</span><span>·</span><span className="capitalize">{n.channel}{n.fallback ? " (push falhou)" : ""}</span><span className={cn("rounded-full px-2 py-0.5 font-bold", n.status === "enviada" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>{n.status}</span></p>
    </li>))}</ul>
}

function Profile({ user, session }: { user: User; session: Session | null }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-2xl border bg-card p-4"><span className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-lg font-bold text-primary">{user.name[0]}</span><div><p className="font-semibold">{user.name}</p><p className="text-sm text-muted-foreground">{user.email}</p></div></div>
      <div className="rounded-2xl border bg-card p-4">
        <p className="flex items-center gap-1.5 font-semibold"><ShieldCheck className="h-4 w-4 text-primary" />Privacidade (LGPD)</p>
        <p className="mt-1 text-sm text-muted-foreground">Coletamos só nome, e-mail, endereço e itens do pedido, para entregar sua compra.</p>
        <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={!!user.consentEmail} onChange={(e) => run(() => api.setConsent(session, e.target.checked))} />Receber avisos por e-mail se o push falhar</label>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => { const b = new Blob([JSON.stringify(run(() => api.exportMe(session)), null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "meus-dados-traylo.json"; a.click() }}><Download className="mr-1.5 h-4 w-4" />Exportar dados</Button>
          <Button variant="outline" size="sm" className="rounded-full text-destructive" onClick={() => { if (confirm("Excluir sua conta e anonimizar seus dados? Não dá para desfazer.") && run(() => { api.deleteMe(session); return true })) setSession(null) }}><Trash2 className="mr-1.5 h-4 w-4" />Excluir conta</Button>
        </div>
      </div>
      <Button variant="secondary" className="h-11 w-full rounded-xl" onClick={() => setSession(null)}><LogOut className="mr-2 h-4 w-4" />Sair</Button>
    </div>
  )
}

function NewOrder({ session, onClose, onDone }: { session: Session | null; onClose: () => void; onDone: (id: string) => void }) {
  const [cart, setCart] = useState<Record<string, number>>({}), [addr, setAddr] = useState(0)
  const total = CATALOG.reduce((a, p) => a + (cart[p.id] || 0) * p.price, 0)
  const step = (id: string, d: number) => setCart((c) => ({ ...c, [id]: Math.max(0, Math.min(9, (c[id] || 0) + d)) }))
  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 pb-2 pt-4"><h2 className="text-2xl font-extrabold tracking-tight">Novo pedido</h2><Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar"><X className="h-5 w-5" /></Button></div>
      <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
        {CATALOG.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-2xl border bg-card p-3">
            <div><p className="text-sm font-semibold">{p.name}</p><p className="text-sm text-muted-foreground">{money(p.price)}</p></div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => step(p.id, -1)} aria-label={`Menos ${p.name}`}><Minus className="h-4 w-4" /></Button>
              <span className="w-5 text-center font-semibold">{cart[p.id] || 0}</span>
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => step(p.id, 1)} aria-label={`Mais ${p.name}`}><Plus className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
        <label className="block pt-2 text-sm font-medium">Endereço de entrega
          <select className="mt-1.5 h-11 w-full rounded-xl border border-input bg-background px-3" value={addr} onChange={(e) => setAddr(+e.target.value)}>{ADDRESSES.map((a, i) => <option key={i} value={i}>{a.label}</option>)}</select>
        </label>
        <p className="text-xs text-muted-foreground">Pagamento via gateway certificado; o Traylo não guarda dados de cartão.</p>
      </div>
      <div className="border-t p-4 safe-b"><Button className="h-12 w-full rounded-xl text-base font-semibold" onClick={() => { const o = run(() => api.createOrder(session, cart, addr)); if (o) { toast(`Pedido ${o.id} criado.`); onDone(o.id) } }}>Confirmar · {money(total)}</Button></div>
    </div>
  )
}
