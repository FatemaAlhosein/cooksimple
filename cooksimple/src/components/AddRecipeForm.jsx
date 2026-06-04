import { useState, useEffect } from "react";
import { createRecipe, uploadRecipeImage, listUnits } from "../api.js";
import IngredientAutocomplete from "./IngredientAutocomplete.jsx";

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

const CUISINES = [
  "any", "italian", "mexican", "indian", "chinese", "japanese",
  "thai", "mediterranean", "middle_eastern", "american", "french", "other",
];

const blank = {
  name: "", description: "", cuisine: "any",
  prep_time_minutes: 0, cook_time_minutes: 0, servings: 1,
  is_vegetarian: false, is_vegan: false, is_gluten_free: false,
  image_url: "",
  recipe_ingredients: [{ ingredient_input: "", quantity: 1, unit_input: "", is_main: false }],
  steps: [{ order: 1, description: "" }],
};

export default function AddRecipeForm({ onCreated }) {
  const [data, setData]         = useState(blank);
  const [error, setError]       = useState(null);
  const [saving, setSaving]     = useState(false);
  const [done, setDone]         = useState(null);
  const [imageFile, setImageFile]   = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [units, setUnits]       = useState([]);

  useEffect(() => {
    listUnits().then((d) => setUnits(sortUnits(d.results || d))).catch(() => {});
  }, []);

  const onPickImage = (e) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));

  const updateIng = (i, k, v) => {
    const next = [...data.recipe_ingredients];
    next[i] = { ...next[i], [k]: v };
    set("recipe_ingredients", next);
  };
  const addIng = () => set("recipe_ingredients", [
    ...data.recipe_ingredients,
    { ingredient_input: "", quantity: 1, unit_input: "", is_main: false },
  ]);
  const removeIng = (i) =>
    set("recipe_ingredients", data.recipe_ingredients.filter((_, idx) => idx !== i));

  const updateStep = (i, v) => {
    const next = [...data.steps];
    next[i] = { ...next[i], description: v, order: i + 1 };
    set("steps", next);
  };
  const addStep = () => set("steps", [...data.steps, { order: data.steps.length + 1, description: "" }]);
  const removeStep = (i) =>
    set("steps", data.steps.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, order: idx + 1 })));

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setDone(null);
    try {
      const payload = {
        ...data,
        prep_time_minutes: Number(data.prep_time_minutes) || 0,
        cook_time_minutes: Number(data.cook_time_minutes) || 0,
        servings: Number(data.servings) || 1,
        recipe_ingredients: data.recipe_ingredients
          .filter((i) => i.ingredient_input?.trim())
          .map((i) => ({
            ingredient_input: i.ingredient_input.trim().toLowerCase(),
            quantity: Number(i.quantity) || 0,
            unit_input: (i.unit_input || "").trim().toLowerCase(),
            is_main: !!i.is_main,
          })),
        steps: data.steps
          .filter((s) => s.description.trim())
          .map((s, idx) => ({ order: idx + 1, description: s.description.trim() })),
      };
      const saved = await createRecipe(payload);
      // Step 2: if a photo was picked, attach it via multipart PATCH
      let final = saved;
      if (imageFile) {
        try {
          final = await uploadRecipeImage(saved.id, imageFile);
        } catch (uploadErr) {
          // recipe was saved but image failed — surface a partial-success message
          setError(
            `Recipe saved, but image upload failed: ${uploadErr.message}. ` +
            `You can still attach an image later from /admin.`
          );
        }
      }
      setDone(final);
      setData(blank);
      setImageFile(null);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
      onCreated?.(final);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg">{error}</div>}
      {done && (
        <div className="p-3 bg-green-50 text-green-700 rounded-lg">
          Created "{done.name}". Add another below.
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div>
          <label className="text-xs text-slate-500 block mb-1">Name *</label>
          <input
            required
            value={data.name}
            onChange={(e) => set("name", e.target.value)}
            className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Description</label>
          <textarea
            rows={2}
            value={data.description}
            onChange={(e) => set("description", e.target.value)}
            className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Cuisine</label>
            <select
              value={data.cuisine}
              onChange={(e) => set("cuisine", e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg"
            >
              {CUISINES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Prep min</label>
            <input
              type="number" min="0"
              value={data.prep_time_minutes}
              onChange={(e) => set("prep_time_minutes", e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Cook min</label>
            <input
              type="number" min="0"
              value={data.cook_time_minutes}
              onChange={(e) => set("cook_time_minutes", e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Servings</label>
            <input
              type="number" min="1"
              value={data.servings}
              onChange={(e) => set("servings", e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={data.is_vegetarian} onChange={(e) => set("is_vegetarian", e.target.checked)} />
            Vegetarian
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={data.is_vegan} onChange={(e) => set("is_vegan", e.target.checked)} />
            Vegan
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={data.is_gluten_free} onChange={(e) => set("is_gluten_free", e.target.checked)} />
            Gluten-free
          </label>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Photo (optional)</label>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept="image/*"
              onChange={onPickImage}
              className="text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-medium hover:file:bg-blue-100"
            />
            {imagePreview && (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="preview"
                  className="h-20 w-20 object-cover rounded-lg border border-slate-200"
                />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); URL.revokeObjectURL(imagePreview); setImagePreview(null); }}
                  className="absolute -top-1 -right-1 bg-white border border-slate-200 rounded-full w-6 h-6 text-xs hover:bg-red-50 hover:text-red-600"
                >x</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h3 className="font-bold mb-3">Ingredients</h3>
        <div className="space-y-2">
          {data.recipe_ingredients.map((ri, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-5">
                <IngredientAutocomplete
                  value={ri.ingredient_input}
                  onChange={(v) => updateIng(i, "ingredient_input", v)}
                />
              </div>
              <input
                type="number" step="0.1" placeholder="qty"
                value={ri.quantity}
                onChange={(e) => updateIng(i, "quantity", e.target.value)}
                className="col-span-2 p-2 border border-slate-200 rounded-lg"
              />
              <select
                value={ri.unit_input}
                onChange={(e) => updateIng(i, "unit_input", e.target.value)}
                className="col-span-2 p-2 border border-slate-200 rounded-lg text-sm"
              >
                <option value="">— unit —</option>
                {units.map((u) => (
                  <option key={u.id} value={u.symbol}>{u.symbol} — {u.name}</option>
                ))}
              </select>
              <label className="col-span-2 flex items-center gap-1 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={!!ri.is_main}
                  onChange={(e) => updateIng(i, "is_main", e.target.checked)}
                />
                main
              </label>
              <button
                type="button"
                onClick={() => removeIng(i)}
                className="col-span-1 text-red-500 hover:bg-red-50 rounded-lg p-2"
              >x</button>
            </div>
          ))}
        </div>
        <button
          type="button" onClick={addIng}
          className="mt-3 text-sm text-blue-600 hover:underline"
        >+ Add ingredient</button>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h3 className="font-bold mb-3">Steps</h3>
        <div className="space-y-2">
          {data.steps.map((s, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-slate-400 mt-2 w-6">{i + 1}.</span>
              <textarea
                rows={2}
                value={s.description}
                onChange={(e) => updateStep(i, e.target.value)}
                className="flex-1 p-2 border border-slate-200 rounded-lg"
              />
              <button
                type="button"
                onClick={() => removeStep(i)}
                className="text-red-500 hover:bg-red-50 rounded-lg p-2"
              >x</button>
            </div>
          ))}
        </div>
        <button
          type="button" onClick={addStep}
          className="mt-3 text-sm text-blue-600 hover:underline"
        >+ Add step</button>
      </div>

      <button
        type="submit" disabled={saving}
        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Create recipe"}
      </button>
    </form>
  );
}
