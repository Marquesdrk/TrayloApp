import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
export const fmtDT = (t: number) =>
  new Date(t).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
export const fmtTime = (t: number) => new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
export const pct = (v: number | null) => (v == null ? "—" : Math.round(v * 100) + "%")
export const hrs = (ms: number) => (ms ? (ms / 3600000).toFixed(1).replace(".", ",") + " h" : "—")
export const kmFmt = (m: number) => (m < 1000 ? Math.round(m / 10) * 10 + " m" : (m / 1000).toFixed(1).replace(".", ",") + " km")
