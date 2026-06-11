import { useEffect, useMemo, useState, useCallback } from "react";
import {
  addPantryItem,
  buildShoppingList,
  deletePantryItem,
  getLowStock,
  getSuggestions,
  listPantry,
  listRecipes,
  listUnits,
  updatePantryItem,
} from "./api.js";
import { useAuth } from "./AuthContext.jsx";
import Filters from "./components/Filters.jsx";
import IngredientGrid from "./components/IngredientGrid.jsx";
import AddRecipeForm from "./components/AddRecipeForm.jsx";
import RecipeModal from "./components/RecipeModal.jsx";

/* ── Unit sort order ────────────────────────────────────────────────────────── */
const UNIT_ORDER = ['g','gr','kg','lb','oz','ml','l','cup','tbsp','tsp','piece','pinch'];
const sortUnits = (units) =>
  [...units].sort((a, b) => {
    const ai = UNIT_ORDER.indexOf(a.symbol?.toLowerCase());
    const bi = UNIT_ORDER.indexOf(b.symbol?.toLowerCase());
    if (ai === -1 && bi === -1) return a.name.localeCompare(b.name);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

/* ── Toast ─────────────────────────────────────────────────────────────────── */
function Toast({ toasts }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className={`px-5 py-2.5 rounded-full shadow-lg text-white text-sm font-medium transition-all ${t.type === "error" ? "bg-red-500" : "bg-slate-800"}`}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = "info") => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);
  return { toasts, toast: add };
}

/* ── Confirm Modal ──────────────────────────────────────────────────────────── */
function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
        <p className="text-slate-800 font-medium mb-5">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600">Remove</button>
        </div>
      </div>
    </div>
  );
}

/* ── Skeleton ───────────────────────────────────────────────────────────────── */
function Skeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-3xl overflow-hidden border border-slate-100">
          <div className="h-40 bg-slate-100" />
          <div className="p-5 space-y-2">
            <div className="h-4 bg-slate-100 rounded w-3/4" />
            <div className="h-3 bg-slate-100 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Auth Modal ─────────────────────────────────────────────────────────────── */
