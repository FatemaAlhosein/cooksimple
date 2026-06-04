import { useEffect, useRef, useState } from "react";

const API_BASE = "http://127.0.0.1:8000/api";

export default function IngredientAutocomplete({ value, onChange, placeholder = "ingredient" }) {
  const [query, setQuery]       = useState(value || "");
  const [results, setResults]   = useState([]);
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const debounceRef             = useRef(null);
  const wrapperRef              = useRef(null);

  // Sync if parent resets value
  useEffect(() => { setQuery(value || ""); }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = (q) => {
    clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("cs_token");
        const res = await fetch(
          `${API_BASE}/ingredients/?search=${encodeURIComponent(q)}&limit=8`,
          token ? { headers: { Authorization: `Token ${token}` } } : {}
        );
        const data = await res.json();
        setResults(data.results || data);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  };

  const select = (name) => {
    setQuery(name);
    onChange(name);
    setOpen(false);
  };

  const handleChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    onChange(v);
    search(v);
  };

  // Check if typed value exactly matches any result
  const exactMatch = results.some(
    (r) => r.name.toLowerCase() === query.trim().toLowerCase()
  );
  const showAddOption = query.trim().length > 1 && !exactMatch;

  return (
    <div ref={wrapperRef} className="relative">
      <input
        value={query}
        onChange={handleChange}
        onFocus={() => query.trim() && setOpen(true)}
        placeholder={placeholder}
        className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none"
        autoComplete="off"
      />

      {open && (results.length > 0 || showAddOption) && (
        <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onMouseDown={() => select(r.name)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 capitalize"
              >
                {r.name}
              </button>
            </li>
          ))}
          {showAddOption && (
            <li>
              <button
                type="button"
                onMouseDown={() => select(query.trim().toLowerCase())}
                className="w-full text-left px-3 py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 border-t border-slate-100"
              >
                + Add "{query.trim()}"
              </button>
            </li>
          )}
          {loading && (
            <li className="px-3 py-2 text-xs text-slate-400">Searching…</li>
          )}
        </ul>
      )}
    </div>
  );
}
