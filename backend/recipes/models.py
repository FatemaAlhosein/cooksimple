from django.contrib.auth.models import User
from django.db import models
from django.db.models import Q


class Ingredient(models.Model):
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Unit(models.Model):
    name = models.CharField(max_length=50)
    symbol = models.CharField(max_length=10)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Recipe(models.Model):
    CUISINE_CHOICES = [
        ("any", "Any"),
        ("italian", "Italian"),
        ("mexican", "Mexican"),
        ("indian", "Indian"),
        ("chinese", "Chinese"),
        ("japanese", "Japanese"),
        ("thai", "Thai"),
        ("mediterranean", "Mediterranean"),
        ("middle_eastern", "Middle Eastern"),
        ("american", "American"),
        ("french", "French"),
        ("other", "Other"),
    ]

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    cuisine = models.CharField(max_length=32, choices=CUISINE_CHOICES, default="any")
    prep_time_minutes = models.PositiveIntegerField(default=0)
    cook_time_minutes = models.PositiveIntegerField(default=0)
    servings = models.PositiveIntegerField(default=1)
    is_vegetarian = models.BooleanField(default=False)
    is_vegan = models.BooleanField(default=False)
    is_gluten_free = models.BooleanField(default=False)
    image_url = models.URLField(blank=True, default="")
    image = models.ImageField(upload_to='recipes/', blank=True, null=True)

    # owner=None means public/admin recipe visible to all users
    owner = models.ForeignKey(
        User, on_delete=models.CASCADE, null=True, blank=True, related_name='recipes'
    )

    # This allows you to do: my_recipe.ingredients.all()
    ingredients = models.ManyToManyField(Ingredient, through='RecipeIngredient')

    class Meta:
        ordering = ['name']

    @property
    def total_time_minutes(self):
        return (self.prep_time_minutes or 0) + (self.cook_time_minutes or 0)

    def __str__(self):
        return self.name


class RecipeIngredient(models.Model):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='recipe_ingredients')
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE)
    # For ingredient quantities (like 0.33 cups), DecimalField is generally preferred over FloatField. Floats can sometimes lead to rounding errors (e.g., 0.1 + 0.2 becoming 0.300000000004),
    #  which can get messy if you start scaling recipes.
    quantity = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    # quantity = models.FloatField(null=True, blank=True)
    unit = models.ForeignKey(Unit, on_delete=models.SET_NULL, null=True, blank=True)
    is_main = models.BooleanField(default=False)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"{self.recipe} - {self.ingredient}"


class Step(models.Model):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='steps')
    # order = models.IntegerField()
    order = models.PositiveIntegerField()  # Use Positive to avoid negative steps
    description = models.TextField()
    # To ensure your cooking steps always come out in the right order (1, 2, 3...)
    #  without you having to sort them manually every time, add Meta ordering:

    class Meta:
        ordering = ['order']  # Steps will always be sorted by 'order' by default

    def __str__(self):
        return f"{self.recipe} - Step {self.order}"


class PantryItem(models.Model):
    """An ingredient the user currently has in their kitchen.

    Stored in one of three locations: pantry, fridge, or freezer.
    The OneToOne to Ingredient means each ingredient lives in exactly
    one location at a time (you can move it between locations).
    """
    LOCATION_PANTRY = "pantry"
    LOCATION_FRIDGE = "fridge"
    LOCATION_FREEZER = "freezer"
    LOCATION_CHOICES = [
        (LOCATION_PANTRY, "Pantry"),
        (LOCATION_FRIDGE, "Fridge"),
        (LOCATION_FREEZER, "Freezer"),
    ]

    ingredient = models.ForeignKey(
        Ingredient, on_delete=models.CASCADE, related_name='pantry_items'
    )
    location = models.CharField(
        max_length=10, choices=LOCATION_CHOICES, default=LOCATION_PANTRY
    )
    quantity = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    unit = models.ForeignKey(Unit, on_delete=models.SET_NULL, null=True, blank=True)
    owner = models.ForeignKey(
        User, on_delete=models.CASCADE, null=True, blank=True, related_name='pantry_items'
    )
    # Stock threshold — user-defined. When quantity <= min_quantity the item is "low".
    min_quantity = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True,
        help_text="Alert threshold: quantity at or below this is considered low stock."
    )
    max_quantity = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True,
        help_text="Normal full stock level (used as the restock-to target)."
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['location', 'ingredient__name']
        unique_together = [('ingredient', 'location', 'owner')]

    @property
    def is_low_stock(self):
        """True when a minimum threshold is set and current quantity is at or below it."""
        if self.min_quantity is None or self.quantity is None:
            return False
        return self.quantity <= self.min_quantity

    def __str__(self):
        unit = self.unit.symbol if self.unit else ''
        return f"{self.ingredient.name} ({self.location}): {self.quantity or ''} {unit}".strip()


# ── Weekly Meal Planner ────────────────────────────────────────────────────────

class WeekPlan(models.Model):
    """One plan per user per week (identified by the Monday date of that week)."""
    owner      = models.ForeignKey(User, on_delete=models.CASCADE, related_name='week_plans')
    week_start = models.DateField(help_text="Monday of the planned week.")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('owner', 'week_start')]
        ordering = ['-week_start']

    def __str__(self):
        return f"{self.owner.username} — week of {self.week_start}"


class MealPlanEntry(models.Model):
    """A single recipe slotted into a day + meal of a WeekPlan."""
    SLOT_BREAKFAST = 'breakfast'
    SLOT_LUNCH     = 'lunch'
    SLOT_DINNER    = 'dinner'
    SLOT_SNACK     = 'snack'
    SLOT_CHOICES = [
        (SLOT_BREAKFAST, 'Breakfast'),
        (SLOT_LUNCH,     'Lunch'),
        (SLOT_DINNER,    'Dinner'),
        (SLOT_SNACK,     'Snack'),
    ]

    plan   = models.ForeignKey(WeekPlan, on_delete=models.CASCADE, related_name='entries')
    day    = models.SmallIntegerField(help_text="0=Mon … 6=Sun")
    slot   = models.CharField(max_length=12, choices=SLOT_CHOICES, default=SLOT_DINNER)
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='meal_entries')

    class Meta:
        ordering = ['day', 'slot']

    def __str__(self):
        days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
        return f"{days[self.day]} {self.slot}: {self.recipe.name}"


# 1. Basic Keyword Search. A common goal is to find any recipe whose name or ingredient list contains a specific keyword (like "chicken").
def search_recipes(keyword):
    #  use the class directly since it's defined above in the same file
    # This searches across the Recipe name AND the related Ingredient names
    return Recipe.objects.filter(
        Q(name__icontains=keyword) |
        Q(ingredients__name__icontains=keyword)
    ).distinct()  # distinct() prevents duplicate results if multiple ingredients match


def find_by_all_ingredients(ingredient_list):
    queryset = Recipe.objects.all()
    for name in ingredient_list:
        queryset = queryset.filter(ingredients__name__iexact=name)
    return queryset
