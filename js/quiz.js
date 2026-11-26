import { store, levelsData, ui } from "./state.js";
import { getProfile, levelState, normalizeName, saveStore } from "./storage.js";
import {
  bucketKey,
  isSaved,
  pickEntry,
  pickRandom,
  remainingIndices,
  sameEntry,
  validBucketEntries,
} from "./helpers.js";
import { showToast } from "./notifications.js";
import { cancelSpeech, speakAnswer } from "./speech.js";
import {
  $,
  askConfirm,
  openBucketScreen,
  refreshStartView,
  renderBucketList,
  renderStats,
  setProgress,
  showScreen,
  showStart,
} from "./ui.js";

export function startLevel(level, keyOverride) {
  const nameFromInput = $("name-input").value.trim();
  const key = keyOverride || normalizeName(nameFromInput);
  if (!key) {
    $("name-error").hidden = false;
    $("name-input").focus();
    return;
  }

  $("name-error").hidden = true;
  const profile = getProfile(key, nameFromInput || (store.profiles[key] && store.profiles[key].displayName) || key);
  ui.profileKey = key;
  ui.level = Number(level);
  ui.mode = "level";
  ui.last = null;
  ui.revisionDone = new Set();
  store.lastProfile = key;
  saveStore();

  const state = levelState(profile, ui.level);
  const previous = state.current;
  const index = pickRandom(remainingIndices(profile, ui.level, [previous]));
  if (index === null) {
    state.current = null;
    saveStore();
    showComplete("level");
    return;
  }

  state.current = index;
  ui.current = { level: ui.level, index };
  saveStore();
  renderQuestion();
}

export function startRevision(keyOverride) {
  const key = keyOverride || ui.profileKey || store.lastProfile;
  const profile = key ? store.profiles[key] : null;
  if (!profile) {
    showToast("Enter your name on the start page first.", "info");
    showStart();
    return;
  }

  ui.profileKey = key;
  const entries = validBucketEntries(profile);
  if (entries.length === 0) {
    showToast("Your revision bucket is empty.", "info");
    openBucketScreen();
    return;
  }

  ui.mode = "revision";
  ui.revisionDone = new Set();
  ui.last = null;
  const first = pickEntry(entries, null);
  ui.current = { level: first.level, index: first.index };
  renderQuestion();
}

export function renderQuestion() {
  cancelSpeech();
  const item = ui.current && levelsData[ui.current.level] && levelsData[ui.current.level][ui.current.index];
  if (!item) {
    showToast("That question is no longer available.", "error");
    showStart();
    return;
  }

  $("question-text").textContent = item.question;
  $("answer-text").textContent = item.answer;
  setRevealed(false);
  updateSaveButton();
  updateQuizHeader();
  showScreen("quiz-screen");
}

export function setRevealed(revealed) {
  ui.revealed = Boolean(revealed);
  $("answer-btn").classList.toggle("is-revealed", ui.revealed);
  $("answer-btn").setAttribute("aria-pressed", String(ui.revealed));
  $("answer-label").textContent = ui.revealed ? "Answer revealed — tap to hide" : "Click to reveal answer";
}

export function toggleAnswer({ speak = false } = {}) {
  const revealing = !ui.revealed;
  setRevealed(revealing);

  if (revealing && speak) {
    speakAnswer($("answer-text").textContent);
  } else if (!revealing) {
    cancelSpeech();
  }
}

function updateSaveButton() {
  const profile = getProfile(ui.profileKey);
  const saved = ui.current ? isSaved(profile, ui.current.level, ui.current.index) : false;
  $("save-btn").classList.toggle("is-saved", saved);
  $("save-btn").setAttribute("aria-pressed", String(saved));
  $("save-label").textContent = saved ? "Saved for revision" : "Save for revision";
}

function updateQuizHeader() {
  const profile = getProfile(ui.profileKey);
  const displayName = (profile && profile.displayName) || ui.profileKey;

  if (ui.mode === "level") {
    const state = levelState(profile, ui.level);
    const total = (levelsData[ui.level] || []).length;
    const done = new Set(state.correct).size;
    $("quiz-context").textContent = `Level ${ui.level} · ${displayName}`;
    $("quiz-level-badge").textContent = `LEVEL ${ui.level}`;
    $("quiz-progress-label").textContent = `${done} / ${total} correct`;
    setProgress(done, total);
  } else {
    const total = validBucketEntries(profile).length;
    const done = ui.revisionDone.size;
    $("quiz-context").textContent = `Revision bucket · ${displayName}`;
    $("quiz-level-badge").textContent = `LEVEL ${ui.current.level}`;
    $("quiz-progress-label").textContent = `${done} / ${total} revised`;
    setProgress(done, total);
  }
}

export function handleGrade(correct) {
  if (ui.screen !== "quiz-screen" || !ui.current || ui.grading) return;
  cancelSpeech();
  ui.grading = true;
  const card = $("answer-btn");
  card.classList.add(correct ? "is-correct-feedback" : "is-wrong-feedback");

  window.setTimeout(() => {
    card.classList.remove("is-correct-feedback", "is-wrong-feedback");
    ui.grading = false;
    if (ui.screen !== "quiz-screen" || !ui.current) return;
    const profile = getProfile(ui.profileKey);
    if (ui.mode === "level") {
      handleLevelGrade(profile, correct);
    } else {
      handleRevisionGrade(profile, correct);
    }
  }, 220);
}

