from django.contrib import admin
from django.utils.html import format_html

from .models import Ingredient, PantryItem, Recipe, RecipeIngredient, Step, Unit


class RecipeIngredientInline(admin.TabularInline):
    model = RecipeIngredient
    extra = 1
    autocomplete_fields = ('ingredient', 'unit')


class StepInline(admin.TabularInline):
    model = Step
    extra = 1
    ordering = ('order',)


@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'thumbnail', 'cuisine', 'prep_time_minutes', 'cook_time_minutes',
        'is_vegetarian', 'is_vegan', 'is_gluten_free',
    )
    list_display_links = ('name',)
    list_filter = ('cuisine', 'is_vegetarian', 'is_vegan', 'is_gluten_free')
    search_fields = ('name', 'description')
    inlines = [RecipeIngredientInline, StepInline]
    readonly_fields = ('thumbnail_preview',)
    fieldsets = (
        (None, {
            'fields': ('name', 'description', 'cuisine', 'servings')
        }),
        ('Time', {
            'fields': ('prep_time_minutes', 'cook_time_minutes')
        }),
        ('Diet', {
            'fields': ('is_vegetarian', 'is_vegan', 'is_gluten_free')
        }),
        ('Image', {
            'fields': ('image', 'thumbnail_preview', 'image_url')
        }),
    )

    def thumbnail(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="height:32px;width:32px;object-fit:cover;border-radius:4px;" />',
                obj.image.url,
            )
        return ""
    thumbnail.short_description = ""

    def thumbnail_preview(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="max-height:200px;border-radius:8px;" />',
                obj.image.url,
            )
        return "(no image uploaded)"
    thumbnail_preview.short_description = "Preview"


@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)


@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = ('name', 'symbol')
    search_fields = ('name', 'symbol')


@admin.register(PantryItem)
class PantryItemAdmin(admin.ModelAdmin):
    list_display = ('ingredient', 'location', 'quantity', 'unit', 'updated_at')
    list_filter = ('location',)
    autocomplete_fields = ('ingredient', 'unit')
    search_fields = ('ingredient__name',)


admin.site.register(RecipeIngredient)
admin.site.register(Step)
