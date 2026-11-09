/* Camada "servidor" simulada (RBAC, atribuição atômica, eventos com data/hora, auditoria).
   Os dados ficam no localStorage; cada aba tem a sua sessão (sessionStorage). */
export type Role = "customer" | "courier" | "admin"
export type Status = "pedido_recebido" | "em_separacao" | "aguardando_coleta" | "em_rota" | "entregue" | "cancelado"
export interface LatLng { lat: number; lng: number }
export interface Address extends LatLng { label: string }
export interface User { id: string; role: Role; name: string; email: string; pass: string; active: boolean; consentEmail?: boolean }
export interface OrderEvent { status: Status; at: number; by: string }
export interface OrderItem { id: string; name: string; price: number; qty: number }
export interface Order {
  id: string; customerId: string; address: Address; items: OrderItem[]; total: number
  createdAt: number; promisedAt: number; status: Status; courierId: string | null
  events: OrderEvent[]; deliveredAt?: number; cancelReason?: string
}
export interface Notification { id: string; orderId: string; userId: string; at: number; msg: string; channel: string; status: "enviada" | "falhou"; attempts: number; fallback?: boolean }
export interface AuditEntry { at: number; who: string; action: string }
export interface Db { users: User[]; orders: Order[]; notifications: Notification[]; audit: AuditEntry[]; clock: number; settings: { failPush: boolean } }
export interface Session { uid: string; last: number }

export const H = 3600000
export const FLOW: Status[] = ["pedido_recebido", "em_separacao", "aguardando_coleta", "em_rota", "entregue"]
export const LABEL: Record<Status, string> = {
  pedido_recebido: "Pedido recebido", em_separacao: "Em separação", aguardando_coleta: "Aguardando coleta",
  em_rota: "Em rota", entregue: "Entregue", cancelado: "Cancelado",
}
export const ROLE: Record<Role, string> = { customer: "Cliente", courier: "Entregador", admin: "Administrador" }
// Coordenadas aproximadas em São Leopoldo/RS (o roteamento ajusta para a via mais próxima).
export const DEPOT: Address = { label: "Centro de distribuição Traylo", lat: -29.7612, lng: -51.1495 }
export const ADDRESSES: Address[] = [
  { label: "Rua Independência, 410 — Centro", lat: -29.7578, lng: -51.1488 },
  { label: "Av. Unisinos, 950 — Cristo Rei", lat: -29.7955, lng: -51.1558 },
  { label: "Rua Duque de Caxias, 120 — Scharlau", lat: -29.7744, lng: -51.1692 },
  { label: "Av. Mauá, 2200 — Feitoria", lat: -29.7391, lng: -51.1279 },
  { label: "Rua Marechal Floriano, 75 — Santos Dumont", lat: -29.7812, lng: -51.1335 },
  { label: "Rua Lindolfo Collor, 330 — Morro do Espelho", lat: -29.7492, lng: -51.1701 },
  { label: "Av. João Corrêa, 1800 — Padre Reus", lat: -29.7702, lng: -51.1622 },
]
export const CATALOG = [
  { id: "p1", name: "Fone Bluetooth", price: 189.9 }, { id: "p2", name: "Carregador Turbo 30W", price: 79.9 },
  { id: "p3", name: "Mochila Urbana", price: 149 }, { id: "p4", name: "Garrafa Térmica 1L", price: 64.5 },
  { id: "p5", name: "Teclado Compacto", price: 229 }, { id: "p6", name: "Luminária de Mesa", price: 98.7 },
]
export const ADMIN_CODE = "000000" // 2FA simulado (R2)
export const SESSION_TTL = 30 * 60 * 1000
const KEY = "traylo.v2", SKEY = "traylo.session", QKEY = "traylo.queue.", CKEY = "traylo.cache", OKEY = "traylo.off"

/* ---------- armazenamento ---------- */
function lsGet<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d } catch { return d } }
function lsSet(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* sem storage */ } }
function ssGet<T>(k: string, d: T): T { try { const v = sessionStorage.getItem(k); return v ? (JSON.parse(v) as T) : d } catch { return d } }
function ssSet(k: string, v: unknown) { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, JSON.stringify(v)) } catch { /* ok */ } }
const uid = () => Math.random().toString(36).slice(2, 9)
const emit = () => window.dispatchEvent(new Event("traylo:change"))

export const getSession = () => ssGet<Session | null>(SKEY, null)
export const setSession = (s: Session | null) => { ssSet(SKEY, s); emit() }
export const isOffline = () => ssGet<boolean>(OKEY, false)

