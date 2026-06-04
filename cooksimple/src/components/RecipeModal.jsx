import { useEffect, useState } from "react";
import { deleteRecipe, getRecipe } from "../api.js";

export default function RecipeModal({ recipeId, onClose, onChanged }) {
  const [recipe, setRecipe] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!recipeId) return;
    setRecipe(null);
    getRecipe(recipeId).then(setRecipe).catch((e) => setError(e.message));
  }, [recipeId]);

  if (!recipeId) return null;

  const onDelete = async () => {
    if (!confirm(`Delete "${recipe.name}"?`)) return;
    await deleteRecipe(recipeId);
    onChanged?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[2rem] max-w-xl w-full shadow-2xl overflow-hidden">
        <div
          className="h-48 relative bg-gradient-to-br from-blue-500 to-indigo-600 p-8 flex items-end"
          style={recipe?.image || recipe?.image_url ? {
            backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0)), url(${recipe.image || recipe.image_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          } : undefined}
        >
          <h2 className="text-3xl font-black text-white drop-shadow">
            {recipe ? recipe.name : "Loading..."}
          </h2>
        </div>
        <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto text-sm">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg">{error}</div>}
          {recipe && (
            <>
              <div className="flex flex-wrap gap-2 text-xs">
                {recipe.cuisine !== "any" && (
                  <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-full">{recipe.cuisine}</span>
                )}
                <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-full">
                  {recipe.total_time_minutes} min
                </span>
                <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-full">
                  serves {recipe.servings}
                </span>
                {recipe.is_vegan && <span className="bg-green-50 text-green-700 px-2 py-1 rounded-full">vegan</span>}
                {!recipe.is_vegan && recipe.is_vegetarian && (
                  <span className="bg-green-50 text-green-700 px-2 py-1 rounded-full">veg</span>
                )}
                {recipe.is_gluten_free && (
                  <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded-full">GF</span>
                )}
              </div>
              {recipe.description && (
                <p className="text-slate-600 italic">{recipe.description}</p>
              )}
              <div>
                <h4 className="text-xs uppercase tracking-widest font-bold text-slate-400 mb-3">Ingredients</h4>
                {recipe.recipe_ingredients?.length ? (
                  <ul className="grid grid-cols-2 gap-2">
                    {recipe.recipe_ingredients.map((ri) => (
                      <li key={ri.id} className="bg-slate-50 p-2 rounded-lg text-slate-700 flex items-center gap-2">
                        <span className="w-1 h-1 bg-blue-400 rounded-full" />
                        {ri.quantity ? parseFloat(ri.quantity) : ""} {ri.unit_symbol || ""} {ri.ingredient_name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500">No ingredients listed.</p>
                )}
              </div>
              <div>
                <h4 className="text-xs uppercase tracking-widest font-bold text-slate-400 mb-3">Steps</h4>
                {recipe.steps?.length ? (
                  <div className="space-y-4">
                    {[...recipe.steps].sort((a, b) => a.order - b.order).map((s, i) => (
                      <div key={s.id} className="flex gap-3">
                        <span className="flex-none w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-[10px]">
                          {i + 1}
                        </span>
                        <p className="text-slate-600 leading-relaxed">{s.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500">No steps listed.</p>
                )}
              </div>
            </>
          )}
        </div>
        <div className="p-6 bg-slate-50 flex justify-end gap-2">
          {recipe && (
            <button
              onClick={onDelete}
              className="px-6 py-2 font-bold text-red-600 hover:bg-red-50 rounded-lg"
            >
              Delete
            </button>
          )}
          <button
            onClick={onClose}
            className="px-6 py-2 font-bold text-slate-500 hover:text-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
