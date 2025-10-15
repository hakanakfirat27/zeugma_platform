from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Sync user roles with is_staff and is_superuser flags'

    def handle(self, *args, **options):
        self.stdout.write('Starting user role synchronization...')

        updated_count = 0

        for user in User.objects.all():
            old_is_staff = user.is_staff
            old_is_superuser = user.is_superuser

            # Sync based on role
            if user.role == 'SUPERADMIN':
                user.is_superuser = True
                user.is_staff = True
            elif user.role == 'STAFF_ADMIN':
                user.is_staff = True
                user.is_superuser = False
            else:
                # Clients and Guests
                user.is_staff = False
                user.is_superuser = False

            # Check if anything changed
            if old_is_staff != user.is_staff or old_is_superuser != user.is_superuser:
                user.save()
                updated_count += 1

                self.stdout.write(
                    self.style.SUCCESS(
                        f'✓ Updated {user.username}: '
                        f'role={user.role}, '
                        f'is_staff={user.is_staff}, '
                        f'is_superuser={user.is_superuser}'
                    )
                )

        if updated_count == 0:
            self.stdout.write(self.style.WARNING('No users needed updating.'))
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f'\nSuccessfully updated {updated_count} user(s)!'
                )
            )