import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('recipes', '0001_initial'),
    ]

    operations = [
        # Recipe extra fields
        migrations.AddField(
            model_name='recipe',
            name='description',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='recipe',
            name='cuisine',
            field=models.CharField(
                choices=[
                    ('any', 'Any'), ('italian', 'Italian'), ('mexican', 'Mexican'),
                    ('indian', 'Indian'), ('chinese', 'Chinese'), ('japanese', 'Japanese'),
                    ('thai', 'Thai'), ('mediterranean', 'Mediterranean'),
                    ('middle_eastern', 'Middle Eastern'), ('american', 'American'),
                    ('french', 'French'), ('other', 'Other'),
                ],
                default='any', max_length=32,
            ),
        ),
        migrations.AddField(
            model_name='recipe',
            name='prep_time_minutes',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='recipe',
            name='cook_time_minutes',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='recipe',
            name='servings',
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AddField(
            model_name='recipe',
            name='is_vegetarian',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='recipe',
            name='is_vegan',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='recipe',
            name='is_gluten_free',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='recipe',
            name='image_url',
            field=models.URLField(blank=True, default=''),
        ),

        # Ordering / unique on existing models
        migrations.AlterModelOptions(
            name='ingredient',
            options={'ordering': ['name']},
        ),
        migrations.AlterField(
            model_name='ingredient',
            name='name',
            field=models.CharField(max_length=100, unique=True),
        ),
        migrations.AlterModelOptions(
            name='unit',
            options={'ordering': ['name']},
        ),
        migrations.AlterModelOptions(
            name='recipe',
            options={'ordering': ['name']},
        ),
        migrations.AlterModelOptions(
            name='recipeingredient',
            options={'ordering': ['id']},
        ),

        # New related_name on RecipeIngredient
        migrations.AlterField(
            model_name='recipeingredient',
            name='recipe',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='recipe_ingredients',
                to='recipes.recipe',
            ),
        ),
        migrations.AlterField(
            model_name='recipeingredient',
            name='unit',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to='recipes.unit',
            ),
        ),

        # New related_name on Step
        migrations.AlterField(
            model_name='step',
            name='recipe',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='steps',
                to='recipes.recipe',
            ),
        ),

        # New PantryItem table
        migrations.CreateModel(
            name='PantryItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantity', models.DecimalField(blank=True, decimal_places=2, max_digits=8, null=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('ingredient', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='pantry_item',
                    to='recipes.ingredient',
                )),
                ('unit', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    to='recipes.unit',
                )),
            ],
            options={'ordering': ['ingredient__name']},
        ),
    ]
