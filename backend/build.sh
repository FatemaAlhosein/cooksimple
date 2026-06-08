#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate
python manage.py seed_recipes

# Create superuser from environment variables if it doesn't exist
python manage.py shell -c "
from django.contrib.auth.models import User
import os
username = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'admin')
email = os.environ.get('DJANGO_SUPERUSER_EMAIL', '')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', '')
if password and not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username=username, email=email, password=password)
    print(f'Superuser {username} created.')
else:
    print('Superuser already exists or no password set.')
"

# Create demo user and seed their pantry
python manage.py shell -c "
from django.contrib.auth.models import User
from recipes.models import Ingredient, PantryItem, Unit

demo, created = User.objects.get_or_create(username='demo')
if created:
    demo.set_password('demo1234')
    demo.save()
    print('Demo user created.')
else:
    print('Demo user already exists.')

# Seed demo pantry if empty
if not PantryItem.objects.filter(owner=demo).exists():
    pantry_items = [
        ('tomato',      3,   'pc',   'pantry'),
        ('onion',       2,   'pc',   'pantry'),
        ('garlic',      1,   'clove','pantry'),
        ('olive oil',   3,   'tbsp', 'pantry'),
        ('pasta',       200, 'g',    'pantry'),
        ('egg',         4,   'pc',   'fridge'),
        ('butter',      50,  'g',    'fridge'),
        ('milk',        250, 'ml',   'fridge'),
        ('chicken breast', 2, 'pc',  'fridge'),
        ('lemon',       2,   'pc',   'fridge'),
        ('spinach',     100, 'g',    'fridge'),
        ('cheese',      100, 'g',    'fridge'),
        ('rice',        200, 'g',    'pantry'),
        ('flour',       200, 'g',    'pantry'),
        ('salt',        1,   'pinch','pantry'),
        ('black pepper',1,   'pinch','pantry'),
        ('banana',      3,   'pc',   'fridge'),
        ('carrot',      3,   'pc',   'fridge'),
        ('potato',      4,   'pc',   'pantry'),
        ('canned tomatoes', 1, 'pc', 'pantry'),
    ]
    unit_cache = {}
    for ing_name, qty, unit_sym, location in pantry_items:
        ing, _ = Ingredient.objects.get_or_create(name=ing_name)
        if unit_sym not in unit_cache:
            unit_cache[unit_sym] = Unit.objects.filter(symbol=unit_sym).first()
        PantryItem.objects.get_or_create(
            ingredient=ing, location=location, owner=demo,
            defaults={'quantity': qty, 'unit': unit_cache[unit_sym]}
        )
    print('Demo pantry seeded with 20 items.')
else:
    print('Demo pantry already exists.')
"
