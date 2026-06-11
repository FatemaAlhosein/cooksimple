import { useEffect, useState } from "react";
import {
  addMealEntry,
  getWeekPlan,
  getPlannerShoppingList,
  listRecipes,
  removeMealEntry,
} from "../api.js";

const DAYS  = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SLOTS = ["breakfast", "lunch", "dinner", "snack"];
const SLOT_ICONS = { breakfast: "🌅", lunch: "☀️", dinner: "🌙", snack: "🍎" };

/** Returns the ISO date string (YYYY-MM-DD) for the Monday of a given week offset. */
function getMonday(offsetWeeks = 0) {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - (day === 0 ? 6 : day - 1) + offsetWeeks * 7;
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

function formatWeekLabel(monday) {
  const start = new Date(monday + "T00:00:00");
  const end   = new Date(monday + "T00:00:00");
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString("en-CA", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}`;
}

export default function PlannerTab({ toast }) {
  const [weekOffset, setWeekOffset]   = useState(0);
  const [plan, setPlan]               = useState(null);
  const [recipes, setRecipes]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [shopping, setShopping]       = useState(null);
  const [showPicker, setShowPicker]   = useState(null); // { day, slot }
  const [search, setSearch]           = useState("");
  const [copyDone, setCopyDone]       = useState(false);

  const monday = getMonday(weekOffset);

  const loadPlan = () => {
    setLoading(true);
    getWeekPlan(monday)
      .then(setPlan)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPlan();
    setShopping(null);
  }, [monday]);

  useEffect(() => {
    listRecipes().then((d) => setRecipes(d.results || d));
  }, []);

  const entriesFor = (day, slot) =>
    (plan?.entries || []).filter((e) => e.day === day && e.slot === slot);

  const handleAdd = async (recipeId) => {
    if (!showPicker) return;
    try {
      await addMealEntry({
        week_start: monday,
        day: showPicker.day,
        slot: showPicker.slot,
        recipe: recipeId,
      });
      setShowPicker(null);
      setSearch("");
      loadPlan();
      toast("Added to planner!");
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const handleRemove = async (entryId) => {
    try {
      await removeMealEntry(entryId);
      loadPlan();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const handleShopping = async () => {
    try {
      const list = await getPlannerShoppingList(monday);
      setShopping(list);
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const copyList = () => {
    if (!shopping) return;
    const text = shopping
      .map((it) => `${it.ingredient}: ${parseFloat(it.quantity) || ""} ${it.unit}`.trim())
      .join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
      toast("Shopping list copied!");
    });
  };

  const totalRecipes = new Set((plan?.entries || []).map((e) => e.recipe)).size;

  const filteredRecipes = recipes.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Week nav */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <button
          onClick={() => setWeekOffset((w) => w - 1)}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-600"
        >
          ← Prev
        </button>
        <div className="text-center">
          <div className="font-bold text-slate-800">{formatWeekLabel(monday)}</div>
          {weekOffset === 0 && (
            <span className="text-xs text-blue-500 font-medium">This week</span>
          )}
        </div>
        <button
          onClick={() => setWeekOffset((w) => w + 1)}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-600"
        >
          Next →
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading plan…</div>
      ) : (
        <>
          {/* Planner grid */}
          <div className="grid grid-cols-7 gap-2">
            {DAYS.map((dayLabel, dayIdx) => (
              <div key={dayIdx} className="space-y-1.5">
                <div className="text-center font-bold text-sm text-slate-600 py-1">
                  {dayLabel}
                </div>
                {SLOTS.map((slot) => {
                  const entries = entriesFor(dayIdx, slot);
                  return (
                    <div
                      key={slot}
                      className="bg-white rounded-xl border border-slate-100 p-1.5 min-h-[64px] relative group"
                    >
                      <div className="text-[10px] text-slate-400 mb-1">
                        {SLOT_ICONS[slot]}
                      </div>
                      {entries.map((entry) => (
                        <div
                          key={entry.id}
                          className="bg-blue-50 text-blue-800 text-[10px] rounded-lg px-1.5 py-1 mb-1 flex items-start justify-between gap-1"
                        >
                          <span className="leading-tight line-clamp-2 flex-1">
                            {entry.recipe_name}
                          </span>
                          <button
                            onClick={() => handleRemove(entry.id)}
                            className="text-blue-300 hover:text-red-500 flex-none leading-none mt-0.5"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          setShowPicker({ day: dayIdx, slot });
                          setSearch("");
                        }}
                        className="w-full text-[10px] text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg py-0.5 transition-colors"
                      >
                        + add
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Summary + shopping list button */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="text-sm text-slate-600">
                <span className="font-bold text-slate-800">{totalRecipes}</span> recipe
                {totalRecipes !== 1 ? "s" : ""} planned this week
              </div>
              <button
                onClick={handleShopping}
                disabled={totalRecipes === 0}
                className="bg-blue-600 text-white px-5 py-2 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                🛒 Generate shopping list
              </button>
            </div>

            {shopping && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                {shopping.length === 0 ? (
                  <p className="text-sm text-green-600 font-medium">
                    ✅ You have everything for this week!
                  </p>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-sm text-slate-700">
                        Missing ingredients ({shopping.length})
                      </h4>
                      <button
                        onClick={copyList}
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        {copyDone ? "✅ Copied!" : "Copy list"}
                      </button>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase text-slate-400">
                          <th className="py-1">Ingredient</th>
                          <th>Qty</th>
                          <th>Unit</th>
                          <th>For recipes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shopping.map((it, i) => (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="py-1.5 font-medium">{it.ingredient}</td>
                            <td>{parseFloat(it.quantity) || ""}</td>
                            <td>{it.unit}</td>
                            <td className="text-slate-400 text-xs">{it.recipes?.join(", ")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Recipe picker modal */}
      {showPicker && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setShowPicker(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold">
                {SLOT_ICONS[showPicker.slot]} {DAYS[showPicker.day]} —{" "}
                <span className="capitalize">{showPicker.slot}</span>
              </h3>
              <button
                onClick={() => setShowPicker(null)}
                className="text-slate-400 hover:text-slate-700 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-3 border-b border-slate-100">
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search recipes…"
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>
            <div className="overflow-y-auto flex-1">
              {filteredRecipes.length === 0 ? (
                <p className="text-center text-slate-400 py-8 text-sm">No recipes found.</p>
              ) : (
                filteredRecipes.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleAdd(r.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-left border-b border-slate-50 last:border-0"
                  >
                    <div
                      className="w-10 h-10 rounded-lg bg-slate-100 flex-none flex items-center justify-center text-lg overflow-hidden"
                      style={
                        r.image || r.image_url
                          ? {
                              backgroundImage: `url(${r.image || r.image_url})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }
                          : undefined
                      }
                    >
                      {!r.image && !r.image_url && "🍽️"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{r.name}</div>
                      <div className="text-xs text-slate-400">
                        {r.total_time_minutes} min
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
