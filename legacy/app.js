'use strict';
/* Traylo — protótipo do Sistema de Gerenciamento de Entregas e Acompanhamento de Pedidos.
   Camada "api" simula o servidor (RBAC, atribuição atômica, eventos com data/hora, auditoria);
   a interface só conversa com ela. Dados ficam no localStorage; cada aba tem a sua própria sessão. */

const KEY = 'traylo.v1', SKEY = 'traylo.session', CKEY = 'traylo.cache', QKEY = 'traylo.queue.';
const H = 3600000;
const FLOW = ['pedido_recebido', 'em_separacao', 'aguardando_coleta', 'em_rota', 'entregue'];
const LABEL = { pedido_recebido: 'Pedido recebido', em_separacao: 'Em separação', aguardando_coleta: 'Aguardando coleta', em_rota: 'Em rota', entregue: 'Entregue', cancelado: 'Cancelado' };
const ROLE = { customer: 'Cliente', courier: 'Entregador', admin: 'Administrador' };
const DEPOT = { x: 50, y: 52, label: 'Centro de distribuição' };
const ADDRESSES = [
  { label: 'Rua das Flores, 120 — Centro', x: 30, y: 28 }, { label: 'Av. Brasil, 900 — Zona Norte', x: 68, y: 14 },
  { label: 'Rua do Sol, 45 — Jardim', x: 84, y: 40 }, { label: 'Rua Verde, 310 — Vila Nova', x: 78, y: 76 },
  { label: 'Av. Central, 1500 — Sul', x: 46, y: 90 }, { label: 'Rua Azul, 77 — Bela Vista', x: 16, y: 70 },
  { label: 'Alameda Lima, 8 — Oeste', x: 10, y: 44 },
];
const CATALOG = [
  { id: 'p1', name: 'Fone Bluetooth', price: 189.9 }, { id: 'p2', name: 'Carregador Turbo 30W', price: 79.9 },
  { id: 'p3', name: 'Mochila Urbana', price: 149 }, { id: 'p4', name: 'Garrafa Térmica 1L', price: 64.5 },
  { id: 'p5', name: 'Teclado Compacto', price: 229 }, { id: 'p6', name: 'Luminária de Mesa', price: 98.7 },
];
const ADMIN_CODE = '000000'; // 2FA simulado (R2)
const SESSION_TTL = 30 * 60 * 1000;

/* ---------- armazenamento ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem armazenamento */ } },
};
const sess = {
  get(k, d) { try { const v = sessionStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* ok */ } },
};
const uid = () => Math.random().toString(36).slice(2, 9);
const load = () => { let s = store.get(KEY); if (!s) { s = seed(); store.set(KEY, s); } return s; };
const save = (s) => store.set(KEY, s);
const now = (s) => Date.now() + ((s || load()).clock || 0);

function seed() {
  const t = Date.now();
  const users = [
    { id: 'u1', role: 'customer', name: 'Ana Souza', email: 'cliente@traylo.app', pass: '1234', active: true, consentEmail: true },
    { id: 'u2', role: 'customer', name: 'Bruno Lima', email: 'cliente2@traylo.app', pass: '1234', active: true, consentEmail: false },
    { id: 'u3', role: 'courier', name: 'Carlos Dias', email: 'entregador@traylo.app', pass: '1234', active: true },
    { id: 'u4', role: 'courier', name: 'Daniela Rocha', email: 'entregador2@traylo.app', pass: '1234', active: true },
    { id: 'u5', role: 'admin', name: 'Marina Prado', email: 'admin@traylo.app', pass: '1234', active: true },
  ];
  // [horas atrás, status, duração da entrega (h), entregador]
  const specs = [[70, 'entregue', 3.2, 'u3'], [64, 'entregue', 3.8, 'u4'], [58, 'entregue', 5.1, 'u3'], [52, 'cancelado'], [46, 'entregue', 3.5, 'u4'],
    [40, 'entregue', 4.6, 'u3'], [34, 'entregue', 2.9, 'u4'], [28, 'cancelado'], [22, 'entregue', 3.1, 'u3'], [16, 'entregue', 3.9, 'u4'],
    [3.5, 'em_rota', 0, 'u3'], [2.2, 'em_rota', 0, 'u3'], [1.5, 'aguardando_coleta'], [1, 'em_separacao'], [0.2, 'pedido_recebido']];
  const orders = specs.map(([ago, status, dur, courierId], i) => {
    const createdAt = t - ago * H, promisedAt = createdAt + 4 * H;
    const end = status === 'entregue' ? createdAt + dur * H : t;
    const upto = status === 'cancelado' ? 1 : FLOW.indexOf(status);
    const events = [];
    for (let k = 0; k <= upto; k++) events.push({ status: FLOW[k], at: createdAt + ((end - createdAt) * k) / Math.max(upto, 1) * (k === upto ? 1 : 0.8), by: k < 3 ? 'Marina Prado' : 'Entregador' });
    const o = { id: 'TR-' + (1001 + i), customerId: i % 2 ? 'u2' : 'u1', address: ADDRESSES[i % ADDRESSES.length], items: [{ ...CATALOG[i % 6], qty: 1 + (i % 2) }], createdAt, promisedAt, status, courierId: courierId || null, events };
    o.total = o.items.reduce((a, b) => a + b.price * b.qty, 0);
    if (status === 'cancelado') { o.events.push({ status: 'cancelado', at: createdAt + 0.5 * H, by: 'Cliente' }); o.cancelReason = 'Desistência do cliente'; }
    if (status === 'entregue') o.deliveredAt = createdAt + dur * H;
    return o;
  });
  return { users, orders, notifications: [], audit: [], clock: 0, settings: { failPush: false } };
}

