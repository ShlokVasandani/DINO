import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App.jsx"

// Follow the OS light/dark setting.
const scheme = window.matchMedia("(prefers-color-scheme: dark)")
const applyScheme = () => document.documentElement.classList.toggle("dark", scheme.matches)
applyScheme()
scheme.addEventListener("change", applyScheme)

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
)
