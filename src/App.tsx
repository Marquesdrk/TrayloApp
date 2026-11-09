import { useEffect, useState } from "react"
import { api, getSession, setSession, SESSION_TTL, type Session } from "@/lib/api"
import { useDbTick, useToast, toast } from "@/lib/hooks"
import { Login } from "@/views/Login"
import { Customer } from "@/views/Customer"
import { Courier } from "@/views/Courier"
import { Admin } from "@/views/Admin"

export default function App() {
  useDbTick()
  const [session, setS] = useState<Session | null>(getSession())
  const msg = useToast()

  // sessão vive por aba; expira por inatividade (R2)
  useEffect(() => {
    const sync = () => setS(getSession())
    window.addEventListener("traylo:change", sync)
    const touch = () => { const s = getSession(); if (s) { s.last = Date.now(); sessionStorage.setItem("traylo.session", JSON.stringify(s)) } }
    window.addEventListener("pointerdown", touch)
    const i = setInterval(() => { const s = getSession(); if (s && Date.now() - s.last > SESSION_TTL) { setSession(null); toast("Sessão expirada por inatividade.") } }, 30000)
    return () => { window.removeEventListener("traylo:change", sync); window.removeEventListener("pointerdown", touch); clearInterval(i) }
  }, [])

  let user = null
  try { user = session ? api.user(session) : null } catch { user = null }

  return (
    <>
      {!user ? <Login /> : user.role === "customer" ? <Customer user={user} session={session} /> : user.role === "courier" ? <Courier user={user} session={session} /> : <Admin user={user} session={session} />}
      <div aria-live="polite" className={"pointer-events-none fixed inset-x-0 bottom-24 z-[100] flex justify-center px-4 transition-all " + (msg ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0")}>
        <div className="max-w-sm rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-float">{msg}</div>
      </div>
    </>
  )
}
