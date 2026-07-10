import React, { useEffect, useState, useRef } from "react";
import { Send, Circle } from "lucide-react";
import api from "../services/api";
import { useSocket } from "../context/SocketContext";

const priorityColors = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
};

export default function Tickets() {
  const { socket } = useSocket();
  const [tickets, setTickets] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [replyText, setReplyText] = useState("");
  const messagesEndRef = useRef(null);

  const loadTickets = () => {
    api.get("/tickets", { params: statusFilter ? { status: statusFilter } : {} }).then((res) => setTickets(res.data));
  };

  useEffect(() => {
    loadTickets();
  }, [statusFilter]);

  useEffect(() => {
    if (!socket) return;
    socket.on("conversation_escalated", () => loadTickets());
    socket.on("new_customer_message", (payload) => {
      if (selected && payload.conversationId === selected.conversationId?._id) {
        setSelected((prev) => ({
          ...prev,
          conversationId: {
            ...prev.conversationId,
            messages: [...prev.conversationId.messages, payload.message],
          },
        }));
      }
    });
    return () => {
      socket.off("conversation_escalated");
      socket.off("new_customer_message");
    };
  }, [socket, selected]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected]);

  const openTicket = async (ticket) => {
    const res = await api.get(`/tickets/${ticket._id}`);
    setSelected(res.data);
    socket?.emit("agent_join_conversation", res.data.conversationId._id);
  };

  const sendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selected) return;
    await api.post(`/tickets/${selected._id}/reply`, { message: replyText });
    setSelected((prev) => ({
      ...prev,
      conversationId: {
        ...prev.conversationId,
        messages: [...prev.conversationId.messages, { sender: "agent", text: replyText, createdAt: new Date() }],
      },
    }));
    setReplyText("");
  };

  const updateStatus = async (status) => {
    await api.put(`/tickets/${selected._id}`, { status });
    setSelected((prev) => ({ ...prev, status }));
    loadTickets();
  };

  return (
    <div>
      <h1 className="font-display font-bold text-2xl mb-1">Live queue &amp; tickets</h1>
      <p className="text-ink/60 mb-6">Conversations your AI agent escalated to a human.</p>

      <div className="flex gap-2 mb-4">
        {["", "open", "pending", "resolved"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-sm font-medium px-3.5 py-1.5 rounded-full transition-colors ${
              statusFilter === s ? "bg-ink text-white" : "bg-white border border-black/10 text-ink/60 hover:text-ink"
            }`}
          >
            {s === "" ? "All" : s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 card overflow-hidden">
          {tickets.length === 0 ? (
            <p className="p-6 text-sm text-ink/50">No tickets in this view.</p>
          ) : (
            <ul className="divide-y divide-black/5 max-h-[65vh] overflow-y-auto">
              {tickets.map((t) => (
                <li
                  key={t._id}
                  onClick={() => openTicket(t)}
                  className={`px-5 py-4 cursor-pointer hover:bg-accent-light/50 transition-colors ${
                    selected?._id === t._id ? "bg-accent-light" : ""
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-sm font-medium truncate">{t.subject}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${priorityColors[t.priority]}`}>
                      {t.priority}
                    </span>
                  </div>
                  <p className="text-xs text-ink/40 mt-1 capitalize">
                    {t.status} · {t.conversationId?.customerName || "Visitor"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:col-span-3 card flex flex-col h-[65vh]">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-sm text-ink/40">
              Select a ticket to view the conversation
            </div>
          ) : (
            <>
              <div className="px-5 py-4 border-b border-black/5 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-sm">{selected.conversationId.customerName}</p>
                  <p className="text-xs text-ink/40">{selected.subject}</p>
                </div>
                <select
                  value={selected.status}
                  onChange={(e) => updateStatus(e.target.value)}
                  className="text-sm border border-black/10 rounded-lg px-2 py-1"
                >
                  <option value="open">Open</option>
                  <option value="pending">Pending</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-surface/50">
                {selected.conversationId.messages.map((m, i) => (
                  <div key={i} className={`flex ${m.sender === "customer" ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm ${
                        m.sender === "customer"
                          ? "bg-white border border-black/10 rounded-bl-sm"
                          : m.sender === "ai"
                          ? "bg-accent-light text-ink rounded-br-sm"
                          : "bg-accent text-white rounded-br-sm"
                      }`}
                    >
                      <p>{m.text}</p>
                      <p className={`text-[10px] mt-1 ${m.sender === "customer" ? "text-ink/30" : "text-white/60"}`}>
                        {m.sender === "customer" ? "Customer" : m.sender === "ai" ? "AI Agent" : "You"}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={sendReply} className="p-4 border-t border-black/5 flex gap-2">
                <input
                  className="input-field"
                  placeholder="Type a reply…"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
                <button type="submit" className="btn-primary shrink-0 px-3.5">
                  <Send size={16} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
