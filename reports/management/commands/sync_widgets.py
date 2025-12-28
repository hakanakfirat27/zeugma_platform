from django.core.management.base import BaseCommand
from reports.models import DashboardWidget
from reports.widget_registry import AVAILABLE_WIDGETS

# --- Command Class ---
class Command(BaseCommand):
    help = 'Synchronizes widget registry with database. Run this after adding new widgets.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--delete-orphans',
            action='store_true',
            help='Delete widgets from database that are not in the registry',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting widget synchronization...'))

        created_count = 0
        updated_count = 0
        deleted_count = 0

        # Get all widget keys from registry
        registry_keys = {w['widget_key'] for w in AVAILABLE_WIDGETS}

        # Sync widgets from registry to database
        for widget_def in AVAILABLE_WIDGETS:
            widget, created = DashboardWidget.objects.update_or_create(
                widget_key=widget_def['widget_key'],
                defaults={
                    'title': widget_def['title'],
                    'description': widget_def['description'],
                    'icon': widget_def['icon'],
                    'category': widget_def['category'],
                    'width': widget_def['width'],
                    'height': widget_def['height'],
                    'is_enabled': widget_def['is_enabled'],
                    'display_order': widget_def['display_order'],
                }
            )

            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'  ✓ Created widget: {widget.title}')
                )
            else:
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'  ↻ Updated widget: {widget.title}')
                )

        # Check for widgets in database that are not in registry
        db_widgets = DashboardWidget.objects.all()
        orphaned_widgets = [w for w in db_widgets if w.widget_key not in registry_keys]

        if orphaned_widgets:
            self.stdout.write(
                self.style.WARNING(f'\n⚠ Found {len(orphaned_widgets)} orphaned widgets in database:')
            )
            for widget in orphaned_widgets:
                self.stdout.write(f'  - {widget.title} ({widget.widget_key}) [category: {widget.category}]')
            
            if options['delete_orphans']:
                for widget in orphaned_widgets:
                    widget.delete()
                    deleted_count += 1
                    self.stdout.write(
                        self.style.ERROR(f'  ✗ Deleted widget: {widget.title}')
                    )
            else:
                self.stdout.write(
                    self.style.NOTICE('\n  To delete orphaned widgets, run: python manage.py sync_widgets --delete-orphans')
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\n✓ Synchronization complete: {created_count} created, {updated_count} updated, {deleted_count} deleted'
            )
        )
