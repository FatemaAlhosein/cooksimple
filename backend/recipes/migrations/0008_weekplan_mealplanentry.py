import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('recipes', '0007_pantryitem_stock_thresholds'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='WeekPlan',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('week_start', models.DateField(help_text='Monday of the planned week.')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('owner', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='week_plans',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['-week_start'],
                'unique_together': {('owner', 'week_start')},
            },
        ),
        migrations.CreateModel(
            name='MealPlanEntry',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('day', models.SmallIntegerField(help_text='0=Mon … 6=Sun')),
                ('slot', models.CharField(
                    choices=[('breakfast','Breakfast'),('lunch','Lunch'),('dinner','Dinner'),('snack','Snack')],
                    default='dinner',
                    max_length=12,
                )),
                ('plan', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='entries',
                    to='recipes.weekplan',
                )),
                ('recipe', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='meal_entries',
                    to='recipes.recipe',
                )),
            ],
            options={
                'ordering': ['day', 'slot'],
            },
        ),
    ]
