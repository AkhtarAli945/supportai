# SupportAI — AI-Powered Customer Support & Ticketing Platform

A multi-tenant, agentic customer support platform. Businesses create a workspace,
upload their knowledge base, and get an AI agent that answers customer questions
on their website via an embeddable chat widget — with automatic escalation to
human agents, ticket creation, and analytics.

**Stack:** MERN (MongoDB, Express, React, Node) · LangGraph-style agent orchestration
· Groq (Llama 3.3 70B) · Socket.IO · local vector embeddings (`@xenova/transformers`)

```
supportai/
├── backend/     Express API, MongoDB models, agent graph, Socket.IO server
├── frontend/    React + Vite + Tailwind dashboard (business owner / support agent)
└── widget/      Vanilla-JS embeddable chat widget for customer websites
```

---

## 1. What's implemented

This scaffold covers **Phases 1–5** of the original project plan end-to-end:

| Phase | Status | Notes |
|---|---|---|
| 1. Auth + workspace + KB upload + RAG chat | ✅ | JWT auth, role-based access, PDF/text/URL ingestion, local embeddings |
| 2. Embeddable widget + Socket.IO | ✅ | Floating widget, real-time agent replies, typing indicators |
| 3. LangGraph-style agent + escalation | ✅ | Retrieve → Classify → Tool call → Answer/Escalate → Summarize |
| 4. Agent dashboard (queue, live reply) | ✅ | Ticket queue, live chat view, status/priority management |
| 5. Analytics dashboard + email alerts | ⚠️ Partial | Analytics ✅. Email alerts scaffolded (Nodemailer configured) but not wired to the escalation event — see "Next steps" |
| 6. Polish, deploy, case study | ❌ | Up to you — see deployment section below |

**Design decisions worth knowing:**
- The "LangGraph" agent (`backend/src/agent/graph.js`) is written as an explicit
  state-machine of nodes (`retrieve → classifyIntent → toolCall → answerOrEscalate → summarize`),
  matching LangGraph's mental model exactly, but implemented in plain async/await
  so it runs with zero extra dependencies. If you want the real `@langchain/langgraph`
  library wired in, the node functions are already isolated and ready to drop into
  a `StateGraph`.
- Vector search is in-memory cosine similarity over chunks stored in MongoDB
  (`backend/src/services/vectorStore.js`). This is fine for small/medium knowledge
  bases. For large KBs, swap in Pinecone, pgvector, or MongoDB Atlas Vector Search.
- Tool-calling (`backend/src/agent/tools.js`) currently has **mock** implementations
  for `check_order_status` and `get_refund_policy` — wire these up to your real
  order/CRM system for production use.

---

## 2. Prerequisites