/* ---------- api (simula o servidor) ---------- */
const need = (c, m) => { if (!c) throw new Error(m); };
const api = {
  user(session) {
    need(session, 'Sessão inválida.');
    const s = load(); const u = s.users.find((x) => x.id === session.uid);
    need(u && u.active, 'Usuário inativo ou inexistente.');
    return u;
  },
  login(email, pass, code) {
    const s = load(); const u = s.users.find((x) => x.email === String(email).trim().toLowerCase());
    need(u && u.active && u.pass === pass, 'E-mail ou senha inválidos.');
    if (u.role === 'admin') { if (!code) return { need2fa: true }; need(code === ADMIN_CODE, 'Código de verificação inválido.'); }
    audit(s, u, 'login'); save(s);
    return { session: { uid: u.id, last: Date.now() } };
  },
  orders(session) { // R2: o servidor filtra por perfil e por dono
    const u = api.user(session); const s = load();
    if (u.role === 'admin') return s.orders;
    if (u.role === 'customer') return s.orders.filter((o) => o.customerId === u.id);
    return s.orders.filter((o) => o.courierId === u.id);
  },
  createOrder(session, cart, addrIdx) {
    const u = api.user(session); need(u.role === 'customer', 'Apenas clientes criam pedidos.');
    const items = CATALOG.filter((p) => cart[p.id] > 0).map((p) => ({ ...p, qty: cart[p.id] }));
    need(items.length, 'Escolha ao menos um item.'); need(ADDRESSES[addrIdx], 'Escolha um endereço.');
    const s = load(); const t = now(s);
    const o = { id: 'TR-' + (1001 + s.orders.length), customerId: u.id, address: ADDRESSES[addrIdx], items, total: items.reduce((a, b) => a + b.price * b.qty, 0), createdAt: t, promisedAt: t + 4 * H, status: 'pedido_recebido', courierId: null, events: [{ status: 'pedido_recebido', at: t, by: u.name }] };
    s.orders.push(o); notify(s, o, 'Recebemos seu pedido ' + o.id + '.'); audit(s, u, 'criou ' + o.id); save(s); return o;
  },
  advance(session, id, opts = {}) {
    const u = api.user(session); const s = load(); const o = s.orders.find((x) => x.id === id); need(o, 'Pedido não encontrado.');
    if (opts.from && o.status !== opts.from) return 'conflict';
    const i = FLOW.indexOf(o.status); need(i >= 0 && i < 4, 'Pedido já finalizado.');
    if (u.role === 'admin') need(i <= 1, 'Administrador só avança até "Aguardando coleta".');
    else if (u.role === 'courier') { need(o.courierId === u.id, 'Entrega não atribuída a você.'); need(i >= 2, 'Pedido ainda não liberado para coleta.'); }
    else need(false, 'Seu perfil não pode alterar o status.');
    if (i === 2) need(o.courierId, 'Atribua um entregador antes de iniciar a rota.');
    setStatus(s, o, FLOW[i + 1], u.role === 'admin' ? u.name : u.name, opts.at); save(s); return 'ok';
  },
  assign(session, id, courierId, expected) { // atribuição atômica (compare-and-set)
    const u = api.user(session); need(u.role === 'admin', 'Apenas administradores atribuem entregas.');
    const s = load(); const o = s.orders.find((x) => x.id === id); need(o, 'Pedido não encontrado.');
    need((o.courierId || '') === (expected || ''), 'A atribuição mudou em outra tela. Atualize e tente de novo.');
    need(['pedido_recebido', 'em_separacao', 'aguardando_coleta'].includes(o.status), 'Não é possível reatribuir após a saída para rota.');
    if (courierId) { const c = s.users.find((x) => x.id === courierId); need(c && c.role === 'courier' && c.active, 'Entregador inválido.'); }
    o.courierId = courierId || null; audit(s, u, 'atribuiu ' + o.id + ' → ' + (courierId ? s.users.find((x) => x.id === courierId).name : 'ninguém')); save(s);
  },
  cancel(session, id, reason) {
    const u = api.user(session); const s = load(); const o = s.orders.find((x) => x.id === id); need(o, 'Pedido não encontrado.');
    need(['pedido_recebido', 'em_separacao', 'aguardando_coleta'].includes(o.status), 'Este pedido não pode mais ser cancelado.');
    if (u.role === 'customer') need(o.customerId === u.id, 'Pedido não pertence a você.'); else need(u.role === 'admin', 'Sem permissão.');
    o.cancelReason = reason || 'Cancelado'; setStatus(s, o, 'cancelado', u.name); audit(s, u, 'cancelou ' + o.id); save(s);
  },
  adminData(session) { const u = api.user(session); need(u.role === 'admin', 'Sem permissão.'); return load(); },
  myNotifications(session) { const u = api.user(session); return load().notifications.filter((n) => n.userId === u.id); },
  toggleUser(session, id) { const u = api.user(session); need(u.role === 'admin' && id !== u.id, 'Operação não permitida.'); const s = load(); const t = s.users.find((x) => x.id === id); t.active = !t.active; audit(s, u, (t.active ? 'ativou ' : 'desativou ') + t.name); save(s); },
  addUser(session, d) {
    const u = api.user(session); need(u.role === 'admin', 'Sem permissão.'); const s = load();
    need(d.name && d.email && d.pass.length >= 4, 'Preencha nome, e-mail e senha (mín. 4).'); need(ROLE[d.role], 'Perfil inválido.');
    need(!s.users.some((x) => x.email === d.email.toLowerCase()), 'E-mail já cadastrado.');
    s.users.push({ id: 'u' + uid(), role: d.role, name: d.name, email: d.email.toLowerCase(), pass: d.pass, active: true, consentEmail: false }); audit(s, u, 'criou usuário ' + d.name); save(s);
  },
  retryNotif(session, id) {
    const u = api.user(session); need(u.role === 'admin', 'Sem permissão.'); const s = load(); const n = s.notifications.find((x) => x.id === id);
    n.attempts++; if (!s.settings.failPush) n.status = 'enviada'; audit(s, u, 'reprocessou notificação'); save(s);
  },
  setConsent(session, v) { const u = api.user(session); const s = load(); s.users.find((x) => x.id === u.id).consentEmail = v; save(s); },
  exportMe(session) { const u = api.user(session); const s = load(); return { usuario: { nome: u.name, email: u.email, perfil: u.role, consentimentoEmail: !!u.consentEmail }, pedidos: s.orders.filter((o) => o.customerId === u.id), notificacoes: s.notifications.filter((n) => n.userId === u.id) }; },
  deleteMe(session) {
    const u = api.user(session); const s = load(); need(u.role === 'customer', 'Apenas clientes.');
    need(!s.orders.some((o) => o.customerId === u.id && !['entregue', 'cancelado'].includes(o.status)), 'Há pedidos em andamento; conclua-os antes.');
    const x = s.users.find((y) => y.id === u.id); x.name = 'Titular removido (LGPD)'; x.email = 'removido-' + uid() + '@traylo.app'; x.active = false; x.pass = uid(); audit(s, u, 'exclusão LGPD'); save(s);
  },
  simulate(session, what, v) {
    const u = api.user(session); need(u.role === 'admin', 'Sem permissão.'); const s = load();
    if (what === 'clock') s.clock = (s.clock || 0) + v * H; if (what === 'failPush') s.settings.failPush = v; save(s);
  },
};
function audit(s, u, action) { s.audit.unshift({ at: now(s), who: u ? u.name : '-', action }); s.audit = s.audit.slice(0, 150); }
function setStatus(s, o, status, by, at) {
  const t = at || now(s); o.status = status; o.events.push({ status, at: t, by });
  if (status === 'entregue') o.deliveredAt = t;
  notify(s, o, status === 'cancelado' ? 'Pedido ' + o.id + ' cancelado.' : 'Pedido ' + o.id + ': ' + LABEL[status] + '.');
}
function notify(s, o, msg) { // R3/R6: evento registrado + fila com canal alternativo
  const c = s.users.find((u) => u.id === o.customerId); if (!c || !c.active) return;
  const n = { id: uid(), orderId: o.id, userId: c.id, at: now(s), msg, channel: 'push', status: 'enviada', attempts: 1 };
  if (s.settings.failPush && Math.random() < 0.6) { n.status = 'falhou'; if (c.consentEmail) { n.channel = 'e-mail'; n.status = 'enviada'; n.attempts = 2; n.fallback = true; } }
  s.notifications.unshift(n); s.notifications = s.notifications.slice(0, 300);
}

