/**
 * SupportAI Embeddable Widget
 * Usage on any website:
 * <script src="https://cdn.yoursupportai.com/supportai-widget.js"
 *         data-workspace-id="YOUR_EMBED_KEY"
 *         data-api-url="https://api.yoursupportai.com"></script>
 */
(function () {
  const scriptTag = document.currentScript;
  const workspaceId = scriptTag.getAttribute("data-workspace-id");
  const apiUrl = scriptTag.getAttribute("data-api-url") || "http://localhost:5000";

  if (!workspaceId) {
    console.error("[SupportAI] Missing data-workspace-id attribute on script tag.");
    return;
  }

  const customerId = getOrCreateCustomerId();
  let conversationId = sessionStorage.getItem("supportai_conversation_id") || null;
  let socket = null;
  let brandColor = "#4F46E5";
  let welcomeMessage = "Hi! How can I help you today?";
  let agentName = "SupportAI Assistant";

  function getOrCreateCustomerId() {
    let id = localStorage.getItem("supportai_customer_id");
    if (!id) {
      id = "cust_" + Math.random().toString(36).slice(2) + Date.now();
      localStorage.setItem("supportai_customer_id", id);
    }
    return id;
  }

  // ---- Inject styles ----
  const style = document.createElement("style");
  style.textContent = `
    #supportai-bubble {
      position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px;
      border-radius: 50%; background: var(--sai-color, #4F46E5); cursor: pointer;
      display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.25);
      z-index: 999998; transition: transform 0.2s ease;
    }
    #supportai-bubble:hover { transform: scale(1.06); }
    #supportai-bubble svg { width: 28px; height: 28px; fill: white; }
    #supportai-window {
      position: fixed; bottom: 92px; right: 20px; width: 360px; max-width: 92vw; height: 520px;
      max-height: 75vh; background: #fff; border-radius: 16px; box-shadow: 0 8px 30px rgba(0,0,0,0.2);
      display: none; flex-direction: column; overflow: hidden; z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    #supportai-window.open { display: flex; }
    #supportai-header {
      background: var(--sai-color, #4F46E5); color: #fff; padding: 16px; font-weight: 600;
      display: flex; justify-content: space-between; align-items: center; font-size: 15px;
    }
    #supportai-header span.status { font-weight: 400; font-size: 12px; opacity: 0.85; display: block; }
    #supportai-close { cursor: pointer; font-size: 20px; line-height: 1; opacity: 0.9; }
    #supportai-messages { flex: 1; overflow-y: auto; padding: 14px; background: #F9FAFB; }
    .sai-msg { margin-bottom: 10px; display: flex; }
    .sai-msg.customer { justify-content: flex-end; }
    .sai-bubble {
      max-width: 78%; padding: 9px 13px; border-radius: 14px; font-size: 14px; line-height: 1.4;
    }
    .sai-msg.customer .sai-bubble { background: var(--sai-color, #4F46E5); color: #fff; border-bottom-right-radius: 4px; }
    .sai-msg.ai .sai-bubble, .sai-msg.agent .sai-bubble { background: #fff; color: #111827; border: 1px solid #E5E7EB; border-bottom-left-radius: 4px; }
    .sai-typing { font-size: 12px; color: #6B7280; padding: 0 14px 8px; font-style: italic; }
    #supportai-inputrow { display: flex; border-top: 1px solid #E5E7EB; padding: 10px; gap: 8px; }
    #supportai-input {
      flex: 1; border: 1px solid #E5E7EB; border-radius: 10px; padding: 9px 12px; font-size: 14px; outline: none;
    }
    #supportai-send {
      background: var(--sai-color, #4F46E5); color: #fff; border: none; border-radius: 10px;
      padding: 0 16px; cursor: pointer; font-size: 14px; font-weight: 600;
    }
    #supportai-send:disabled { opacity: 0.5; cursor: default; }
  `;
  document.head.appendChild(style);

  // ---- Build DOM ----
  const bubble = document.createElement("div");
  bubble.id = "supportai-bubble";
  bubble.innerHTML =
    '<svg viewBox="0 0 24 24"><path d="M12 3C6.5 3 2 6.9 2 11.5c0 2.4 1.2 4.6 3.2 6.1-.1.9-.6 2.5-1.7 3.9 1.9-.2 3.6-1 4.8-1.8 1.1.4 2.4.6 3.7.6 5.5 0 10-3.9 10-8.8S17.5 3 12 3z"/></svg>';
  document.body.appendChild(bubble);

  const win = document.createElement("div");
  win.id = "supportai-window";
  win.innerHTML = `
    <div id="supportai-header">
      <div>
        <div id="supportai-agent-name">SupportAI Assistant</div>
        <span class="status" id="supportai-status">Online</span>
      </div>
      <div id="supportai-close">&times;</div>
    </div>
    <div id="supportai-messages"></div>
    <div class="sai-typing" id="supportai-typing" style="display:none;">Agent is typing…</div>
    <div id="supportai-inputrow">
      <input id="supportai-input" type="text" placeholder="Type your message…" />
      <button id="supportai-send">Send</button>
    </div>
  `;
  document.body.appendChild(win);

  const messagesEl = win.querySelector("#supportai-messages");
  const inputEl = win.querySelector("#supportai-input");
  const sendBtn = win.querySelector("#supportai-send");
  const typingEl = win.querySelector("#supportai-typing");
  const statusEl = win.querySelector("#supportai-status");
  const agentNameEl = win.querySelector("#supportai-agent-name");

  bubble.addEventListener("click", () => {
    win.classList.toggle("open");
    if (win.classList.contains("open") && messagesEl.children.length === 0) {
      addMessage("ai", welcomeMessage);
    }
  });
  win.querySelector("#supportai-close").addEventListener("click", () => win.classList.remove("open"));

  function addMessage(sender, text) {
    const row = document.createElement("div");
    row.className = `sai-msg ${sender}`;
    const b = document.createElement("div");
    b.className = "sai-bubble";
    b.textContent = text;
    row.appendChild(b);
    messagesEl.appendChild(row);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function loadConfig() {
    try {
      const res = await fetch(`${apiUrl}/api/chat/widget-config/${workspaceId}`);
      const data = await res.json();
      brandColor = data.settings?.brandColor || brandColor;
      welcomeMessage = data.settings?.welcomeMessage || welcomeMessage;
      agentName = data.settings?.agentName || agentName;
      document.documentElement.style.setProperty("--sai-color", brandColor);
      agentNameEl.textContent = agentName;
    } catch (e) {
      console.warn("[SupportAI] Could not load widget config", e);
    }
  }

  async function sendMessage() {
    const text = inputEl.value.trim();
    if (!text) return;
    addMessage("customer", text);
    inputEl.value = "";
    sendBtn.disabled = true;
    typingEl.style.display = "block";

    try {
      const res = await fetch(`${apiUrl}/api/chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embedKey: workspaceId,
          customerId,
          message: text,
          conversationId,
        }),
      });
      const data = await res.json();
      conversationId = data.conversationId;
      sessionStorage.setItem("supportai_conversation_id", conversationId);

      if (window.io && !socket) connectSocket();

      if (data.reply) addMessage(data.status === "escalated" ? "ai" : "ai", data.reply);
      if (data.status === "escalated") statusEl.textContent = "Connecting you to a human agent…";
    } catch (e) {
      addMessage("ai", "Sorry, something went wrong. Please try again in a moment.");
    } finally {
      sendBtn.disabled = false;
      typingEl.style.display = "none";
    }
  }

  function connectSocket() {
    socket = window.io(apiUrl, { transports: ["websocket", "polling"] });
    socket.emit("join_conversation", conversationId);
    socket.on("new_agent_message", (payload) => {
      if (payload.conversationId === conversationId) addMessage("agent", payload.message.text);
    });
    socket.on("typing", ({ sender }) => {
      if (sender === "agent") {
        typingEl.style.display = "block";
        setTimeout(() => (typingEl.style.display = "none"), 2500);
      }
    });
  }

  sendBtn.addEventListener("click", sendMessage);
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  // Load socket.io-client from CDN for real-time agent replies (optional, degrades gracefully)
  const socketScript = document.createElement("script");
  socketScript.src = "https://cdn.socket.io/4.8.1/socket.io.min.js";
  socketScript.onload = () => {
    if (conversationId) connectSocket();
  };
  document.head.appendChild(socketScript);

  loadConfig();
})();
