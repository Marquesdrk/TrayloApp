import { cn } from "@/lib/utils"

export function Logo({ className, size = 28, wordmark = true }: { className?: string; size?: number; wordmark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-extrabold tracking-tight", className)}>
      <img src="/logo-v2.png" alt="Traylo" width={size} height={size} style={{ width: size, height: size }} className="shrink-0 object-contain drop-shadow-[0_2px_10px_hsl(var(--primary)/.45)]" />
      {wordmark && <span style={{ fontSize: size * 0.7 }} className="leading-none">tray<span className="text-brand">lo</span></span>}
    </span>
  )
}

