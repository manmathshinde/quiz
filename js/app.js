import { fetchLevels } from "./data.js";
import { setLevelsData, setStore, store, ui } from "./state.js";
import { loadStore } from "./storage.js";
import { initSpeech } from "./speech.js";
import { initTheme } from "./theme.js";
import {
  $,
  bindSoundButton,
  bindThemeButton,
  chooseHighlightedProfile,
  closeProfilePicker,
  moveProfileSelection,
  openBucketScreen,
  openProfilePicker,
  refreshStartView,
  showLoadError,
  showScreen,
  showStart,
} from "./ui.js";
import {
  clearBucket,
  goBackFromQuiz,
  handleGrade,
  startLevel,
  startRevision,
  toggleAnswer,
  toggleSaveCurrent,
} from "./quiz.js";

async function loadData() {
  showScreen("loading-screen");
  try {
    setStore(loadStore());
    initSpeech();
    initTheme();

    const lastName = store.lastProfile && store.profiles[store.lastProfile] ? store.profiles[store.lastProfile] : null;
    if (lastName && !$("name-input").value) {
      $("name-input").value = lastName.displayName || store.lastProfile;
    }

    setLevelsData(await fetchLevels());
    ui.selectedLevel = 1;
    refreshStartView();
    showScreen("start-screen");
  } catch (error) {
    showLoadError(error);
  }
}

function bindEvents() {
  bindThemeButton();
  bindSoundButton();

  $("retry-load").addEventListener("click", loadData);

  const nameInput = $("name-input");
  nameInput.addEventListener("focus", () => openProfilePicker());
  nameInput.addEventListener("click", () => openProfilePicker());
  nameInput.addEventListener("input", () => {
    $("name-error").hidden = true;
    refreshStartView();
    openProfilePicker({ filterByInput: true });
  });
  nameInput.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if ($("profile-suggestions").hidden) openProfilePicker();
      else moveProfileSelection(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if ($("profile-suggestions").hidden) openProfilePicker();
      else moveProfileSelection(-1);
    } else if (event.key === "Enter" && !$("profile-suggestions").hidden) {
      event.preventDefault();
      chooseHighlightedProfile();
    } else if (event.key === "Escape") {
      closeProfilePicker();
    }
  });

  document.addEventListener("pointerdown", (event) => {
    const wrap = nameInput.closest(".input-wrap");
    if (wrap && !wrap.contains(event.target)) closeProfilePicker();
  });

  document.querySelectorAll(".level-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      ui.selectedLevel = Number(chip.dataset.level);
      refreshStartView();
    });
  });

  $("start-btn").addEventListener("click", () => startLevel(ui.selectedLevel));
  $("open-bucket-btn").addEventListener("click", openBucketScreen);
  document.querySelectorAll("[data-go-start]").forEach((button) => {
    button.addEventListener("click", showStart);
  });

  $("quiz-back-btn").addEventListener("click", goBackFromQuiz);
  $("answer-btn").addEventListener("click", () => toggleAnswer({ speak: true }));
  $("correct-btn").addEventListener("click", () => handleGrade(true));
  $("wrong-btn").addEventListener("click", () => handleGrade(false));
  $("save-btn").addEventListener("click", toggleSaveCurrent);

  $("start-revision-btn").addEventListener("click", () => startRevision());
  $("clear-bucket-btn").addEventListener("click", clearBucket);

  document.addEventListener("keydown", (event) => {
    if (ui.screen !== "quiz-screen" || document.querySelector("dialog[open]")) return;
    const target = event.target;
    if (target && (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable)) return;

    const key = event.key.toLowerCase();
    if (key === "c") {
      event.preventDefault();
      handleGrade(true);
    } else if (key === "w") {
      event.preventDefault();
      handleGrade(false);
    } else if (key === "r") {
      event.preventDefault();
      toggleAnswer();
    } else if (event.key === "Escape") {
      event.preventDefault();
      goBackFromQuiz();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  loadData();
});
