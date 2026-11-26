import { STORAGE_KEY, THEME_MODES } from "./config.js";
import { store, ui } from "./state.js";
import { showToast } from "./notifications.js";

export function loadStore() {
  const fresh = { lastProfile: "", profiles: {}, theme: "auto", soundMuted: false };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fresh;

    const result = {
      lastProfile: typeof parsed.lastProfile === "string" ? parsed.lastProfile : "",
      profiles: {},
      theme: THEME_MODES.includes(parsed.theme) ? parsed.theme : "auto",
      soundMuted: parsed.soundMuted === true,
    };

    if (parsed.profiles && typeof parsed.profiles === "object" && !Array.isArray(parsed.profiles)) {
      for (const [key, profile] of Object.entries(parsed.profiles)) {
        if (profile && typeof profile === "object" && !Array.isArray(profile)) {
          result.profiles[key] = profile;
        }
      }
    }

    if (result.lastProfile && !result.profiles[result.lastProfile]) {
      result.lastProfile = "";
    }
    return result;
  } catch (error) {
    return fresh;
  }
}

export function saveStore() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    if (!ui.storageWarned) {
      ui.storageWarned = true;
      showToast("Browser storage is unavailable — progress will not be saved.", "error");
    }
  }
}

export function setThemePreference(mode) {
  if (!THEME_MODES.includes(mode)) return;
  store.theme = mode;
  saveStore();
}

export function setSoundMuted(muted) {
  store.soundMuted = Boolean(muted);
  saveStore();
}

export function normalizeName(name) {
  return String(name || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function getProfile(key, displayName) {
  if (!key) return null;
  if (!store.profiles[key]) {
    store.profiles[key] = {
      displayName: displayName || key,
      levels: {},
      bucket: [],
    };
  }

  const profile = store.profiles[key];
  if (!profile.displayName) profile.displayName = displayName || key;
  if (!profile.levels || typeof profile.levels !== "object" || Array.isArray(profile.levels)) {
    profile.levels = {};
  }
  if (!Array.isArray(profile.bucket)) profile.bucket = [];
  return profile;
}

export function levelState(profile, level) {
  const key = String(level);
  if (!profile.levels[key] || typeof profile.levels[key] !== "object" || Array.isArray(profile.levels[key])) {
    profile.levels[key] = {};
  }

  const state = profile.levels[key];
  if (!Array.isArray(state.correct)) state.correct = [];
  state.correct = state.correct.filter(Number.isInteger);
  if (!Number.isInteger(state.current)) state.current = null;
  if (!state.wrongCounts || typeof state.wrongCounts !== "object" || Array.isArray(state.wrongCounts)) {
    state.wrongCounts = {};
  }
  if (!Number.isInteger(state.cycles) || state.cycles < 0) state.cycles = 0;
  return state;
}
