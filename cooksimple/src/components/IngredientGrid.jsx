import { useEffect, useRef, useState } from "react";
import { listUnits, addPantryItem, listPantry } from "../api.js";

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

/* ── Common ingredients with emoji icons ───────────────────────────────────── */
// col: which drop-zone column this ingredient naturally belongs to
const INGREDIENT_ICONS = [
  // Pantry column — dry goods, grains, oils, spices, canned items, root veg
  { name: "tomato",              emoji: "🍅", category: "Produce", col: "pantry" },
  { name: "cherry tomato",       emoji: "🍒", category: "Produce", col: "pantry" },
  { name: "roma tomato",         emoji: "🔴", category: "Produce", col: "pantry" },
  { name: "onion",               emoji: "🧅", category: "Produce", col: "pantry" },
  { name: "red onion",           emoji: "💜", category: "Produce", col: "pantry" },
  { name: "garlic",              emoji: "🧄", category: "Produce", col: "pantry" },
  { name: "potato",              emoji: "🥔", category: "Produce", col: "pantry" },
  { name: "sweet potato",        emoji: "🟠", category: "Produce", col: "pantry" },
  { name: "corn",                emoji: "🌽", category: "Produce", col: "pantry" },
  { name: "eggplant",            emoji: "🍆", category: "Produce", col: "pantry" },
  { name: "rice",                emoji: "🍚", category: "Pantry",  col: "pantry" },
  { name: "pasta",               emoji: "🍝", category: "Pantry",  col: "pantry" },
  { name: "bread",               emoji: "🍞", category: "Pantry",  col: "pantry" },
  { name: "olive oil",           emoji: "🫒", category: "Pantry",  col: "pantry" },
  { name: "vegetable oil",       emoji: "🫙", category: "Pantry",  col: "pantry" },
  { name: "flour",               emoji: "🌾", category: "Pantry",  col: "pantry" },
  { name: "sugar",               emoji: "🍬", category: "Pantry",  col: "pantry" },
  { name: "salt",                emoji: "🧂", category: "Pantry",  col: "pantry" },
  { name: "black pepper",        emoji: "🖤", category: "Pantry",  col: "pantry" },
  { name: "cumin",               emoji: "🌰", category: "Pantry",  col: "pantry" },
  { name: "paprika",             emoji: "🟥", category: "Pantry",  col: "pantry" },
  { name: "soy sauce",           emoji: "🍾", category: "Pantry",  col: "pantry" },
  { name: "tomato paste",        emoji: "🥫", category: "Pantry",  col: "pantry" },
  { name: "coconut milk",        emoji: "🥥", category: "Pantry",  col: "pantry" },
  { name: "honey",               emoji: "🍯", category: "Pantry",  col: "pantry" },
  { name: "oats",                emoji: "🌻", category: "Pantry",  col: "pantry" },
  { name: "breadcrumbs",         emoji: "🍘", category: "Pantry",  col: "pantry" },
  { name: "chickpeas",           emoji: "🟡", category: "Protein", col: "pantry" },
  { name: "lentils",             emoji: "🟫", category: "Protein", col: "pantry" },
  { name: "black beans",         emoji: "⚫", category: "Protein", col: "pantry" },

  // Fridge column — fresh produce, dairy, herbs
  { name: "green onion",         emoji: "🌱", category: "Produce", col: "fridge" },
  { name: "carrot",              emoji: "🥕", category: "Produce", col: "fridge" },
  { name: "broccoli",            emoji: "🥦", category: "Produce", col: "fridge" },
  { name: "cauliflower",         emoji: "🌼", category: "Produce", col: "fridge" },
  { name: "spinach",             emoji: "💚", category: "Produce", col: "fridge" },
  { name: "kale",                emoji: "🌿", category: "Produce", col: "fridge" },
  { name: "romaine lettuce",     emoji: "🥗", category: "Produce", col: "fridge" },
  { name: "celery",              emoji: "🪴", category: "Produce", col: "fridge" },
  { name: "zucchini",            emoji: "🟢", category: "Produce", col: "fridge" },
  { name: "cucumber",            emoji: "🥒", category: "Produce", col: "fridge" },
  { name: "lemon",               emoji: "🍋", category: "Produce", col: "fridge" },
  { name: "lime",                emoji: "🍈", category: "Produce", col: "fridge" },
  { name: "avocado",             emoji: "🥑", category: "Produce", col: "fridge" },
  { name: "white mushroom",      emoji: "🍄", category: "Produce", col: "fridge" },
  { name: "cremini mushroom",    emoji: "🟤", category: "Produce", col: "fridge" },
  { name: "portobello mushroom", emoji: "🪨", category: "Produce", col: "fridge" },
  { name: "shiitake mushroom",   emoji: "🎋", category: "Produce", col: "fridge" },
  { name: "bell pepper",         emoji: "🫑", category: "Produce", col: "fridge" },
  { name: "jalapeño",            emoji: "🌶️", category: "Produce", col: "fridge" },
  { name: "peas",                emoji: "🫘", category: "Produce", col: "fridge" },
  { name: "ginger",              emoji: "🫛", category: "Produce", col: "fridge" },
  { name: "milk",                emoji: "🥛", category: "Dairy",   col: "fridge" },
  { name: "butter",              emoji: "🧈", category: "Dairy",   col: "fridge" },
  { name: "cheddar cheese",      emoji: "🧀", category: "Dairy",   col: "fridge" },
  { name: "mozzarella",          emoji: "🪡", category: "Dairy",   col: "fridge" },
  { name: "parmesan",            emoji: "🟨", category: "Dairy",   col: "fridge" },
  { name: "feta cheese",         emoji: "🔲", category: "Dairy",   col: "fridge" },
  { name: "yogurt",              emoji: "🍶", category: "Dairy",   col: "fridge" },
  { name: "heavy cream",         emoji: "🫗", category: "Dairy",   col: "fridge" },
  { name: "sour cream",          emoji: "🥣", category: "Dairy",   col: "fridge" },
  { name: "egg",                 emoji: "🥚", category: "Protein", col: "fridge" },
  { name: "apple",               emoji: "🍎", category: "Fruit",   col: "fridge" },
  { name: "banana",              emoji: "🍌", category: "Fruit",   col: "fridge" },
  { name: "strawberry",          emoji: "🍓", category: "Fruit",   col: "fridge" },
  { name: "blueberry",           emoji: "🫐", category: "Fruit",   col: "fridge" },
  { name: "mango",               emoji: "🥭", category: "Fruit",   col: "fridge" },
  { name: "orange",              emoji: "🍊", category: "Fruit",   col: "fridge" },
  { name: "grapes",              emoji: "🍇", category: "Fruit",   col: "fridge" },
  { name: "peach",               emoji: "🍑", category: "Fruit",   col: "fridge" },

  // Freezer column — meat, fish, frozen fruit
  { name: "chicken",             emoji: "🍗", category: "Protein", col: "freezer" },
  { name: "chicken breast",      emoji: "🐓", category: "Protein", col: "freezer" },
  { name: "beef",                emoji: "🥩", category: "Protein", col: "freezer" },
  { name: "ground beef",         emoji: "🫕", category: "Protein", col: "freezer" },
  { name: "lamb",                emoji: "🐑", category: "Protein", col: "freezer" },
  { name: "salmon",              emoji: "🐟", category: "Protein", col: "freezer" },
  { name: "tuna",                emoji: "🐠", category: "Protein", col: "freezer" },
  { name: "shrimp",              emoji: "🍤", category: "Protein", col: "freezer" },
  { name: "tofu",                emoji: "⬜", category: "Protein", col: "freezer" },
  { name: "watermelon",          emoji: "🍉", category: "Fruit",   col: "freezer" },
  { name: "pineapple",           emoji: "🍍", category: "Fruit",   col: "freezer" },
];