function handleLevelGrade(profile, correct) {
  const state = levelState(profile, ui.level);
  const currentIndex = ui.current.index;

  if (correct && !state.correct.includes(currentIndex)) {
    state.correct.push(currentIndex);
  }
  if (!correct) {
    const key = String(currentIndex);
    state.wrongCounts[key] = (Number(state.wrongCounts[key]) || 0) + 1;
  }

  const next = pickRandom(remainingIndices(profile, ui.level, [currentIndex]));
  if (next === null) {
    state.current = null;
    ui.last = { level: ui.level, index: currentIndex };
    saveStore();
    showComplete("level");
    return;
  }

  ui.last = { level: ui.level, index: currentIndex };
  state.current = next;
  ui.current = { level: ui.level, index: next };
  saveStore();
  renderQuestion();
}

function handleRevisionGrade(profile, correct) {
  const entries = validBucketEntries(profile);
  if (entries.length === 0) {
    openBucketScreen();
    return;
  }

  const current = ui.current;
  if (correct) ui.revisionDone.add(bucketKey(current.level, current.index));

  let candidates;
  if (correct) {
    candidates = entries.filter((entry) => !ui.revisionDone.has(bucketKey(entry.level, entry.index)));
    if (candidates.length === 0) {
      saveStore();
      showComplete("revision");
      return;
    }
  } else {
    candidates = entries.slice();
  }

  const next = pickEntry(candidates, current);
  ui.last = { level: current.level, index: current.index };
  ui.current = { level: next.level, index: next.index };
  saveStore();
  renderQuestion();
}

export function goBackFromQuiz() {
  if (ui.mode === "revision") openBucketScreen();
  else showStart();
}

export function toggleSaveCurrent() {
  if (!ui.current) return;
  const profile = getProfile(ui.profileKey);
  const level = ui.current.level;
  const index = ui.current.index;
  const existing = profile.bucket.find(
    (entry) => Number(entry && entry.level) === level && Number(entry && entry.index) === index
  );

  if (existing) {
    profile.bucket = profile.bucket.filter((entry) => entry !== existing);
    showToast("Removed from your revision bucket.", "info");

    if (ui.mode === "revision") {
      const entries = validBucketEntries(profile);
      if (entries.length === 0) {
        saveStore();
        openBucketScreen();
        return;
      }
      if (!entries.some((entry) => sameEntry(entry, ui.current))) {
        const next = pickEntry(entries, ui.current);
        ui.last = { level: ui.current.level, index: ui.current.index };
        ui.current = { level: next.level, index: next.index };
        saveStore();
        renderQuestion();
        return;
      }
    }
  } else {
    profile.bucket.push({ level, index, addedAt: Date.now() });
    showToast("Saved to your revision bucket.");
  }

  saveStore();
  updateSaveButton();
  refreshStartView();
}

export async function clearBucket() {
  const profile = getProfile(ui.profileKey);
  const count = validBucketEntries(profile).length;
  if (count === 0) return;

  const confirmed = await askConfirm(
    "Clear your bucket?",
    `This removes ${count} saved question${count === 1 ? "" : "s"}. This cannot be undone.`,
    "Clear bucket"
  );
  if (!confirmed) return;

  profile.bucket = [];
  saveStore();
  renderBucketList();
  refreshStartView();
  showToast("Bucket cleared.", "info");
}

function showComplete(mode) {
  const profile = getProfile(ui.profileKey);

  if (mode === "level") {
    const state = levelState(profile, ui.level);
    const total = (levelsData[ui.level] || []).length;
    const done = new Set(state.correct).size;
    const bucketCount = validBucketEntries(profile).length;

    $("complete-eyebrow").textContent = "Level complete";
    $("complete-title").textContent = "Beautifully done.";
    $("complete-subtitle").textContent =
      `You cleared all ${total} questions in level ${ui.level}. Start again when you're ready for a fresh round.`;
    renderStats([
      { value: done, label: "Mastered" },
      { value: state.cycles + 1, label: "Next round" },
      { value: bucketCount, label: "In bucket" },
    ]);
    $("complete-primary").textContent = "Start again";
    $("complete-primary").onclick = resetLevelAndStart;
    $("complete-secondary").textContent = "Back to start";
    $("complete-secondary").onclick = showStart;
  } else {
    const entries = validBucketEntries(profile);
    const done = ui.revisionDone.size;
    $("complete-eyebrow").textContent = "Revision complete";
    $("complete-title").textContent = "Nicely revised.";
    $("complete-subtitle").textContent =
      `You worked through all ${done} saved questions. They stay in your bucket for another round.`;
    renderStats([
      { value: done, label: "Revised" },
      { value: entries.length, label: "In bucket" },
    ]);
    $("complete-primary").textContent = "Repeat revision";
    $("complete-primary").onclick = () => startRevision(ui.profileKey);
    $("complete-secondary").textContent = "Back to bucket";
    $("complete-secondary").onclick = openBucketScreen;
  }

  showScreen("complete-screen");
}

function resetLevelAndStart() {
  const profile = getProfile(ui.profileKey);
  const state = levelState(profile, ui.level);
  state.correct = [];
  state.wrongCounts = {};
  state.current = null;
  state.cycles = (Number(state.cycles) || 0) + 1;
  saveStore();
  startLevel(ui.level, ui.profileKey);
  showToast("Level reset — fresh round started.", "info");
}
