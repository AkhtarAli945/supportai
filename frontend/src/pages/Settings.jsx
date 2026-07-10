import React, { useEffect, useState } from "react";
import { Copy, Check, UserPlus } from "lucide-react";
import api from "../services/api";

export default function Settings() {
  const [workspace, setWorkspace] = useState(null);
  const [settings, setSettings] = useState(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [embed, setEmbed] = useState(null);
  const [copied, setCopied] = useState(false);
  const [agents, setAgents] = useState([]);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", password: "" });
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");

  useEffect(() => {
    api.get("/workspaces/me").then((res) => {
      setWorkspace(res.data);
      setSettings(res.data.settings);
      setName(res.data.name);
    });
    api.get("/workspaces/embed-code").then((res) => setEmbed(res.data));
    api.get("/workspaces/agents").then((res) => setAgents(res.data));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await api.put("/workspaces/me", { name, settings });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const copyEmbed = () => {
    navigator.clipboard.writeText(embed.snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteBusy(true);
    setInviteMsg("");
    try {
      const res = await api.post("/auth/invite-agent", inviteForm);
      setAgents((prev) => [...prev, res.data]);
      setInviteForm({ name: "", email: "", password: "" });
      setInviteMsg("Agent invited successfully.");
    } catch (err) {
      setInviteMsg(err.response?.data?.message || "Could not invite agent");
    } finally {
      setInviteBusy(false);
    }
  };

  if (!settings) return <p className="text-sm text-ink/50">Loading…</p>;

  return (
    <div>
      <h1 className="font-display font-bold text-2xl mb-1">Settings</h1>
      <p className="text-ink/60 mb-8">Configure your agent's behavior and get your embed code.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleSave} className="card p-6 space-y-4 h-fit">
          <h2 className="font-semibold mb-1">Agent configuration</h2>

          <div>
            <label className="label">Workspace name</label>
            <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label className="label">Agent name (shown to customers)</label>
            <input
              className="input-field"
              value={settings.agentName}
              onChange={(e) => setSettings({ ...settings, agentName: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Welcome message</label>
            <input
              className="input-field"
              value={settings.welcomeMessage}
              onChange={(e) => setSettings({ ...settings, welcomeMessage: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Agent personality / instructions</label>
            <textarea
              rows={3}
              className="input-field"
              value={settings.agentPersonality}
              onChange={(e) => setSettings({ ...settings, agentPersonality: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Brand color</label>
              <input
                type="color"
                className="w-full h-10 rounded-lg border border-black/10 cursor-pointer"
                value={settings.brandColor}
                onChange={(e) => setSettings({ ...settings, brandColor: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Escalation threshold</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                className="input-field"
                value={settings.escalationConfidenceThreshold}
                onChange={(e) =>
                  setSettings({ ...settings, escalationConfidenceThreshold: parseFloat(e.target.value) })
                }
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.escalateOnNegativeSentiment}
              onChange={(e) => setSettings({ ...settings, escalateOnNegativeSentiment: e.target.checked })}
            />
            Auto-escalate on angry / complaint messages
          </label>

          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
          </button>
        </form>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-semibold mb-1">Embed code</h2>
            <p className="text-sm text-ink/60 mb-4">
              Paste this snippet before the closing <code>&lt;/body&gt;</code> tag on your website.
            </p>
            {embed && (
              <div className="relative">
                <pre className="bg-ink text-white text-xs rounded-xl p-4 overflow-x-auto whitespace-pre-wrap break-all">
                  {embed.snippet}
                </pre>
                <button
                  onClick={copyEmbed}
                  className="absolute top-3 right-3 text-white/70 hover:text-white transition-colors"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            )}
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2 mb-1">
              <UserPlus size={18} className="text-accent" />
              <h2 className="font-semibold">Support agents</h2>
            </div>
            <p className="text-sm text-ink/60 mb-4">Invite teammates to handle escalated conversations.</p>

            <ul className="space-y-2 mb-4">
              {agents.map((a) => (
                <li key={a._id} className="flex justify-between text-sm px-3 py-2 rounded-lg bg-surface">
                  <span>{a.name}</span>
                  <span className="text-ink/40">{a.email}</span>
                </li>
              ))}
              {agents.length === 0 && <p className="text-sm text-ink/40">No agents invited yet.</p>}
            </ul>

            <form onSubmit={handleInvite} className="space-y-2">
              <input
                required
                placeholder="Name"
                className="input-field"
                value={inviteForm.name}
                onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
              />
              <input
                required
                type="email"
                placeholder="Email"
                className="input-field"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              />
              <input
                required
                type="password"
                minLength={6}
                placeholder="Temporary password"
                className="input-field"
                value={inviteForm.password}
                onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
              />
              <button type="submit" disabled={inviteBusy} className="btn-secondary w-full">
                {inviteBusy ? "Inviting…" : "Invite agent"}
              </button>
              {inviteMsg && <p className="text-xs text-ink/60">{inviteMsg}</p>}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
