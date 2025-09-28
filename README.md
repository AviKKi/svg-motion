<div id="top"></div>

<div align="center">
  <h1 align="center">SVG Motion</h1>
  <br />
  <br />
  <p align="center">
    Create stunning animations of your Figma UI or Logos using AI. 
    <br />
    Built with React + Vite and powered by anime.js.
    <br />
    <br />
    <b>
      If you like this concept you can add a 🌟 or 👀 this repo
    </b>
  </p>
  <br />
  <br />

</div>

## Built With

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) ![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white) ![Radix UI](https://img.shields.io/badge/Radix_UI-161618?style=for-the-badge) ![anime.js](https://img.shields.io/badge/anime.js-FF355E?style=for-the-badge) ![Zustand](https://img.shields.io/badge/Zustand-000000?style=for-the-badge)

<br />
  
## Features
- Works Locally, no-install, no-sign up
- BYOK you can use your own OpenRouter Key with this

<br />

## Getting Started

Run locally to explore and develop.

### Pre-requisite

- Node.js 18+ (or 20+ recommended)
- pnpm, npm, or yarn

### Starting Development server

- Install dependencies

```bash
pnpm install
# or
npm install
# or
yarn
```

- Start the dev server

```bash
pnpm dev
# or
npm run dev
# or
yarn dev
```

This will start a Vite dev server at `http://localhost:5173`.

### Build and Preview

```bash
pnpm build && pnpm preview
# or
npm run build && npm run preview
```

The preview server also runs on `http://localhost:5173` by default.

### Notes

- A sample SVG (`public/sampleSvg/phone-call.svg`) and a pre-wired test animation are included so you can see the timeline and preview working immediately on first run.
- The renderer is loaded inside an iframe from `public/svg-renderer.html` and communicates with the editor via `postMessage`.

<p align="right">(<a href="#top">back to top</a>)</p>
<br />

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<p align="right">(<a href="#top">back to top</a>)</p>

<br />
