import { THEME_MODES } from "./config.js";
import { store } from "./state.js";
import { setThemePreference } from "./storage.js";

const darkQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
const reduceQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

let currentMode = "auto";
let listenerAttached = false;

export function resolvedTheme(mode = currentMode) {
  if (mode === "dark") return "dark";
  if (mode === "light") return "light";
  return darkQuery && darkQuery.matches ? "dark" : "light";
}

export function applyTheme(mode, { persist = false, animate = false } = {}) {
  if (!THEME_MODES.includes(mode)) mode = "auto";
  currentMode = mode;

  const resolved = resolvedTheme(mode);
  const root = document.documentElement;

  if (animate && !(reduceQuery && reduceQuery.matches)) {
    root.classList.add("theme-transition");
    window.setTimeout(() => root.classList.remove("theme-transition"), 220);
  }

  root.dataset.theme = resolved;
  root.dataset.themeMode = mode;

  if (persist) setThemePreference(mode);

  document.dispatchEvent(new CustomEvent("themechange", { detail: { mode, resolved } }));
}

export function cycleTheme() {
  let next;
  if (currentMode === "auto") {
    next = resolvedTheme("auto") === "dark" ? "light" : "dark";
  } else if (currentMode === "light") {
    next = "dark";
  } else {
    next = "auto";
  }
  applyTheme(next, { persist: true, animate: true });
}

export function initTheme() {
  currentMode = THEME_MODES.includes(store.theme) ? store.theme : "auto";
  applyTheme(currentMode);

  if (!listenerAttached && darkQuery) {
    listenerAttached = true;
    const handleChange = () => {
      if (currentMode === "auto") applyTheme("auto", { animate: true });
    };
    if (typeof darkQuery.addEventListener === "function") {
      darkQuery.addEventListener("change", handleChange);
    } else if (typeof darkQuery.addListener === "function") {
      darkQuery.addListener(handleChange);
    }
  }
}
