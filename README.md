# 🌍 Language Learning Tutor

A minimal React/JSX demo that shows how to build an AI-powered language tutor UI using the Anthropic Claude API.

This repo currently contains a single `app.jsx` file that can be used as the main app component inside a standard React/Vite project.

---

## 🚀 Quick Start (Recommended)

1. Create a new Vite + React project:

```bash
npm create vite@latest language-tutor-app -- --template react
cd language-tutor-app
npm install
```

2. Replace `src/App.jsx` with the contents of this repository's `app.jsx`:

```bash
cp ../Language-tutor-app/app.jsx src/App.jsx
```

3. Create a `.env` file in the root of your project:

```env
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

4. Start the dev server:

```bash
npm run dev
```

---

## 📄 What’s Included Here

- `app.jsx` — the main React component that handles the UI and API interaction.

> ⚠️ This repository is intentionally minimal and does not include a full Vite build setup.


---

## 📝 Notes

- This repo is intentionally minimal and does not include a package manager setup (e.g., `package.json`).
- You can run the app by creating a Vite + React project (see Quick Start), then copying this repo's `app.jsx` into `src/App.jsx`.
- The app expects `VITE_ANTHROPIC_API_KEY` to be set in a `.env` file in the root of your Vite project.

---

## 🔒 Notes on Storage

This app uses `window.storage` (Claude Artifact persistent storage) for session saving. If running outside of the Claude.ai environment, replace `window.storage` calls with `localStorage` or a backend database of your choice.

---

## 📸 Screenshots

> *(Add screenshots here after deployment)*

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you'd like to change.

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

## 🙏 Acknowledgements

- [Anthropic](https://www.anthropic.com/) for the Claude API
- [Lucide](https://lucide.dev/) for the icon set
- [Tailwind CSS](https://tailwindcss.com/) for utility-first styling