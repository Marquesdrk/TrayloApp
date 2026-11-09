import type { ReactNode } from "react"

/** Moldura de app mobile: tela cheia no celular, "aparelho" centralizado no desktop. */
export function PhoneShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full bg-background md:grid md:place-items-center md:p-6 md:aurora">
      <div className="relative mx-auto h-[100dvh] w-full max-w-[440px] overflow-hidden bg-background md:h-[min(880px,calc(100dvh-3rem))] md:rounded-[2.6rem] md:border md:border-white/15 md:shadow-[0_0_0_8px_hsl(var(--card)),0_40px_120px_-20px_hsl(var(--primary)/.45)]">
        {children}
      </div>
    </div>
  )
}

/** Painel inferior em vidro, sobre o mapa. */
export function Sheet({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={"glass absolute inset-x-0 z-20 max-h-[68%] overflow-y-auto rounded-t-[2rem] border-b-0 shadow-[0_-20px_60px_-10px_rgba(0,0,0,.55)] " + className}>
      <div className="sticky top-0 z-10 flex justify-center pb-1 pt-2.5"><span className="h-1 w-9 rounded-full bg-foreground/25" /></div>
      <div className="px-5 pb-5 pt-1">{children}</div>
    </div>
  )
}