function seed(): Db {
  const t = Date.now()
  const users: User[] = [
    { id: "u1", role: "customer", name: "Ana Souza", email: "cliente@traylo.app", pass: "1234", active: true, consentEmail: true },
    { id: "u2", role: "customer", name: "Bruno Lima", email: "cliente2@traylo.app", pass: "1234", active: true, consentEmail: false },
    { id: "u3", role: "courier", name: "Carlos Dias", email: "entregador@traylo.app", pass: "1234", active: true },
    { id: "u4", role: "courier", name: "Daniela Rocha", email: "entregador2@traylo.app", pass: "1234", active: true },
    { id: "u5", role: "admin", name: "Marina Prado", email: "admin@traylo.app", pass: "1234", active: true },
  ]
  const specs: [number, Status, number, string | null][] = [
    [70, "entregue", 3.2, "u3"], [64, "entregue", 3.8, "u4"], [58, "entregue", 5.1, "u3"], [52, "cancelado", 0, null],
    [46, "entregue", 3.5, "u4"], [40, "entregue", 4.6, "u3"], [34, "entregue", 2.9, "u4"], [28, "cancelado", 0, null],
    [22, "entregue", 3.1, "u3"], [16, "entregue", 3.9, "u4"], [3.5, "em_rota", 0, "u3"], [2.2, "aguardando_coleta", 0, "u3"],
    [1.5, "aguardando_coleta", 0, "u3"], [1, "em_separacao", 0, null], [0.2, "pedido_recebido", 0, null],
  ]
  const orders: Order[] = specs.map(([ago, status, dur, courierId], i) => {
    const createdAt = t - ago * H, promisedAt = createdAt + 4 * H
    const end = status === "entregue" ? createdAt + dur * H : t
    const upto = status === "cancelado" ? 1 : FLOW.indexOf(status)
    const events: OrderEvent[] = []
    for (let k = 0; k <= upto; k++) events.push({ status: FLOW[k], at: k === upto && status !== "entregue" ? Math.min(t - 60000, createdAt + (end - createdAt) * 0.8) : createdAt + ((end - createdAt) * k) / Math.max(upto, 1) * 0.95, by: k < 3 ? "Marina Prado" : "Entregador" })
    const items: OrderItem[] = [{ ...CATALOG[i % 6], qty: 1 + (i % 2) }]
    const o: Order = { id: "TR-" + (1001 + i), customerId: i % 2 ? "u2" : "u1", address: ADDRESSES[i % ADDRESSES.length], items, total: items.reduce((a, b) => a + b.price * b.qty, 0), createdAt, promisedAt, status, courierId, events }
    if (status === "cancelado") { o.events.push({ status: "cancelado", at: createdAt + 0.5 * H, by: "Cliente" }); o.cancelReason = "Desistência do cliente" }
    if (status === "entregue") o.deliveredAt = createdAt + dur * H
    return o
  })
  // o pedido "em rota" do seed começa agora, para a animação do mapa ser visível
  const live = orders.find((o) => o.status === "em_rota")
  if (live) live.events[live.events.length - 1].at = t - 15000
  return { users, orders, notifications: [], audit: [], clock: 0, settings: { failPush: false } }
}
export const load = (): Db => { let s = lsGet<Db | null>(KEY, null); if (!s) { s = seed(); lsSet(KEY, s) } return s }
const save = (s: Db) => { lsSet(KEY, s); emit() }
export const nowMs = (s?: Db) => Date.now() + (s || load()).clock
export function resetDemo() { lsSet(KEY, seed()); Object.keys(localStorage).filter((k) => k.startsWith(QKEY)).forEach((k) => localStorage.removeItem(k)); emit() }

const need = (c: unknown, m: string): void => { if (!c) throw new Error(m) }
const OPEN: Status[] = ["pedido_recebido", "em_separacao", "aguardando_coleta"]
export const isFinal = (o: Order) => o.status === "entregue" || o.status === "cancelado"

function audit(s: Db, u: User | null, action: string) { s.audit.unshift({ at: nowMs(s), who: u ? u.name : "-", action }); s.audit = s.audit.slice(0, 150) }
function notify(s: Db, o: Order, msg: string) {
  const c = s.users.find((u) => u.id === o.customerId); if (!c || !c.active) return
  const n: Notification = { id: uid(), orderId: o.id, userId: c.id, at: nowMs(s), msg, channel: "push", status: "enviada", attempts: 1 }
  if (s.settings.failPush && Math.random() < 0.6) { n.status = "falhou"; if (c.consentEmail) { n.channel = "e-mail"; n.status = "enviada"; n.attempts = 2; n.fallback = true } }
  s.notifications.unshift(n); s.notifications = s.notifications.slice(0, 300)
}
function setStatus(s: Db, o: Order, status: Status, by: string, at?: number) {
  const t = at || nowMs(s); o.status = status; o.events.push({ status, at: t, by })
  if (status === "entregue") o.deliveredAt = t
  notify(s, o, status === "cancelado" ? `Pedido ${o.id} cancelado.` : `Pedido ${o.id}: ${LABEL[status]}.`)
}

