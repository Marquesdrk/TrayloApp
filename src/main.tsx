import React from "react"
import ReactDOM from "react-dom/client"
import "maplibre-gl/dist/maplibre-gl.css"
import "./index.css"
import App from "./App"

// tema automático (claro/escuro) conforme o sistema
const mq = window.matchMedia("(prefers-color-scheme: dark)")
const applyTheme = () => document.documentElement.classList.toggle("dark", mq.matches)
applyTheme(); mq.addEventListener("change", applyTheme)

ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>)
