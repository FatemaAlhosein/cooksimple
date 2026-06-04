from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views
from . import auth_views

router = DefaultRouter()
router.register(r'recipes', views.RecipeViewSet, basename='recipe')
router.register(r'ingredients', views.IngredientViewSet, basename='ingredient')
router.register(r'units', views.UnitViewSet, basename='unit')
router.register(r'pantry', views.PantryItemViewSet, basename='pantry')

urlpatterns = [
    # CRUD viewsets
    path('', include(router.urls)),

    # Auth
    path('auth/register/', auth_views.register,    name='auth-register'),
    path('auth/login/',    auth_views.login_view,  name='auth-login'),
    path('auth/logout/',   auth_views.logout_view, name='auth-logout'),
    path('auth/me/',       auth_views.me,          name='auth-me'),

    # Suggestion + shopping list
    path('suggestions/', views.suggestions, name='suggestions'),
    path('shopping-list/', views.shopping_list, name='shopping-list'),

    # Backward-compat with the original App.jsx
    path('cook-now/', views.cook_now, name='cook-now'),
    path('recipes-detail/<int:pk>/', views.recipe_detail, name='recipe-detail-legacy'),
]