/* ---------- api ---------- */
export const api = {
  user(session: Session | null): User {
    need(session, "Sessão inválida.")
    const u = load().users.find((x) => x.id === session!.uid); need(u && u.active, "Usuário inativo ou inexistente."); return u!
  },
  login(email: string, pass: string, code?: string): { need2fa: true } | { session: Session } {
    const s = load(); const u = s.users.find((x) => x.email === email.trim().toLowerCase())
    need(u && u.active && u.pass === pass, "E-mail ou senha inválidos.")
    if (u!.role === "admin") { if (!code) return { need2fa: true }; need(code === ADMIN_CODE, "Código de verificação inválido.") }
    audit(s, u!, "login"); save(s); return { session: { uid: u!.id, last: Date.now() } }
  },
  orders(session: Session | null): Order[] {
    const u = api.user(session); const s = load()
    if (u.role === "admin") return s.orders
    if (u.role === "customer") return s.orders.filter((o) => o.customerId === u.id)
    return s.orders.filter((o) => o.courierId === u.id)
  },
  createOrder(session: Session | null, cart: Record<string, number>, addrIdx: number): Order {
    const u = api.user(session); need(u.role === "customer", "Apenas clientes criam pedidos.")
    const items = CATALOG.filter((p) => cart[p.id] > 0).map((p) => ({ ...p, qty: cart[p.id] }))
    need(items.length, "Escolha ao menos um item."); need(ADDRESSES[addrIdx], "Escolha um endereço.")
    const s = load(); const t = nowMs(s)
    const o: Order = { id: "TR-" + (1001 + s.orders.length), customerId: u.id, address: ADDRESSES[addrIdx], items, total: items.reduce((a, b) => a + b.price * b.qty, 0), createdAt: t, promisedAt: t + 4 * H, status: "pedido_recebido", courierId: null, events: [{ status: "pedido_recebido", at: t, by: u.name }] }
    s.orders.push(o); notify(s, o, `Recebemos seu pedido ${o.id}.`); audit(s, u, "criou " + o.id); save(s); return o
  },
  advance(session: Session | null, id: string, opts: { from?: Status; at?: number } = {}): "ok" | "conflict" {
    const u = api.user(session); const s = load(); const o = s.orders.find((x) => x.id === id); need(o, "Pedido não encontrado.")
    if (opts.from && o!.status !== opts.from) return "conflict"
    const i = FLOW.indexOf(o!.status); need(i >= 0 && i < 4, "Pedido já finalizado.")
    if (u.role === "admin") need(i <= 1, 'Administrador só avança até "Aguardando coleta".')
    else if (u.role === "courier") { need(o!.courierId === u.id, "Entrega não atribuída a você."); need(i >= 2, "Pedido ainda não liberado para coleta.") }
    else need(false, "Seu perfil não pode alterar o status.")
    if (i === 2) need(o!.courierId, "Atribua um entregador antes de iniciar a rota.")
    setStatus(s, o!, FLOW[i + 1], u.name, opts.at); save(s); return "ok"
  },
  assign(session: Session | null, id: string, courierId: string, expected: string) { // compare-and-set
    const u = api.user(session); need(u.role === "admin", "Apenas administradores atribuem entregas.")
    const s = load(); const o = s.orders.find((x) => x.id === id); need(o, "Pedido não encontrado.")
    need((o!.courierId || "") === (expected || ""), "A atribuição mudou em outra tela. Atualize e tente de novo.")
    need(OPEN.includes(o!.status), "Não é possível reatribuir após a saída para rota.")
    const c = courierId ? s.users.find((x) => x.id === courierId) : null
    if (courierId) need(c && c.role === "courier" && c.active, "Entregador inválido.")
    o!.courierId = courierId || null; audit(s, u, `atribuiu ${o!.id} → ${c ? c.name : "ninguém"}`); save(s)
  },
  cancel(session: Session | null, id: string, reason?: string) {
    const u = api.user(session); const s = load(); const o = s.orders.find((x) => x.id === id); need(o, "Pedido não encontrado.")
    need(OPEN.includes(o!.status), "Este pedido não pode mais ser cancelado.")
    if (u.role === "customer") need(o!.customerId === u.id, "Pedido não pertence a você."); else need(u.role === "admin", "Sem permissão.")
    o!.cancelReason = reason || "Cancelado"; setStatus(s, o!, "cancelado", u.name); audit(s, u, "cancelou " + o!.id); save(s)
  },
  adminData(session: Session | null): Db { const u = api.user(session); need(u.role === "admin", "Sem permissão."); return load() },
  myNotifications(session: Session | null): Notification[] { const u = api.user(session); return load().notifications.filter((n) => n.userId === u.id) },
  toggleUser(session: Session | null, id: string) { const u = api.user(session); need(u.role === "admin" && id !== u.id, "Operação não permitida."); const s = load(); const t = s.users.find((x) => x.id === id)!; t.active = !t.active; audit(s, u, (t.active ? "ativou " : "desativou ") + t.name); save(s) },
  addUser(session: Session | null, d: { name: string; email: string; pass: string; role: Role }) {
    const u = api.user(session); need(u.role === "admin", "Sem permissão."); const s = load()
    need(d.name && d.email && d.pass.length >= 4, "Preencha nome, e-mail e senha (mín. 4)."); need(ROLE[d.role], "Perfil inválido.")
    need(!s.users.some((x) => x.email === d.email.toLowerCase()), "E-mail já cadastrado.")
    s.users.push({ id: "u" + uid(), role: d.role, name: d.name, email: d.email.toLowerCase(), pass: d.pass, active: true, consentEmail: false }); audit(s, u, "criou usuário " + d.name); save(s)
  },
  retryNotif(session: Session | null, id: string) { const u = api.user(session); need(u.role === "admin", "Sem permissão."); const s = load(); const n = s.notifications.find((x) => x.id === id); if (n) { n.attempts++; if (!s.settings.failPush) n.status = "enviada" } audit(s, u, "reprocessou notificação"); save(s) },
  setConsent(session: Session | null, v: boolean) { const u = api.user(session); const s = load(); s.users.find((x) => x.id === u.id)!.consentEmail = v; save(s) },
  exportMe(session: Session | null) { const u = api.user(session); const s = load(); return { usuario: { nome: u.name, email: u.email, perfil: u.role, consentimentoEmail: !!u.consentEmail }, pedidos: s.orders.filter((o) => o.customerId === u.id), notificacoes: s.notifications.filter((n) => n.userId === u.id) } },
  deleteMe(session: Session | null) {
    const u = api.user(session); const s = load(); need(u.role === "customer", "Apenas clientes.")
    need(!s.orders.some((o) => o.customerId === u.id && !isFinal(o)), "Há pedidos em andamento; conclua-os antes.")
    const x = s.users.find((y) => y.id === u.id)!; x.name = "Titular removido (LGPD)"; x.email = `removido-${uid()}@traylo.app`; x.active = false; x.pass = uid(); audit(s, u, "exclusão LGPD"); save(s)
  },
  simulate(session: Session | null, what: "clock" | "failPush", v: number | boolean) {
    const u = api.user(session); need(u.role === "admin", "Sem permissão."); const s = load()
    if (what === "clock") s.clock += (v as number) * H; else s.settings.failPush = v as boolean; save(s)
  },
}

