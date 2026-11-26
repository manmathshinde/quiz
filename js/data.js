import { LEVELS } from "./config.js";

export async function fetchLevels() {
  const pairs = await Promise.all(
    LEVELS.map(async (level) => {
      const response = await fetch(`levels/${level}_data.json`, { cache: "no-cache" });
      if (!response.ok) {
        throw new Error(`Level ${level}: ${response.status} ${response.statusText}`);
      }

      const raw = await response.json();
      if (!Array.isArray(raw)) {
        throw new Error(`Level ${level} data is not a list of questions.`);
      }

      const clean = raw.filter(
        (item) =>
          item &&
          typeof item.question === "string" &&
          item.question.trim() &&
          typeof item.answer === "string" &&
          item.answer.trim()
      );
      return [level, clean];
    })
  );

  return Object.fromEntries(pairs);
}
