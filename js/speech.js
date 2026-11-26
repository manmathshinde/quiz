import { SPANISH_VOICE_PRIORITY } from "./config.js";
import { store } from "./state.js";
import { setSoundMuted } from "./storage.js";

const supported =
  typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

let voices = [];
let currentUtterance = null;
let cachedVoice = null;
let initialized = false;

function dispatch(name, detail) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

function normalizeLang(lang) {
  return String(lang || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
}

function voiceMatchesLang(voice, lang) {
  const value = normalizeLang(voice.lang);
  return value === lang || value.startsWith(`${lang}-`);
}

function getVoices() {
  if (!supported) return [];
  const fresh = window.speechSynthesis.getVoices() || [];
  if (fresh.length) voices = fresh;
  return voices.length ? voices : fresh;
}

function refreshVoices() {
  voices = supported ? window.speechSynthesis.getVoices() || [] : [];
  cachedVoice = null;
}

function findVoice(langs, excluded = []) {
  const excludedLangs = excluded.map(normalizeLang);
  for (const lang of langs) {
    const matches = getVoices().filter(
      (voice) =>
        voiceMatchesLang(voice, lang) &&
        !excludedLangs.some((excludedLang) => voiceMatchesLang(voice, excludedLang))
    );
    const local = matches.find((voice) => voice.localService);
    if (local) return local;
    if (matches.length) return matches[0];
  }
  return null;
}

function pickSpanishVoice() {
  if (cachedVoice) return cachedVoice;

  const preferred = findVoice(SPANISH_VOICE_PRIORITY) || findVoice(["es"], ["es-es"]) || findVoice(["es"]);
  cachedVoice = preferred;
  return cachedVoice;
}

export function isSpeechSupported() {
  return supported;
}

export function isMuted() {
  return Boolean(store.soundMuted);
}

export function initSpeech() {
  if (!initialized && supported) {
    initialized = true;
    refreshVoices();
    pickSpanishVoice();

    if (typeof window.speechSynthesis.addEventListener === "function") {
      window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
    } else if ("onvoiceschanged" in window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = refreshVoices;
    }
  }

  dispatch("soundchange", { muted: Boolean(store.soundMuted), supported });
}

export function toggleSoundMuted() {
  if (!supported) return;

  setSoundMuted(!store.soundMuted);
  if (store.soundMuted) cancelSpeech();

  dispatch("soundchange", { muted: store.soundMuted, supported });
}

function isSpeechActive() {
  if (!supported) return false;
  return Boolean(currentUtterance || window.speechSynthesis.speaking || window.speechSynthesis.pending);
}

export function cancelSpeech() {
  if (!supported || !isSpeechActive()) return;

  window.speechSynthesis.cancel();
  currentUtterance = null;
  dispatch("speechstatechange", { speaking: false });
}

export function speakAnswer(text) {
  const value = String(text || "").trim();
  if (!supported || store.soundMuted || !value) return;

  cancelSpeech();

  const utterance = new SpeechSynthesisUtterance(value);
  const voice = pickSpanishVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang || "es-MX";
  } else {
    utterance.lang = "es-MX";
  }

  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;

  const finish = () => {
    if (currentUtterance !== utterance) return;
    currentUtterance = null;
    dispatch("speechstatechange", { speaking: false });
  };
  utterance.onend = finish;
  utterance.onerror = finish;

  currentUtterance = utterance;
  dispatch("speechstatechange", { speaking: true });

  try {
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    currentUtterance = null;
    dispatch("speechstatechange", { speaking: false });
  }
}
