# Spanish Practice

A simple, polished Spanish translation practice app with four levels and a saved revision bucket.

## Run it

Browsers block loading local JSON when you open `index.html` directly, so use the included tiny server:

```bat
node serve.js
```

Then open **http://localhost:8000**.

If you already have Python installed, `python -m http.server` works too.

## How it works

- Enter your name or click the field to pick a saved profile, then choose one of the four levels.
- The answer is blurred — click it to reveal and hear it spoken in Spanish. Press `R` to reveal silently.
- Use the Sound button next to Save for revision to mute or unmute answer audio. The choice is saved globally.
- Use ✓ for correct or ✗ for wrong (or press `C` / `W`).
- Wrong questions return to the pool. Correct ones aren't shown again until the level is cleared.
- Clearing a level resets that level's progress so you can start a fresh round.
- Bookmark any question to add it to your **revision bucket**. Revision practice is separate from level progress.
- Use the sun/moon button in the start panel's top-right to cycle **Auto → Light → Dark → Auto**. Auto follows your system theme.
- Everything is saved in your browser's localStorage, per name and per level. The theme choice is global.

Question data lives in `levels/1_data.json` through `levels/4_data.json`. The JavaScript is split into small ES modules under `js/`.
