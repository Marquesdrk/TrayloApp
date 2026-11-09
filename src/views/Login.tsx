import { useState } from "react"
import { ArrowRight, Bike, LayoutDashboard, ShieldCheck, ShoppingBag } from "lucide-react"
import { api, setSession } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/Logo"
import { GpsMap } from "@/components/GpsMap"

const DEMOS = [
  { label: "Cliente", sub: "Acompanhe o pedido no mapa", email: "cliente@traylo.app", Icon: ShoppingBag },
  { label: "Entregador", sub: "Rota e navegação", email: "entregador@traylo.app", Icon: Bike },
  { label: "Administrador", sub: "Painel de logística", email: "admin@traylo.app", Icon: LayoutDashboard },
]
const field = "h-12 w-full rounded-xl border border-input bg-card/60 px-4 text-[15px] outline-none transition placeholder:text-muted-foreground/60 focus:border-primary focus:ring-4 focus:ring-primary/20"

export function Login() {
  const [email, setEmail] = useState(""), [pass, setPass] = useState(""), [code, setCode] = useState("")
  const [need2fa, setNeed2fa] = useState(false), [err, setErr] = useState("")

  const submit = (e?: string, p?: string) => {
    try {
      const r = api.login(e ?? email, p ?? pass, code)
      if ("need2fa" in r) { if (e) { setEmail(e); setPass(p ?? "") } setNeed2fa(true); setErr(""); return }
      setSession(r.session)
    } catch (x) { setErr((x as Error).message) }
  }

  return (
    <div className="relative grid min-h-full lg:grid-cols-[minmax(420px,520px)_1fr]">
      <div className="aurora relative flex flex-col justify-center px-6 py-10 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Logo size={44} />
          <h1 className="mt-10 text-[2.6rem] font-extrabold leading-[1.05]">Cada curva da entrega, <span className="text-brand">ao vivo.</span></h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">Rastreie pedidos, otimize rotas e acompanhe a logística em um só lugar.</p>

          <form className="mt-8 space-y-3" onSubmit={(ev) => { ev.preventDefault(); submit() }}>
            <input className={field} type="email" required aria-label="E-mail" placeholder="E-mail" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className={field} type="password" required aria-label="Senha" placeholder="Senha" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} />
            {need2fa && (
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-brand2" />Verificação em duas etapas</p>
                <input className={field + " text-center text-lg tracking-[0.5em]"} aria-label="Código de verificação" inputMode="numeric" maxLength={6} autoFocus placeholder="000000" value={code} onChange={(e) => setCode(e.target.value)} />
                <p className="mt-1.5 text-xs text-muted-foreground">Demonstração: o código é 000000.</p>
              </div>
            )}
            {err && <p role="alert" className="text-sm font-semibold text-destructive">{err}</p>}
            <Button className="h-12 w-full rounded-xl text-[15px] font-bold" size="lg">{need2fa ? "Verificar e entrar" : "Entrar"}<ArrowRight className="ml-2 h-4 w-4" /></Button>
          </form>

          <div className="mt-9">
            <p className="eyebrow mb-3">Experimente · senha 1234</p>
            <div className="space-y-2">
              {DEMOS.map(({ label, sub, email: em, Icon }) => (
                <button key={em} onClick={() => submit(em, "1234")} className="group flex w-full items-center gap-3.5 rounded-2xl border bg-card/50 p-3.5 text-left transition hover:border-primary/60 hover:bg-card">
                  <span className="bg-brand grid h-11 w-11 place-items-center rounded-xl text-white shadow-[0_6px_18px_-6px_hsl(var(--primary)/.8)]"><Icon className="h-5 w-5" /></span>
                  <span className="flex-1"><span className="block text-[15px] font-bold leading-tight">{label}</span><span className="mt-0.5 block text-[13px] text-muted-foreground">{sub}</span></span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="relative hidden lg:block">
        <GpsMap className="absolute inset-0" mode="overview" markers={[]} routeTodo={[]} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background via-background/10 to-transparent" />
      </div>
    </div>
  )
}
