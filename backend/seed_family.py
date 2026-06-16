import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vaccine_platform.settings')
django.setup()

from django.contrib.auth.models import User
from accounts.models import Family, FamilyMember, Profile

admin = User.objects.get(username='admin')
if not hasattr(admin, 'profile'):
    Profile.objects.create(user=admin, relation_with_baby='mother')
else:
    admin.profile.relation_with_baby = 'mother'
    admin.profile.save()
print('Updated admin profile')

family = Family.objects.first()
print(f'Using family: {family.name}')

FamilyMember.objects.filter(family=family).exclude(user=admin).delete()

demo_users = [
    ('爸爸', 'father', 'dad', 'dad@example.com', 'member'),
    ('奶奶', 'grandma', 'grandma', 'grandma@example.com', 'member'),
    ('爷爷', 'grandpa', 'grandpa', 'grandpa@example.com', 'member'),
]

for display_name, relation, username, email, role in demo_users:
    user, created = User.objects.get_or_create(
        username=username,
        defaults={'email': email, 'first_name': display_name}
    )
    if created:
        user.set_password('demo123456')
        user.save()
    
    if not hasattr(user, 'profile'):
        Profile.objects.create(user=user, relation_with_baby=relation)
    else:
        user.profile.relation_with_baby = relation
        user.profile.save()
    
    FamilyMember.objects.get_or_create(
        family=family,
        user=user,
        defaults={'role': role}
    )
    print(f'Added {display_name} ({username}) to family')

print('Done!')
