import { LEVELS, SCREEN_IDS, TRASH_ICON, THEME_ICONS, THEME_LABELS, SOUND_ICONS } from "./config.js";
import { store, levelsData, ui } from "./state.js";
import { getProfile, levelState, normalizeName, saveStore } from "./storage.js";
import { validBucketEntries } from "./helpers.js";
import { showToast } from "./notifications.js";
import { cycleTheme } from "./theme.js";
import { cancelSpeech, isMuted, isSpeechSupported, toggleSoundMuted } from "./speech.js";

export const $ = (id) => document.getElementById(id);

let profileNames = [];
let highlightedProfile = -1;

export function showScreen(id) {
  if (ui.screen === "quiz-screen" && id !== "quiz-screen") cancelSpeech();
  if (id !== "start-screen") closeProfilePicker();

  for (const screenId of SCREEN_IDS) {
    const element = $(screenId);
    if (element) element.hidden = screenId !== id;
  }
  ui.screen = id;
  window.scrollTo(0, 0);
  const heading = $(id) && $(id).querySelector("h1");
  if (heading) {
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }
}

export function showLoadError(error) {
  const message = error && error.message ? error.message : String(error);
  $("error-message").textContent = message;
  $("error-hint").textContent =
    location.protocol === "file:"
      ? "You opened index.html directly. Browsers block loading local JSON that way.\n\nRun this in the project folder:\n  node serve.js\n\nThen open http://localhost:8000"
      : "Check that the levels folder is next to index.html and contains 1_data.json through 4_data.json.\n\nRun 'node serve.js' in the project folder, then open http://localhost:8000";
  showScreen("error-screen");
}

export function askConfirm(title, message, acceptLabel) {
  return new Promise((resolve) => {
    const dialog = $("confirm-dialog");
    $("confirm-title").textContent = title;
    $("confirm-message").textContent = message;
    $("confirm-accept").textContent = acceptLabel;
    dialog.returnValue = "cancel";
    dialog.showModal();
    dialog.addEventListener("close", () => resolve(dialog.returnValue === "confirm"), { once: true });
  });
}

export function renderStats(items) {
  const container = $("complete-stats");
  container.replaceChildren();
  for (const item of items) {
    const stat = document.createElement("div");
    stat.className = "stat";
    const value = document.createElement("strong");
    value.textContent = String(item.value);
    const label = document.createElement("span");
    label.textContent = item.label;
    stat.append(value, label);
    container.appendChild(stat);
  }
}

export function setProgress(done, total) {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  $("quiz-progress-fill").style.width = `${percent}%`;
  $("quiz-progress-track").setAttribute("aria-valuenow", String(percent));
}

export function activeProfileFromStart() {
  const name = $("name-input").value.trim();
  const key = name ? normalizeName(name) : store.lastProfile;
  if (!key || !store.profiles[key]) return null;
  return { key, profile: store.profiles[key] };
}

export function refreshStartView() {
  const lastProfile = ui.profileKey && store.profiles[ui.profileKey] ? ui.profileKey : store.lastProfile;

  const found = activeProfileFromStart();
  const profile = found ? found.profile : store.profiles[lastProfile] || null;

  for (const level of LEVELS) {
    const chip = document.querySelector(`.level-chip[data-level="${level}"]`);
    if (!chip) continue;
    const total = (levelsData[level] || []).length;
    const done = profile ? new Set(levelState(profile, level).correct).size : 0;
    const meta = chip.querySelector(".level-meta");
    if (meta) meta.textContent = `${done} / ${total} correct`;
    const active = level === ui.selectedLevel;
    chip.classList.toggle("is-active", active);
    chip.setAttribute("aria-pressed", String(active));
  }

  const bucketCount = profile ? validBucketEntries(profile).length : 0;
  $("bucket-count").textContent = String(bucketCount);
  $("open-bucket-btn").disabled = bucketCount === 0;
}

function sortedProfileNames() {
  const lastName =
    store.lastProfile && store.profiles[store.lastProfile]
      ? store.profiles[store.lastProfile].displayName || store.lastProfile
      : "";

  const names = [
    ...new Set(
      Object.values(store.profiles)
        .map((profile) => (profile && typeof profile.displayName === "string" ? profile.displayName.trim() : ""))
        .filter(Boolean)
    ),
  ];

  return names.sort((a, b) => {
    if (a === lastName) return -1;
    if (b === lastName) return 1;
    return a.localeCompare(b, undefined, { sensitivity: "base" });
  });
}

export function openProfilePicker({ filterByInput = false } = {}) {
  const input = $("name-input");
  const list = $("profile-suggestions");
  if (!input || !list) return;

  const allNames = sortedProfileNames();
  const query = filterByInput ? input.value.trim().toLowerCase() : "";
  profileNames = query ? allNames.filter((name) => name.toLowerCase().includes(query)) : allNames;
  highlightedProfile = -1;

  list.replaceChildren();

  if (profileNames.length === 0) {
    const empty = document.createElement("div");
    empty.className = "profile-empty";
    empty.textContent = allNames.length === 0 ? "No saved profiles yet" : "No matching profiles";
    list.appendChild(empty);
  } else {
    profileNames.forEach((name, index) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "profile-option";
      option.id = `profile-option-${index}`;
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", "false");
      option.textContent = name;
      option.addEventListener("mousedown", (event) => event.preventDefault());
      option.addEventListener("click", () => selectProfile(name));
      list.appendChild(option);
    });
  }

  list.hidden = false;
  input.setAttribute("aria-expanded", "true");
  input.removeAttribute("aria-activedescendant");
}

