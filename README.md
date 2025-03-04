# electron-vite-vue

🥳 Really simple `Electron` + `Vue` + `Vite` boilerplate.

<!-- [![awesome-vite](https://awesome.re/mentioned-badge.svg)](https://github.com/vitejs/awesome-vite) -->
<!-- [![Netlify Status](https://api.netlify.com/api/v1/badges/ae3863e3-1aec-4eb1-8f9f-1890af56929d/deploy-status)](https://app.netlify.com/sites/electron-vite/deploys) -->
<!-- [![GitHub license](https://img.shields.io/github/license/caoxiemeihao/electron-vite-vue)](https://github.com/electron-vite/electron-vite-vue/blob/main/LICENSE) -->
<!-- [![GitHub stars](https://img.shields.io/github/stars/caoxiemeihao/electron-vite-vue?color=fa6470)](https://github.com/electron-vite/electron-vite-vue) -->
<!-- [![GitHub forks](https://img.shields.io/github/forks/caoxiemeihao/electron-vite-vue)](https://github.com/electron-vite/electron-vite-vue) -->
[![GitHub Build](https://github.com/electron-vite/electron-vite-vue/actions/workflows/build.yml/badge.svg)](https://github.com/electron-vite/electron-vite-vue/actions/workflows/build.yml)
[![GitHub Discord](https://img.shields.io/badge/chat-discord-blue?logo=discord)](https://discord.gg/sRqjYpEAUK)

## Features

📦 Out of the box  
🎯 Based on the official [template-vue-ts](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-vue-ts), less invasive  
🌱 Extensible, really simple directory structure  
💪 Support using Node.js API in Electron-Renderer  
🔩 Support C/C++ native addons  
🖥 It's easy to implement multiple windows  

## Quick Setup

```sh
# clone the project
git clone https://github.com/electron-vite/electron-vite-vue.git

# enter the project directory
cd electron-vite-vue

# install dependency
npm install

# develop
npm run dev
```

## Required External Tools

### ADB (Android Debug Bridge)

For this application to work, you need to install ADB:

1. Download the Android SDK Platform Tools from [developer.android.com](https://developer.android.com/tools/releases/platform-tools)
2. Extract the downloaded archive
3. Copy the `adb` executable to the `public/adb/` directory:
   - Windows: Copy `adb.exe` to `public/adb/adb.exe`
   - macOS/Linux: Copy `adb` to `public/adb/adb`

### SCRCPY (Screen Copy)

To use the device streaming feature, you need to install SCRCPY:

1. Download SCRCPY from [GitHub](https://github.com/Genymobile/scrcpy/releases)
2. Extract the downloaded archive
3. Copy the scrcpy executable and dependencies to the `public/scrcpy/` directory:
   - Windows: Copy `scrcpy.exe` and required DLLs to `public/scrcpy/`
   - macOS/Linux: Copy `scrcpy` and required libraries to `public/scrcpy/`

Alternatively, you can install SCRCPY globally through your system's package manager, and the application will detect it.

## Debug

![electron-vite-react-debug.gif](https://github.com/electron-vite/electron-vite-react/blob/main/electron-vite-react-debug.gif?raw=true)

## Directory

```diff
+ ├─┬ electron
+ │ ├─┬ main
+ │ │ └── index.ts    entry of Electron-Main
+ │ └─┬ preload
+ │   └── index.ts    entry of Preload-Scripts
  ├─┬ src
  │ └── main.ts       entry of Electron-Renderer
  ├── index.html
  ├── package.json
  └── vite.config.ts
```

<!--
## Be aware

🚨 By default, this template integrates Node.js in the Renderer process. If you don't need it, you just remove the option below. [Because it will modify the default config of Vite](https://github.com/electron-vite/vite-plugin-electron-renderer#config-presets-opinionated).

```diff
# vite.config.ts

export default {
  plugins: [
-   // Use Node.js API in the Renderer-process
-   renderer({
-     nodeIntegration: true,
-   }),
  ],
}
```
-->

## FAQ

- [C/C++ addons, Node.js modules - Pre-Bundling](https://github.com/electron-vite/vite-plugin-electron-renderer#dependency-pre-bundling)
- [dependencies vs devDependencies](https://github.com/electron-vite/vite-plugin-electron-renderer#dependencies-vs-devdependencies)
