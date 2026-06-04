"""Recipe suggestion + shopping list logic.

A recipe is "makeable" when every ingredient is in the pantry. We compute
a match_ratio (0..1) so partial matches can be sorted by how close the
user is to being able to cook the recipe.
"""
from __future__ import annotations

from .models import PantryItem, Recipe


def _pantry_ingredient_ids(user=None) -> set[int]:
    qs = PantryItem.objects.all()
    if user and user.is_authenticated:
        qs = qs.filter(owner=user)
    return set(qs.values_list('ingredient_id', flat=True))


def suggest_recipes(
    *,
    cuisine: str | None = None,
    max_total_minutes: int | None = None,
    diet: str | None = None,
    only_makeable: bool = False,
    max_missing: int | None = None,
    user=None,
):
    """Return recipes ranked by how well they match the pantry.

    Each result is a dict {recipe, missing, have, match_ratio}.
    """
    pantry_ids = _pantry_ingredient_ids(user)

    qs = Recipe.objects.all().prefetch_related(
        'recipe_ingredients__ingredient', 'recipe_ingredients__unit'
    )
    if cuisine and cuisine != 'any':
        qs = qs.filter(cuisine=cuisine)
    if diet == 'vegetarian':
        qs = qs.filter(is_vegetarian=True)
    elif diet == 'vegan':
        qs = qs.filter(is_vegan=True)
    elif diet == 'gluten_free':
        qs = qs.filter(is_gluten_free=True)

    if max_total_minutes is not None:
        recipes = [r for r in qs if r.total_time_minutes <= max_total_minutes]
    else:
        recipes = list(qs)

    results = []
    for recipe in recipes:
        ings = list(recipe.recipe_ingredients.all())
        if not ings:
            continue
        have, missing = [], []
        for ri in ings:
            if ri.ingredient_id in pantry_ids:
                have.append(ri.ingredient.name)
            else:
                missing.append(ri.ingredient.name)
        match_ratio = len(have) / len(ings)
        if only_makeable and missing:
            continue
        if max_missing is not None and len(missing) > max_missing:
            continue
        results.append({
            'recipe': recipe,
            'have': have,
            'missing': missing,
            'match_ratio': round(match_ratio, 3),
        })

    # Best matches first; ties broken by shorter total time
    results.sort(key=lambda r: (-r['match_ratio'], r['recipe'].total_time_minutes))
    return results


def shopping_list_for_recipes(recipe_ids: list[int], user=None) -> list[dict]:
    """Aggregate ingredients across the given recipes that aren't in the pantry."""
    pantry_ids = _pantry_ingredient_ids(user)
    recipes = Recipe.objects.filter(id__in=recipe_ids).prefetch_related(
        'recipe_ingredients__ingredient', 'recipe_ingredients__unit'
    )
    bucket: dict[tuple[int, int | None], dict] = {}
    for recipe in recipes:
        for ri in recipe.recipe_ingredients.all():
            if ri.ingredient_id in pantry_ids:
                continue
            key = (ri.ingredient_id, ri.unit_id)
            entry = bucket.get(key)
            if entry is None:
                bucket[key] = {
                    'ingredient': ri.ingredient.name,
                    'quantity': float(ri.quantity or 0),
                    'unit': ri.unit.symbol if ri.unit else '',
                    'recipes': [recipe.name],
                }
            else:
                entry['quantity'] += float(ri.quantity or 0)
                if recipe.name not in entry['recipes']:
                    entry['recipes'].append(recipe.name)
    return sorted(bucket.values(), key=lambda x: x['ingredient'])