function AuthModal({ onClose }) {
  const { login, register } = useAuth();
  const [mode, setMode]     = useState("login"); // "login" | "register"
  const [form, setForm]     = useState({ username: "", email: "", password: "", password2: "" });
  const [error, setError]   = useState(null);
  const [busy, setBusy]     = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const tryDemo = async () => {
    setError(null);
    setBusy(true);
    try {
      await login("demo", "demo1234");
      onClose();
    } catch {
      setError("Demo account unavailable. Please try again shortly.");
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") {
        await login(form.username, form.password);
      } else {
        await register(form.username, form.email, form.password, form.password2);
      }
      onClose();
    } catch (err) {
      try {
        const body = JSON.parse(err.message.split(": ").slice(1).join(": "));
        const msgs = Object.values(body).flat();
        setError(msgs[0] || "Something went wrong.");
      } catch {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit}
        className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm space-y-4">
        <h2 className="text-2xl font-extrabold text-center">
          {mode === "login" ? "Welcome back 👋" : "Create account 🍳"}
        </h2>

        {error && <p className="bg-red-50 text-red-600 text-sm rounded-xl p-3">{error}</p>}

        <div className="space-y-3">
          <input required autoFocus value={form.username} onChange={(e) => set("username", e.target.value)}
            placeholder="Username" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none" />
          {mode === "register" && (
            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
              placeholder="Email (optional)" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none" />
          )}
          <input required type="password" value={form.password} onChange={(e) => set("password", e.target.value)}
            placeholder="Password" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none" />
          {mode === "register" && (
            <input required type="password" value={form.password2} onChange={(e) => set("password2", e.target.value)}
              placeholder="Confirm password" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none" />
          )}
        </div>

        <button type="submit" disabled={busy}
          className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all">
          {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
        </button>

        <div className="relative flex items-center gap-2">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400">or</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <button type="button" onClick={tryDemo} disabled={busy}
          className="w-full py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 disabled:opacity-50 transition-all">
          🎮 Try Demo Account
        </button>

        <p className="text-center text-sm text-slate-500">
          {mode === "login" ? "No account yet? " : "Already have an account? "}
          <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
            className="text-blue-600 font-medium hover:underline">
            {mode === "login" ? "Register" : "Log in"}
          </button>
        </p>
      </form>
    </div>
  );
}

/* ── Main App ───────────────────────────────────────────────────────────────── */
export default function App() {
  const [tab, setTab]           = useState("cook");
  const [selectedId, setSelectedId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAuth, setShowAuth] = useState(false);
  const refresh = () => setRefreshKey((k) => k + 1);
  const { toasts, toast } = useToast();
  const { user, logout } = useAuth();

  const goKitchen = () => {
    if (!user) { setShowAuth(true); return; }
    setTab("kitchen");
  };

  const goAdd = () => {
    if (!user) { setShowAuth(true); return; }
    setTab("add");
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200 p-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center flex-wrap gap-3">
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            🍳 CookSimple
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex bg-slate-100 rounded-full p-1 border border-slate-200">
              {[["cook","Cook"],["kitchen","Kitchen"],["recipes","Recipes"]].map(([t, label]) => (
                <button key={t}
                  onClick={() => t === "kitchen" ? goKitchen() : setTab(t)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${tab === t ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700"}`}>
                  {label}
                </button>
              ))}
              <button onClick={goAdd}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${tab === "add" ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700"}`}>
                + Add
              </button>
            </div>
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 font-medium">👤 {user.username}</span>
                <button onClick={async () => { await logout(); setTab("cook"); toast("Logged out."); }}
                  className="text-xs text-slate-400 hover:text-red-500 px-2 py-1 rounded-lg hover:bg-red-50">
                  Log out
                </button>
              </div>
            ) : (
              <button onClick={() => setShowAuth(true)}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-full hover:bg-blue-700">
                Log in
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        {tab === "cook"    && <CookTab onOpenRecipe={setSelectedId} refreshKey={refreshKey} onGoKitchen={goKitchen} toast={toast} />}
        {tab === "kitchen" && (user
          ? <KitchenTab refreshKey={refreshKey} onChanged={refresh} toast={toast} />
          : <div className="text-center py-24 text-slate-500">
              <p className="text-4xl mb-4">🔒</p>
              <p className="text-lg font-medium mb-2">Your kitchen is private</p>
              <p className="text-sm mb-6">Log in to manage your pantry and get personalized recipe suggestions.</p>
              <button onClick={() => setShowAuth(true)} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700">Log in or Register</button>
            </div>
        )}
        {tab === "recipes" && <RecipesTab onOpenRecipe={setSelectedId} refreshKey={refreshKey} />}
        {tab === "add"     && (user
          ? <AddRecipeForm onCreated={() => { refresh(); setTab("recipes"); toast("Recipe added!"); }} />
          : <div className="text-center py-24 text-slate-500">
              <p className="text-4xl mb-4">🔒</p>
              <p className="text-sm mb-6">Log in to add your own recipes.</p>
              <button onClick={() => setShowAuth(true)} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700">Log in or Register</button>
            </div>
        )}
      </main>

      <footer className="border-t border-slate-200 mt-12 py-6 text-center text-sm text-slate-400">
        Built by{" "}
        <a href="https://github.com/FatemaAlhosein" target="_blank" className="text-blue-500 hover:underline font-medium">Fatema Alhosein</a>
        {" "}· Django REST Framework + React
      </footer>

      <RecipeModal recipeId={selectedId} onClose={() => setSelectedId(null)} onChanged={refresh} />
      <Toast toasts={toasts} />
    </div>
  );
}

/* ── Cook Tab ───────────────────────────────────────────────────────────────── */
function CookTab({ onOpenRecipe, refreshKey, onGoKitchen, toast }) {
  const [filters, setFilters] = useState({ only_makeable: false });
  const [results, setResults] = useState([]);
  const [error, setError]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked]   = useState(new Set());
  const [shopping, setShopping] = useState(null);
  const [hasPantry, setHasPantry] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([getSuggestions(filters), listPantry()])
      .then(([suggestions, pantry]) => {
        setResults(suggestions);
        setHasPantry((pantry.results || pantry).length > 0);
      })
      .catch((e) => {
        if (e.message.includes("401")) {
          setError("Please log in to see recipe suggestions.");
        } else if (e.message.includes("Failed to fetch")) {
          setError("Could not connect to the server. Please try again.");
        } else {
          setError(e.message);
        }
      })
      .finally(() => setLoading(false));
  }, [JSON.stringify(filters), refreshKey]);

  const togglePick = (id) => {
    const next = new Set(picked);
    next.has(id) ? next.delete(id) : next.add(id);
    setPicked(next);
  };

  const onBuildList = async () => {
    if (picked.size === 0) return;
    try { setShopping(await buildShoppingList([...picked])); }
    catch (e) { setError(e.message); }
  };

  const copyList = () => {
    if (!shopping) return;
    const text = shopping.map((it) => `${it.ingredient}: ${parseFloat(it.quantity) || ""} ${it.unit}`.trim()).join("\n");
    navigator.clipboard.writeText(text).then(() => toast("Shopping list copied!"));
  };

  const makeable = useMemo(() => results.filter((r) => r.match_ratio === 1), [results]);
  const partial  = useMemo(() => results.filter((r) => r.match_ratio < 1),  [results]);

  if (loading) return <Skeleton />;

  if (!hasPantry) return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4">🥫</div>
      <h2 className="text-2xl font-bold mb-2">Your kitchen is empty</h2>
      <p className="text-slate-500 mb-6">Add ingredients to get recipe suggestions based on what you have.</p>
      <button onClick={onGoKitchen} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700">Go to Kitchen →</button>
    </div>
  );

  return (
    <div className="space-y-6">
      <Filters value={filters} onChange={setFilters} />
      {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg">{error}</div>}
      {makeable.length > 0 && <section><h2 className="text-lg font-bold mb-3">Ready to cook ({makeable.length})</h2><ResultGrid list={makeable} picked={picked} togglePick={togglePick} onOpen={onOpenRecipe} /></section>}
      {partial.length  > 0 && <section><h2 className="text-lg font-bold mb-3 mt-6">Almost there ({partial.length})</h2><ResultGrid list={partial} picked={picked} togglePick={togglePick} onOpen={onOpenRecipe} /></section>}
      {results.length  === 0 && <div className="text-center text-slate-500 py-16">No matches. Add more items to your kitchen or relax the filters.</div>}
      {picked.size > 0 && (
        <div className="sticky bottom-4 bg-white rounded-2xl border border-slate-100 shadow-lg p-4 space-y-3">
          <div className="flex items-center gap-3">
            <strong>{picked.size} selected</strong>
            <div className="flex-1" />
            <button onClick={onBuildList} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700">Build shopping list</button>
            <button onClick={() => { setPicked(new Set()); setShopping(null); }} className="text-slate-500 px-3 py-2 rounded-xl hover:bg-slate-100">Clear</button>
          </div>
          {shopping && <ShoppingList items={shopping} onCopy={copyList} />}
        </div>
      )}
    </div>
  );
}

function ResultGrid({ list, picked, togglePick, onOpen }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {list.map((r) => (
        <div key={r.id} className="group bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
          <div className="h-40 bg-slate-100 relative flex items-center justify-center text-4xl"
            style={r.image || r.image_url ? { backgroundImage: `url(${r.image || r.image_url})`, backgroundSize:"cover", backgroundPosition:"center" } : undefined}>
            {!r.image && !r.image_url && <span>🍽️</span>}
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-blue-600 border border-blue-100">{Math.round(r.match_ratio * 100)}% Match</div>
            <label onClick={(e) => e.stopPropagation()} className="absolute top-4 left-4 bg-white/90 backdrop-blur px-2 py-1 rounded-full flex items-center gap-1 text-xs text-slate-700 border border-slate-200 cursor-pointer">
              <input type="checkbox" checked={picked.has(r.id)} onChange={() => togglePick(r.id)} /> shop
            </label>
          </div>
          <div onClick={() => onOpen(r.id)} className="p-5 cursor-pointer space-y-2">
            <h3 className="text-xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{r.name}</h3>
            <div className="flex flex-wrap gap-1 text-xs">
              {r.cuisine !== "any" && <span className="bg-slate-100 px-2 py-1 rounded-full">{r.cuisine}</span>}
              <span className="bg-slate-100 px-2 py-1 rounded-full">{r.total_time_minutes} min</span>
              {r.is_vegetarian && !r.is_vegan && <span className="bg-green-50 text-green-700 px-2 py-1 rounded-full">vegetarian</span>}
              {r.is_vegan && <span className="bg-green-50 text-green-700 px-2 py-1 rounded-full">vegan</span>}
              {r.is_gluten_free && <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded-full">GF</span>}
            </div>
            <div className="bg-slate-100 rounded-full h-1.5 overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${r.match_ratio * 100}%` }} /></div>
            {r.missing && r.missing.length > 0 && <p className="text-xs text-red-600">Missing: {r.missing.join(", ")}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function ShoppingList({ items, onCopy }) {
  if (items.length === 0) return <p className="text-sm text-slate-500">You already have everything!</p>;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-sm uppercase tracking-wide text-slate-500">Shopping list</h3>
        <button onClick={onCopy} className="text-xs text-blue-600 hover:underline font-medium">Copy list</button>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-xs uppercase text-slate-400"><th className="py-1">Ingredient</th><th>Qty</th><th>Unit</th><th>For</th></tr></thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i} className="border-t border-slate-100">
              <td className="py-2">{it.ingredient}</td>
              <td>{parseFloat(it.quantity) || ""}</td>
              <td>{it.unit}</td>
              <td className="text-slate-500">{it.recipes.join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Kitchen Tab ────────────────────────────────────────────────────────────── */
const LOCATIONS = [
  { key: "pantry",  label: "Pantry",  icon: "🥫", hint: "Dry goods, oils, spices, canned" },
  { key: "fridge",  label: "Fridge",  icon: "🧊", hint: "Dairy, eggs, fresh produce, leftovers" },
  { key: "freezer", label: "Freezer", icon: "❄️", hint: "Frozen meats, frozen veg, ice cream" },
];

function KitchenTab({ refreshKey, onChanged, toast }) {
  const [items, setItems]         = useState([]);
  const [units, setUnits]         = useState([]);
  const [lowStock, setLowStock]   = useState([]);
  const [error, setError]         = useState(null);
  const [confirm, setConfirm]     = useState(null);
  const [form, setForm]           = useState({ ingredient_input: "", quantity: 1, unit_id: "", location: "pantry" });

  const load = () => {
    listPantry().then((d) => setItems(d.results || d)).catch((e) => setError(e.message));
    getLowStock().then((d) => setLowStock(d.results || d)).catch(() => {});
  };

  useEffect(() => {
    load();
    listUnits().then((d) => {
      const u = sortUnits(d.results || d);
      setUnits(u);
      if (u.length) setForm((f) => ({ ...f, unit_id: String(u[0].id) }));
    });
  }, [refreshKey]);

  const onAdd = async (e) => {
    e.preventDefault(); setError(null);
    const selectedUnit = units.find((u) => String(u.id) === form.unit_id);
    try {
      await addPantryItem({
        ingredient_input: form.ingredient_input.trim().toLowerCase(),
        quantity: Number(form.quantity) || 0,
        unit_input: selectedUnit?.symbol || selectedUnit?.name || "",
        location: form.location,
      });
      setForm((f) => ({ ...f, ingredient_input: "", quantity: 1 }));
      load(); onChanged?.(); toast(`${form.ingredient_input} added!`);
    } catch (e) {
      setError(e.message.includes("400") ? "That ingredient is already in your kitchen. Edit it below." : e.message);
    }
  };

  const doRemove = async () => {
    await deletePantryItem(confirm.id);
    toast(`${confirm.ingredient_name} removed.`);
    setConfirm(null); load(); onChanged?.();
  };

  const grouped = useMemo(() => {
    const buckets = { pantry: [], fridge: [], freezer: [] };
    for (const it of items) (buckets[it.location || "pantry"] || buckets.pantry).push(it);
    return buckets;
  }, [items]);

  return (
    <div className="space-y-6">
      {confirm && <ConfirmModal message={`Remove ${confirm.ingredient_name} from your kitchen?`} onConfirm={doRemove} onCancel={() => setConfirm(null)} />}

      {/* Low-stock alert banner */}
      {lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">⚠️</span>
            <h3 className="font-bold text-amber-800">
              {lowStock.length} item{lowStock.length > 1 ? "s" : ""} running low
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStock.map((it) => (
              <span key={it.id} className="bg-amber-100 text-amber-800 text-sm px-3 py-1 rounded-full flex items-center gap-1">
                <span className="font-medium">{it.ingredient_name}</span>
                <span className="text-amber-600 text-xs">
                  {parseFloat(it.quantity)} / {parseFloat(it.min_quantity)} {it.unit_symbol}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Drag-and-drop ingredient grid */}
      <IngredientGrid onAdded={() => { load(); onChanged?.(); }} toast={toast} />

      {/* Manual add form */}
      <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
        <h2 className="text-2xl font-bold mb-1">Your Kitchen</h2>
        <p className="text-slate-500 mb-6 text-sm">Or type an ingredient manually below.</p>
        {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg mb-4">{error}</div>}
        <form onSubmit={onAdd} className="grid grid-cols-1 md:grid-cols-12 gap-2 mb-6">
          <input required value={form.ingredient_input} onChange={(e) => setForm({ ...form, ingredient_input: e.target.value })} placeholder="Ingredient (e.g. milk)" className="md:col-span-3 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none" />
          <input type="number" step="0.1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="Qty" className="md:col-span-2 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none" />
          <select value={form.unit_id} onChange={(e) => setForm({ ...form, unit_id: e.target.value })} className="md:col-span-3 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none">
            {units.map((u) => <option key={u.id} value={u.id}>{u.symbol} — {u.name}</option>)}
          </select>
          <select value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="md:col-span-2 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none">
            {LOCATIONS.map((l) => <option key={l.key} value={l.key}>{l.icon} {l.label}</option>)}
          </select>
          <button className="md:col-span-2 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold" type="submit">Add</button>
        </form>
        {items.length === 0 ? (
          <div className="text-center text-slate-500 py-8">Kitchen is empty. Drag an ingredient above or type one here.</div>
        ) : (
          <div className="space-y-6">
            {LOCATIONS.map((loc) => (
              <KitchenSection key={loc.key} location={loc} items={grouped[loc.key] || []} onRemove={setConfirm} onSaved={(name) => { load(); onChanged?.(); toast(`${name} updated!`); }} units={units} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KitchenSection({ location, items, onRemove, onSaved, units }) {
  return (
    <section>
      <div className="flex items-baseline gap-2 mb-2">
        <h3 className="text-lg font-bold">{location.icon} {location.label}<span className="text-slate-400 text-sm font-normal ml-2">({items.length})</span></h3>
        <span className="text-xs text-slate-400">{location.hint}</span>
      </div>
      {items.length === 0 ? <p className="text-sm text-slate-400 italic pl-7">Nothing here yet.</p> : (
        <ul className="divide-y divide-slate-100 bg-slate-50/50 rounded-xl px-4">
          {items.map((it) => <KitchenRow key={it.id} item={it} onRemove={onRemove} onSaved={onSaved} units={units} />)}
        </ul>
      )}
    </section>
  );
}

function KitchenRow({ item, onRemove, onSaved, units }) {
  const [qty, setQty]       = useState(item.quantity != null ? parseFloat(item.quantity) : "");
  const [minQty, setMinQty] = useState(item.min_quantity != null ? parseFloat(item.min_quantity) : "");
  const [unitId, setUnitId] = useState(() => {
    const match = units.find((u) => u.name === item.unit_name || u.symbol === item.unit_symbol);
    return match ? String(match.id) : (units[0] ? String(units[0].id) : "");
  });
  const [loc, setLoc]       = useState(item.location || "pantry");
  const [showAlert, setShowAlert] = useState(false);
  const [dirty, setDirty]   = useState(false);
  const [saving, setSaving] = useState(false);

  const isLow = item.is_low_stock;

  const save = async () => {
    setSaving(true);
    const selectedUnit = units.find((u) => String(u.id) === unitId);
    await updatePantryItem(item.id, {
      ingredient: item.ingredient,
      quantity: Number(qty) || 0,
      unit_input: selectedUnit?.symbol || selectedUnit?.name || "",
      location: loc,
      min_quantity: minQty !== "" ? Number(minQty) : null,
    });
    setSaving(false); setDirty(false); setShowAlert(false); onSaved?.(item.ingredient_name);
  };

  return (
    <li className={`py-3 border-t border-slate-100 ${isLow ? "bg-amber-50/50" : ""}`}>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="font-medium flex-1 min-w-[140px] flex items-center gap-1">
          {isLow && <span title="Low stock">⚠️</span>}
          {item.ingredient_name}
        </span>
        <input type="number" step="0.1" value={qty}
          onChange={(e) => { setQty(e.target.value); setDirty(true); }}
          className="w-20 p-2 border border-slate-200 rounded-lg bg-white" />
        <select value={unitId} onChange={(e) => { setUnitId(e.target.value); setDirty(true); }}
          className="p-2 border border-slate-200 rounded-lg bg-white text-sm">
          {units.map((u) => <option key={u.id} value={u.id}>{u.symbol} — {u.name}</option>)}
        </select>
        <select value={loc} onChange={(e) => { setLoc(e.target.value); setDirty(true); }}
          className="p-2 border border-slate-200 rounded-lg bg-white text-sm">
          {LOCATIONS.map((l) => <option key={l.key} value={l.key}>{l.icon} {l.label}</option>)}
        </select>
        <button onClick={() => setShowAlert((v) => !v)}
          className={`text-xs px-2 py-1 rounded-lg border transition-all ${showAlert ? "bg-amber-100 border-amber-300 text-amber-700" : "border-slate-200 text-slate-400 hover:text-amber-600 hover:border-amber-300"}`}
          title="Set low-stock alert">
          🔔 {item.min_quantity != null ? `alert ≤ ${parseFloat(item.min_quantity)}` : "Set alert"}
        </button>
        {dirty && (
          <button onClick={save} disabled={saving}
            className="text-blue-600 font-medium hover:bg-blue-50 px-3 py-1 rounded-lg">
            {saving ? "…" : "Save"}
          </button>
        )}
        <button onClick={() => onRemove(item)} className="text-red-500 hover:bg-red-50 px-3 py-1 rounded-lg">Remove</button>
      </div>

      {/* Alert threshold panel */}
      {showAlert && (
        <div className="mt-2 ml-2 flex items-center gap-3 flex-wrap bg-amber-50 rounded-xl p-3 border border-amber-100">
          <span className="text-xs text-amber-700 font-medium">Stock alert</span>
          <label className="flex items-center gap-1 text-xs text-slate-600">
            Alert below
            <input type="number" step="0.1" value={minQty}
              placeholder="min"
              onChange={(e) => { setMinQty(e.target.value); setDirty(true); }}
              className="w-16 p-1.5 border border-amber-200 rounded-lg bg-white ml-1" />
          </label>
          <span className="text-xs text-slate-400">(same unit as above)</span>
        </div>
      )}
    </li>
  );
}

/* ── Recipes Tab ────────────────────────────────────────────────────────────── */
function RecipesTab({ onOpenRecipe, refreshKey }) {
  const { user } = useAuth();
  const [recipes, setRecipes]   = useState([]);
  const [filters, setFilters]   = useState({});
  const [search, setSearch]     = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [deleting, setDeleting] = useState(null);
  const refresh = () => setRefreshKey?.((k) => k + 1);

  useEffect(() => {
    setLoading(true); setError(null);
    const params = {};
    if (filters.cuisine) params.cuisine = filters.cuisine;
    if (filters.diet)    params.diet    = filters.diet;
    if (search)          params.search  = search;
    if (mineOnly)        params.mine    = "1";
    listRecipes(params).then((d) => setRecipes(d.results || d)).catch((e) => {
      if (e.message.includes("Failed to fetch")) setError("Could not connect to the server. Please try again.");
      else setError(e.message);
    }).finally(() => setLoading(false));
  }, [JSON.stringify(filters), search, mineOnly, refreshKey]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm("Delete this recipe?")) return;
    setDeleting(id);
    try {
      const { deleteRecipe } = await import("./api.js");
      await deleteRecipe(id);
      setRecipes((rs) => rs.filter((r) => r.id !== id));
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search recipes..."
          className="flex-1 p-4 rounded-2xl border-0 bg-white shadow-md ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 outline-none min-w-0" />
        {user && (
          <button onClick={() => setMineOnly((v) => !v)}
            className={`px-4 py-2 rounded-2xl text-sm font-medium border transition-all ${mineOnly ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"}`}>
            My recipes
          </button>
        )}
      </div>
      <Filters value={filters} onChange={setFilters} showOnlyMakeable={false} />
      {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg">{error}</div>}
      {loading ? <Skeleton /> : recipes.length === 0 ? (
        <div className="text-center text-slate-500 py-16">No recipes found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recipes.map((r) => (
            <div key={r.id} className="relative group bg-white rounded-2xl border border-slate-100 hover:shadow-lg hover:-translate-y-0.5 transition-all overflow-hidden flex">
              <button onClick={() => onOpenRecipe(r.id)} className="flex flex-1 text-left min-w-0">
                <div className="w-24 h-24 flex-none bg-slate-100 flex items-center justify-center text-2xl"
                  style={r.image || r.image_url ? { backgroundImage: `url(${r.image || r.image_url})`, backgroundSize:"cover", backgroundPosition:"center" } : undefined}>
                  {!r.image && !r.image_url && "🍽️"}
                </div>
                <div className="p-4 flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <h3 className="font-bold text-slate-800 mb-1 truncate flex-1">{r.name}</h3>
                    {r.is_owner && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full flex-none">mine</span>}
                  </div>
                  <p className="text-xs text-slate-500 mb-1">{r.cuisine !== "any" && `${r.cuisine} • `}{r.total_time_minutes} min • serves {r.servings}</p>
                  <div className="flex flex-wrap gap-1 mb-1">
                    {r.is_vegetarian && !r.is_vegan && <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">vegetarian</span>}
                    {r.is_vegan && <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">vegan</span>}
                    {r.is_gluten_free && <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">GF</span>}
                  </div>
                  {r.description && <p className="text-sm text-slate-600 line-clamp-2">{r.description}</p>}
                </div>
              </button>
              {r.is_owner && (
                <button
                  onClick={(e) => handleDelete(e, r.id)}
                  disabled={deleting === r.id}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-50 text-red-500 hover:bg-red-100 text-xs px-2 py-1 rounded-lg"
                >
                  {deleting === r.id ? "…" : "Delete"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
