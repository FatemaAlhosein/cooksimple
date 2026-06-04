const CUISINES = [
  ["", "Any cuisine"], ["italian", "Italian"], ["mexican", "Mexican"],
  ["indian", "Indian"], ["chinese", "Chinese"], ["japanese", "Japanese"],
  ["thai", "Thai"], ["mediterranean", "Mediterranean"],
  ["middle_eastern", "Middle Eastern"], ["american", "American"],
  ["french", "French"], ["other", "Other"],
];

const DIETS = [
  ["", "No diet filter"], ["vegetarian", "Vegetarian"],
  ["vegan", "Vegan"], ["gluten_free", "Gluten-free"],
];

export default function Filters({ value, onChange, showOnlyMakeable = true }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
      <div>
        <label className="text-xs text-slate-500 block mb-1">Cuisine</label>
        <select
          value={value.cuisine || ""}
          onChange={(e) => set("cuisine", e.target.value)}
          className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
        >
          {CUISINES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-slate-500 block mb-1">Diet</label>
        <select
          value={value.diet || ""}
          onChange={(e) => set("diet", e.target.value)}
          className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
        >
          {DIETS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-slate-500 block mb-1">Max time (min)</label>
        <input
          type="number" min="0" placeholder="any"
          value={value.max_minutes || ""}
          onChange={(e) => set("max_minutes", e.target.value)}
          className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
        />
      </div>
      {showOnlyMakeable && (
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={!!value.only_makeable}
              onChange={(e) => set("only_makeable", e.target.checked)}
              className="w-4 h-4"
            />
            Only what I can make now
          </label>
        </div>
      )}
    </div>
  );
}
