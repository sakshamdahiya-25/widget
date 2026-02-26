# Chat Widget v1

A premium, responsive, and feature-rich chat widget built as a standalone Web Component. Designed for seamless integration into any website with advanced AI capabilities and live agent support.

## 🚀 Features

- **Standalone Web Component**: Easy to embed anywhere using a simple HTML tag.
- **AI-Powered Chat**: Integrates with backend AI to answer user queries instantly.
- **Lead Capture**: Built-in greeting and form system to capture user details (Name & Email).
- **Live Specialist Mode**: Ability to hand over conversations to human agents via WebSockets.
- **Premium Design**: Modern aesthetics with glassmorphism, animations, and responsive layouts.
- **Customizable**: Configure via HTML attributes.

## 📦 Installation

Simply include the `index.js` script and add the `<chat-widget>` tag to your HTML.

```html
<!DOCTYPE html>
<html>
<body>
  <!-- Add the widget tag -->
  <chat-widget 
    api-url="https://your-api.com/chat/message" 
    sync-human-url="https://your-sync-url.com"
    site-id="your-site-id">
  </chat-widget>

  <!-- Include the script -->
  <script src="./index.js"></script>
</body>
</html>
```

## ⚙️ Configuration Properties

| Attribute | Description | Default |
|-----------|-------------|---------|
| `api-url` | The endpoint for AI chat messages | CPTC AI Default |
| `sync-human-url` | Base URL for human agent synchronization | `http://localhost:3000` |
| `agent-socket-url` | WebSocket URL for live agent connection | `https://chat.supercx.co` |
| `site-id` | Unique identifier for the website/installation | `demo-site` |

## 🛠️ Development

This project is built using vanilla JavaScript (ES6+) and Web Components. No heavy frameworks are required.

To run locally:
1. Open `index.html` in any modern web browser.
2. Ensure you have a backend server running for the API and WebSocket connections.

## 🎨 Design System

The widget uses a modern Blue Gradient palette with:
- **Primary Colors**: Deep Ocean Blue to Cyan.
- **Typography**: Inter & Outfit (Google Fonts).
- **Effects**: Backdrop blur (glassmorphism), smooth transitions, and pulse animations.

---
Created for Century Property Tax Consultants.
