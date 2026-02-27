class ChatWidget extends HTMLElement {
  constructor() {
    super();
    this.socketLoadPromise = null;
    this.agentSocket = null;
    this.agentSessionId = null;
    this.isLiveAgentMode = false;
    this.isAgentConnecting = false;
    this.agentSocketUrl = null;
    this.agentSiteId = null;
    this.agentSocketListenersAttached = false;

    this.onAgentSessionCreated = (data) => {
      if (!this.isLiveAgentMode) return;
      this.agentSessionId = data?.sessionId || data?.session_id || this.agentSessionId;
      if (this.agentSessionId) {
        this.addMessage("You're connected to a live specialist. Feel free to share more details.", "bot");
      }
    };

    this.onAgentIncoming = (message) => {
      // Show agent messages even if the widget was reopened; prefer matching session if available.
      const payloadSession = message?.sessionId || message?.session_id;
      if (payloadSession && this.agentSessionId && payloadSession !== this.agentSessionId) {
        return;
      }

      // Don't show visitor's own messages (already shown in UI when sent)
      if (message?.from === "visitor") {
        return;
      }

      const sender = "bot"; // Only agent messages reach here
      const text = this.getAgentMessageText(message);
      this.addMessage(text, sender);
    };
    this.attachShadow({ mode: "open" });

    this.shadowRoot.innerHTML = `
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        :host {
          position: fixed;
          bottom: 20px;
          right: 20px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
          z-index: 9999;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
          
          /* ALC Lawyers — match site background/theme */
          --primary-deep: #2b2e83; /* site's accent */
          --primary-ocean: #0b6b9a; /* site's accent-2 */
          --primary-cyan: #06b6d4; /* bright teal */
          --primary-bright: #00d9ff;
          --accent-royal: #1b2a6b;
          --accent-sky: #1e90a1;
          --accent-light: #8fe1e0;
          --accent-ice: #eaf9fb;

          /* Gradient Definitions */
          --gradient-primary: linear-gradient(90deg, #2b2e83 0%, #0b6b9a 100%);
          --gradient-accent: linear-gradient(135deg, #1b2a6b 0%, #1e90a1 50%, #8fe1e0 100%);
          --gradient-shimmer: linear-gradient(120deg, transparent, rgba(255,255,255,0.28), transparent);
          --gradient-light: linear-gradient(135deg, rgba(11, 107, 154, 0.06) 0%, rgba(43, 46, 131, 0.06) 100%);
          --gradient-dark: linear-gradient(135deg, rgba(43,46,131,0.12) 0%, rgba(11,107,154,0.08) 100%);
          
          /* Glassmorphism */
          --glass-bg: rgba(255, 255, 255, 0.1);
          --glass-bg-strong: rgba(255, 255, 255, 0.15);
          --glass-border: rgba(255, 255, 255, 0.2);
          --glass-shadow: 0 8px 32px 0 rgba(10, 77, 104, 0.15);
          
          /* Legacy compatibility */
          --color-light-blue: #84D2F6;
          --color-teal: #05C3DD;
          --color-blue: #088395;
          --color-light-gray: rgba(204, 208, 210, 0.5);
          --primary: #088395;
          --primary-gradient: var(--gradient-primary);
          --link-color: #05C3DD;
          --text-primary: #1a1a1a;
          --text-secondary: #4a5568;
          --bg-light: linear-gradient(135deg, rgba(196, 228, 255, 0.1) 0%, rgba(132, 210, 246, 0.05) 100%);
          max-width: calc(100vw - 40px);
        }

        #chat-button {
          width: 64px;
          height: 64px;
          background: var(--gradient-primary);
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          color: white;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(10, 77, 104, 0.4), 0 0 0 0 rgba(5, 195, 221, 0.7);
          border: none;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          z-index: 30;
          overflow: hidden;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
          animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse-ring {
          0%, 100% {
            box-shadow: 0 8px 24px rgba(10, 77, 104, 0.4), 0 0 0 0 rgba(5, 195, 221, 0.7);
          }
          50% {
            box-shadow: 0 8px 24px rgba(10, 77, 104, 0.5), 0 0 0 8px rgba(5, 195, 221, 0);
          }
        }

        #chat-button::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: var(--gradient-shimmer);
          opacity: 0;
          transform: rotate(45deg);
          transition: opacity 0.6s;
          animation: shimmer 3s infinite;
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%) translateY(-100%) rotate(45deg);
            opacity: 0;
          }
          50% {
            opacity: 0.3;
          }
          100% {
            transform: translateX(100%) translateY(100%) rotate(45deg);
            opacity: 0;
          }
        }

        #chat-button::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, transparent 50%);
          border-radius: 50%;
          opacity: 0;
          transition: opacity 0.3s;
        }

        #chat-button:hover {
          transform: scale(1.1) translateY(-3px) rotate(5deg);
          box-shadow: 0 16px 40px rgba(10, 77, 104, 0.5), 0 0 0 4px rgba(5, 195, 221, 0.3);
        }

        #chat-button:hover::after {
          opacity: 1;
        }

        #chat-button:active {
          transform: scale(1.05) translateY(-1px) rotate(2deg);
        }

        #chat-button svg {
          width: 28px;
          height: 28px;
          position: relative;
          z-index: 2;
          flex-shrink: 0;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        #chat-button:hover svg {
          transform: scale(1.1);
        }

        #chat-window {
          z-index: 10;
          position: absolute;
          bottom: 80px;
          right: 0;
          width: min(400px, calc(100vw - 40px));
          height: min(600px, calc(100vh - 120px));
          max-height: 90vh;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border-radius: 24px;
          box-shadow: 0 20px 60px rgba(10, 77, 104, 0.25), 
                      0 0 0 1px rgba(255, 255, 255, 0.5) inset,
                      0 8px 32px rgba(5, 195, 221, 0.1);
          display: flex;
          flex-direction: column;
          opacity: 0;
          visibility: hidden;
          transform: scale(0.94) translateY(20px) rotateX(5deg);
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          pointer-events: none;
          overflow: hidden;
          border: 1px solid var(--glass-border);
        }

        #chat-window.open {
          opacity: 1;
          visibility: visible;
          transform: scale(1) translateY(0) rotateX(0deg);
          pointer-events: all;
        }

        /* Tablet devices */
        @media (max-width: 768px) {
          :host {
            bottom: 16px;
            right: 16px;
          }

          #chat-button {
            width: 60px;
            height: 60px;
          }

          #chat-button svg {
            width: 26px;
            height: 26px;
          }

          #chat-window {
            bottom: 76px;
            width: min(380px, calc(100vw - 32px));
            height: min(580px, calc(100vh - 100px));
          }
        }

        /* Mobile devices */
        @media (max-width: 520px) {
          :host {
            bottom: 16px;
            right: 16px;
            left: auto;
            max-width: calc(100vw - 32px);
          }

          #chat-button {
            width: 56px;
            height: 56px;
            right: 0;
            bottom: 0;
            box-shadow: 0 6px 20px rgba(10, 77, 104, 0.4);
          }

          #chat-button svg {
            width: 24px;
            height: 24px;
          }

          #chat-button:hover {
            transform: scale(1.05) translateY(-2px);
          }

          #chat-window {
            width: 100vw;
            height: 100vh;
            max-height: 100vh;
            bottom: 0;
            right: 0;
            left: 0;
            border-radius: 0;
          }

        }

        /* Small mobile devices */
        @media (max-width: 375px) {
          :host {
            bottom: 12px;
            right: 12px;
          }

          #chat-button {
            width: 52px;
            height: 52px;
          }

          #chat-button svg {
            width: 22px;
            height: 22px;
          }
        }

        /* Large desktop devices */
        @media (min-width: 1440px) {
          :host {
            bottom: 24px;
            right: 24px;
          }

          #chat-button {
            width: 68px;
            height: 68px;
          }

          #chat-button svg {
            width: 30px;
            height: 30px;
          }
        }

        /* Landscape orientation on mobile */
        @media (max-width: 920px) and (orientation: landscape) {
          #chat-window {
            height: min(500px, calc(100vh - 100px));
          }
        }

        .chat-header {
          background: var(--gradient-primary);
          background-image: 
            radial-gradient(circle at 20% 50%, rgba(5, 195, 221, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(8, 131, 149, 0.2) 0%, transparent 50%),
            var(--gradient-primary);
          color: white;
          padding: 20px;
          border-radius: 0;
          font-weight: 600;
          font-size: 15px;
          letter-spacing: -0.01em;
          line-height: 1.4;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 16px rgba(10, 77, 104, 0.2), 
                      inset 0 1px 0 rgba(255, 255, 255, 0.2);
          position: relative;
          overflow: hidden;
          min-height: 70px;
        }

        .chat-title {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 0 40px;
        }

        .title-icon {
          width: 28px;
          height: 28px;
          flex-shrink: 0;
          filter: drop-shadow(0 2px 8px rgba(0,0,0,0.15));
        }

        .title-text {
          display: flex;
          flex-direction: column;
          line-height: 1;
        }

        .title-text .main {
          font-weight: 700;
          font-size: 15px;
          color: white;
        }

        .title-text .sub {
          font-size: 11px;
          color: rgba(255,255,255,0.9);
          font-weight: 600;
          opacity: 0.95;
        }

        .chat-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
          pointer-events: none;
        }

        .header-content-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          position: relative;
          z-index: 2;
          min-height: 40px;
        }

        .wave-divider {
          display: none;
        }

        .wave-divider svg {
          display: block;
          width: 100%;
          height: 100%;
          position: relative;
          filter: drop-shadow(0 -2px 4px rgba(10, 77, 104, 0.1));
        }

        .wave-divider path {
          fill: rgba(255, 255, 255, 0.98);
          stroke: none;
        }

        .header-actions {
          display: flex;
          align-items: center;
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 3;
        }

        .header-actions.left {
          left: 15px;
        }

        .header-actions.right {
          right: 15px;
        }

        .chat-title {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
          font-size: 16px;
          width: 100%;
          padding: 0 40px;
        }

        .title-icon {
          width: 28px;
          height: 28px;
          flex-shrink: 0;
          filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.2));
          animation: icon-glow 2s ease-in-out infinite alternate;
        }

        @keyframes icon-glow {
          0% {
            filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.2)) drop-shadow(0 0 4px rgba(5, 195, 221, 0.3));
          }
          100% {
            filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.2)) drop-shadow(0 0 12px rgba(5, 195, 221, 0.6));
          }
        }

        .header-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: var(--glass-bg);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(10px) saturate(180%);
          -webkit-backdrop-filter: blur(10px) saturate(180%);
          font-family: inherit;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .header-btn svg {
          width: 18px;
          height: 18px;
          fill: currentColor;
          stroke: currentColor;
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
        }

        .header-btn:hover {
          background: var(--glass-bg-strong);
          border-color: rgba(255, 255, 255, 0.3);
          transform: scale(1.08) translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }

        .header-btn:active {
          transform: scale(0.96) translateY(0);
        }

        .chat-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* Initial greeting state */
        .greeting-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 40px 24px 32px;
          text-align: center;
          gap: 20px;
          background: var(--bg-light);
          background-image: 
            radial-gradient(circle at 30% 20%, rgba(5, 195, 221, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 70% 80%, rgba(8, 131, 149, 0.06) 0%, transparent 50%);
          position: relative;
          overflow: hidden;
        }

        .greeting-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, transparent 0%, rgba(5, 195, 221, 0.03) 100%);
          pointer-events: none;
        }

        .greeting-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          position: relative;
          z-index: 1;
          animation: fadeInUp 0.6s ease-out;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .greeting-section.hidden {
          display: none;
        }

        .greeting-icon {
          width: 90px;
          height: 90px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--gradient-light);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-radius: 24px;
          border: 1px solid rgba(5, 195, 221, 0.2);
          box-shadow: 0 8px 24px rgba(5, 195, 221, 0.15), 
                      inset 0 1px 0 rgba(255, 255, 255, 0.5);
          animation: float 3s ease-in-out infinite, icon-pulse 2s ease-in-out infinite;
          position: relative;
          overflow: hidden;
        }

        .greeting-icon::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: var(--gradient-shimmer);
          opacity: 0;
          animation: shimmer-slow 4s infinite;
        }

        @keyframes shimmer-slow {
          0% {
            transform: translateX(-100%) translateY(-100%) rotate(45deg);
            opacity: 0;
          }
          50% {
            opacity: 0.2;
          }
          100% {
            transform: translateX(100%) translateY(100%) rotate(45deg);
            opacity: 0;
          }
        }

        .greeting-icon svg {
          width: 48px;
          height: 48px;
          fill: var(--primary-ocean);
          filter: drop-shadow(0 2px 4px rgba(5, 195, 221, 0.3));
          position: relative;
          z-index: 1;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(2deg); }
        }

        @keyframes icon-pulse {
          0%, 100% {
            box-shadow: 0 8px 24px rgba(5, 195, 221, 0.15), 
                        inset 0 1px 0 rgba(255, 255, 255, 0.5);
          }
          50% {
            box-shadow: 0 12px 32px rgba(5, 195, 221, 0.25), 
                        inset 0 1px 0 rgba(255, 255, 255, 0.5);
          }
        }

        .greeting-text {
          font-family: 'Geom', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
          color: var(--text-primary);
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 8px;
          letter-spacing: -0.03em;
          line-height: 1.3;
          background: var(--gradient-primary);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: fadeInUp 0.6s ease-out 0.1s both;
        }

        .greeting-subtext {
          color: var(--text-secondary);
          font-size: 14px;
          font-weight: 400;
          line-height: 1.7;
          margin-bottom: 24px;
          max-width: 320px;
          letter-spacing: -0.01em;
          animation: fadeInUp 0.6s ease-out 0.2s both;
        }

        .greeting-input-area {
          width: 100%;
          max-width: 320px;
          margin-top: auto;
          position: relative;
          z-index: 1;
          animation: fadeInUp 0.6s ease-out 0.3s both;
        }

        .greeting-input-box {
          position: relative;
          width: 100%;
        }

        .greeting-input {
          width: 100%;
          padding: 14px 50px 14px 16px;
          border: 2px solid rgba(5, 195, 221, 0.2);
          border-radius: 14px;
          font-size: 14px;
          font-weight: 400;
          letter-spacing: -0.01em;
          line-height: 1.5;
          outline: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-shadow: 0 2px 8px rgba(10, 77, 104, 0.08);
        }

        .greeting-input:focus {
          border-color: var(--primary-cyan);
          box-shadow: 0 0 0 4px rgba(5, 195, 221, 0.15), 
                      0 4px 12px rgba(5, 195, 221, 0.2);
          background: rgba(255, 255, 255, 0.95);
        }

        .greeting-input::placeholder {
          color: #999;
          font-weight: 400;
          letter-spacing: -0.01em;
        }

        .greeting-input.invalid {
          border-color: #d32f2f;
          box-shadow: 0 0 0 4px rgba(211, 47, 47, 0.15);
        }

        .greeting-submit {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 12px;
          background: var(--gradient-primary);
          color: white;
          cursor: pointer;
          display: flex;
          justify-content: center;
          align-items: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 8px rgba(10, 77, 104, 0.3);
        }

        .greeting-submit svg {
          width: 18px;
          height: 18px;
          fill: currentColor;
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
        }

        .greeting-submit:hover {
          transform: translateY(-50%) scale(1.1);
          box-shadow: 0 4px 12px rgba(10, 77, 104, 0.4);
        }

        .greeting-submit:active {
          transform: translateY(-50%) scale(0.95);
        }

        .greeting-hint, .field-hint {
          margin-top: 6px;
          color: #d32f2f;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: -0.01em;
          line-height: 1.4;
          min-height: 14px;
          text-align: left;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .greeting-hint.show, .field-hint.show {
          opacity: 1;
        }

        .greeting-input.invalid, .form-field input.invalid {
          border-color: #d32f2f !important;
          box-shadow: 0 0 0 4px rgba(211, 47, 47, 0.15) !important;
        }

        /* Form section */
        .form-section {
          flex: 1;
          display: none;
          flex-direction: column;
          padding: 32px 24px 24px;
          overflow-y: auto;
          gap: 8px;
          background: var(--bg-light);
          background-image: 
            radial-gradient(circle at 30% 20%, rgba(5, 195, 221, 0.06) 0%, transparent 50%),
            radial-gradient(circle at 70% 80%, rgba(8, 131, 149, 0.04) 0%, transparent 50%);
          position: relative;
        }

        .form-section.show {
          display: flex;
        }

        .form-message {
          color: var(--primary-ocean);
          font-size: 15px;
          font-weight: 500;
          letter-spacing: -0.01em;
          line-height: 1.6;
          text-align: left;
          padding: 20px 24px;
          margin-bottom: 24px;
          border-radius: 18px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.98) 100%);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border: 1.5px solid rgba(5, 195, 221, 0.3);
          box-shadow: 
            0 8px 24px rgba(10, 77, 104, 0.12),
            0 2px 8px rgba(5, 195, 221, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.8),
            inset 0 -1px 0 rgba(5, 195, 221, 0.05);
          animation: slideDown 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: flex-start;
          gap: 14px;
          position: relative;
          overflow: hidden;
        }

        .form-message::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--gradient-primary);
          opacity: 0.8;
        }

        .form-message svg {
          width: 24px;
          height: 24px;
          stroke: var(--primary-cyan);
          fill: none;
          flex-shrink: 0;
          margin-top: 1px;
          filter: drop-shadow(0 2px 4px rgba(5, 195, 221, 0.25));
        }

        .form-message span {
          flex: 1;
          color: var(--text-primary);
          font-weight: 500;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .form-field {
          margin-bottom: 16px;
          animation: slideIn 0.3s ease-out;
        }

        .form-field {
          position: relative;
        }

        .form-field {
          position: relative;
        }

        .form-field input {
          width: 100%;
          padding: 14px 16px;
          border: 2px solid rgba(5, 195, 221, 0.2);
          border-radius: 12px;
          font-size: 14px;
          font-weight: 400;
          letter-spacing: -0.01em;
          line-height: 1.5;
          outline: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: inherit;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-shadow: 0 2px 8px rgba(10, 77, 104, 0.08);
        }

        .form-field.has-icon input {
          padding-left: 44px;
        }

        .form-field input:focus {
          border-color: var(--primary-cyan);
          box-shadow: 0 0 0 4px rgba(5, 195, 221, 0.15), 
                      0 4px 12px rgba(5, 195, 221, 0.2);
          background: rgba(255, 255, 255, 0.95);
        }

        .form-field input::placeholder {
          color: #999;
          font-weight: 400;
          letter-spacing: -0.01em;
        }

        .start-chat-btn {
          width: 100%;
          padding: 16px;
          background: var(--gradient-primary);
          color: white;
          border: none;
          border-radius: 14px;
          font-size: 15px;
          font-weight: 600;
          letter-spacing: -0.01em;
          line-height: 1.4;
          cursor: pointer;
          margin-top: 8px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: slideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.2s both;
          box-shadow: 0 4px 16px rgba(10, 77, 104, 0.3), 
                      inset 0 1px 0 rgba(255, 255, 255, 0.2);
          position: relative;
          overflow: hidden;
        }

        .start-chat-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          transition: left 0.5s;
        }

        .start-chat-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(10, 77, 104, 0.4), 
                      inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }

        .start-chat-btn:hover::before {
          left: 100%;
        }

        .start-chat-btn:active {
          transform: translateY(0);
        }

        /* Ripple Effect */
        .ripple {
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.6);
          transform: scale(0);
          animation: ripple-animation 0.6s ease-out;
          pointer-events: none;
        }

        @keyframes ripple-animation {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }

        /* Chat messages section */
        .messages-section {
          flex: 1;
          display: none;
          flex-direction: column;
          overflow: hidden;
        }

        .messages-section.show {
          display: flex;
        }

        #messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          background: var(--bg-light);
          background-image: 
            radial-gradient(circle at 20% 30%, rgba(5, 195, 221, 0.04) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(8, 131, 149, 0.03) 0%, transparent 50%);
        }

        #messages::-webkit-scrollbar {
          width: 6px;
        }

        #messages::-webkit-scrollbar-track {
          background: transparent;
        }

        #messages::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, rgba(5, 195, 221, 0.3) 0%, rgba(8, 131, 149, 0.3) 100%);
          border-radius: 3px;
        }

        #messages::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, rgba(5, 195, 221, 0.5) 0%, rgba(8, 131, 149, 0.5) 100%);
        }

        .message {
          max-width: 80%;
          padding: 14px 18px;
          border-radius: 18px;
          font-size: 14px;
          font-weight: 400;
          letter-spacing: -0.01em;
          line-height: 1.6;
          white-space: pre-wrap;
          word-break: break-word;
          overflow-wrap: anywhere;
          animation: msgAppear 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }

        @keyframes msgAppear {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .message.user {
          align-self: flex-end;
          background: var(--gradient-primary);
          color: white;
          border-bottom-right-radius: 6px;
          box-shadow: 0 4px 12px rgba(10, 77, 104, 0.25), 
                      inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .message.bot {
          align-self: flex-start;
          background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,252,252,1) 100%);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          color: var(--text-primary);
          border: 1px solid rgba(6,182,212,0.12);
          border-bottom-left-radius: 6px;
          box-shadow: 0 2px 8px rgba(10, 77, 104, 0.08), 
                      inset 0 1px 0 rgba(255, 255, 255, 0.8);
        }

        .message a {
          color: var(--link-color);
          font-weight: 500;
          letter-spacing: -0.01em;
          text-decoration: none;
          word-break: break-all;
        }

        .message a:hover {
          text-decoration: underline;
        }

        /* Input area */
        .input-section {
          display: none;
          border-top: 1px solid rgba(5, 195, 221, 0.15);
          padding: 16px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-shadow: 0 -2px 8px rgba(10, 77, 104, 0.05);
        }

        .input-section.show {
          display: block;
        }

        .input-wrapper {
          position: relative;
          width: 100%;
          height: 48px;
          display: block;
          margin: 0;
          padding: 0;
        }

        #chat-input {
          width: 100%;
          padding: 14px 50px 14px 16px;
          border: 2px solid rgba(5, 195, 221, 0.2);
          border-radius: 14px;
          font-size: 14px;
          font-weight: 400;
          letter-spacing: -0.01em;
          line-height: 1.5;
          outline: none;
          font-family: inherit;
          height: 48px;
          box-sizing: border-box;
          transition: border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-shadow: 0 2px 8px rgba(10, 77, 104, 0.08);
          display: block;
          margin: 0;
          position: relative;
          z-index: 1;
        }

        #chat-input:focus {
          border-color: var(--primary-cyan);
          box-shadow: 0 0 0 4px rgba(5, 195, 221, 0.15), 
                      0 4px 12px rgba(5, 195, 221, 0.2);
          background: rgba(255, 255, 255, 0.95);
        }

        #chat-input::placeholder {
          color: #999;
          font-weight: 400;
          letter-spacing: -0.01em;
        }

        .send-btn {
          position: absolute;
          right: 6px;
          top: 6px;
          width: 36px;
          height: 36px;
          background: linear-gradient(90deg,var(--primary-ocean),var(--primary-cyan));
          color: white;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          display: flex;
          justify-content: center;
          align-items: center;
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 8px rgba(10, 77, 104, 0.3);
          flex-shrink: 0;
          z-index: 20;
          padding: 0;
          margin: 0;
          pointer-events: auto;
        }

        .send-btn svg {
          width: 18px;
          height: 18px;
          fill: currentColor;
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
        }

        .send-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(10, 77, 104, 0.4);
        }

        .send-btn:active {
          transform: scale(0.95);
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Typing Indicator */
        .typing-indicator {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-radius: 18px;
          border: 1px solid rgba(5, 195, 221, 0.15);
          box-shadow: 0 2px 8px rgba(10, 77, 104, 0.1);
          max-width: 80px;
          margin-bottom: 14px;
          align-self: flex-start;
        }

        .typing-indicator span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--primary-cyan);
          animation: typing-bounce 1.4s infinite ease-in-out;
        }

        .typing-indicator span:nth-child(1) {
          animation-delay: -0.32s;
        }

        .typing-indicator span:nth-child(2) {
          animation-delay: -0.16s;
        }

        @keyframes typing-bounce {
          0%, 80%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }

        /* Status Badge */
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: white;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          color: var(--primary-ocean);
          border: 1px solid rgba(6, 182, 212, 0.12);
          box-shadow: 0 2px 6px rgba(11,79,108,0.06);
        }

        .status-badge::before {
          content: '';
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--primary-cyan);
          animation: pulse-dot 2s ease-in-out infinite;
          box-shadow: 0 0 8px rgba(6,182,212,0.35);
        }

        @keyframes pulse-dot {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.8);
          }
        }

        /* Form Field Icons */
        .form-field-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          width: 18px;
          height: 18px;
          opacity: 0.5;
          z-index: 1;
          pointer-events: none;
          color: var(--primary-ocean);
        }

        .form-field.has-icon input {
          padding-left: 44px;
        }
      </style>

      <button id="chat-button" aria-label="Open chat">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>

      <div id="chat-window">
        <div class="chat-header">
          <div class="header-content-wrapper">
            <div class="header-actions left">
              <button class="header-btn close-btn" id="close-chat-btn" aria-label="Close chat">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <span class="chat-title">
              <img id="widget-logo" class="title-icon" src="" alt="Logo" style="width:28px;height:28px;border-radius:6px;object-fit:cover;display:none;" />
              <svg class="title-icon title-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 7h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" fill="white" opacity="0.06"/>
                <path d="M8 7V5a4 4 0 1 1 8 0v2" stroke="white" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
                <rect x="6" y="9" width="12" height="6" rx="1" fill="white" opacity="0.06"/>
              </svg>
              <span class="title-text"><span class="main">ALC Lawyers</span><span class="sub">Immigration Law</span></span>
              <span class="status-badge">Online</span>
            </span>
            <div class="header-actions right">
              <!-- <button class="header-btn agent-btn" id="human-agent-btn" aria-label="Talk to a specialist">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </button> -->
            </div>
          </div>
          <div class="wave-divider">
            <svg viewBox="0 0 1200 28" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0,0 L1200,0 L1200,28 L0,28 Z" fill="white" stroke="none"/>
            </svg>
          </div>
        </div>

        <div class="chat-content">
          <!-- Greeting Section -->
          <div class="greeting-section" id="greeting-section">
            <div class="greeting-content">
              <div class="greeting-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
              </div>
              <div class="greeting-text">Welcome to Century Property Tax Consultants</div>
              <div class="greeting-subtext">Get expert assistance with your property tax questions, Say hello and let us know what's on your mind</div>
            </div>
            <div class="greeting-input-area">
              <div class="greeting-input-box">
                <input type="text" id="greeting-input" class="greeting-input" placeholder="Ask about property tax..." />
                <button id="greeting-submit" class="greeting-submit" aria-label="Continue">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </button>
              </div>
              <div class="greeting-hint" id="greeting-hint"></div>
            </div>
          </div>

          <!-- Form Section -->
          <div class="form-section" id="form-section">
            <div class="form-message" id="form-message">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 16v-4"></path>
                <path d="M12 8h.01"></path>
              </svg>
              <span>Please share your contact information so we can assist you better.</span>
            </div>
            <div class="form-field has-icon">
              <svg class="form-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <input type="text" id="name-input" placeholder="Full name *" required />
              <div class="field-hint" id="name-hint"></div>
            </div>
            <div class="form-field has-icon">
              <svg class="form-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <input type="email" id="email-input" placeholder="Email address *" required />
              <div class="field-hint" id="email-hint"></div>
            </div>
            <button class="start-chat-btn" id="start-chat-btn">Start Chat</button>
          </div>

          <!-- Messages Section -->
          <div class="messages-section" id="messages-section">
            <div id="messages"></div>
            <div class="input-section" id="input-section">
              <div class="input-wrapper">
                <input type="text" id="chat-input" placeholder="Type your message..." />
                <button class="send-btn" id="send-btn" aria-label="Send message">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  connectedCallback() {
    const chatButton = this.shadowRoot.querySelector("#chat-button");
    const chatWindow = this.shadowRoot.querySelector("#chat-window");
    const closeChatBtn = this.shadowRoot.querySelector("#close-chat-btn");
    const humanAgentBtn = this.shadowRoot.querySelector("#human-agent-btn");

    const greetingSection = this.shadowRoot.querySelector("#greeting-section");
    const greetingInput = this.shadowRoot.querySelector("#greeting-input");
    const greetingSubmit = this.shadowRoot.querySelector("#greeting-submit");
    const greetingHint = this.shadowRoot.querySelector("#greeting-hint");
    const formSection = this.shadowRoot.querySelector("#form-section");
    const messagesSection = this.shadowRoot.querySelector("#messages-section");
    const inputSection = this.shadowRoot.querySelector("#input-section");
    const formMessageEl = this.shadowRoot.querySelector("#form-message");

    const nameInput = this.shadowRoot.querySelector("#name-input");
    const nameHint = this.shadowRoot.querySelector("#name-hint");
    const emailInput = this.shadowRoot.querySelector("#email-input");
    const emailHint = this.shadowRoot.querySelector("#email-hint");
    const startChatBtn = this.shadowRoot.querySelector("#start-chat-btn");

    const messagesContainer = this.shadowRoot.querySelector("#messages");
    const chatInput = this.shadowRoot.querySelector("#chat-input");
    const sendBtn = this.shadowRoot.querySelector("#send-btn");

    // Load custom logo if provided via `logo-url` attribute
    try {
      const logoUrl = this.getAttribute("logo-url");
      const logoImg = this.shadowRoot.querySelector("#widget-logo");
      const svgIcon = this.shadowRoot.querySelector(".title-icon-svg");
      if (logoUrl && logoImg) {
        logoImg.src = logoUrl;
        logoImg.style.display = "block";
        if (svgIcon) svgIcon.style.display = "none";
      }
    } catch (err) {
      // ignore
    }

    const apiUrlAttr = this.getAttribute("api-url");
    const apiUrl = apiUrlAttr || "https://cptc-ai-chatbot-443305236090.us-central1.run.app/chat/message";
    this.agentSocketUrl = this.getAttribute("agent-socket-url") || "https://chat.supercx.co";
    this.agentSiteId = this.getAttribute("site-id") || "demo-site";
    this.syncHumanBaseUrl = this.getAttribute("sync-human-url") || "http://localhost:3000";
    this.lead = null;
    this.sessionId = null;
    this.agentSessionId = null;
    this.isLiveAgentMode = false;
    this.isAgentConnecting = false;
    this.initialGreeting = "";

    // Show the chat window on initial load; users can close it via the button or header control.
    // Start closed so the floating button is the primary opener.
    // chatWindow.classList.add("open");

    // Immediately ask for contact info when the widget starts.
    // Directly toggle the sections so the name/email form shows right away.
    greetingSection.classList.add("hidden");
    formSection.classList.add("show");
    if (formMessageEl) {
      formMessageEl.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span>Thanks! Please provide your name and email so we can continue assisting you.</span>
        `;
    }
    if (nameInput) setTimeout(() => nameInput.focus(), 0);
    // Toggle chat window
    chatButton.addEventListener("click", () => {
      chatWindow.classList.toggle("open");
    });
    closeChatBtn.addEventListener("click", () => {
      chatWindow.classList.remove("open");
    });

    if (humanAgentBtn) {
      humanAgentBtn.addEventListener("click", async () => {
        chatWindow.classList.add("open");
        if (!messagesSection.classList.contains("show")) {
          alert("Please share your contact details first so we can connect you with a specialist.");
          return;
        }

        if (this.isAgentConnecting) {
          this.addMessage("We're connecting you to a specialist now.", "bot");
          return;
        }

        if (this.isLiveAgentMode && this.agentSessionId) {
          this.addMessage("You're already connected to a specialist.", "bot");
          return;
        }

        this.isLiveAgentMode = true;
        this.isAgentConnecting = true;
        this.addMessage("Connecting you to a live specialist...", "bot");

        try {
          await this.ensureAgentSocket();
        } catch (error) {
          console.error("Live agent connection failed:", error);
          this.addMessage("Unable to connect to a live specialist right now. Please try again.", "bot");
          this.isLiveAgentMode = false;
        } finally {
          this.isAgentConnecting = false;
        }
      });
    }

    const showForm = () => {
      greetingSection.classList.add("hidden");
      formSection.classList.add("show");
      if (formMessageEl) {
        formMessageEl.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span>Thanks! Please provide your name and email so we can continue assisting you.</span>
        `;
      }
    };

    const handleGreetingSubmit = () => {
      const value = greetingInput.value.trim();
      if (!value) {
        greetingInput.classList.add("invalid");
        greetingHint.textContent = "Please enter a message to continue.";
        greetingHint.classList.add("show");
        return;
      }

      this.initialGreeting = value;
      greetingHint.textContent = "";
      greetingHint.classList.remove("show");
      greetingInput.classList.remove("invalid");
      showForm();
    };

    greetingSubmit.addEventListener("click", (e) => {
      addRippleEffect(greetingSubmit, e);
      handleGreetingSubmit();
    });
    greetingInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleGreetingSubmit();
      }
    });

    // Ripple effect helper
    const addRippleEffect = (button, event) => {
      // Only add ripple if button is not the send button (which needs absolute positioning)
      if (button.id === "send-btn") {
        return; // Skip ripple for send button to preserve positioning
      }

      const ripple = document.createElement("span");
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = event.clientX - rect.left - size / 2;
      const y = event.clientY - rect.top - size / 2;

      ripple.style.width = ripple.style.height = size + "px";
      ripple.style.left = x + "px";
      ripple.style.top = y + "px";
      ripple.classList.add("ripple");

      // Store original position
      const originalPosition = button.style.position;
      button.style.position = "relative";
      button.style.overflow = "hidden";
      button.appendChild(ripple);

      setTimeout(() => {
        ripple.remove();
        // Restore original position if it was set
        if (originalPosition) {
          button.style.position = originalPosition;
        } else {
          button.style.position = "";
        }
        button.style.overflow = "";
      }, 600);
    };

    // Real-time validation clearing
    nameInput.addEventListener("input", () => {
      nameInput.classList.remove("invalid");
      nameHint.classList.remove("show");
    });

    emailInput.addEventListener("input", () => {
      emailInput.classList.remove("invalid");
      emailHint.classList.remove("show");
    });

    greetingInput.addEventListener("input", () => {
      greetingInput.classList.remove("invalid");
      greetingHint.classList.remove("show");
    });

    // Submit form and start chat
    startChatBtn.addEventListener("click", (e) => {
      addRippleEffect(startChatBtn, e);
      const name = nameInput.value.trim();
      const email = emailInput.value.trim();

      let hasError = false;

      // Reset states
      nameInput.classList.remove("invalid");
      emailInput.classList.remove("invalid");
      nameHint.textContent = "";
      nameHint.classList.remove("show");
      emailHint.textContent = "";
      emailHint.classList.remove("show");

      if (!name) {
        nameInput.classList.add("invalid");
        nameHint.textContent = "Full name is required.";
        nameHint.classList.add("show");
        hasError = true;
      } else if (name.length < 2) {
        nameInput.classList.add("invalid");
        nameHint.textContent = "Please enter a valid name.";
        nameHint.classList.add("show");
        hasError = true;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email) {
        emailInput.classList.add("invalid");
        emailHint.textContent = "Email address is required.";
        emailHint.classList.add("show");
        hasError = true;
      } else if (!emailRegex.test(email)) {
        emailInput.classList.add("invalid");
        emailHint.textContent = "Please enter a valid email address.";
        emailHint.classList.add("show");
        hasError = true;
      }

      if (hasError) return;

      const sanitizedEmail = email.replace(/[^a-z0-9]/gi, "").toLowerCase() || "user";
      const randomChunk = Math.random().toString(36).slice(2, 8);
      this.sessionId = `${sanitizedEmail}-${Date.now()}-${randomChunk}`;

      this.lead = {
        name,
        email,
        session_id: this.sessionId
      };

      console.log("📌 Lead captured:", this.lead);

      formSection.classList.remove("show");
      messagesSection.classList.add("show");
      inputSection.classList.add("show");

      if (this.initialGreeting) {
        chatInput.value = this.initialGreeting;
        setTimeout(() => chatInput.focus(), 0);
        this.initialGreeting = "";
      }

      // Add greeting message
      this.addMessage("Hi! Thanks for providing your details. How can we help you today?", "bot");
    });

    // Send chat message
    const sendMessage = async () => {
      const text = chatInput.value.trim();
      if (!text) return;

      this.addMessage(text, "user");
      chatInput.value = "";

      if (this.isLiveAgentMode) {
        try {
          await this.ensureAgentSocket();
          if (!this.agentSessionId) {
            this.addMessage("Still connecting you to a specialist. We'll deliver your message once connected.", "bot");
          }

          if (this.agentSocket) {
            this.agentSocket.emit("visitor-message", {
              sessionId: this.agentSessionId,
              text,
              email: this.lead?.email,
              name: this.lead?.name
            });
          }
        } catch (error) {
          console.error("Error sending to live agent:", error);
          this.addMessage("We couldn't send that to the specialist. Please try again.", "bot");
        }
        return;
      }

      if (!apiUrl) {
        this.addMessage("API not configured", "bot");
        return;
      }

      if (!this.lead) {
        this.addMessage("Please provide your contact details first.", "bot");
        return;
      }

      // Check sync-human API first
      try {
        // Use the configured sync-human base URL from the Century app
        const syncHumanUrl = `${this.syncHumanBaseUrl}/api/messages/sync-human?email=${encodeURIComponent(this.lead.email)}`;

        const syncResponse = await fetch(syncHumanUrl);
        const syncData = await syncResponse.json();

        console.log("📞 Sync-human response:", syncData);

        // If chat_human is true, enable socket connection
        if (syncData.success && syncData.chat_human) {
          console.log("✅ Human agent available - enabling socket mode");
          this.isLiveAgentMode = true;
          this.isAgentConnecting = true;
          this.addMessage("A human agent is available! Connecting you now...", "bot");

          try {
            await this.ensureAgentSocket();
            console.log("🔌 Socket connected, sessionId:", this.agentSessionId);

            // Send the current message through socket
            if (this.agentSocket) {
              this.agentSocket.emit("visitor-message", {
                sessionId: this.agentSessionId,
                text,
                email: this.lead?.email,
                name: this.lead?.name
              });
              console.log("💬 Message sent via socket");
            }
          } catch (error) {
            console.error("❌ Live agent connection failed:", error);
            this.addMessage("Unable to connect to a live specialist right now. Routing to AI assistant.", "bot");
            this.isLiveAgentMode = false;
          } finally {
            this.isAgentConnecting = false;
          }

          // Don't call AI API if we're in live agent mode (even if there was a socket issue, the mode is set)
          if (this.isLiveAgentMode) {
            console.log("🚫 Skipping AI API - in live agent mode");
            return;
          }
        } else {
          console.log("🤖 No human agent available - using AI flow");
        }
      } catch (error) {
        console.error("Error checking sync-human API:", error);
        // Continue with normal AI flow if sync-human check fails
      }

      const payload = {
        message: text,
        name: this.lead?.name,
        email: this.lead?.email
      };

      // Show typing indicator
      this.showTypingIndicator();

      try {
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        const reply = data.reply || "Got your message!";

        // Hide typing indicator and add message
        this.hideTypingIndicator();
        this.addMessage(reply, "bot");

        // Check if this is a system message indicating human agent routing
        if (this.isValidSystemMessage(reply)) {
          console.log("🔔 System message detected - auto-connecting to human agent");
          this.isLiveAgentMode = true;
          this.isAgentConnecting = true;

          try {
            await this.ensureAgentSocket();
            console.log("✅ Auto-connected to human agent socket, sessionId:", this.agentSessionId);
            this.addMessage("Connecting you to a live specialist...", "bot");
          } catch (error) {
            console.error("❌ Auto-connection to human agent failed:", error);
            this.isLiveAgentMode = false;
          } finally {
            this.isAgentConnecting = false;
          }
        }
      } catch (error) {
        console.error("Error:", error);
        this.hideTypingIndicator();
        this.addMessage("Sorry, something went wrong.", "bot");
      }
    };

    const bindSendButton = (btn) => btn && btn.addEventListener("click", (e) => {
      addRippleEffect(btn, e);
      sendMessage();
    });

    bindSendButton(sendBtn);
    chatInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  addMessage(text, sender) {
    const messagesContainer = this.shadowRoot.querySelector("#messages");
    const messageEl = document.createElement("div");
    messageEl.className = `message ${sender}`;
    this.appendLinkifiedText(messageEl, text);
    messagesContainer.appendChild(messageEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  showTypingIndicator() {
    const messagesContainer = this.shadowRoot.querySelector("#messages");
    let typingEl = this.shadowRoot.querySelector(".typing-indicator");

    if (!typingEl) {
      typingEl = document.createElement("div");
      typingEl.className = "typing-indicator";
      typingEl.innerHTML = "<span></span><span></span><span></span>";
      messagesContainer.appendChild(typingEl);
    }

    typingEl.style.display = "flex";
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  hideTypingIndicator() {
    const typingEl = this.shadowRoot.querySelector(".typing-indicator");
    if (typingEl) {
      typingEl.style.display = "none";
      typingEl.remove();
    }
  }

  getAgentMessageText(message) {
    if (!message) return "";
    return (
      message.text ||
      message.message ||
      message.content ||
      message.body ||
      JSON.stringify(message)
    );
  }

  // Check if the message is a system message indicating human agent routing
  isValidSystemMessage(text) {
    const pattern = /^Okay\s+[A-Za-z]+,\s+our team will connect with you soon!\s+For immediate assistance,\s+please call us at\s+\+1\s+\(713\)\s+270-5953\.$/;
    return pattern.test(text);
  }

  async loadSocketLibrary() {
    if (window.io) return;
    if (this.socketLoadPromise) return this.socketLoadPromise;

    this.socketLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.socket.io/4.7.2/socket.io.min.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Socket.io client"));
      document.head.appendChild(script);
    });

    return this.socketLoadPromise;
  }

  async ensureAgentSocket() {
    if (this.agentSocket && this.agentSocketListenersAttached) {
      return this.agentSocket;
    }

    if (this.agentSocket) {
      // Socket exists but listeners not attached yet
      if (!this.agentSocketListenersAttached) {
        this.agentSocket.on("session-created", this.onAgentSessionCreated);
        this.agentSocket.on("new-message", this.onAgentIncoming);
        this.agentSocketListenersAttached = true;
      }
      return this.agentSocket;
    }

    await this.loadSocketLibrary();

    const socket = window.__LIVECHAT_SOCKET__ || window.io(this.agentSocketUrl);
    window.__LIVECHAT_SOCKET__ = socket;
    this.agentSocket = socket;

    // Only attach listeners once
    socket.on("session-created", this.onAgentSessionCreated);
    socket.on("new-message", this.onAgentIncoming);
    this.agentSocketListenersAttached = true;

    // Send email and name with widget-init
    socket.emit("widget-init", {
      siteId: this.agentSiteId,
      email: this.lead?.email,
      name: this.lead?.name
    });
    return socket;
  }

  appendLinkifiedText(container, text) {
    const safeText = typeof text === "string" ? text : String(text ?? "");
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    let lastIndex = 0;
    let match;
    const processText = (segment) => {
      if (segment) {
        container.appendChild(document.createTextNode(segment));
      }
    };

    while ((match = urlRegex.exec(safeText)) !== null) {
      const [url] = match;
      const start = match.index;
      processText(safeText.slice(lastIndex, start));

      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.title = url;
      link.textContent = this.formatLinkLabel(url);
      container.appendChild(link);

      lastIndex = start + url.length;
    }

    processText(safeText.slice(lastIndex));
  }

  formatLinkLabel(url) {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.replace(/^www\./, "");
      const pathname = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname : "";
      return `${hostname}${pathname}`;
    } catch (err) {
      return url;
    }
  }
}

customElements.define("chat-widget", ChatWidget);
