export const STORAGE_KEY = "spanishPractice:v1";

export const LEVELS = [1, 2, 3, 4];

export const SCREEN_IDS = [
  "loading-screen",
  "error-screen",
  "start-screen",
  "bucket-screen",
  "quiz-screen",
  "complete-screen",
];

export const THEME_MODES = ["auto", "light", "dark"];

export const THEME_LABELS = {
  auto: "Theme: Auto (system)",
  light: "Theme: Light",
  dark: "Theme: Dark",
};

export const TRASH_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>';

export const THEME_ICONS = {
  auto:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 1 0 16z" style="fill:currentColor;stroke:none" /></svg>',
  light:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>',
  dark:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>',
};

export const SOUND_ICONS = {
  on:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4V5z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></svg>',
  off:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4V5z" /><path d="M16 9l5 6M21 9l-5 6" /></svg>',
};

export const SPANISH_VOICE_PRIORITY = [
  "es-MX",
  "es-US",
  "es-419",
  "es-AR",
  "es-CO",
  "es-CL",
  "es-PE",
  "es-VE",
  "es-UY",
  "es-PY",
  "es-BO",
  "es-EC",
  "es-GT",
  "es-HN",
  "es-NI",
  "es-CR",
  "es-PA",
  "es-DO",
  "es-PR",
  "es-CU",
];
