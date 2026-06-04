from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('recipes', '0003_pantryitem_location'),
    ]

    operations = [
        migrations.AddField(
            model_name='recipe',
            name='image',
            field=models.ImageField(blank=True, null=True, upload_to='recipes/'),
        ),
    ]
