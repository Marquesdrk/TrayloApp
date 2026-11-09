import { useMemo, useState, type ReactNode } from "react"
import { Bell, ClipboardList, Clock, LayoutDashboard, LogOut, ScrollText, Users } from "lucide-react"
import { DEPOT, FLOW, LABEL, ROLE, api, isFinal, kpis, nowMs, resetDemo, setSession, type Order, type Role, type Session, type User } from "@/lib/api"
import { run, toast, useDbTick } from "@/lib/hooks"
import { cn, fmtDT, hrs, pct } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { GpsMap, type MapMarker } from "@/components/GpsMap"
import { Logo } from "@/components/Logo"

type Tab = "painel" | "pedidos" | "usuarios" | "notificacoes" | "auditoria"
const TABS: [Tab, string, typeof Users][] = [["painel", "Painel", LayoutDashboard], ["pedidos", "Pedidos", ClipboardList], ["usuarios", "Usuários", Users], ["notificacoes", "Notificações", Bell], ["auditoria", "Auditoria", ScrollText]]
const field = "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
const OPEN = ["pedido_recebido", "em_separacao", "aguardando_coleta"]

function Pill({ o, t }: { o: Order; t: number }) {
  let cls = "bg-primary/10 text-primary", txt: string = LABEL[o.status]
  if (o.status === "cancelado") cls = "bg-destructive/10 text-destructive"
  else if (o.status === "entregue") { const ok = o.deliveredAt! <= o.promisedAt; cls = ok ? "bg-success/15 text-success" : "bg-warning/15 text-warning"; txt = ok ? "Entregue" : "Entregue com atraso" }
  else if (t > o.promisedAt) { cls = "bg-destructive/10 text-destructive"; txt += " · atrasado" }
  return <span className={cn("inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", cls)}>{txt}</span>
}
const Card = ({ title, sub, aside, children, className }: { title?: string; sub?: string; aside?: ReactNode; children: ReactNode; className?: string }) => (
  <section className={cn("rounded-3xl border bg-card/70 p-6", className)}>
    {title && (
      <header className="mb-5 flex items-start justify-between gap-4">
        <div><h2 className="text-lg font-extrabold leading-tight">{title}</h2>{sub && <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{sub}</p>}</div>{aside}
      </header>
    )}
    {children}
  </section>
)
const Th = ({ children }: { children?: ReactNode }) => <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</th>
const Td = ({ children, className }: { children?: ReactNode; className?: string }) => <td className={cn("border-t px-3 py-2.5 align-middle", className)}>{children}</td>

