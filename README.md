# Tom & Jerry Chase

A fast-paced canvas mini-game where you guide Jerry around the kitchen, scooping up cheese while Tom relentlessly closes in.

## 🚀 Running Locally

This project is a zero-dependency static site – any static file server works:

```bash
npx serve .
# or
python -m http.server 3000
```

Then open your browser at `http://localhost:3000` (or the port you chose).

## 🕹️ Gameplay

- Move Jerry with the arrow keys or WASD.
- Collect cheese to stash power-ups and slow Tom's pursuit.
- Hold Shift to dash; it burns one cheese but grants a burst of speed.
- Survive as long as you can to push the score and beat your local high score (stored in `localStorage`).

## 📁 Files

- `index.html` – layout and HUD components.
- `styles.css` – neon-night styling and responsive layout.
- `script.js` – game loop, AI pursuit logic, item system, and UI hooks.
- `vercel.json` – static build configuration for Vercel hosting.

## 📦 Deployment

The project is ready for static hosting. For Vercel production deployments:

```bash
vercel build
vercel deploy --prod
```

The production instance for this project lives at `https://agentic-3bb6b6bb.vercel.app`.
