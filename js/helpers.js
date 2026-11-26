import { LEVELS } from "./config.js";
import { levelsData } from "./state.js";
import { levelState } from "./storage.js";

export function pickRandom(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}

export function bucketKey(level, index) {
  return `${level}:${index}`;
}

export function sameEntry(a, b) {
  return Boolean(a && b && Number(a.level) === Number(b.level) && Number(a.index) === Number(b.index));
}

export function pickEntry(entries, exclude) {
  const pool = entries.filter((entry) => !sameEntry(entry, exclude));
  return pickRandom(pool.length ? pool : entries);
}

export function validBucketEntries(profile) {
  if (!profile || !Array.isArray(profile.bucket)) return [];

  const seen = new Set();
  const result = [];
  for (const raw of profile.bucket) {
    if (!raw || typeof raw !== "object") continue;
    const level = Number(raw.level);
    const index = Number(raw.index);
    if (!LEVELS.includes(level) || !Number.isInteger(index)) continue;
    const list = levelsData[level];
    if (!list || index < 0 || index >= list.length) continue;

    const key = bucketKey(level, index);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ level, index, addedAt: Number(raw.addedAt) || 0 });
  }
  return result;
}

export function isSaved(profile, level, index) {
  if (!profile || !Array.isArray(profile.bucket)) return false;
  return profile.bucket.some(
    (entry) => Number(entry && entry.level) === Number(level) && Number(entry && entry.index) === Number(index)
  );
}

export function remainingIndices(profile, level, exclude = []) {
  const list = levelsData[level] || [];
  const correct = new Set(levelState(profile, level).correct);
  const excluded = new Set(exclude);
  const all = [];

  for (let index = 0; index < list.length; index += 1) {
    if (!correct.has(index)) all.push(index);
  }
  if (all.length === 0) return [];

  const pool = all.filter((index) => !excluded.has(index));
  return pool.length ? pool : all;
}
