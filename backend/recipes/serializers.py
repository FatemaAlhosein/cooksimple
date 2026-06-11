from rest_framework import serializers
from PIL import Image as PilImage

from .models import Ingredient, PantryItem, Recipe, RecipeIngredient, Step, Unit

ALLOWED_IMAGE_TYPES = {'image/jpeg', 'image/png', 'image/webp'}
MAX_IMAGE_SIZE_MB   = 5
MIN_IMAGE_DIM       = 200   # px


def validate_recipe_image(image):
    """Validate file type, size, and minimum dimensions."""
    if image.content_type not in ALLOWED_IMAGE_TYPES:
        raise serializers.ValidationError(
            "Only JPG, PNG, and WebP images are allowed."
        )
    if image.size > MAX_IMAGE_SIZE_MB * 1024 * 1024:
        raise serializers.ValidationError(
            f"Image must be under {MAX_IMAGE_SIZE_MB}MB."
        )
    try:
        img = PilImage.open(image)
        w, h = img.size
        if w < MIN_IMAGE_DIM or h < MIN_IMAGE_DIM:
            raise serializers.ValidationError(
                f"Image must be at least {MIN_IMAGE_DIM}×{MIN_IMAGE_DIM} pixels."
            )
    except Exception as e:
        if isinstance(e, serializers.ValidationError):
            raise
        raise serializers.ValidationError("Upload a valid image file.")
    finally:
        image.seek(0)   # reset so Django can still read it
    return image


class UnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = ['id', 'name', 'symbol']


class IngredientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ingredient
        fields = ['id', 'name']


class RecipeIngredientSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.CharField(source='ingredient.name', read_only=True)
    unit_symbol = serializers.CharField(source='unit.symbol', read_only=True, default='')
    unit_name = serializers.CharField(source='unit.name', read_only=True, default='')

    # write helpers — accept names instead of ids
    ingredient_input = serializers.CharField(write_only=True, required=False)
    unit_input = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = RecipeIngredient
        fields = [
            'id', 'ingredient', 'ingredient_name', 'ingredient_input',
            'quantity', 'unit', 'unit_name', 'unit_symbol', 'unit_input', 'is_main',
        ]
        extra_kwargs = {
            'ingredient': {'required': False},
            'unit': {'required': False, 'allow_null': True},
        }

    def validate(self, attrs):
        name = attrs.pop('ingredient_input', None)
        unit_text = attrs.pop('unit_input', None)
        if name and not attrs.get('ingredient'):
            ing, _ = Ingredient.objects.get_or_create(name=name.strip().lower())
            attrs['ingredient'] = ing
        if unit_text and not attrs.get('unit'):
            text = unit_text.strip().lower()
            if text:
                # Match by symbol first, then by name — prevents duplicate units
                from django.db.models import Q
                unit = Unit.objects.filter(
                    Q(symbol__iexact=text) | Q(name__iexact=text)
                ).first()
                if not unit:
                    unit = Unit.objects.create(name=text, symbol=text)
                attrs['unit'] = unit
        if not attrs.get('ingredient'):
            raise serializers.ValidationError(
                {'ingredient': 'Provide ingredient id or ingredient_input.'}
            )
        return attrs


class StepSerializer(serializers.ModelSerializer):
    class Meta:
        model = Step
        fields = ['id', 'order', 'description']


class RecipeListSerializer(serializers.ModelSerializer):
    total_time_minutes = serializers.IntegerField(read_only=True)
    image = serializers.ImageField(read_only=True, use_url=True)
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = Recipe
        fields = [
            'id', 'name', 'description', 'cuisine',
            'prep_time_minutes', 'cook_time_minutes', 'total_time_minutes',
            'servings', 'is_vegetarian', 'is_vegan', 'is_gluten_free',
            'image', 'image_url', 'is_owner',
        ]

    def get_is_owner(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.owner_id == request.user.id or request.user.is_staff


class RecipeDetailSerializer(serializers.ModelSerializer):
    recipe_ingredients = RecipeIngredientSerializer(many=True)
    steps = StepSerializer(many=True)
    total_time_minutes = serializers.IntegerField(read_only=True)
    # When sent via multipart, accept the file. When read, return absolute URL.
    image = serializers.ImageField(required=False, allow_null=True, use_url=True)

    def validate_image(self, value):
        if value:
            return validate_recipe_image(value)
        return value

    class Meta:
        model = Recipe
        fields = [
            'id', 'name', 'description', 'cuisine',
            'prep_time_minutes', 'cook_time_minutes', 'total_time_minutes',
            'servings', 'is_vegetarian', 'is_vegan', 'is_gluten_free',
            'image', 'image_url', 'recipe_ingredients', 'steps',
        ]

    def create(self, validated_data):
        ings = validated_data.pop('recipe_ingredients', [])
        steps = validated_data.pop('steps', [])
        recipe = Recipe.objects.create(**validated_data)
        for ri in ings:
            RecipeIngredient.objects.create(recipe=recipe, **ri)
        for idx, s in enumerate(steps, start=1):
            s.setdefault('order', idx)
            Step.objects.create(recipe=recipe, **s)
        return recipe

    def update(self, instance, validated_data):
        ings = validated_data.pop('recipe_ingredients', None)
        steps = validated_data.pop('steps', None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if ings is not None:
            instance.recipe_ingredients.all().delete()
            for ri in ings:
                RecipeIngredient.objects.create(recipe=instance, **ri)
        if steps is not None:
            instance.steps.all().delete()
            for idx, s in enumerate(steps, start=1):
                s.setdefault('order', idx)
                Step.objects.create(recipe=instance, **s)
        return instance


class PantryItemSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.CharField(source='ingredient.name', read_only=True)
    unit_symbol = serializers.CharField(source='unit.symbol', read_only=True, default='')
    unit_name = serializers.CharField(source='unit.name', read_only=True, default='')

    ingredient_input = serializers.CharField(write_only=True, required=False)
    unit_input = serializers.CharField(write_only=True, required=False, allow_blank=True)
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = PantryItem
        fields = [
            'id', 'ingredient', 'ingredient_name', 'ingredient_input',
            'location', 'quantity', 'unit', 'unit_name', 'unit_symbol',
            'unit_input', 'min_quantity', 'max_quantity', 'is_low_stock',
            'updated_at',
        ]
        extra_kwargs = {
            'ingredient': {'required': False},
            'unit': {'required': False, 'allow_null': True},
        }
        # We handle same-ingredient+same-location merging in the view,
        # so we suppress the auto-generated UniqueTogetherValidator here.
        validators = []

    def validate(self, attrs):
        name = attrs.pop('ingredient_input', None)
        unit_text = attrs.pop('unit_input', None)
        if name and not attrs.get('ingredient'):
            ing, _ = Ingredient.objects.get_or_create(name=name.strip().lower())
            attrs['ingredient'] = ing
        if unit_text and not attrs.get('unit'):
            text = unit_text.strip().lower()
            if text:
                # Match by symbol first, then by name — prevents duplicate units
                from django.db.models import Q
                unit = Unit.objects.filter(
                    Q(symbol__iexact=text) | Q(name__iexact=text)
                ).first()
                if not unit:
                    unit = Unit.objects.create(name=text, symbol=text)
                attrs['unit'] = unit
        if not attrs.get('ingredient'):
            raise serializers.ValidationError(
                {'ingredient': 'Provide ingredient id or ingredient_input.'}
            )
        return attrs
