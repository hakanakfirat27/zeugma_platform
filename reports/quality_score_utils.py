# QUALITY SCORE FIX - Simplified Version
# Works without get_category_fields dependency

from django.db import models


# ===========================================================================
# APPROACH 1: SIMPLE PERCENTAGE (Most Transparent)
# ===========================================================================

def calculate_simple_quality_score(site):
    """
    ✅ APPROACH 1: Simple percentage of filled fields
    Most transparent and honest approach.
    """
    # Define all fields that should be counted
    all_fields = [
        # Core fields
        'company_name', 'country', 'category',
        # Address fields
        'address_1', 'address_2', 'address_3', 'address_4', 'region',
        # Contact fields
        'phone_number', 'company_email', 'website',
        'geographical_coverage', 'accreditation', 'parent_company',
        # Contact persons
        'title_1', 'initials_1', 'surname_1', 'position_1',
        'title_2', 'initials_2', 'surname_2', 'position_2',
        'title_3', 'initials_3', 'surname_3', 'position_3',
        'title_4', 'initials_4', 'surname_4', 'position_4',
    ]
    
    # Add material fields
    material_fields = [
        'custom', 'proprietary_products', 'in_house', 'other_materials',
        'main_materials', 'polymer_range_number', 'polymer_range',
        'compound_in_house', 'buy_in_compounds',
    ]
    all_fields.extend(material_fields)
    
    total_fields = len(all_fields)
    filled_count = 0
    
    for field_name in all_fields:
        value = getattr(site, field_name, None)
        if value:
            # For boolean fields, we count them if they're True
            if isinstance(value, bool):
                if value:
                    filled_count += 1
            # For other fields, check if they're not empty
            elif str(value).strip():
                filled_count += 1
    
    if total_fields == 0:
        return 0.0
    
    quality_score = (filled_count / total_fields) * 100
    return round(quality_score, 1)


# ===========================================================================
# APPROACH 2: WEIGHTED SCORING (Important Fields Worth More)
# ===========================================================================

def calculate_weighted_quality_score(site):
    """
    ✅ APPROACH 2: Weighted scoring
    Core fields are worth more points than optional fields.
    """
    # Define field weights
    FIELD_WEIGHTS = {
        # Tier 1: Critical fields (15 points each)
        'company_name': 15,
        'country': 15,
        'category': 10,
        
        # Tier 2: Very important fields (10 points each)
        'website': 10,
        'phone_number': 10,
        'company_email': 10,
        
        # Tier 3: Important fields (5 points each)
        'address_1': 5,
        'surname_1': 5,
        'position_1': 5,
        'region': 5,
        
        # Tier 4: Nice to have (2 points each)
        'address_2': 2,
        'address_3': 2,
        'address_4': 2,
        'surname_2': 2,
        'surname_3': 2,
        'surname_4': 2,
        'parent_company': 2,
        'accreditation': 2,
        # All other fields: 1 point each
    }
    
    total_possible_points = 100
    earned_points = 0
    
    for field_name, weight in FIELD_WEIGHTS.items():
        value = getattr(site, field_name, None)
        if value:
            if isinstance(value, bool):
                if value:
                    earned_points += weight
            elif str(value).strip():
                earned_points += weight
    
    quality_score = (earned_points / total_possible_points) * 100
    return round(min(quality_score, 100), 1)


# ===========================================================================
# APPROACH 3: TIERED SCORING - SIMPLIFIED (Recommended) ⭐
# ===========================================================================

