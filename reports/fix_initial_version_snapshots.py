"""
Script to fix Initial Versions that were created before snapshot functionality was added.
Run this in Django shell:

python manage.py shell < reports/fix_initial_version_snapshots.py

Or copy and paste the contents into the Django shell.
"""

from reports.company_models import ProductionSiteVersion, Company

def fix_initial_version_snapshots():
    """
    Find all Initial Versions without proper snapshots and fix them.
    """
    # Find Initial Versions with empty or missing snapshots
    initial_versions = ProductionSiteVersion.objects.filter(
        is_initial=True
    ).select_related('production_site__company')
    
    fixed_count = 0
    
    for version in initial_versions:
        company = version.production_site.company
        needs_fix = False
        
        # Check if company_data_snapshot is empty or missing key fields
        if not version.company_data_snapshot or 'company_name' not in version.company_data_snapshot:
            needs_fix = True
        
        if needs_fix:
            print(f"Fixing Initial Version for: {company.company_name} ({company.unique_key})")
            
            # Create proper snapshots from current company data
            version.company_data_snapshot = {
                'company_name': company.company_name,
                'address_1': company.address_1 or '',
                'address_2': company.address_2 or '',
                'address_3': company.address_3 or '',
                'address_4': company.address_4 or '',
                'region': company.region or '',
                'country': company.country or '',
                'geographical_coverage': company.geographical_coverage or '',
                'phone_number': company.phone_number or '',
                'company_email': company.company_email or '',
                'website': company.website or '',
                'accreditation': company.accreditation or '',
                'parent_company': company.parent_company or '',
                'status': company.status,
                'unique_key': company.unique_key,
            }
            
            # Contact Information Snapshot
            version.contact_data_snapshot = {}
            for i in range(1, 5):
                version.contact_data_snapshot[f'title_{i}'] = getattr(company, f'title_{i}', '') or ''
                version.contact_data_snapshot[f'initials_{i}'] = getattr(company, f'initials_{i}', '') or ''
                version.contact_data_snapshot[f'surname_{i}'] = getattr(company, f'surname_{i}', '') or ''
                version.contact_data_snapshot[f'position_{i}'] = getattr(company, f'position_{i}', '') or ''
            
            # Notes Snapshot
            version.notes_snapshot = []
            for note in company.notes.all():
                version.notes_snapshot.append({
                    'note_id': str(note.note_id),
                    'note_type': note.note_type,
                    'content': note.content,
                    'created_at': note.created_at.isoformat() if note.created_at else None,
                    'created_by': note.created_by.username if note.created_by else None,
                    'is_pinned': note.is_pinned,
                })
            
            version.save()
            fixed_count += 1
            print(f"  - Fixed! Snapshot now has {len(version.company_data_snapshot)} company fields, {len(version.contact_data_snapshot)} contact fields")
    
    print(f"\nDone! Fixed {fixed_count} Initial Version(s).")
    return fixed_count


if __name__ == '__main__':
    fix_initial_version_snapshots()
