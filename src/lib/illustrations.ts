// Ilustrações simples em SVG (data URI) para o StatusCard — sem depender de imagens externas.
const wrap = (body: string) => "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 128" fill="none">${body}</svg>`)

const box = `<path d="M40 52l40-20 40 20v44l-40 20-40-20z" fill="#f4c27a"/><path d="M40 52l40 20 40-20" stroke="#c98f3d" stroke-width="3" stroke-linejoin="round"/><path d="M80 72v44" stroke="#c98f3d" stroke-width="3"/><path d="M60 42l40 20v14" stroke="#e8a94f" stroke-width="3"/>`

export const illustrations = {
  recebido: wrap(`<circle cx="80" cy="64" r="56" fill="#0f9d8a" opacity=".12"/>${box}`),
  separacao: wrap(`<circle cx="80" cy="64" r="56" fill="#6366f1" opacity=".12"/>${box}<rect x="96" y="14" width="40" height="30" rx="6" fill="#6366f1"/><path d="M106 29l7 7 12-14" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`),
  coleta: wrap(`<circle cx="80" cy="64" r="56" fill="#f59e0b" opacity=".14"/>${box}<circle cx="124" cy="30" r="16" fill="#f59e0b"/><path d="M124 22v9l6 4" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`),
  rota: wrap(`<circle cx="80" cy="64" r="56" fill="#1a73e8" opacity=".12"/><path d="M14 110h132" stroke="#94a3b8" stroke-width="3" stroke-dasharray="6 6"/><circle cx="46" cy="98" r="16" stroke="#1e293b" stroke-width="5"/><circle cx="118" cy="98" r="16" stroke="#1e293b" stroke-width="5"/><path d="M46 98l22-34h30l20 34M68 64l-6-12h-12M98 64l-8-18" stroke="#1e293b" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><g transform="translate(54 30) scale(.55)">${box}</g>`),
  entregue: wrap(`<circle cx="80" cy="64" r="56" fill="#16a34a" opacity=".14"/>${box}<circle cx="122" cy="30" r="17" fill="#16a34a"/><path d="M113 30l7 7 12-14" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`),
  cancelado: wrap(`<circle cx="80" cy="64" r="56" fill="#dc2626" opacity=".12"/>${box}<circle cx="122" cy="30" r="17" fill="#dc2626"/><path d="M114 22l16 16M130 22l-16 16" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`),
}