def calculate_tiered_quality_score(site):
    """
    ✅ APPROACH 3: Tiered quality scoring (RECOMMENDED)
    
    Simplified version that doesn't require get_category_fields.
    
    Divides fields into tiers with different weights:
    - Required fields: 0-40 points
    - Core contact info: 0-30 points
    - Address & company details: 0-20 points
    - Additional contacts: 0-10 points
    
    This gives reasonable scores that reflect actual data quality.
    """
    score = 0.0
    
    # TIER 1: Required Fields (40 points max)
    required_fields = ['company_name', 'country', 'category']
    required_filled = 0
    for field_name in required_fields:
        value = getattr(site, field_name, None)
        if value and str(value).strip():
            required_filled += 1
    
    tier1_score = (required_filled / len(required_fields)) * 40
    score += tier1_score
    
    # TIER 2: Core Contact Information (30 points max)
    core_contact_fields = [
        'website',
        'phone_number',
        'company_email',
        'surname_1',  # Primary contact surname
        'position_1'   # Primary contact position
    ]
    contact_filled = 0
    for field_name in core_contact_fields:
        value = getattr(site, field_name, None)
        if value and str(value).strip():
            contact_filled += 1
    
    tier2_score = (contact_filled / len(core_contact_fields)) * 30
    score += tier2_score
    
    # TIER 3: Address & Company Details (20 points max)
    address_fields = [
        'address_1',
        'region',
        'geographical_coverage',
        'parent_company',
        'main_materials',
        'polymer_range'
    ]
    address_filled = 0
    for field_name in address_fields:
        value = getattr(site, field_name, None)
        if value and str(value).strip():
            address_filled += 1
    
    tier3_score = (address_filled / len(address_fields)) * 20
    score += tier3_score
    
    # TIER 4: Additional Contacts (10 points max)
    additional_contact_fields = [
        'surname_2', 'position_2',
        'surname_3', 'position_3',
        'surname_4', 'position_4',
    ]
    additional_filled = 0
    for field_name in additional_contact_fields:
        value = getattr(site, field_name, None)
        if value and str(value).strip():
            additional_filled += 1
    
    if len(additional_contact_fields) > 0:
        tier4_score = (additional_filled / len(additional_contact_fields)) * 10
        score += tier4_score
    
    return round(score, 1)


# ===========================================================================
# HELPER FUNCTION: Count Non-Empty Fields
# ===========================================================================

def count_non_empty_fields(site):
    """
    Count how many fields have been filled in for a site.
    """
    all_fields = [
        'company_name', 'country', 'category',
        'address_1', 'address_2', 'address_3', 'address_4', 'region',
        'phone_number', 'company_email', 'website',
        'geographical_coverage', 'accreditation', 'parent_company',
        'title_1', 'initials_1', 'surname_1', 'position_1',
        'title_2', 'initials_2', 'surname_2', 'position_2',
        'title_3', 'initials_3', 'surname_3', 'position_3',
        'title_4', 'initials_4', 'surname_4', 'position_4',
    ]
    
    filled_count = 0
    for field_name in all_fields:
        value = getattr(site, field_name, None)
        if value:
            if isinstance(value, bool):
                if value:
                    filled_count += 1
            elif str(value).strip():
                filled_count += 1
    
    return filled_count


# ===========================================================================
# MAIN FUNCTION: Calculate Quality Score
# ===========================================================================

def calculate_data_quality_score(site):
    """
    Main function to calculate data quality score.
    Change the approach by uncommenting the one you want to use.
    """
    
    # OPTION 1: Simple percentage (most transparent)
    # return calculate_simple_quality_score(site)
    
    # OPTION 2: Weighted scoring (important fields worth more)
    # return calculate_weighted_quality_score(site)
    
    # OPTION 3: Tiered scoring (RECOMMENDED) ⭐
    return calculate_tiered_quality_score(site)


# ===========================================================================
# COMPARISON: Show What Each Approach Gives
# ===========================================================================

def compare_quality_scores(site):
    """
    Helper function to see what score each approach gives.
    Useful for testing and deciding which approach to use.
    """
    filled_count = count_non_empty_fields(site)
    
    simple = calculate_simple_quality_score(site)
    weighted = calculate_weighted_quality_score(site)
    tiered = calculate_tiered_quality_score(site)
    
    print(f"\n{'='*60}")
    print(f"Quality Score Comparison for: {site.company_name}")
    print(f"{'='*60}")
    print(f"Fields filled: {filled_count}")
    print(f"\nAPPROACH 1 (Simple): {simple}%")
    print(f"APPROACH 2 (Weighted): {weighted}%")
    print(f"APPROACH 3 (Tiered): {tiered}%")
    print(f"{'='*60}\n")
    
    return {
        'simple': simple,
        'weighted': weighted,
        'tiered': tiered,
        'filled_count': filled_count,
    }