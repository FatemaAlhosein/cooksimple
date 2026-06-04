"""Seed the database with starter units, ingredients, and recipes.

Run:  python manage.py seed_recipes
Use --reset to wipe existing recipes/ingredients/units first.
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from recipes.models import (
    Ingredient,
    PantryItem,
    Recipe,
    RecipeIngredient,
    Step,
    Unit,
)

UNITS = [
    ("gram", "g"), ("kilogram", "kg"), ("milliliter", "ml"), ("liter", "l"),
    ("teaspoon", "tsp"), ("tablespoon", "tbsp"), ("cup", "cup"),
    ("piece", "pc"), ("clove", "clove"), ("slice", "slice"),
    ("pinch", "pinch"),
]

# (title, description, cuisine, prep, cook, servings, veg, vegan, gf,
#   [(ingredient, qty, unit_symbol, is_main)], [steps...])
RECIPES = [
    (
        "Tomato Pasta",
        "A simple, fast tomato pasta.",
        "italian", 5, 15, 2, True, True, False,
        [
            ("pasta", 200, "g", True),
            ("tomato", 4, "pc", True),
            ("garlic", 2, "clove", False),
            ("olive oil", 2, "tbsp", False),
            ("salt", 1, "tsp", False),
        ],
        [
            "Boil pasta in salted water until al dente.",
            "Saute garlic in olive oil, add chopped tomato, cook 5 min.",
            "Toss pasta with sauce. Salt to taste.",
        ],
    ),
    (
        "Veggie Stir Fry",
        "Quick stir fry with whatever veggies you have.",
        "chinese", 10, 10, 2, True, True, True,
        [
            ("rice", 150, "g", True),
            ("broccoli", 1, "pc", True),
            ("carrot", 2, "pc", False),
            ("soy sauce", 2, "tbsp", False),
            ("garlic", 2, "clove", False),
            ("olive oil", 1, "tbsp", False),
        ],
        [
            "Cook rice per package directions.",
            "Stir fry veggies and garlic in oil 5 min.",
            "Add soy sauce, toss, serve over rice.",
        ],
    ),
    (
        "Chicken Curry",
        "Mild creamy chicken curry.",
        "indian", 15, 25, 4, False, False, True,
        [
            ("chicken", 500, "g", True),
            ("onion", 1, "pc", False),
            ("garlic", 3, "clove", False),
            ("ginger", 1, "tbsp", False),
            ("curry powder", 2, "tbsp", False),
            ("coconut milk", 400, "ml", False),
            ("rice", 200, "g", False),
            ("salt", 1, "tsp", False),
        ],
        [
            "Saute onion, garlic, ginger.",
            "Add chicken; brown.",
            "Stir in curry powder and coconut milk; simmer 20 min.",
            "Serve over rice.",
        ],
    ),
    (
        "Avocado Toast",
        "Breakfast in 5 minutes.",
        "american", 5, 0, 1, True, True, False,
        [
            ("bread", 2, "slice", True),
            ("avocado", 1, "pc", True),
            ("salt", 1, "pinch", False),
            ("lemon", 1, "pc", False),
        ],
        [
            "Toast bread.",
            "Mash avocado with lemon juice and salt.",
            "Spread on toast.",
        ],
    ),
    (
        "Greek Salad",
        "Crisp, fresh, no cooking.",
        "mediterranean", 10, 0, 2, True, False, True,
        [
            ("cucumber", 1, "pc", True),
            ("tomato", 3, "pc", True),
            ("feta cheese", 100, "g", True),
            ("olive oil", 2, "tbsp", False),
            ("olives", 50, "g", False),
            ("salt", 1, "tsp", False),
        ],
        [
            "Chop cucumber and tomato.",
            "Toss with olives and feta.",
            "Drizzle with olive oil and salt.",
        ],
    ),
    (
        "Chocolate Mug Cake",
        "Single-serving microwave cake.",
        "american", 2, 2, 1, True, False, False,
        [
            ("flour", 4, "tbsp", True),
            ("sugar", 4, "tbsp", False),
            ("cocoa powder", 2, "tbsp", True),
            ("milk", 4, "tbsp", False),
            ("olive oil", 2, "tbsp", False),
        ],
        [
            "Mix all ingredients in a mug.",
            "Microwave 90 seconds. Eat warm.",
        ],
    ),
    (
        "Beef Tacos",
        "Weeknight tacos.",
        "mexican", 10, 15, 3, False, False, False,
        [
            ("ground beef", 400, "g", True),
            ("onion", 1, "pc", False),
            ("garlic", 2, "clove", False),
            ("taco seasoning", 2, "tbsp", False),
            ("tortilla", 6, "pc", True),
            ("tomato", 1, "pc", False),
            ("lettuce", 1, "pc", False),
        ],
        [
            "Saute onion and garlic; add beef and seasoning, brown 8 min.",
            "Warm tortillas.",
            "Fill with beef, chopped tomato, lettuce.",
        ],
    ),
    (
        "Miso Soup",
        "Light Japanese soup.",
        "japanese", 5, 10, 2, True, True, True,
        [
            ("miso paste", 2, "tbsp", True),
            ("tofu", 150, "g", False),
            ("seaweed", 5, "g", False),
            ("green onion", 1, "pc", False),
        ],
        [
            "Simmer 600ml water, add seaweed.",
            "Whisk in miso off heat.",
            "Add tofu cubes and green onion.",
        ],
    ),
    (
        "Hummus Plate",
        "Pantry-friendly meze.",
        "middle_eastern", 10, 0, 2, True, True, True,
        [
            ("chickpeas", 400, "g", True),
            ("tahini", 2, "tbsp", True),
            ("lemon", 1, "pc", False),
            ("garlic", 1, "clove", False),
            ("olive oil", 2, "tbsp", False),
            ("salt", 1, "tsp", False),
        ],
        [
            "Blend chickpeas, tahini, lemon, garlic, salt.",
            "Drizzle with olive oil. Serve with bread.",
        ],
    ),
    (
        "Chicken Rice",
        "Comforting one-pot dish.",
        "any", 10, 25, 3, False, False, True,
        [
            ("chicken", 400, "g", True),
            ("rice", 250, "g", True),
            ("yogurt", 100, "g", False),
            ("salt", 1, "tsp", False),
            ("onion", 1, "pc", False),
        ],
        [
            "Cook rice.",
            "Cook chicken with onion until golden.",
            "Mix and serve with yogurt.",
        ],
    ),

    # ── New recipes ────────────────────────────────────────────────────────────

    (
        "Lentil Soup",
        "Hearty Middle Eastern red lentil soup.",
        "middle_eastern", 10, 30, 4, True, True, True,
        [
            ("red lentils", 300, "g", True),
            ("onion", 1, "pc", False),
            ("garlic", 3, "clove", False),
            ("cumin", 2, "tsp", False),
            ("olive oil", 2, "tbsp", False),
            ("salt", 1, "tsp", False),
            ("lemon", 1, "pc", False),
        ],
        [
            "Saute onion and garlic in olive oil until soft.",
            "Add lentils, cumin, and 1 liter of water.",
            "Simmer 25 minutes until lentils are soft.",
            "Blend partially for a creamy texture.",
            "Squeeze lemon over each bowl before serving.",
        ],
    ),
    (
        "Spaghetti Bolognese",
        "Classic Italian meat sauce.",
        "italian", 10, 35, 4, False, False, False,
        [
            ("spaghetti", 400, "g", True),
            ("ground beef", 500, "g", True),
            ("onion", 1, "pc", False),
            ("garlic", 3, "clove", False),
            ("tomato paste", 2, "tbsp", False),
            ("tomato", 4, "pc", False),
            ("olive oil", 2, "tbsp", False),
            ("salt", 1, "tsp", False),
            ("black pepper", 1, "tsp", False),
        ],
        [
            "Saute onion and garlic in olive oil.",
            "Add ground beef and brown.",
            "Stir in tomato paste and chopped tomatoes.",
            "Simmer 30 minutes on low heat.",
            "Cook spaghetti, toss with sauce, serve.",
        ],
    ),
    (
        "Banana Pancakes",
        "Fluffy 2-ingredient pancakes.",
        "american", 5, 10, 2, True, False, True,
        [
            ("banana", 2, "pc", True),
            ("egg", 2, "pc", True),
            ("butter", 1, "tbsp", False),
        ],
        [
            "Mash bananas and whisk with eggs until smooth.",
            "Heat butter in a pan over medium heat.",
            "Pour small rounds of batter, cook 2 min per side.",
        ],
    ),
    (
        "Caesar Salad",
        "Crisp romaine with creamy caesar dressing.",
        "american", 15, 0, 2, True, False, False,
        [
            ("romaine lettuce", 1, "pc", True),
            ("parmesan", 50, "g", True),
            ("breadcrumbs", 30, "g", False),
            ("olive oil", 3, "tbsp", False),
            ("garlic", 1, "clove", False),
            ("lemon", 1, "pc", False),
            ("salt", 1, "tsp", False),
        ],
        [
            "Toast breadcrumbs with garlic in olive oil until golden.",
            "Chop romaine and place in a large bowl.",
            "Whisk olive oil, lemon juice, salt for dressing.",
            "Toss salad with dressing, top with croutons and parmesan.",
        ],
    ),
    (
        "Shakshuka",
        "Eggs poached in spiced tomato sauce.",
        "middle_eastern", 5, 20, 2, True, False, True,
        [
            ("egg", 4, "pc", True),
            ("tomato", 4, "pc", True),
            ("bell pepper", 1, "pc", False),
            ("onion", 1, "pc", False),
            ("garlic", 2, "clove", False),
            ("cumin", 1, "tsp", False),
            ("paprika", 1, "tsp", False),
            ("olive oil", 2, "tbsp", False),
            ("salt", 1, "tsp", False),
        ],
        [
            "Saute onion, pepper, and garlic in olive oil.",
            "Add chopped tomatoes, cumin, paprika, salt.",
            "Simmer 10 minutes until sauce thickens.",
            "Make wells in the sauce and crack eggs in.",
            "Cover and cook until eggs are just set.",
        ],
    ),
    (
        "Salmon with Lemon",
        "Pan-seared salmon with garlic butter.",
        "any", 5, 12, 2, False, False, True,
        [
            ("salmon", 400, "g", True),
            ("butter", 2, "tbsp", False),
            ("garlic", 2, "clove", False),
            ("lemon", 1, "pc", False),
            ("salt", 1, "tsp", False),
            ("black pepper", 1, "tsp", False),
        ],
        [
            "Season salmon with salt and pepper.",
            "Melt butter in a pan over medium-high heat.",
            "Cook salmon skin-side up for 4 minutes, flip.",
            "Add garlic and lemon juice, cook 3 more minutes.",
        ],
    ),
    (
        "Fried Rice",
        "Easy egg fried rice, better than takeout.",
        "chinese", 5, 15, 3, True, False, True,
        [
            ("rice", 300, "g", True),
            ("egg", 2, "pc", True),
            ("carrot", 1, "pc", False),
            ("peas", 100, "g", False),
            ("soy sauce", 3, "tbsp", False),
            ("garlic", 2, "clove", False),
            ("vegetable oil", 2, "tbsp", False),
        ],
        [
            "Cook and cool rice (day-old works best).",
            "Scramble eggs in oil and set aside.",
            "Stir fry carrot and garlic in oil.",
            "Add rice and peas, fry 3 minutes.",
            "Add soy sauce and eggs, toss together.",
        ],
    ),
    (
        "Black Bean Tacos",
        "Quick vegetarian tacos.",
        "mexican", 10, 10, 2, True, True, False,
        [
            ("black beans", 400, "g", True),
            ("tortilla", 6, "pc", True),
            ("avocado", 1, "pc", False),
            ("lime", 1, "pc", False),
            ("cumin", 1, "tsp", False),
            ("salt", 1, "tsp", False),
            ("tomato", 1, "pc", False),
        ],
        [
            "Warm black beans with cumin and salt.",
            "Slice avocado, dice tomato.",
            "Warm tortillas and fill with beans, avocado, tomato.",
            "Squeeze lime juice over tacos.",
        ],
    ),
    (
        "Mushroom Risotto",
        "Creamy Italian risotto with mushrooms.",
        "italian", 10, 30, 3, True, False, True,
        [
            ("rice", 300, "g", True),
            ("cremini mushroom", 250, "g", True),
            ("onion", 1, "pc", False),
            ("garlic", 2, "clove", False),
            ("butter", 2, "tbsp", False),
            ("parmesan", 50, "g", False),
            ("olive oil", 2, "tbsp", False),
            ("salt", 1, "tsp", False),
        ],
        [
            "Saute onion and garlic in olive oil.",
            "Add rice and toast for 2 minutes.",
            "Add warm broth one ladle at a time, stirring constantly.",
            "Meanwhile saute mushrooms in butter separately.",
            "Fold in mushrooms and parmesan at the end.",
        ],
    ),
    (
        "Chicken Quesadillas",
        "Crispy quesadillas stuffed with chicken and cheese.",
        "mexican", 10, 15, 2, False, False, False,
        [
            ("chicken breast", 300, "g", True),
            ("cheddar cheese", 150, "g", True),
            ("tortilla", 4, "pc", True),
            ("bell pepper", 1, "pc", False),
            ("onion", 1, "pc", False),
            ("olive oil", 1, "tbsp", False),
            ("salt", 1, "tsp", False),
        ],
        [
            "Cook chicken with onion and pepper, shred.",
            "Place filling and cheese on half of each tortilla.",
            "Fold and pan fry until golden and crispy on each side.",
            "Slice and serve with salsa or sour cream.",
        ],
    ),
    (
        "Tomato Soup",
        "Creamy roasted tomato soup.",
        "any", 10, 30, 4, True, False, True,
        [
            ("tomato", 800, "g", True),
            ("onion", 1, "pc", False),
            ("garlic", 3, "clove", False),
            ("butter", 2, "tbsp", False),
            ("heavy cream", 100, "ml", False),
            ("salt", 1, "tsp", False),
            ("black pepper", 1, "tsp", False),
        ],
        [
            "Roast tomatoes, onion, garlic at 200°C for 25 minutes.",
            "Blend until smooth.",
            "Pour into pot, add butter and cream, heat gently.",
            "Season with salt and pepper.",
        ],
    ),
    (
        "Oatmeal",
        "Warm breakfast oats with honey.",
        "any", 2, 8, 1, True, False, True,
        [
            ("oats", 80, "g", True),
            ("milk", 200, "ml", False),
            ("honey", 1, "tbsp", False),
            ("banana", 1, "pc", False),
        ],
        [
            "Cook oats in milk over medium heat for 5-7 minutes, stirring.",
            "Pour into bowl, top with sliced banana and honey.",
        ],
    ),
    (
        "Garlic Butter Shrimp",
        "Quick shrimp in garlic butter sauce.",
        "any", 5, 10, 2, False, False, True,
        [
            ("shrimp", 400, "g", True),
            ("butter", 3, "tbsp", False),
            ("garlic", 4, "clove", False),
            ("lemon", 1, "pc", False),
            ("salt", 1, "tsp", False),
            ("black pepper", 1, "tsp", False),
        ],
        [
            "Melt butter in a pan over medium-high heat.",
            "Add garlic and cook 1 minute.",
            "Add shrimp, cook 2-3 minutes per side until pink.",
            "Squeeze lemon over and serve immediately.",
        ],
    ),
    (
        "Spinach Dal",
        "Comforting Indian lentil and spinach curry.",
        "indian", 10, 30, 4, True, True, True,
        [
            ("red lentils", 250, "g", True),
            ("spinach", 200, "g", True),
            ("onion", 1, "pc", False),
            ("garlic", 3, "clove", False),
            ("ginger", 1, "tbsp", False),
            ("cumin", 1, "tsp", False),
            ("coconut milk", 200, "ml", False),
            ("salt", 1, "tsp", False),
        ],
        [
            "Saute onion, garlic, ginger with cumin.",
            "Add rinsed lentils and 600ml water.",
            "Simmer 20 minutes until soft.",
            "Stir in spinach and coconut milk, cook 5 more minutes.",
            "Serve with rice or bread.",
        ],
    ),
    (
        "Caprese Salad",
        "Italian salad with tomato, mozzarella and basil.",
        "italian", 5, 0, 2, True, False, True,
        [
            ("tomato", 3, "pc", True),
            ("mozzarella", 200, "g", True),
            ("olive oil", 2, "tbsp", False),
            ("salt", 1, "tsp", False),
            ("black pepper", 1, "tsp", False),
        ],
        [
            "Slice tomatoes and mozzarella into rounds.",
            "Alternate on a plate.",
            "Drizzle with olive oil, season with salt and pepper.",
        ],
    ),
    (
        "Thai Peanut Noodles",
        "Cold noodles in creamy peanut sauce.",
        "thai", 15, 10, 3, True, True, False,
        [
            ("pasta", 300, "g", True),
            ("peanut butter", 4, "tbsp", True),
            ("soy sauce", 3, "tbsp", False),
            ("lime", 1, "pc", False),
            ("garlic", 2, "clove", False),
            ("ginger", 1, "tsp", False),
            ("carrot", 1, "pc", False),
            ("cucumber", 1, "pc", False),
        ],
        [
            "Cook noodles, rinse with cold water.",
            "Whisk peanut butter, soy sauce, lime juice, garlic, ginger.",
            "Julienne carrot and cucumber.",
            "Toss noodles with sauce and vegetables.",
        ],
    ),
    (
        "Scrambled Eggs",
        "Soft creamy scrambled eggs.",
        "any", 2, 5, 1, True, False, True,
        [
            ("egg", 3, "pc", True),
            ("butter", 1, "tbsp", False),
            ("milk", 2, "tbsp", False),
            ("salt", 1, "pinch", False),
            ("black pepper", 1, "pinch", False),
        ],
        [
            "Whisk eggs with milk, salt, and pepper.",
            "Melt butter in pan over low heat.",
            "Add eggs and gently stir continuously until just set.",
            "Remove from heat while still slightly runny.",
        ],
    ),
    (
        "Beef Stir Fry",
        "Quick beef and vegetable stir fry.",
        "chinese", 15, 10, 3, False, False, True,
        [
            ("beef", 400, "g", True),
            ("broccoli", 1, "pc", True),
            ("bell pepper", 1, "pc", False),
            ("carrot", 1, "pc", False),
            ("soy sauce", 3, "tbsp", False),
            ("garlic", 2, "clove", False),
            ("ginger", 1, "tsp", False),
            ("vegetable oil", 2, "tbsp", False),
        ],
        [
            "Slice beef thinly against the grain.",
            "Marinate in soy sauce for 10 minutes.",
            "Stir fry beef in hot oil until browned, set aside.",
            "Stir fry vegetables, garlic, ginger 4 minutes.",
            "Return beef, toss everything together.",
        ],
    ),
    (
        "Chickpea Curry",
        "Easy vegan curry packed with flavour.",
        "indian", 10, 25, 4, True, True, True,
        [
            ("chickpeas", 400, "g", True),
            ("tomato", 3, "pc", True),
            ("onion", 1, "pc", False),
            ("garlic", 3, "clove", False),
            ("ginger", 1, "tbsp", False),
            ("cumin", 1, "tsp", False),
            ("paprika", 1, "tsp", False),
            ("coconut milk", 200, "ml", False),
            ("rice", 200, "g", False),
            ("salt", 1, "tsp", False),
        ],
        [
            "Saute onion, garlic, ginger until golden.",
            "Add cumin and paprika, stir 1 minute.",
            "Add chickpeas, chopped tomatoes, coconut milk.",
            "Simmer 20 minutes until thick.",
            "Serve over rice.",
        ],
    ),
    (
        "French Omelette",
        "Classic soft French omelette.",
        "french", 5, 5, 1, True, False, True,
        [
            ("egg", 3, "pc", True),
            ("butter", 1, "tbsp", False),
            ("salt", 1, "pinch", False),
            ("black pepper", 1, "pinch", False),
            ("cheddar cheese", 30, "g", False),
        ],
        [
            "Beat eggs with salt and pepper.",
            "Melt butter in a non-stick pan over medium heat.",
            "Pour in eggs and stir gently with a spatula.",
            "When almost set, add cheese and fold omelette in thirds.",
            "Slide onto plate and serve immediately.",
        ],
    ),
]


COMMON_INGREDIENTS = [
    # Produce
    "tomato", "cherry tomato", "roma tomato", "onion", "green onion", "red onion",
    "garlic", "potato", "sweet potato", "carrot", "broccoli", "cauliflower",
    "spinach", "kale", "romaine lettuce", "celery", "zucchini", "cucumber",
    "lemon", "lime", "avocado", "white mushroom", "cremini mushroom",
    "portobello mushroom", "shiitake mushroom", "bell pepper", "jalapeño",
    "corn", "peas", "eggplant", "ginger", "asparagus", "artichoke",
    "brussels sprouts", "cabbage", "bok choy", "leek", "radish", "turnip",
    "butternut squash", "pumpkin", "fennel", "beet", "arugula", "endive",
    "watercress", "swiss chard",
    # Protein
    "chicken", "chicken breast", "chicken thigh", "chicken drumstick",
    "beef", "ground beef", "beef steak", "lamb", "lamb chop", "pork",
    "pork chop", "bacon", "sausage", "salmon", "tuna", "shrimp", "cod",
    "tilapia", "sardine", "egg", "tofu", "tempeh", "edamame",
    "chickpeas", "lentils", "black beans", "kidney beans", "white beans",
    "red lentils", "green lentils", "split peas",
    # Dairy
    "milk", "butter", "cheddar cheese", "mozzarella", "parmesan",
    "feta cheese", "yogurt", "heavy cream", "sour cream", "cream cheese",
    "ricotta", "gouda", "brie", "goat cheese", "condensed milk",
    "whipping cream", "half and half",
    # Pantry
    "rice", "brown rice", "basmati rice", "jasmine rice", "pasta",
    "spaghetti", "penne", "fettuccine", "lasagna sheets", "bread",
    "sourdough bread", "pita bread", "naan", "tortilla",
    "olive oil", "vegetable oil", "coconut oil", "sesame oil",
    "flour", "whole wheat flour", "cornstarch", "baking powder", "baking soda",
    "sugar", "brown sugar", "powdered sugar", "maple syrup", "honey",
    "salt", "black pepper", "cumin", "paprika", "turmeric", "coriander",
    "cinnamon", "cayenne pepper", "chili flakes", "oregano", "thyme",
    "rosemary", "basil", "bay leaf", "curry powder", "garam masala",
    "soy sauce", "fish sauce", "oyster sauce", "worcestershire sauce",
    "tomato paste", "tomato sauce", "coconut milk", "vegetable broth",
    "chicken broth", "beef broth", "apple cider vinegar", "white vinegar",
    "balsamic vinegar", "dijon mustard", "hot sauce", "sriracha",
    "peanut butter", "tahini", "miso paste", "oats", "breadcrumbs",
    "panko", "cornmeal", "quinoa", "couscous", "bulgur",
    "canned tomatoes", "olives", "capers", "sun-dried tomatoes",
    "seaweed", "nori", "taco seasoning",
    # Fruit
    "apple", "banana", "strawberry", "blueberry", "mango", "orange",
    "grapes", "watermelon", "pineapple", "peach", "pear", "plum",
    "cherry", "raspberry", "blackberry", "kiwi", "papaya", "pomegranate",
    "lychee", "passion fruit", "fig", "date", "apricot", "nectarine",
    # Nuts & Seeds
    "almonds", "walnuts", "cashews", "peanuts", "pecans", "pine nuts",
    "sunflower seeds", "pumpkin seeds", "sesame seeds", "chia seeds",
    "flax seeds", "hemp seeds",
    # Baking & Sweets
    "chocolate chips", "cocoa powder", "vanilla extract", "yeast",
    "gelatin", "cornflour", "almond flour", "coconut flour",
]


class Command(BaseCommand):
    help = "Seed the database with starter units, ingredients, and recipes."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true",
                            help="Wipe recipes/ingredients/units before seeding.")

    @transaction.atomic
    def handle(self, *args, **opts):
        if opts.get("reset"):
            self.stdout.write("Wiping existing data...")
            PantryItem.objects.all().delete()
            RecipeIngredient.objects.all().delete()
            Step.objects.all().delete()
            Recipe.objects.all().delete()
            Ingredient.objects.all().delete()
            Unit.objects.all().delete()

        # Units (key by symbol for lookup below)
        unit_by_symbol = {}
        for full, sym in UNITS:
            u, _ = Unit.objects.get_or_create(symbol=sym, defaults={'name': full})
            unit_by_symbol[sym] = u

        # Common ingredients (for autocomplete)
        ing_created = 0
        for name in COMMON_INGREDIENTS:
            _, created_now = Ingredient.objects.get_or_create(name=name.strip().lower())
            if created_now:
                ing_created += 1
        if ing_created:
            self.stdout.write(f"Added {ing_created} new common ingredient(s).")

        created = 0
        for (title, desc, cuisine, prep, cook, servings,
             veg, vegan, gf, ings, steps) in RECIPES:
            if Recipe.objects.filter(name=title).exists():
                continue
            recipe = Recipe.objects.create(
                name=title, description=desc, cuisine=cuisine,
                prep_time_minutes=prep, cook_time_minutes=cook,
                servings=servings,
                is_vegetarian=veg, is_vegan=vegan, is_gluten_free=gf,
            )
            for ing_name, qty, unit_sym, is_main in ings:
                ing, _ = Ingredient.objects.get_or_create(name=ing_name)
                RecipeIngredient.objects.create(
                    recipe=recipe, ingredient=ing,
                    quantity=qty, unit=unit_by_symbol.get(unit_sym),
                    is_main=is_main,
                )
            for i, text in enumerate(steps, start=1):
                Step.objects.create(recipe=recipe, order=i, description=text)
            created += 1

        self.stdout.write(self.style.SUCCESS(
            f"Done. Created {created} new recipe(s). "
            f"Totals: units={Unit.objects.count()}, "
            f"ingredients={Ingredient.objects.count()}, "
            f"recipes={Recipe.objects.count()}."
        ))
