from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('recipes', '0002_recipe_pantry_filters'),
    ]

    operations = [
        migrations.AddField(
            model_name='pantryitem',
            name='location',
            field=models.CharField(
                choices=[
                    ('pantry', 'Pantry'),
                    ('fridge', 'Fridge'),
                    ('freezer', 'Freezer'),
                ],
                default='pantry',
                max_length=10,
            ),
        ),
        migrations.AlterModelOptions(
            name='pantryitem',
            options={'ordering': ['location', 'ingredient__name']},
        ),
    ]