const CATEGORIES = ["All", "Produce", "Protein", "Dairy", "Pantry", "Fruit"];

const LOCATIONS = [
  { key: "pantry",  label: "Pantry",  icon: "🥫", color: "bg-orange-50 border-orange-200",  activeColor: "bg-orange-100 border-orange-400 scale-105" },
  { key: "fridge",  label: "Fridge",  icon: "🧊", color: "bg-blue-50 border-blue-200",      activeColor: "bg-blue-100 border-blue-400 scale-105" },
  { key: "freezer", label: "Freezer", icon: "❄️", color: "bg-indigo-50 border-indigo-200",  activeColor: "bg-indigo-100 border-indigo-400 scale-105" },
];

const CUSTOM_EMOJIS = ["🥬","🍖","🧀","🌾","🫙","🍎","🧂","🥤","🍳","🫐","🥩","🐟","🧁","🌿","❓"];

export default function IngredientGrid({ onAdded, toast }) {
  const [units, setUnits]           = useState([]);
  const [filter, setFilter]         = useState("All");
  const [search, setSearch]         = useState("");
  const [dragging, setDragging]     = useState(null);
  const [overZone, setOverZone]     = useState(null);
  const [modal, setModal]           = useState(null);   // { ingredient, location }
  const [qty, setQty]               = useState("1");
  const [unitId, setUnitId]         = useState("");
  const [saving, setSaving]         = useState(false);
  const [warning, setWarning]       = useState(null);   // { message, existingItem }
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customEmoji, setCustomEmoji] = useState("❓");
  const [customLocation, setCustomLocation] = useState("pantry");
  const qtyRef = useRef(null);
  const customRef = useRef(null);

  useEffect(() => { if (showCustom) setTimeout(() => customRef.current?.focus(), 50); }, [showCustom]);

  useEffect(() => {
    listUnits()
      .then((d) => {
        const items = sortUnits(d.results || d);
        setUnits(items);
        if (items.length) setUnitId(String(items[0].id));
      })
      .catch(() => {});
  }, []);

  // focus qty when modal opens
  useEffect(() => {
    if (modal) setTimeout(() => qtyRef.current?.focus(), 50);
  }, [modal]);

  const visibleFor = (colKey) =>
    INGREDIENT_ICONS.filter((ing) => {
      const matchCol    = ing.col === colKey;
      const matchCat    = filter === "All" || ing.category === filter;
      const matchSearch = ing.name.includes(search.toLowerCase());
      return matchCol && matchCat && matchSearch;
    });

  const onDragStart = (e, ing) => {
    setDragging(ing);
    e.dataTransfer.effectAllowed = "copy";
  };

  const onDragEnd = () => { setDragging(null); setOverZone(null); };

  const onDrop = (e, locationKey) => {
    e.preventDefault();
    setOverZone(null);
    if (!dragging) return;
    setModal({ ingredient: dragging, location: locationKey });
    setQty("1");
    if (units.length) setUnitId(String(units[0].id));
  };

  const doSave = async () => {
    setSaving(true);
    try {
      const selectedUnit = units.find((u) => String(u.id) === unitId);
      await addPantryItem({
        ingredient_input: modal.ingredient.name,
        quantity: parseFloat(qty) || 1,
        unit_input: selectedUnit?.symbol || selectedUnit?.name || "",
        location: modal.location,
      });
      toast?.(`${modal.ingredient.emoji} ${modal.ingredient.name} added to ${modal.location}!`);
      onAdded?.();
      setModal(null);
      setWarning(null);
    } catch (err) {
      toast?.(err.message || "Something went wrong.", "error");
      setModal(null);
      setWarning(null);
    } finally {
      setSaving(false);
    }
  };

  const onSave = async (e) => {
    e?.preventDefault();
    // Warn only if the ingredient already exists in a DIFFERENT location.
    // Same location → backend merges quantities automatically, no warning needed.
    try {
      const pantry = await listPantry();
      const items = pantry.results || pantry;
      const name = modal.ingredient.name.toLowerCase();
      const elsewhere = items.filter(
        (p) =>
          (p.ingredient_name || p.ingredient?.name || "").toLowerCase() === name &&
          p.location !== modal.location
      );
      if (elsewhere.length > 0) {
        const loc     = elsewhere[0];
        const existQty = parseFloat(loc.quantity) || 0;
        const newQty   = parseFloat(qty) || 1;
        setWarning({
          message: `You already have ${existQty % 1 === 0 ? existQty : existQty.toFixed(1)} in your ${loc.location}. Still add ${newQty % 1 === 0 ? newQty : newQty.toFixed(1)} to your ${modal.location}?`,
          existingItem: loc,
        });
        return;
      }
    } catch (_) {
      // if pantry check fails, just proceed
    }
    await doSave();
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 mb-6">
      <h2 className="text-lg font-bold mb-1">Add from pantry icons</h2>
      <p className="text-slate-500 text-sm mb-4">Drag an ingredient into Pantry, Fridge, or Freezer below.</p>

      {/* Search + category filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ingredients…"
          className="p-2 px-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 outline-none w-44"
        />
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              filter === cat
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
            }`}
          >{cat}</button>
        ))}
      </div>

      {/* 3-column layout: icons above, drop zone below each column */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {LOCATIONS.map((loc) => {
          const items = visibleFor(loc.key);
          return (
            <div key={loc.key} className="flex flex-col gap-2">
              {/* Icon grid for this column */}
              <div className="grid grid-cols-3 gap-1.5 min-h-[80px] max-h-52 overflow-y-auto pr-0.5">
                {items.length === 0 ? (
                  <p className="col-span-3 text-xs text-slate-300 text-center py-4 italic">
                    {search || filter !== "All" ? "No matches" : ""}
                  </p>
                ) : items.map((ing) => (
                  <div
                    key={ing.name}
                    draggable
                    onDragStart={(e) => onDragStart(e, ing)}
                    onDragEnd={onDragEnd}
                    title={ing.name}
                    className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl cursor-grab active:cursor-grabbing border transition-all select-none
                      ${dragging?.name === ing.name
                        ? "border-blue-400 bg-blue-50 scale-95 opacity-70"
                        : "border-slate-100 bg-slate-50 hover:bg-white hover:border-blue-200 hover:shadow-sm"
                      }`}
                  >
                    <span className="text-xl">{ing.emoji}</span>
                    <span className="text-[9px] text-slate-500 text-center leading-tight w-full truncate">{ing.name}</span>
                  </div>
                ))}
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setOverZone(loc.key); }}
                onDragLeave={() => setOverZone(null)}
                onDrop={(e) => onDrop(e, loc.key)}
                className={`rounded-2xl border-2 border-dashed p-3 text-center transition-all duration-150
                  ${overZone === loc.key ? loc.activeColor : loc.color}`}
              >
                <div className="text-2xl mb-0.5">{loc.icon}</div>
                <div className="font-semibold text-xs text-slate-700">{loc.label}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Drop here</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom ingredient button */}
      <button
        onClick={() => setShowCustom(true)}
        className="w-full py-2 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 text-sm hover:border-blue-300 hover:text-blue-600 transition-all"
      >
        + Can't find it? Add a custom ingredient
      </button>

      {/* Custom ingredient modal */}
      {showCustom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCustom(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-80 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg">Custom ingredient</h3>

            {/* Emoji picker */}
            <div>
              <label className="text-xs text-slate-500 block mb-2">Pick an icon</label>
              <div className="flex flex-wrap gap-2">
                {CUSTOM_EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setCustomEmoji(em)}
                    className={`text-2xl p-1.5 rounded-lg border-2 transition-all ${customEmoji === em ? "border-blue-500 bg-blue-50" : "border-transparent hover:border-slate-200"}`}
                  >{em}</button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="text-xs text-slate-500 block mb-1">Ingredient name</label>
              <input
                ref={customRef}
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. dragon fruit"
                className="w-full p-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>

            {/* Location */}
            <div>
              <label className="text-xs text-slate-500 block mb-1">Add to</label>
              <div className="flex gap-2">
                {LOCATIONS.map((l) => (
                  <button
                    key={l.key}
                    type="button"
                    onClick={() => setCustomLocation(l.key)}
                    className={`flex-1 py-2 rounded-xl text-sm border-2 transition-all ${customLocation === l.key ? "border-blue-500 bg-blue-50 font-semibold" : "border-slate-200 hover:border-slate-300"}`}
                  >{l.icon} {l.label}</button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => setShowCustom(false)} className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</button>
              <button
                type="button"
                disabled={!customName.trim()}
                onClick={() => {
                  if (!customName.trim()) return;
                  setModal({ ingredient: { name: customName.trim().toLowerCase(), emoji: customEmoji }, location: customLocation });
                  setShowCustom(false);
                  setCustomName("");
                }}
                className="flex-1 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-40"
              >Next →</button>
            </div>
          </div>
        </div>
      )}

      {/* Drop modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setModal(null); setWarning(null); }}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={onSave}
            className="bg-white rounded-2xl shadow-xl p-6 w-72 space-y-4"
          >
            <div className="text-center">
              <div className="text-5xl mb-2">{modal.ingredient.emoji}</div>
              <h3 className="font-bold text-lg capitalize">{modal.ingredient.name}</h3>
              <p className="text-sm text-slate-500">Adding to <strong>{modal.location}</strong></p>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-slate-500 block mb-1">Quantity</label>
                <input
                  ref={qtyRef}
                  type="number"
                  min="0"
                  step="0.1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-slate-500 block mb-1">Unit</label>
                <select
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>{u.symbol} — {u.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Warning: already exists elsewhere or here */}
            {warning && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                <p className="mb-3">⚠️ {warning.message}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setWarning(null)}
                    className="flex-1 py-1.5 rounded-lg border border-amber-300 text-amber-700 text-xs font-medium hover:bg-amber-100"
                  >Cancel</button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={doSave}
                    className="flex-1 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 disabled:opacity-50"
                  >{saving ? "Adding…" : "Yes, add to fridge too"}</button>
                </div>
              </div>
            )}

            {!warning && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setModal(null); setWarning(null); }}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                >Cancel</button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50"
                >{saving ? "Checking…" : "Add"}</button>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
