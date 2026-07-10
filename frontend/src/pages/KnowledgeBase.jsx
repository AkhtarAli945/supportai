import React, { useEffect, useRef, useState } from "react";
import { UploadCloud, Link2, Trash2, FileText, Globe } from "lucide-react";
import api from "../services/api";

const statusStyles = {
  processing: "bg-amber-100 text-amber-700",
  ready: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
};

export default function KnowledgeBase() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef(null);

  const loadDocs = () => {
    api
      .get("/kb")
      .then((res) => setDocs(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDocs();
    const interval = setInterval(loadDocs, 4000); // poll for processing status
    return () => clearInterval(interval);
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBusy(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      await api.post("/kb/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
      loadDocs();
    } catch (err) {
      alert(err.response?.data?.message || "Upload failed");
    } finally {
      setBusy(false);
      fileInputRef.current.value = "";
    }
  };

  const handleUrlIngest = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setBusy(true);
    try {
      await api.post("/kb/url", { url });
      setUrl("");
      loadDocs();
    } catch (err) {
      alert(err.response?.data?.message || "Could not fetch URL");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this document from the knowledge base?")) return;
    await api.delete(`/kb/${id}`);
    loadDocs();
  };

  return (
    <div>
      <h1 className="font-display font-bold text-2xl mb-1">Knowledge base</h1>
      <p className="text-ink/60 mb-8">
        Upload docs or link a page — your AI agent retrieves from these automatically when answering customers.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-3">
            <UploadCloud size={18} className="text-accent" />
            <h2 className="font-semibold">Upload a file</h2>
          </div>
          <p className="text-sm text-ink/60 mb-4">PDF or plain text (.txt), up to 15MB.</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt"
            onChange={handleFileUpload}
            disabled={busy}
            className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-accent-light file:text-accent file:font-semibold hover:file:bg-accent/20 cursor-pointer"
          />
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-3">
            <Link2 size={18} className="text-accent" />
            <h2 className="font-semibold">Ingest a URL</h2>
          </div>
          <p className="text-sm text-ink/60 mb-4">We'll crawl and index a support/FAQ page.</p>
          <form onSubmit={handleUrlIngest} className="flex gap-2">
            <input
              type="url"
              required
              placeholder="https://yoursite.com/faq"
              className="input-field"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button type="submit" disabled={busy} className="btn-primary shrink-0">
              Add
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-black/5">
          <h2 className="font-semibold">Indexed documents ({docs.length})</h2>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-ink/50">Loading…</p>
        ) : docs.length === 0 ? (
          <p className="p-6 text-sm text-ink/50">No documents yet. Upload one above to get started.</p>
        ) : (
          <ul className="divide-y divide-black/5">
            {docs.map((doc) => (
              <li key={doc._id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {doc.sourceType === "url" ? (
                    <Globe size={18} className="text-ink/40 shrink-0" />
                  ) : (
                    <FileText size={18} className="text-ink/40 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate max-w-xs">{doc.filename}</p>
                    <p className="text-xs text-ink/40">{doc.chunks?.length || 0} chunks indexed</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusStyles[doc.status]}`}>
                    {doc.status}
                  </span>
                  <button onClick={() => handleDelete(doc._id)} className="text-ink/40 hover:text-red-600 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
