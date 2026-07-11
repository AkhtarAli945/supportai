import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  BookOpen,
  Inbox,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  Bot,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/", label: "Overview", icon: LayoutGrid, end: true },
  { to: "/knowledge-base", label: "Knowledge Base", icon: BookOpen },
  { to: "/tickets", label: "Live Queue & Tickets", icon: Inbox },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings & Embed", icon: SettingsIcon },
];

export default function DashboardLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Mobile overlay - closes sidebar when tapped */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 shrink-0 bg-ink text-white flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="flex items-center justify-between gap-2 px-6 py-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Bot size={18} />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">SupportAI</span>
          </div>
          <button
            className="lg:hidden text-white/60 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={22} />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 pb-6 pt-3 border-t border-white/10">
          <div className="px-3 pb-3">
            <p className="text-sm font-semibold truncate">{user?.name}</p>
            <p className="text-xs text-white/50 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            <LogOut size={16} /> Log out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar with hamburger */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-ink text-white sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <span className="font-display font-bold text-base">SupportAI</span>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}