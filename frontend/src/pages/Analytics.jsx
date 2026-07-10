import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import api from "../services/api";

const SENTIMENT_COLORS = { positive: "#10B981", neutral: "#CBD5E1", negative: "#EF4444" };

export default function Analytics() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api.get("/analytics/summary").then((res) => setSummary(res.data));
  }, []);

  if (!summary) return <p className="text-sm text-ink/50">Loading analytics…</p>;

  const sentimentData = Object.entries(summary.sentimentBreakdown || {}).map(([name, value]) => ({ name, value }));
  const intentData = (summary.topIntents || []).map((i) => ({ name: i.intent.replace("_", " "), count: i.count }));

  return (
    <div>
      <h1 className="font-display font-bold text-2xl mb-1">Analytics</h1>
      <p className="text-ink/60 mb-8">Understand how customers are interacting with your AI agent.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-6">
          <h2 className="font-semibold mb-4">Sentiment breakdown</h2>
          {sentimentData.length === 0 ? (
            <p className="text-sm text-ink/50">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={sentimentData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {sentimentData.map((entry) => (
                    <Cell key={entry.name} fill={SENTIMENT_COLORS[entry.name] || "#CBD5E1"} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-6">
          <h2 className="font-semibold mb-4">Top FAQ / intent topics</h2>
          {intentData.length === 0 ? (
            <p className="text-sm text-ink/50">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={intentData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEEEF5" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#5B4FE9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-2xl font-display font-bold">{summary.totalConversations}</p>
          <p className="text-sm text-ink/60">Total conversations</p>
        </div>
        <div className="card p-5">
          <p className="text-2xl font-display font-bold">{summary.aiDeflectionRate}%</p>
          <p className="text-sm text-ink/60">Handled by AI (no human needed)</p>
        </div>
        <div className="card p-5">
          <p className="text-2xl font-display font-bold">{summary.resolutionRate}%</p>
          <p className="text-sm text-ink/60">Ticket resolution rate</p>
        </div>
      </div>
    </div>
  );
}
