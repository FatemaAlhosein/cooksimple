from django.db import models
from rest_framework import filters, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from rest_framework.response import Response

from .models import Ingredient, PantryItem, Recipe, Unit
from .serializers import (
    IngredientSerializer,
    PantryItemSerializer,
    RecipeDetailSerializer,
    RecipeListSerializer,
    UnitSerializer,
)
from .suggest import shopping_list_for_recipes, suggest_recipes


def is_owner_or_admin(request, obj_owner):
    """Return True if request.user owns the object or is staff/admin."""
    return request.user.is_authenticated and (
        request.user.is_staff or obj_owner == request.user
    )


# ---------------------------------------------------------------------------
# CRUD viewsets
# ---------------------------------------------------------------------------

class UnitViewSet(viewsets.ModelViewSet):
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'symbol']


class IngredientViewSet(viewsets.ModelViewSet):
    queryset = Ingredient.objects.all()
    serializer_class = IngredientSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']


class RecipeViewSet(viewsets.ModelViewSet):
    """
    /api/recipes/        list / create
    /api/recipes/<id>/   retrieve / update / delete

    Visibility:
      - Public recipes (owner=None): visible to everyone
      - User recipes: visible only to their owner
    Mutability:
      - Create: authenticated users only
      - Update/Delete: owner or admin only
    """
    queryset = Recipe.objects.all().prefetch_related(
        'recipe_ingredients__ingredient', 'recipe_ingredients__unit', 'steps'
    )
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'prep_time_minutes', 'cook_time_minutes']
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_serializer_class(self):
        if self.action == 'list':
            return RecipeListSerializer
        return RecipeDetailSerializer

    def get_queryset(self):
        from django.db.models import Q
        user = self.request.user
        # Public recipes + the user's own recipes
        if user.is_authenticated:
            qs = Recipe.objects.filter(
                Q(owner__isnull=True) | Q(owner=user)
            ).prefetch_related(
                'recipe_ingredients__ingredient', 'recipe_ingredients__unit', 'steps'
            )
        else:
            qs = Recipe.objects.filter(owner__isnull=True).prefetch_related(
                'recipe_ingredients__ingredient', 'recipe_ingredients__unit', 'steps'
            )
        cuisine = self.request.query_params.get('cuisine')
        diet    = self.request.query_params.get('diet')
        mine    = self.request.query_params.get('mine')
        if cuisine and cuisine != 'any':
            qs = qs.filter(cuisine=cuisine)
        if diet == 'vegetarian':
            qs = qs.filter(is_vegetarian=True)
        elif diet == 'vegan':
            qs = qs.filter(is_vegan=True)
        elif diet == 'gluten_free':
            qs = qs.filter(is_gluten_free=True)
        if mine == '1' and user.is_authenticated:
            qs = qs.filter(owner=user)
        return qs

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def update(self, request, *args, **kwargs):
        recipe = self.get_object()
        if not is_owner_or_admin(request, recipe.owner):
            return Response(
                {'detail': 'You can only edit your own recipes.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        recipe = self.get_object()
        if not is_owner_or_admin(request, recipe.owner):
            return Response(
                {'detail': 'You can only delete your own recipes.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)


class PantryItemViewSet(viewsets.ModelViewSet):
    queryset = PantryItem.objects.select_related('ingredient', 'unit').all()
    serializer_class = PantryItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Each user sees only their own pantry
        qs = PantryItem.objects.select_related('ingredient', 'unit').filter(
            owner=self.request.user
        )
        location = self.request.query_params.get('location')
        if location in ('pantry', 'fridge', 'freezer'):
            qs = qs.filter(location=location)
        return qs

    def create(self, request, *args, **kwargs):
        """
        If the same ingredient already exists at the same location for this user,
        add the quantities together. Different location = new entry (allowed).
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        ingredient = validated.get('ingredient')
        location   = validated.get('location', PantryItem.LOCATION_PANTRY)
        new_qty    = validated.get('quantity') or 0

        existing = PantryItem.objects.filter(
            ingredient=ingredient, location=location, owner=request.user
        ).first()

        if existing:
            existing.quantity = (existing.quantity or 0) + new_qty
            if validated.get('unit'):
                existing.unit = validated['unit']
            existing.save()
            out = PantryItemSerializer(existing, context={'request': request})
            return Response(out.data, status=status.HTTP_200_OK)

        serializer.save(owner=request.user)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def low_stock(request):
    """
    GET /api/pantry/low-stock/
    Returns pantry items where quantity <= min_quantity (and min_quantity is set).
    """
    items = PantryItem.objects.select_related('ingredient', 'unit').filter(
        owner=request.user,
        min_quantity__isnull=False,
        quantity__isnull=False,
        quantity__lte=models.F('min_quantity'),
    )
    serializer = PantryItemSerializer(items, many=True, context={'request': request})
    return Response(serializer.data)


# ---------------------------------------------------------------------------
# Function endpoints
# ---------------------------------------------------------------------------

@api_view(['GET'])
def suggestions(request):
    """GET /api/suggestions/?cuisine=&diet=&max_minutes=&only_makeable=&max_missing="""
    cuisine = request.query_params.get('cuisine')
    diet = request.query_params.get('diet')
    max_minutes = request.query_params.get('max_minutes')
    only_makeable = request.query_params.get('only_makeable', '').lower() in (
        '1', 'true', 'yes',
    )
    max_missing = request.query_params.get('max_missing')
    try:
        max_minutes_int = int(max_minutes) if max_minutes else None
        max_missing_int = int(max_missing) if max_missing else None
    except ValueError:
        return Response(
            {'detail': 'max_minutes and max_missing must be integers.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    matches = suggest_recipes(
        cuisine=cuisine,
        max_total_minutes=max_minutes_int,
        diet=diet,
        only_makeable=only_makeable,
        max_missing=max_missing_int,
        user=request.user,
    )
    ctx = {'request': request}  # so ImageField returns absolute URLs
    payload = []
    for m in matches:
        payload.append({
            **RecipeListSerializer(m['recipe'], context=ctx).data,
            'have': m['have'],
            'missing': m['missing'],
            'match_ratio': m['match_ratio'],
            'match': int(round(m['match_ratio'] * 100)),  # back-compat
        })
    return Response(payload)


@api_view(['POST'])
def shopping_list(request):
    """POST /api/shopping-list/  body: {"recipe_ids": [1,2,3]}"""
    ids = request.data.get('recipe_ids') or []
    if not isinstance(ids, list) or not all(isinstance(i, int) for i in ids):
        return Response(
            {'detail': 'recipe_ids must be a list of integers.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return Response(shopping_list_for_recipes(ids, user=request.user))


# ---------------------------------------------------------------------------
# Backward-compat endpoints (kept so the existing App.jsx still works)
# ---------------------------------------------------------------------------

@api_view(['POST'])
def cook_now(request):
    """Match recipes to a list of free-text ingredient strings.

    Body: {"ingredients": ["chicken", "rice", ...]}
    Returns: [{id, name, match}, ...]
    """
    raw_ingredients = request.data.get('ingredients', [])
    user_ingredients = [i.strip().lower() for i in raw_ingredients if i.strip()]

    if not user_ingredients:
        return Response([])

    from django.db.models import Q
    query = Q()
    for ingredient in user_ingredients:
        query |= Q(ingredients__name__icontains=ingredient)

    recipes = Recipe.objects.filter(query).distinct()

    data = []
    for recipe in recipes:
        all_ings = recipe.ingredients.all()
        matched = 0
        for ing in all_ings:
            if any(u in ing.name.lower() for u in user_ingredients):
                matched += 1
        match_pct = 0
        total = all_ings.count()
        if total:
            match_pct = int((matched / total) * 100)
        data.append({
            'id': recipe.id,
            'name': recipe.name,
            'match': match_pct,
        })

    data.sort(key=lambda x: x['match'], reverse=True)
    return Response(data)


@api_view(['GET'])
def recipe_detail(request, pk):
    """Lightweight recipe detail (used by the existing modal in App.jsx)."""
    try:
        recipe = Recipe.objects.get(pk=pk)
    except Recipe.DoesNotExist:
        return Response({'error': 'Recipe not found'}, status=404)

    ingred_list = []
    for ri in recipe.recipe_ingredients.select_related('ingredient', 'unit'):
        qty = ri.quantity if ri.quantity is not None else ''
        sym = ri.unit.symbol if ri.unit else ''
        ingred_list.append(f"{qty} {sym} {ri.ingredient.name}".strip())

    step_list = [s.description for s in recipe.steps.all()]

    return Response({
        'id': recipe.id,
        'name': recipe.name,
        'description': recipe.description,
        'cuisine': recipe.cuisine,
        'prep_time_minutes': recipe.prep_time_minutes,
        'cook_time_minutes': recipe.cook_time_minutes,
        'total_time_minutes': recipe.total_time_minutes,
        'is_vegetarian': recipe.is_vegetarian,
        'is_vegan': recipe.is_vegan,
        'is_gluten_free': recipe.is_gluten_free,
        'ingredients': ingred_list,
        'steps': step_list,
    })