export function closeProfilePicker() {
  const input = $("name-input");
  const list = $("profile-suggestions");

  if (list) {
    list.hidden = true;
    list.querySelectorAll(".profile-option").forEach((option) => {
      option.classList.remove("is-active");
      option.setAttribute("aria-selected", "false");
    });
  }
  if (input) {
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  }
  highlightedProfile = -1;
}

export function moveProfileSelection(direction) {
  const input = $("name-input");
  const list = $("profile-suggestions");
  if (!input || !list || list.hidden) return;

  const options = Array.from(list.querySelectorAll(".profile-option"));
  if (options.length === 0) return;

  if (highlightedProfile === -1) {
    highlightedProfile = direction > 0 ? 0 : options.length - 1;
  } else {
    highlightedProfile = (highlightedProfile + direction + options.length) % options.length;
  }

  options.forEach((option, index) => {
    const active = index === highlightedProfile;
    option.classList.toggle("is-active", active);
    option.setAttribute("aria-selected", String(active));
  });

  input.setAttribute("aria-activedescendant", options[highlightedProfile].id);
  options[highlightedProfile].scrollIntoView({ block: "nearest" });
}

export function chooseHighlightedProfile() {
  const list = $("profile-suggestions");
  if (!list || highlightedProfile < 0) return;
  const option = list.querySelectorAll(".profile-option")[highlightedProfile];
  if (option) option.click();
}

function selectProfile(name) {
  const input = $("name-input");
  if (!input) return;

  input.value = name;
  $("name-error").hidden = true;
  closeProfilePicker();
  refreshStartView();
}

export function showStart() {
  refreshStartView();
  showScreen("start-screen");
}

export function openBucketScreen() {
  const found = activeProfileFromStart();
  if (!found) {
    showToast("Enter your name to see your bucket.", "info");
    showStart();
    $("name-input").focus();
    return;
  }
  ui.profileKey = found.key;
  renderBucketList();
  showScreen("bucket-screen");
}

export function renderBucketList() {
  const profile = getProfile(ui.profileKey);
  const entries = validBucketEntries(profile);
  const list = $("bucket-list");
  list.replaceChildren();

  $("bucket-empty").hidden = entries.length > 0;
  $("start-revision-btn").disabled = entries.length === 0;
  $("clear-bucket-btn").disabled = entries.length === 0;

  for (const entry of entries) {
    const item = levelsData[entry.level][entry.index];
    const card = document.createElement("article");
    card.className = "bucket-item";

    const badge = document.createElement("span");
    badge.className = "mini-badge";
    badge.textContent = `LEVEL ${entry.level}`;

    const question = document.createElement("p");
    question.className = "bucket-question";
    question.textContent = item.question;

    const answer = document.createElement("p");
    answer.className = "bucket-answer";
    answer.textContent = item.answer;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "icon-btn icon-btn--remove";
    remove.setAttribute("aria-label", `Remove from bucket: ${item.question}`);
    remove.innerHTML = TRASH_ICON;
    remove.addEventListener("click", () => {
      profile.bucket = profile.bucket.filter(
        (stored) => !(Number(stored && stored.level) === entry.level && Number(stored && stored.index) === entry.index)
      );
      saveStore();
      renderBucketList();
      refreshStartView();
      showToast("Removed from your revision bucket.", "info");
    });

    card.append(badge, question, answer, remove);
    list.appendChild(card);
  }
}

export function bindSoundButton() {
  const button = $("sound-toggle");
  if (!button) return;

  button.addEventListener("click", toggleSoundMuted);

  document.addEventListener("soundchange", updateSoundButton);
  document.addEventListener("speechstatechange", (event) => {
    button.classList.toggle("is-speaking", Boolean(event.detail && event.detail.speaking));
  });

  updateSoundButton();
}

function updateSoundButton() {
  const button = $("sound-toggle");
  const icon = $("sound-icon");
  const label = $("sound-label");
  if (!button || !icon || !label) return;

  const supported = isSpeechSupported();
  const muted = !supported || isMuted();
  const text = !supported ? "Audio unavailable" : muted ? "Sound off" : "Sound on";
  const hint = !supported
    ? "Answer audio is not available in this browser"
    : muted
      ? "Unmute answer audio"
      : "Mute answer audio";

  button.disabled = !supported;
  button.classList.toggle("is-muted", muted);
  button.setAttribute("aria-pressed", String(!muted));
  button.setAttribute("aria-label", text);
  button.title = hint;
  icon.innerHTML = SOUND_ICONS[muted ? "off" : "on"];
  label.textContent = text;
}

export function bindThemeButton() {
  const button = $("theme-toggle");
  if (!button) return;

  button.addEventListener("click", cycleTheme);
  document.addEventListener("themechange", (event) => {
    updateThemeButton(event.detail.mode, event.detail.resolved);
  });

  updateThemeButton(
    document.documentElement.dataset.themeMode || "auto",
    document.documentElement.dataset.theme || "light"
  );
}

function updateThemeButton(mode, resolved) {
  const button = $("theme-toggle");
  const icon = $("theme-icon");
  if (!button || !icon) return;

  icon.innerHTML = THEME_ICONS[mode] || THEME_ICONS.auto;
  const label = THEME_LABELS[mode] || THEME_LABELS.auto;
  const next = mode === "auto" ? (resolved === "dark" ? "light" : "dark") : mode === "light" ? "dark" : "auto";
  button.setAttribute("aria-label", label);
  button.title = `${label} — switch to ${(THEME_LABELS[next] || "").replace("Theme: ", "")}`;
}
