from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('recipes', '0006_add_owner_to_recipe_and_pantry'),
    ]

    operations = [
        migrations.AddField(
            model_name='pantryitem',
            name='min_quantity',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Alert threshold: quantity at or below this is considered low stock.',
                max_digits=8,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='pantryitem',
            name='max_quantity',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Normal full stock level (used as the restock-to target).',
                max_digits=8,
                null=True,
            ),
        ),
    ]