/* ---------- modo offline do entregador (R5) ---------- */
export interface QueuedAction { id: string; from: Status; to: Status; at: number }
export const queueOf = (uidv: string) => lsGet<QueuedAction[]>(QKEY + uidv, [])
export const offlineCache = () => ssGet<Order[]>(CKEY, [])
export function goOffline(session: Session | null) { ssSet(CKEY, api.orders(session)); ssSet(OKEY, true); emit() }
export function pushQueued(uidv: string, a: QueuedAction) { const q = queueOf(uidv); q.push(a); lsSet(QKEY + uidv, q); emit() }
export function goOnline(session: Session | null) {
  const u = api.user(session); ssSet(OKEY, false)
  let ok = 0, conflicts = 0
  for (const a of queueOf(u.id)) { try { api.advance(session, a.id, { from: a.from, at: a.at }) === "conflict" ? conflicts++ : ok++ } catch { conflicts++ } }
  lsSet(QKEY + u.id, []); emit(); return { ok, conflicts }
}

/* ---------- indicadores (definições formais — R8) ---------- */
export function kpis(s: Db) {
  const t = nowMs(s), o = s.orders, del = o.filter((x) => x.status === "entregue")
  const onTime = del.filter((x) => x.deliveredAt! <= x.promisedAt).length
  const overdue = o.filter((x) => !isFinal(x) && t > x.promisedAt).length
  const canc = o.filter((x) => x.status === "cancelado").length
  const avg = del.length ? del.reduce((a, x) => a + (x.deliveredAt! - x.createdAt), 0) / del.length : 0
  const per = s.users.filter((u) => u.role === "courier").map((c) => {
    const d = del.filter((x) => x.courierId === c.id); const ok = d.filter((x) => x.deliveredAt! <= x.promisedAt).length
    return { name: c.name, total: d.length, pct: d.length ? ok / d.length : null, open: o.filter((x) => x.courierId === c.id && !isFinal(x)).length }
  })
  return { total: o.length, delivered: del.length, onTime, pctOnTime: del.length ? onTime / del.length : null, late: del.length - onTime, overdue, canc, cancRate: o.length ? canc / o.length : 0, avg, per }
}
