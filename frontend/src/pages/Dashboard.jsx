import React, { useEffect, useState } from "react";
import { MessageSquare, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="card p-5">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${accent}`}>
        <Icon size={18} className="text-white" />
      </div>
      <p className="text-2xl font-display font-bold">{value}</p>
      <p className="text-sm text-ink/60 mt-0.5">{label}</p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/analytics/summary")
      .then((res) => setSummary(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="font-display font-bold text-2xl mb-1">Good to see you, {user?.name?.split(" ")[0]} 👋</h1>
      <p className="text-ink/60 mb-8">Here's how your AI support agent is performing.</p>

      {loading ? (
        <p className="text-ink/50 text-sm">Loading stats…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={MessageSquare}
              label="Total conversations"
              value={summary?.totalConversations ?? 0}
              accent="bg-accent"
            />
            <StatCard
              icon={TrendingUp}
              label="AI deflection rate"
              value={`${summary?.aiDeflectionRate ?? 0}%`}
              accent="bg-emerald-500"
            />
            <StatCard
              icon={CheckCircle2}
              label="Ticket resolution rate"
              value={`${summary?.resolutionRate ?? 0}%`}
              accent="bg-blue-500"
            />
            <StatCard
              icon={AlertCircle}
              label="Open tickets"
              value={summary?.openTickets ?? 0}
              accent="bg-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h2 className="font-display font-semibold mb-4">Sentiment breakdown</h2>
              <div className="space-y-3">
                {["positive", "neutral", "negative"].map((s) => {
                  const count = summary?.sentimentBreakdown?.[s] || 0;
                  const total = summary?.totalConversations || 1;
                  const pct = Math.round((count / total) * 100);
                  const color = s === "positive" ? "bg-emerald-500" : s === "negative" ? "bg-red-500" : "bg-slate-300";
                  return (
                    <div key={s}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize text-ink/70">{s}</span>
                        <span className="text-ink/50">{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-black/5 overflow-hidden">
                        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card p-6">
              <h2 className="font-display font-semibold mb-4">Top customer intents</h2>
              {summary?.topIntents?.length ? (
                <ul className="space-y-2.5">
                  {summary.topIntents.map((i) => (
                    <li key={i.intent} className="flex justify-between text-sm">
                      <span className="capitalize text-ink/70">{i.intent.replace("_", " ")}</span>
                      <span className="font-semibold">{i.count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink/50">No conversations yet — share your embed code to get started.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
