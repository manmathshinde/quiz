export let store = {
  lastProfile: "",
  profiles: {},
  theme: "auto",
  soundMuted: false,
};

export let levelsData = {};

export const ui = {
  screen: "loading-screen",
  mode: "level",
  selectedLevel: 1,
  level: 1,
  profileKey: "",
  current: null,
  last: null,
  revealed: false,
  grading: false,
  revisionDone: new Set(),
  storageWarned: false,
};

export function setStore(next) {
  store = next;
}

export function setLevelsData(next) {
  levelsData = next;
}