export function Admin({ user, session }: { user: User; session: Session | null }) {
  useDbTick()
  const [tab, setTab] = useState<Tab>("painel")
  const s = api.adminData(session), t = nowMs(s), k = kpis(s)
  const couriers = s.users.filter((x) => x.role === "courier" && x.active)
  const name = (id: string | null) => s.users.find((x) => x.id === id)?.name ?? "—"

  const markers: MapMarker[] = useMemo(() => [
    { id: "dep", kind: "depot" as const, lng: DEPOT.lng, lat: DEPOT.lat },
    ...s.orders.filter((o) => !isFinal(o)).map((o) => ({ id: o.id, kind: "stop" as const, lng: o.address.lng, lat: o.address.lat, label: `${o.id} — ${LABEL[o.status]}`, tag: o.id, active: o.status === "em_rota" })),
  ], [s.orders.map((o) => o.id + o.status).join()])

  const counts = [...FLOW, "cancelado" as const].map((st) => [st, s.orders.filter((o) => o.status === st).length] as const)
  const mx = Math.max(1, ...counts.map((c) => c[1]))

  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      <aside className="no-scrollbar glass flex items-center gap-1 overflow-x-auto rounded-none border-x-0 border-t-0 px-3 py-2.5 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:items-stretch lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
        <Logo size={34} className="mr-3 shrink-0 lg:mb-8 lg:mr-0" />
        {TABS.map(([k2, l, Icon]) => (
          <button key={k2} onClick={() => setTab(k2)} aria-current={tab === k2} className={cn("flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold transition", tab === k2 ? "bg-primary/15 text-foreground shadow-[inset_3px_0_0_hsl(var(--primary))]" : "text-muted-foreground hover:bg-accent hover:text-foreground")}><Icon className={cn("h-[18px] w-[18px]", tab === k2 && "text-primary")} />{l}</button>
        ))}
        <div className="ml-auto flex items-center gap-2 lg:mt-auto lg:ml-0 lg:border-t lg:pt-4">
          <div className="hidden min-w-0 lg:block"><p className="truncate text-sm font-semibold">{user.name}</p><p className="text-xs text-muted-foreground">{ROLE.admin}</p></div>
          <Button variant="ghost" size="icon" className="ml-auto" onClick={() => setSession(null)} aria-label="Sair"><LogOut className="h-4 w-4" /></Button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 space-y-4 p-4 lg:p-7">
        {tab === "painel" && (<>
          <header className="aurora -mx-4 -mt-4 rounded-b-3xl px-4 pb-2 pt-6 lg:-mx-7 lg:-mt-7 lg:px-7 lg:pt-9">
            <p className="eyebrow">Visão geral</p>
            <h1 className="mt-1 text-3xl font-extrabold leading-tight">Bom te ver, <span className="text-brand">{user.name.split(" ")[0]}</span></h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">{k.total - k.delivered - k.canc} {k.total - k.delivered - k.canc === 1 ? "entrega em andamento" : "entregas em andamento"} agora{k.overdue ? ` — ${k.overdue} fora do prazo` : ", todas dentro do prazo"}.</p>
          </header>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {([[pct(k.pctOnTime), "Entregas no prazo", "text-brand"], [String(k.late), "Entregues com atraso", "text-warning"], [String(k.overdue), "Abertos e atrasados", k.overdue ? "text-destructive" : "text-success"], [`${k.canc}`, `Cancelamentos · ${pct(k.cancRate)}`, ""], [hrs(k.avg), "Tempo médio", ""]] as const).map(([v, l, c]) => (
              <div key={l} className="rounded-3xl border bg-card/70 p-5"><p className={cn("text-[2rem] font-extrabold leading-none tracking-tight", c)}>{v}</p><p className="mt-2 text-[13px] font-medium leading-snug text-muted-foreground">{l}</p></div>
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <Card title="Mapa ao vivo" sub={`${markers.length - 1} destinos abertos · ${s.orders.filter((o) => o.status === "em_rota").length} em rota`} className="overflow-hidden"
              aside={<div className="hidden shrink-0 items-center gap-3 text-xs font-semibold text-muted-foreground sm:flex"><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#2f6bff] shadow-[0_0_8px_#2f6bff]" />Em rota</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#00d4b8] shadow-[0_0_8px_#00d4b8]" />Aguardando</span><span className="flex items-center gap-1.5"><i className="bg-brand h-2.5 w-2.5 rounded-[3px]" />Centro</span></div>}>
              <div className="-mx-1 overflow-hidden rounded-2xl border"><GpsMap className="h-[420px] w-full" markers={markers} fitKey={markers.length + ""} padding={{ top: 70, bottom: 90, left: 70, right: 70 }} /></div>
            </Card>
            <div className="space-y-4">
              <Card title="Pedidos por status">{counts.map(([st, n]) => (
                <div key={st} className="my-2 flex items-center gap-3 text-sm"><span className="w-36 text-muted-foreground">{LABEL[st]}</span><span className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted"><span className={cn("block h-full rounded-full", st === "cancelado" ? "bg-destructive" : "bg-primary")} style={{ width: `${(n / mx) * 100}%` }} /></span><b className="w-5 text-right">{n}</b></div>
              ))}</Card>
              <Card title="Por entregador"><table className="w-full text-sm"><thead><tr><Th>Nome</Th><Th>Entregas</Th><Th>No prazo</Th><Th>Abertas</Th></tr></thead><tbody>{k.per.map((p) => <tr key={p.name}><Td>{p.name}</Td><Td>{p.total}</Td><Td>{pct(p.pct)}</Td><Td>{p.open}</Td></tr>)}</tbody></table></Card>
            </div>
          </div>
          <Card title="Definições dos indicadores"><p className="text-sm text-muted-foreground"><b>No prazo:</b> entregues com data/hora de entrega ≤ previsão ÷ total entregue. <b>Atrasado:</b> entregue após a previsão, ou ainda aberto com o relógio além da previsão. <b>Cancelamento:</b> cancelados ÷ total de pedidos. Cálculo central sobre os eventos registrados.</p></Card>
          <Card title="Simulação (demonstração)"><div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground"><Clock className="h-4 w-4" />Relógio: {fmtDT(t)} ({s.clock >= 0 ? "+" : ""}{Math.round(s.clock / 3600000)} h)</span>
            <Button size="sm" variant="outline" onClick={() => run(() => api.simulate(session, "clock", 1))}>+1 h</Button>
            <Button size="sm" variant="outline" onClick={() => run(() => api.simulate(session, "clock", 4))}>+4 h</Button>
            <label className="flex items-center gap-2"><input type="checkbox" className="accent-[hsl(var(--primary))]" checked={s.settings.failPush} onChange={(e) => run(() => api.simulate(session, "failPush", e.target.checked))} />Simular falha de push</label>
            <Button size="sm" variant="outline" className="ml-auto text-destructive" onClick={() => { if (confirm("Restaurar todos os dados de exemplo?")) { resetDemo(); toast("Dados restaurados.") } }}>Restaurar dados</Button>
          </div></Card>
        </>)}

        {tab === "pedidos" && (
          <Card title="Pedidos e despacho" className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><Th>Pedido</Th><Th>Cliente</Th><Th>Destino</Th><Th>Previsão</Th><Th>Status</Th><Th>Entregador</Th><Th /></tr></thead><tbody>
            {s.orders.slice().sort((a, b) => b.createdAt - a.createdAt).map((o) => {
              const editable = OPEN.includes(o.status)
              return (<tr key={o.id}><Td><b>{o.id}</b></Td><Td>{name(o.customerId)}</Td><Td className="text-xs">{o.address.label}</Td><Td className="whitespace-nowrap text-xs">{fmtDT(o.promisedAt)}</Td><Td><Pill o={o} t={t} /></Td>
                <Td>{editable ? <select className={field + " min-w-[140px]"} value={o.courierId ?? ""} aria-label={`Entregador do pedido ${o.id}`} onChange={(e) => { run(() => api.assign(session, o.id, e.target.value, o.courierId ?? "")); toast("Atribuição salva.") }}><option value="">— nenhum —</option>{couriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select> : name(o.courierId)}</Td>
                <Td><div className="flex gap-1.5">{["pedido_recebido", "em_separacao"].includes(o.status) && <Button size="sm" variant="outline" onClick={() => run(() => api.advance(session, o.id))}>Avançar</Button>}{editable && <Button size="sm" variant="outline" className="text-destructive" onClick={() => { const r = window.prompt("Motivo do cancelamento (opcional):"); if (r !== null) run(() => api.cancel(session, o.id, r)) }}>Cancelar</Button>}</div></Td></tr>)
            })}</tbody></table></Card>
        )}

        {tab === "usuarios" && <UsersTab session={session} me={user} s={s} />}

        {tab === "notificacoes" && (
          <Card title="Fila de notificações" className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><Th>Quando</Th><Th>Pedido</Th><Th>Mensagem</Th><Th>Canal</Th><Th>Tent.</Th><Th>Situação</Th><Th /></tr></thead><tbody>
            {s.notifications.slice(0, 60).map((n) => <tr key={n.id}><Td className="whitespace-nowrap text-xs">{fmtDT(n.at)}</Td><Td>{n.orderId}</Td><Td className="text-xs">{n.msg}</Td><Td>{n.channel}</Td><Td>{n.attempts}</Td><Td><span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", n.status === "enviada" ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive")}>{n.status}</span></Td><Td>{n.status === "falhou" && <Button size="sm" variant="outline" onClick={() => run(() => api.retryNotif(session, n.id))}>Reprocessar</Button>}</Td></tr>)}
            {!s.notifications.length && <tr><Td className="text-muted-foreground">Sem notificações ainda.</Td></tr>}</tbody></table></Card>
        )}

        {tab === "auditoria" && (
          <Card title="Trilha de auditoria" className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><Th>Quando</Th><Th>Quem</Th><Th>Ação</Th></tr></thead><tbody>
            {s.audit.map((a, i) => <tr key={i}><Td className="whitespace-nowrap text-xs">{fmtDT(a.at)}</Td><Td>{a.who}</Td><Td>{a.action}</Td></tr>)}
            {!s.audit.length && <tr><Td className="text-muted-foreground">Vazia.</Td></tr>}</tbody></table></Card>
        )}
      </main>
    </div>
  )
}

function UsersTab({ session, me, s }: { session: Session | null; me: User; s: ReturnType<typeof api.adminData> }) {
  const [f, setF] = useState({ name: "", email: "", pass: "", role: "courier" as Role })
  return (
    <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
      <Card title="Usuários" className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><Th>Nome</Th><Th>Perfil</Th><Th>Situação</Th><Th /></tr></thead><tbody>
        {s.users.map((x) => <tr key={x.id}><Td>{x.name}<br /><span className="text-xs text-muted-foreground">{x.email}</span></Td><Td>{ROLE[x.role]}</Td><Td><span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", x.active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>{x.active ? "ativo" : "inativo"}</span></Td><Td>{x.id !== me.id && <Button size="sm" variant="outline" onClick={() => run(() => api.toggleUser(session, x.id))}>{x.active ? "Desativar" : "Ativar"}</Button>}</Td></tr>)}
      </tbody></table></Card>
      <Card title="Novo usuário"><form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (run(() => { api.addUser(session, f); return true })) { toast("Usuário criado."); setF({ name: "", email: "", pass: "", role: "courier" }) } }}>
        <input className={field} placeholder="Nome" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className={field} placeholder="E-mail" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <input className={field} placeholder="Senha provisória" type="password" required minLength={4} value={f.pass} onChange={(e) => setF({ ...f, pass: e.target.value })} />
        <select className={field} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>{Object.entries(ROLE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <Button className="w-full">Criar usuário</Button></form></Card>
    </div>
  )
}