/* ---------- indicadores (definições formais — R8) ---------- */
function kpis(s) {
  const t = now(s), o = s.orders, del = o.filter((x) => x.status === 'entregue');
  const onTime = del.filter((x) => x.deliveredAt <= x.promisedAt).length;
  const overdue = o.filter((x) => !['entregue', 'cancelado'].includes(x.status) && t > x.promisedAt).length;
  const canc = o.filter((x) => x.status === 'cancelado').length;
  const avg = del.length ? del.reduce((a, x) => a + (x.deliveredAt - x.createdAt), 0) / del.length : 0;
  const per = s.users.filter((u) => u.role === 'courier').map((c) => {
    const d = del.filter((x) => x.courierId === c.id); const ok = d.filter((x) => x.deliveredAt <= x.promisedAt).length;
    return { name: c.name, total: d.length, pct: d.length ? ok / d.length : null, open: o.filter((x) => x.courierId === c.id && !['entregue', 'cancelado'].includes(x.status)).length };
  });
  return { total: o.length, delivered: del.length, onTime, pctOnTime: del.length ? onTime / del.length : null, late: del.length - onTime, overdue, canc, cancRate: o.length ? canc / o.length : 0, avg, per };
}

/* ---------- utilidades de interface ---------- */
const e = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dt = (t) => new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const pct = (v) => (v == null ? '—' : Math.round(v * 100) + '%');
const hrs = (ms) => (ms ? (ms / H).toFixed(1).replace('.', ',') + ' h' : '—');
const km = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) * 0.25;
function toast(m) { const t = document.getElementById('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 3200); }
function chipFor(o, t) {
  if (o.status === 'cancelado') return '<span class="chip bad">Cancelado</span>';
  if (o.status === 'entregue') return '<span class="chip ' + (o.deliveredAt <= o.promisedAt ? 'ok' : 'warn') + '">Entregue' + (o.deliveredAt <= o.promisedAt ? '' : ' com atraso') + '</span>';
  return '<span class="chip ' + (t > o.promisedAt ? 'bad' : '') + '">' + LABEL[o.status] + (t > o.promisedAt ? ' · atrasado' : '') + '</span>';
}

function mapSvg({ stops = [], route = false, courierAt = null, dest = null }) {
  const pts = [DEPOT, ...stops];
  let g = '';
  for (let i = 10; i < 100; i += 10) g += `<path d="M${i} 0V100M0 ${i}H100" stroke="currentColor" stroke-opacity=".08" stroke-width=".4"/>`;
  if (route && stops.length) g += `<polyline points="${pts.map((p) => p.x + ',' + p.y).join(' ')}" fill="none" stroke="var(--brand)" stroke-width="1.2" stroke-dasharray="3 2"/>`;
  if (dest) g += `<line x1="${DEPOT.x}" y1="${DEPOT.y}" x2="${dest.x}" y2="${dest.y}" stroke="var(--brand)" stroke-width="1" stroke-dasharray="2 2"/><circle cx="${dest.x}" cy="${dest.y}" r="3.2" fill="var(--bad)"/>`;
  stops.forEach((p, i) => { g += `<circle cx="${p.x}" cy="${p.y}" r="3.6" fill="var(--brand)"/><text x="${p.x}" y="${p.y + 1.4}" font-size="4" text-anchor="middle" fill="#fff" font-weight="700">${i + 1}</text>`; });
  g += `<rect x="${DEPOT.x - 3}" y="${DEPOT.y - 3}" width="6" height="6" rx="1" fill="var(--text)"/>`;
  if (courierAt) g += `<circle cx="${courierAt.x}" cy="${courierAt.y}" r="4" fill="var(--info)" stroke="#fff" stroke-width="1"/>`;
  return `<svg class="map" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Mapa simplificado"><g style="color:var(--text)">${g}</g></svg>`;
}
const nearest = (list) => { // vizinho mais próximo a partir do centro de distribuição
  const rest = [...list]; const out = []; let cur = DEPOT;
  while (rest.length) { let bi = 0; rest.forEach((o, i) => { if (km(cur, o.address) < km(cur, rest[bi].address)) bi = i; }); const [n] = rest.splice(bi, 1); out.push(n); cur = n.address; }
  return out;
};

/* ---------- estado da interface ---------- */
const ui = { tab: {}, need2fa: null, err: '', cart: {}, addr: 0, newOpen: false, sel: null, dirty: false };
let session = sess.get(SKEY, null);
const offline = () => sess.get('traylo.off', false);
const app = document.getElementById('app');

function guard(fn) { try { const r = fn(); touch(); return r; } catch (er) { toast(er.message); render(); return undefined; } }
function touch() { if (session) { session.last = Date.now(); sess.set(SKEY, session); } }
function me() { try { return api.user(session); } catch { return null; } }

/* ---------- telas ---------- */
function viewLogin() {
  const demos = [['Cliente', 'cliente@traylo.app'], ['Entregador', 'entregador@traylo.app'], ['Administrador', 'admin@traylo.app']];
  return `<div class="login"><div class="card"><div class="logo">Tray<i>lo</i></div><p class="muted">Entregas e acompanhamento de pedidos</p>
  <form data-form="login"><label for="em">E-mail</label><input id="em" name="email" type="email" required autocomplete="username" value="${e(ui.need2fa ? ui.need2fa.email : '')}">
  <label for="pw">Senha</label><input id="pw" name="pass" type="password" required autocomplete="current-password" value="${e(ui.need2fa ? ui.need2fa.pass : '')}">
  ${ui.need2fa ? '<label for="cd">Código de verificação (administrador)</label><input id="cd" name="code" inputmode="numeric" maxlength="6" autofocus placeholder="000000"><p class="small muted">Demonstração: o código é 000000.</p>' : ''}
  ${ui.err ? `<p class="small" style="color:var(--bad)" role="alert">${e(ui.err)}</p>` : ''}
  <p><button class="primary" style="width:100%">${ui.need2fa ? 'Verificar e entrar' : 'Entrar'}</button></p></form></div>
  <div class="card demo"><h3>Contas de demonstração</h3><p class="small muted">Senha de todas: 1234. Abra abas diferentes para ver os perfis ao mesmo tempo.</p>
  ${demos.map(([n, m]) => `<button data-act="demo" data-email="${m}"><b>${n}</b> <span class="muted small">${m}</span></button>`).join('')}</div></div>`;
}

function header(u) {
  return `<div class="topbar"><span class="logo">Tray<i>lo</i></span><span class="chip gray">${ROLE[u.role]}</span><span class="spacer"></span><span class="small muted">${e(u.name)}</span><button class="sm" data-act="logout">Sair</button></div>`;
}

function timeline(o) {
  if (o.status === 'cancelado') return `<ul class="timeline">${o.events.map((ev) => `<li class="done"><span>${LABEL[ev.status]}</span> <span class="small muted">${dt(ev.at)}</span></li>`).join('')}</ul>`;
  const idx = FLOW.indexOf(o.status);
  return `<ul class="timeline">${FLOW.map((st, i) => { const ev = o.events.find((x) => x.status === st); return `<li class="${i <= idx ? 'done' : ''} ${i === idx ? 'cur' : ''}">${LABEL[st]} ${ev ? `<span class="small muted">${dt(ev.at)}</span>` : ''}</li>`; }).join('')}</ul>`;
}

function viewCustomer(u) {
  const orders = api.orders(session).slice().sort((a, b) => b.createdAt - a.createdAt); const t = now();
  const sel = orders.find((o) => o.id === ui.sel) || orders.find((o) => !['entregue', 'cancelado'].includes(o.status)) || orders[0];
  const tab = ui.tab.c || 'pedidos';
  const notes = api.myNotifications(session);
  let body = '';
  if (tab === 'pedidos') {
    const total = CATALOG.reduce((a, p) => a + (ui.cart[p.id] || 0) * p.price, 0);
    body = `<div class="grid g2"><div>
      <div class="row" style="justify-content:space-between;margin-bottom:10px"><h2>Meus pedidos</h2><button class="primary" data-act="toggle-new">${ui.newOpen ? 'Fechar' : 'Novo pedido'}</button></div>
      ${ui.newOpen ? `<form class="card" data-form="order"><h3>Novo pedido</h3>${CATALOG.map((p) => `<div class="row" style="justify-content:space-between;margin:6px 0"><span>${e(p.name)} <span class="muted small">${money(p.price)}</span></span><input type="number" min="0" max="9" style="width:70px" aria-label="Quantidade de ${e(p.name)}" data-cart="${p.id}" value="${ui.cart[p.id] || 0}"></div>`).join('')}
        <label for="ad">Endereço de entrega</label><select id="ad" data-addr>${ADDRESSES.map((a, i) => `<option value="${i}" ${i === +ui.addr ? 'selected' : ''}>${e(a.label)}</option>`).join('')}</select>
        <p style="margin-top:12px"><b>Total: ${money(total)}</b> <span class="muted small">· Pagamento via gateway certificado; o Traylo não guarda dados de cartão.</span></p><button class="primary">Confirmar pedido</button></form>` : ''}
      ${orders.length ? orders.map((o) => `<div class="order ${sel && sel.id === o.id ? 'sel' : ''}"><div class="row" style="justify-content:space-between"><b>${o.id}</b>${chipFor(o, t)}</div>
        <p class="small muted">${o.items.map((i) => i.qty + '× ' + e(i.name)).join(', ')} · ${money(o.total)}</p><p class="small muted">Previsão: ${dt(o.promisedAt)}</p>
        <div class="row"><button class="sm" data-act="sel" data-id="${o.id}">Acompanhar</button>${['pedido_recebido', 'em_separacao', 'aguardando_coleta'].includes(o.status) ? `<button class="sm danger" data-act="cancel" data-id="${o.id}">Cancelar</button>` : ''}</div></div>`).join('') : '<p class="muted">Nenhum pedido ainda.</p>'}</div>
      <div>${sel ? `<div class="card"><div class="row" style="justify-content:space-between"><h2>Pedido ${sel.id}</h2>${chipFor(sel, t)}</div>
        ${mapSvg({ dest: sel.address, courierAt: sel.status === 'em_rota' ? { x: (DEPOT.x + sel.address.x) / 2, y: (DEPOT.y + sel.address.y) / 2 } : sel.status === 'entregue' ? sel.address : null })}
        <p class="small muted" style="margin-top:8px">${e(sel.address.label)}</p>${timeline(sel)}</div>` : ''}</div></div>`;
  } else if (tab === 'avisos') {
    body = `<div class="card"><h2>Notificações</h2>${notes.length ? `<div class="tscroll"><table><tr><th>Quando</th><th>Mensagem</th><th>Canal</th><th>Situação</th></tr>${notes.slice(0, 40).map((n) => `<tr><td>${dt(n.at)}</td><td>${e(n.msg)}</td><td>${n.channel}${n.fallback ? ' <span class="small muted">(push falhou)</span>' : ''}</td><td><span class="chip ${n.status === 'enviada' ? 'ok' : 'bad'}">${n.status}</span></td></tr>`).join('')}</table></div>` : '<p class="muted">Sem notificações.</p>'}</div>`;
  } else {
    body = `<div class="card"><h2>Privacidade e dados (LGPD)</h2><p class="small muted">Coletamos apenas nome, e-mail, endereço e itens do pedido, para entregar sua compra. Você pode revisar, exportar ou excluir seus dados.</p>
      <label class="inline"><input type="checkbox" data-act="consent" ${u.consentEmail ? 'checked' : ''}> Receber avisos por e-mail quando o push falhar</label>
      <div class="row" style="margin-top:14px"><button data-act="export">Exportar meus dados (JSON)</button><button class="danger" data-act="delete-me">Excluir minha conta</button></div></div>`;
  }
  return header(u) + `<div class="wrap"><div class="tabs" role="tablist">${[['pedidos', 'Pedidos'], ['avisos', 'Notificações'], ['privacidade', 'Privacidade']].map(([k, l]) => `<button class="tab" role="tab" aria-selected="${tab === k}" data-act="tab" data-scope="c" data-tab="${k}">${l}</button>`).join('')}</div>${body}</div>`;
}

function viewCourier(u) {
  const off = offline(); const queue = store.get(QKEY + u.id, []);
  const base = off ? sess.get(CKEY, []) : api.orders(session);
  const eff = (o) => { const q = queue.filter((x) => x.id === o.id).pop(); return q ? q.to : o.status; };
  const open = nearest(base.filter((o) => ['aguardando_coleta', 'em_rota'].includes(eff(o))));
  const done = base.filter((o) => eff(o) === 'entregue').length;
  let dist = 0, cur = DEPOT; open.forEach((o) => { dist += km(cur, o.address); cur = o.address; });
  const eta = Math.round((dist / 25) * 60 + open.length * 4);
  return header(u) + `<div class="wrap">
    <div class="card row" style="justify-content:space-between"><div><h2 style="margin:0">Minha rota de hoje</h2><p class="small muted">${open.length} parada(s) · ${dist.toFixed(1).replace('.', ',')} km · ~${eta} min · ${done} concluída(s)</p></div>
    <div class="row"><span class="chip ${off ? 'bad' : 'ok'}">${off ? 'Offline' : 'Online'}</span><button data-act="toggle-offline">${off ? 'Voltar a ficar online' : 'Simular perda de sinal'}</button></div></div>
    ${off ? '<div class="notice">Sem conexão: rota em cache. Suas ações ficam salvas neste aparelho com data e hora e são enviadas quando o sinal voltar.</div>' : ''}
    ${queue.length ? `<div class="notice">${queue.length} ação(ões) aguardando sincronização.</div>` : ''}
    <div class="grid g2"><div class="card">${mapSvg({ stops: open.map((o) => o.address), route: true })}<p class="small muted" style="margin-top:6px">Quadrado = centro de distribuição. Ordem calculada pelo vizinho mais próximo.</p></div>
    <div>${open.length ? open.map((o, i) => { const st = eff(o); return `<div class="order"><div class="stop"><span class="num">${i + 1}</span><div style="flex:1"><div class="row" style="justify-content:space-between"><b>${o.id}</b>${chipFor({ ...o, status: st }, now())}</div>
      <p>${e(o.address.label)}</p><p class="small muted">${o.items.map((x) => x.qty + '× ' + e(x.name)).join(', ')} · entregar até ${dt(o.promisedAt)}</p>
      <button class="primary sm" data-act="courier-next" data-id="${o.id}" data-from="${st}">${st === 'aguardando_coleta' ? 'Iniciar rota' : 'Confirmar entrega'}</button></div></div></div>`; }).join('') : '<div class="card"><p class="muted">Nenhuma entrega pendente. Peça ao administrador para atribuir pedidos.</p></div>'}</div></div></div>`;
}

function viewAdmin(u) {
  const s = api.adminData(session); const t = now(s); const k = kpis(s); const tab = ui.tab.a || 'painel';
  const couriers = s.users.filter((x) => x.role === 'courier' && x.active);
  const name = (id) => (s.users.find((x) => x.id === id) || {}).name || '—';
  let body = '';
  if (tab === 'painel') {
    const counts = [...FLOW, 'cancelado'].map((st) => [st, s.orders.filter((o) => o.status === st).length]); const mx = Math.max(1, ...counts.map((c) => c[1]));
    body = `<div class="kpis"><div class="kpi"><b>${pct(k.pctOnTime)}</b><span>Entregas no prazo</span></div><div class="kpi"><b>${k.late}</b><span>Entregues com atraso</span></div><div class="kpi"><b>${k.overdue}</b><span>Em andamento e atrasados</span></div><div class="kpi"><b>${k.canc} <small class="muted" style="font-size:.9rem">(${pct(k.cancRate)})</small></b><span>Cancelamentos</span></div><div class="kpi"><b>${hrs(k.avg)}</b><span>Tempo médio de entrega</span></div></div>
      <div class="grid g2"><div class="card"><h2>Pedidos por status</h2>${counts.map(([st, n]) => `<div class="bar"><span class="lbl">${LABEL[st]}</span><span class="track"><span class="fill" style="display:block;width:${(n / mx) * 100}%;${st === 'cancelado' ? 'background:var(--bad)' : ''}"></span></span><b>${n}</b></div>`).join('')}</div>
      <div class="card"><h2>Por entregador</h2><table><tr><th>Entregador</th><th>Entregas</th><th>No prazo</th><th>Em aberto</th></tr>${k.per.map((p) => `<tr><td>${e(p.name)}</td><td>${p.total}</td><td>${pct(p.pct)}</td><td>${p.open}</td></tr>`).join('')}</table></div></div>
      <div class="card"><h3>Definições dos indicadores</h3><p class="small muted"><b>No prazo:</b> entregues com data/hora de entrega ≤ previsão ÷ total entregue. <b>Atrasado:</b> entregue após a previsão, ou ainda aberto com o relógio além da previsão. <b>Cancelamento:</b> pedidos cancelados ÷ total de pedidos. Cálculo central, sobre os eventos registrados.</p></div>
      <div class="card"><h3>Simulação (demonstração)</h3><div class="row"><span class="small muted">Relógio: ${dt(t)} (${(s.clock || 0) / H >= 0 ? '+' : ''}${((s.clock || 0) / H).toFixed(0)} h)</span><button class="sm" data-act="clock" data-v="1">+1 h</button><button class="sm" data-act="clock" data-v="4">+4 h</button>
      <label class="inline" style="margin:0"><input type="checkbox" data-act="failpush" ${s.settings.failPush ? 'checked' : ''}> Simular falha de push</label><button class="sm danger" data-act="reset">Restaurar dados de exemplo</button></div></div>`;
  } else if (tab === 'pedidos') {
    body = `<div class="card"><h2>Pedidos e despacho</h2><div class="tscroll"><table><tr><th>Pedido</th><th>Cliente</th><th>Destino</th><th>Previsão</th><th>Status</th><th>Entregador</th><th>Ações</th></tr>
      ${s.orders.slice().sort((a, b) => b.createdAt - a.createdAt).map((o) => { const editable = ['pedido_recebido', 'em_separacao', 'aguardando_coleta'].includes(o.status);
        return `<tr><td><b>${o.id}</b></td><td>${e(name(o.customerId))}</td><td class="small">${e(o.address.label)}</td><td class="small">${dt(o.promisedAt)}</td><td>${chipFor(o, t)}</td>
        <td>${editable ? `<select data-assign="${o.id}" data-expected="${o.courierId || ''}" aria-label="Entregador do pedido ${o.id}"><option value="">— nenhum —</option>${couriers.map((c) => `<option value="${c.id}" ${o.courierId === c.id ? 'selected' : ''}>${e(c.name)}</option>`).join('')}</select>` : e(name(o.courierId))}</td>
        <td class="row">${['pedido_recebido', 'em_separacao'].includes(o.status) ? `<button class="sm" data-act="advance" data-id="${o.id}">Avançar</button>` : ''}${editable ? `<button class="sm danger" data-act="cancel" data-id="${o.id}">Cancelar</button>` : ''}</td></tr>`; }).join('')}</table></div></div>`;
  } else if (tab === 'usuarios') {
    body = `<div class="grid g2"><div class="card"><h2>Usuários</h2><div class="tscroll"><table><tr><th>Nome</th><th>Perfil</th><th>Situação</th><th></th></tr>${s.users.map((x) => `<tr><td>${e(x.name)}<br><span class="small muted">${e(x.email)}</span></td><td>${ROLE[x.role]}</td><td><span class="chip ${x.active ? 'ok' : 'gray'}">${x.active ? 'ativo' : 'inativo'}</span></td><td>${x.id !== u.id ? `<button class="sm" data-act="toggle-user" data-id="${x.id}">${x.active ? 'Desativar' : 'Ativar'}</button>` : ''}</td></tr>`).join('')}</table></div></div>
      <form class="card" data-form="user"><h2>Novo usuário</h2><label for="un">Nome</label><input id="un" name="name" required><label for="ue">E-mail</label><input id="ue" name="email" type="email" required><label for="up">Senha provisória</label><input id="up" name="pass" type="password" required minlength="4"><label for="ur">Perfil</label><select id="ur" name="role">${Object.entries(ROLE).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select><p><button class="primary">Criar usuário</button></p></form></div>`;
  } else if (tab === 'notificacoes') {
    body = `<div class="card"><h2>Fila de notificações</h2><div class="tscroll"><table><tr><th>Quando</th><th>Pedido</th><th>Mensagem</th><th>Canal</th><th>Tentativas</th><th>Situação</th><th></th></tr>${s.notifications.slice(0, 60).map((n) => `<tr><td>${dt(n.at)}</td><td>${n.orderId}</td><td class="small">${e(n.msg)}</td><td>${n.channel}</td><td>${n.attempts}</td><td><span class="chip ${n.status === 'enviada' ? 'ok' : 'bad'}">${n.status}</span></td><td>${n.status === 'falhou' ? `<button class="sm" data-act="retry" data-id="${n.id}">Reprocessar</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">Sem notificações ainda.</td></tr>'}</table></div></div>`;
  } else {
    body = `<div class="card"><h2>Trilha de auditoria</h2><div class="tscroll"><table><tr><th>Quando</th><th>Quem</th><th>Ação</th></tr>${s.audit.map((a) => `<tr><td>${dt(a.at)}</td><td>${e(a.who)}</td><td>${e(a.action)}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">Vazia.</td></tr>'}</table></div></div>`;
  }
  const tabs = [['painel', 'Painel'], ['pedidos', 'Pedidos'], ['usuarios', 'Usuários'], ['notificacoes', 'Notificações'], ['auditoria', 'Auditoria']];
  return header(u) + `<div class="wrap"><div class="tabs" role="tablist">${tabs.map(([kk, l]) => `<button class="tab" role="tab" aria-selected="${tab === kk}" data-act="tab" data-scope="a" data-tab="${kk}">${l}</button>`).join('')}</div>${body}</div>`;
}

function render() {
  ui.dirty = false;
  const u = session && me();
  if (session && !u) { session = null; sess.set(SKEY, null); }
  if (session && Date.now() - session.last > SESSION_TTL) { session = null; sess.set(SKEY, null); ui.err = 'Sessão expirada por inatividade.'; }
  if (!session) { app.innerHTML = viewLogin(); return; }
  try { app.innerHTML = u.role === 'customer' ? viewCustomer(u) : u.role === 'courier' ? viewCourier(u) : viewAdmin(u); }
  catch (er) { app.innerHTML = '<div class="wrap"><div class="card">Erro ao exibir a tela: ' + e(er.message) + '</div></div>'; }
}

/* ---------- eventos ---------- */
function flushQueue(u) {
  const key = QKEY + u.id; const q = store.get(key, []); let ok = 0, conflicts = 0;
  q.forEach((a) => { try { const r = api.advance(session, a.id, { from: a.from, at: a.at }); r === 'conflict' ? conflicts++ : ok++; } catch { conflicts++; } });
  store.set(key, []); return { ok, conflicts };
}
document.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-act]'); if (!b || b.tagName === 'INPUT') return; const a = b.dataset.act, id = b.dataset.id;
  if (a === 'demo') { ui.err = ''; const f = app.querySelector('[name=email]'); f.value = b.dataset.email; app.querySelector('[name=pass]').value = '1234'; app.querySelector('form').requestSubmit(); return; }
  if (a === 'logout') { session = null; sess.set(SKEY, null); sess.set('traylo.off', false); ui.need2fa = null; ui.err = ''; return render(); }
  if (a === 'tab') { ui.tab[b.dataset.scope] = b.dataset.tab; return render(); }
  if (a === 'toggle-new') { ui.newOpen = !ui.newOpen; return render(); }
  if (a === 'sel') { ui.sel = id; return render(); }
  if (a === 'cancel') { const reason = prompt('Motivo do cancelamento (opcional):'); if (reason === null) return; guard(() => api.cancel(session, id, reason)); toast('Pedido cancelado.'); return render(); }
  if (a === 'advance') { guard(() => api.advance(session, id)); return render(); }
  if (a === 'toggle-user') { guard(() => api.toggleUser(session, id)); return render(); }
  if (a === 'retry') { guard(() => api.retryNotif(session, id)); return render(); }
  if (a === 'clock') { guard(() => api.simulate(session, 'clock', +b.dataset.v)); return render(); }
  if (a === 'reset') { if (confirm('Restaurar todos os dados de exemplo?')) { store.set(KEY, seed()); Object.keys(localStorage).filter((k) => k.startsWith(QKEY)).forEach((k) => localStorage.removeItem(k)); toast('Dados restaurados.'); render(); } return; }
  if (a === 'export') { const blob = new Blob([JSON.stringify(guard(() => api.exportMe(session)), null, 2)], { type: 'application/json' }); const l = document.createElement('a'); l.href = URL.createObjectURL(blob); l.download = 'meus-dados-traylo.json'; l.click(); return; }
  if (a === 'delete-me') { if (confirm('Excluir sua conta e anonimizar seus dados? Não dá para desfazer.')) { const ok = guard(() => { api.deleteMe(session); return true; }); if (ok) { session = null; sess.set(SKEY, null); toast('Conta excluída.'); render(); } } return; }
  if (a === 'toggle-offline') {
    const u = me(); if (!offline()) { sess.set(CKEY, api.orders(session)); sess.set('traylo.off', true); toast('Sem sinal (simulado). Usando rota em cache.'); }
    else { sess.set('traylo.off', false); const r = flushQueue(u); toast('Sincronizado: ' + r.ok + ' ação(ões)' + (r.conflicts ? ', ' + r.conflicts + ' conflito(s) ignorado(s)' : '') + '.'); }
    return render();
  }
  if (a === 'courier-next') {
    const u = me(); const to = b.dataset.from === 'aguardando_coleta' ? 'em_rota' : 'entregue';
    if (offline()) { const k = QKEY + u.id; const q = store.get(k, []); q.push({ id, from: b.dataset.from, to, at: now() }); store.set(k, q); toast('Salvo offline; será sincronizado.'); }
    else guard(() => api.advance(session, id, { from: b.dataset.from }));
    return render();
  }
});
document.addEventListener('change', (ev) => {
  const t = ev.target;
  if (t.dataset.act === 'consent') guard(() => api.setConsent(session, t.checked));
  else if (t.dataset.act === 'failpush') { guard(() => api.simulate(session, 'failPush', t.checked)); render(); }
  else if (t.dataset.assign) { guard(() => api.assign(session, t.dataset.assign, t.value, t.dataset.expected)); toast('Atribuição salva.'); render(); }
  else if (t.hasAttribute('data-addr')) ui.addr = t.value;
});
document.addEventListener('input', (ev) => { const c = ev.target.dataset.cart; if (c) ui.cart[c] = Math.max(0, Math.min(9, +ev.target.value || 0)); });
document.addEventListener('submit', (ev) => {
  const f = ev.target; if (!f.dataset.form) return; ev.preventDefault(); const d = Object.fromEntries(new FormData(f));
  if (f.dataset.form === 'login') {
    try { const r = api.login(d.email, d.pass, d.code); if (r.need2fa) { ui.need2fa = { email: d.email, pass: d.pass }; ui.err = ''; } else { session = r.session; sess.set(SKEY, session); ui.need2fa = null; ui.err = ''; ui.tab = {}; ui.sel = null; } }
    catch (er) { ui.err = er.message; }
    return render();
  }
  if (f.dataset.form === 'order') { const o = guard(() => api.createOrder(session, ui.cart, +ui.addr)); if (o) { ui.cart = {}; ui.newOpen = false; ui.sel = o.id; toast('Pedido ' + o.id + ' criado.'); } return render(); }
  if (f.dataset.form === 'user') { guard(() => api.addUser(session, d)); toast('Usuário criado.'); return render(); }
});

// tempo real entre abas: só redesenha se o usuário não estiver digitando
window.addEventListener('storage', (ev) => {
  if (ev.key !== KEY && !(ev.key || '').startsWith(QKEY)) return;
  const a = document.activeElement; if (a && /INPUT|SELECT|TEXTAREA/.test(a.tagName) && app.contains(a)) { ui.dirty = true; return; } render();
});
document.addEventListener('focusout', () => { if (ui.dirty) setTimeout(() => { const a = document.activeElement; if (!(a && /INPUT|SELECT|TEXTAREA/.test(a.tagName))) render(); }, 50); });
setInterval(() => { if (session && Date.now() - session.last > SESSION_TTL) render(); }, 30000);
render();