- Node.js 18+
- A MongoDB database (local `mongod` or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster)
- A free [Groq API key](https://console.groq.com/keys)

---

## 3. Backend setup

```bash
cd backend
npm install
cp .env.example .env
# then edit .env: set MONGO_URI, JWT_SECRET, GROQ_API_KEY at minimum
npm run dev
```

The API starts on `http://localhost:5000`. Health check: `GET /health`.

**Seed two demo workspaces** (matches the project's deliverable of 2 seed workspaces):

```bash
npm run seed
```

This creates:
- `owner@demoecommerce.com` / `password123` → workspace "Demo E-commerce Store"
- `owner@demosaas.com` / `password123` → workspace "Demo SaaS Company"

Each comes with a small pre-embedded FAQ knowledge base so you can test the RAG
chat flow immediately.

> **Note on `@xenova/transformers`:** the first time you upload a document or run
> the seed script, it downloads a small embedding model (~90MB) and caches it
> locally. This takes a few extra seconds on first run only.

---

## 4. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
# VITE_API_URL should point at your backend, e.g. http://localhost:5000/api
npm run dev
```

Dashboard runs on `http://localhost:5173`. Register a new workspace, or log in
with one of the seeded demo accounts above.

---

## 5. Widget setup (for testing locally)

The `widget/` folder contains the standalone embeddable script plus a demo HTML
page that loads it exactly the way a real customer website would.

1. In the dashboard, go to **Settings → Embed code** and copy your `embedKey`
   (or the full `<script>` snippet).
2. Open `widget/demo.html`, replace `data-workspace-id="REPLACE_WITH_EMBED_KEY"`
   with your real key, and make sure `data-api-url` points at your running backend.
3. Open `widget/demo.html` directly in a browser (or serve it with any static
   server) — you'll see the chat bubble in the bottom-right corner.

In production, host `supportai-widget.js` on a CDN and give clients the
`<script>` snippet shown in their dashboard — this is exactly what
`GET /api/workspaces/embed-code` returns.

---

## 6. How the agentic flow works end-to-end

1. Customer opens the widget on a business's website and sends a message.
2. `POST /api/chat/message` runs `runAgentGraph()`:
   - **Retrieve** — embeds the query, does cosine-similarity search over that
     workspace's knowledge base chunks.
   - **Classify intent** — a Groq call tags the message as `faq` / `order_status`
     / `complaint` / `human_request` / `refund`, plus sentiment + confidence.
   - **Tool call** — conditionally calls a tool (e.g. `check_order_status`) based
     on intent.
   - **Answer or escalate** — if confidence is high and intent isn't a complaint/
     human request, Groq generates a grounded answer from the retrieved context.
     Otherwise, the conversation is escalated.
   - **Summarize** — on escalation, Groq writes a short handoff summary for the
     human agent.
3. On escalation, a `Ticket` is created and the workspace's dashboard gets a
   real-time `conversation_escalated` Socket.IO event — it appears instantly in
   the Live Queue.
4. A support agent opens the ticket, sees the AI's summary + full transcript,
   and replies — delivered back to the customer's widget in real time via
   Socket.IO.

---

## 7. Deployment

- **Backend → [Render](https://render.com):** New Web Service, root directory
  `backend`, build command `npm install`, start command `npm start`. Add all
  `.env` vars in Render's dashboard. Use a MongoDB Atlas connection string for
  `MONGO_URI`.
- **Frontend → [Vercel](https://vercel.com):** import the repo, set root
  directory to `frontend`, framework preset "Vite", add `VITE_API_URL` pointing
  at your deployed Render backend.
- **Widget → any static host / CDN** (Vercel, Cloudflare Pages, S3+CloudFront):
  deploy `widget/supportai-widget.js` and give that URL to clients for their
  `<script src="...">` tag.

Remember to update `CLIENT_URL` (backend `.env`) and CORS settings for your
production frontend domain, and set `PUBLIC_API_URL` so generated embed codes
point at your live backend.

---

## 8. Next steps / suggested improvements

- Wire up the Nodemailer email alert (`backend/src/services/`) to fire on the
  `conversation_escalated` event when no agent is online (checks `User.isOnline`).
- Replace mock tools in `agent/tools.js` with real integrations (Shopify orders,
  a ticketing CRM, etc.).
- Add Cloudinary file-attachment support to the widget's chat input (dependency
  is already in `package.json`).
- Swap the in-memory vector search for MongoDB Atlas Vector Search or Pinecone
  once a workspace's knowledge base grows large.
- Add WhatsApp Business Cloud API notifications (mentioned in the original spec)
  alongside email.

---

## 9. Project structure reference

```
backend/src/
├── agent/            graph.js (LangGraph-style orchestration), tools.js
├── config/            db.js, groq.js
├── controllers/        auth, workspace, kb, chat, ticket, analytics
├── middleware/        authMiddleware.js (JWT + roles), errorMiddleware.js
├── models/            Workspace, User, Conversation, Ticket, KnowledgeDoc
├── routes/            one file per resource
├── services/           embeddingService.js, vectorStore.js, groqService.js
├── sockets/            socketHandlers.js
├── utils/             seed.js
└── server.js

frontend/src/
├── pages/             Login, Register, Dashboard, KnowledgeBase, Tickets, Analytics, Settings
├── components/        DashboardLayout.jsx
├── context/           AuthContext, SocketContext
└── services/api.js

widget/
├── supportai-widget.js
└── demo.html
```
