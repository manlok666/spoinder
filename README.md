# 🔥 Spoinder

[English](#english) | [中文](#中文)

<a name="english"></a>

**Spoinder** is a web application that combines your Spotify music library with the swipe interaction experience of Tinder. It aims to help users rediscover hidden gems in their playlists in a fun and intuitive way, while also providing a more thorough playlist shuffle function.

**Demo:** https://spoinder.onrender.com/

## ✨ Features

### Core Functions
1.  **Spoinder Mode (Swipe Discovery)**
    *   **Tinder-style Interaction**: Randomly draws songs from your selected playlists and filters them via "Swipe Left (Dislike) / Swipe Right (Like)".
    *   **Smart Generation**: Automatically generates a new Spotify playlist (named `spoinder + date`) containing all "Liked" songs when the target count is reached or no more songs are available.
    *   **Multi-selection**: Supports extracting a song pool from multiple playlists simultaneously.
    *   **Undo**: Made a mistake? Supports undoing the last operation.

2.  **Shuffle Mode (True Shuffle)**
    *   **True Random Algorithm**: Addresses the issue where Spotify's native shuffle isn't "random" enough by using a custom algorithm to thoroughly shuffle playlists.
    *   **Position Deviation Optimization**: The algorithm ensures songs deviate as much as possible from their original positions (e.g., moving the 2nd song to the 782nd), and minimizes "fixed points" to guarantee freshness after shuffling.

### Design Style
*   **iOS Glassmorphism**: The UI features a high-blur, semi-transparent frosted glass style, combined with Spotify's classic black and green color scheme for a modern look.
*   **Smooth Animations**: Includes delicate interactive animations like card fly-outs, fade-ins, loading spinners, and button scaling to reduce visual stutter.
*   **Responsive Design**: Perfectly adapted for desktop and mobile. Mobile features a dedicated scrolling number picker and touch gesture support.

## 🛠 Tech Stack

Built with a lightweight native Web tech stack:

*   **Backend Runtime**: Node.js (Recommended v14.0.0+)
*   **Web Framework**: Express.js
*   **Frontend Core**: Native HTML5, CSS3 (CSS Variables, Flexbox, Grid), Vanilla JavaScript (ES6+)
*   **API Integration**: Spotify Web API
*   **Authentication**: OAuth 2.0 (Authorization Code Flow) + Cookies
*   **Dependencies**:
    *   `express`: Web server
    *   `node-fetch`: Server-side HTTP requests
    *   `dotenv`: Environment variable management
    *   `cookie-parser`: Cookie parsing
    *   `querystring`: Query string handling

## 🚀 Configuration & Deployment Guide

### 1. Prerequisites
*   [Node.js](https://nodejs.org/) and npm installed.
*   A [Spotify Developer](https://developer.spotify.com/dashboard/) account.

### 2. Register Spotify App
1.  Log in to the Spotify Developer Dashboard.
2.  Click "Create App".
3.  Fill in the App Name (e.g., Spoinder) and Description.
4.  In app settings, find **Redirect URI** and add your callback address.
    *   Local development: `http://localhost:3000/callback`
    *   Production: Fill in your actual domain callback address.
5.  Save the Client ID and Client Secret.

### 3. Install Dependencies
Run the following command in the project root directory:

```bash
npm install
```

### 4. Environment Variables
Create a file named `.env` in the project root directory and fill in the following:

```env
# Server Port
PORT=3000

# Spotify App Credentials (from Developer Dashboard)
CLIENT_ID=your_spotify_client_id
CLIENT_SECRET=your_spotify_client_secret

# Callback URL (Must match the one set in Dashboard)
REDIRECT_URI=http://localhost:3000/callback

# Environment Mode (development / production)
NODE_ENV=development
```

### 5. Start Project

**Start in Development / Production Mode:**

```bash
node server.js
```

Upon success, the console will output:
`Server on http://localhost:3000`

### 6. Usage
1.  Visit `http://localhost:3000` in your browser.
2.  Click the **START** button to jump to Spotify for authorization login.
3.  After logging in, choose a feature:
    *   **Spoinder**: Select playlists -> Set generation count -> Start swiping -> Automatically create new playlist.
    *   **Shuffle**: Select playlists -> Submit -> Wait for shuffle to complete.

## 📂 Directory Structure

```
spoinder/
├── pages/              # HTML pages
│   ├── index.html      # Home/Menu/Playlist Selection
│   ├── swipe.html      # Swipe Interaction Page
│   └── success.html    # Success Page
├── styles/             # CSS files
│   ├── style.css       # Global & Home styles
│   └── swipe.css       # Swipe page styles
├── scripts/            # Frontend JavaScript
│   ├── app.js          # Home logic
│   └── swipe.js        # Swipe logic
├── server.js           # Node.js Backend Entry
├── package.json        # Project dependencies
├── .env                # Environment variables (Create manually)
└── README.md           # Documentation
```

---

<a name="中文"></a>

# 🔥 Spoinder (中文版)

**Spoinder** 是一个结合了 Spotify 音乐库与 Tinder 滑动交互体验的 Web 应用程序。它旨在帮助用户以一种有趣、直观的方式重新发现自己歌单中的宝藏歌曲，并提供更彻底的歌单洗牌（Shuffle）功能。

**Demo 体验地址:** https://spoinder.onrender.com/

## ✨ 功能与特点

### 核心功能
1.  **滑动发现 (Spoinder Mode)**
    *   **Tinder 式交互**：从你现有的多个歌单中随机抽取歌曲，通过“左滑不喜欢 / 右滑喜欢”的方式进行筛选。
    *   **智能生成**：当筛选达到指定数量或没有更多歌曲时，自动将所有“喜欢”的歌曲生成为一个全新的 Spotify 歌单（命名为 `spoinder + 日期`）。
    *   **多选支持**：支持同时从多个歌单中提取歌曲池。
    *   **撤回功能**：手滑了？支持撤回上一次的操作。

2.  **强力洗牌 (Shuffle Mode)**
    *   **真·随机算法**：针对 Spotify 原生随机算法有时不够“随机”的问题，Spoinder 使用自定义算法对歌单进行彻底打乱。
    *   **位置偏离优化**：算法确保歌曲尽量偏离原始位置（例如第2首变到第782首），并尽量减少“不动点”，保证洗牌后的新鲜感。

### 设计风格
*   **iOS 毛玻璃拟态 (Glassmorphism)**：整体 UI 采用高模糊度、半透明的毛玻璃风格，配合 Spotify 经典的黑绿配色，极具现代感。
*   **流畅动效**：包含卡片飞出、淡入淡出、加载转圈、按钮缩放等细腻的交互动画，减少视觉卡顿感。
*   **响应式设计**：完美适配桌面端和移动端。移动端拥有专属的滚动数字选择器和触摸手势支持。

## 🛠 技术栈

本项目基于轻量级的原生 Web 技术栈构建：

*   **后端 Runtime**: Node.js (建议 v14.0.0+)
*   **Web 框架**: Express.js
*   **前端核心**: 原生 HTML5, CSS3 (CSS Variables, Flexbox, Grid), Vanilla JavaScript (ES6+)
*   **API 集成**: Spotify Web API
*   **认证授权**: OAuth 2.0 (Authorization Code Flow) + Cookies
*   **依赖库**:
    *   `express`: Web 服务器
    *   `node-fetch`: 服务端 HTTP 请求
    *   `dotenv`: 环境变量管理
    *   `cookie-parser`: Cookie 解析
    *   `querystring`: 查询字符串处理

## 🚀 配置与部署指南

### 1. 前置要求
*   已安装 [Node.js](https://nodejs.org/) 和 npm。
*   拥有一个 [Spotify Developer](https://developer.spotify.com/dashboard/) 账号。

### 2. 注册 Spotify 应用
1.  登录 Spotify Developer Dashboard。
2.  点击 "Create App"。
3.  填写 App Name (例如: Spoinder) 和 Description。
4.  在应用设置中，找到 **Redirect URI**，添加你的回调地址。
    *   本地开发通常为: `http://localhost:3000/callback`
    *   线上部署请填写实际域名的回调地址。
5.  保存 Client ID 和 Client Secret。

### 3. 安装依赖
在项目根目录下打开终端，运行：

```bash
npm install
```

### 4. 环境变量配置
在项目根目录下创建一个名为 `.env` 的文件，并填入以下内容：

```env
# 服务器端口
PORT=3000

# Spotify 应用凭证 (从 Developer Dashboard 获取)
CLIENT_ID=你的_Spotify_Client_ID
CLIENT_SECRET=你的_Spotify_Client_Secret

# 回调地址 (必须与 Dashboard 中设置的完全一致)
REDIRECT_URI=http://localhost:3000/callback

# 环境模式 (development / production)
NODE_ENV=development
```

### 5. 启动项目

**开发模式 / 生产模式启动:**

```bash
node server.js
```

启动成功后，控制台将输出：
`Server on http://localhost:3000`

### 6. 使用说明
1.  在浏览器访问 `http://localhost:3000`。
2.  点击 **START** 按钮，跳转至 Spotify 进行授权登录。
3.  登录成功后，选择功能：
    *   **Spoinder**: 选择歌单 -> 设定生成数量 -> 开始滑动 -> 自动创建新歌单。
    *   **Shuffle**: 选择歌单 -> 提交 -> 等待洗牌完成。

## 📂 目录结构

```
spoinder/
├── pages/              # HTML 页面文件
│   ├── index.html      # 首页/功能菜单/歌单选择
│   ├── swipe.html      # 滑动交互页面
│   └── success.html    # 成功提示页面
├── styles/             # CSS 样式文件
│   ├── style.css       # 全局及首页样式
│   └── swipe.css       # 滑动页面专用样式
├── scripts/            # 前端 JavaScript 逻辑
│   ├── app.js          # 首页逻辑
│   └── swipe.js        # 滑动页面逻辑
├── server.js           # Node.js 后端入口
├── package.json        # 项目依赖配置
├── .env                # 环境变量 (需自行创建)
└── README.md           # 项目说明文档
```

---
Enjoy your music discovery! 🎧
