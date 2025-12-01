# reports/services/duplicate_check.py
"""
Duplicate Detection Service for Company Names

This service provides:
1. Exact match detection (case-insensitive)
2. Fuzzy/similar name matching
3. Smart suggestions for "Did you mean?"

Usage:
    from reports.services.duplicate_check import DuplicateCheckService
    
    result = DuplicateCheckService.check_duplicate("HMJ Plastic")
    if result['is_duplicate']:
        print(f"Exact match found: {result['exact_match']}")
    elif result['similar_matches']:
        print("Similar companies found:")
        for match in result['similar_matches']:
            print(f"  - {match['company'].company_name} ({match['similarity']}%)")
"""

from django.db.models import Q
from difflib import SequenceMatcher
import re


class DuplicateCheckService:
    """
    Service for checking duplicate and similar company names.
    
    Features:
    - Case-insensitive exact matching
    - Fuzzy matching with configurable threshold
    - Intelligent word-based matching
    - Company abbreviation handling
    """
    
    # Similarity threshold for "Did you mean?" suggestions (0.0 to 1.0)
    SIMILARITY_THRESHOLD = 0.65  # 65% similarity
    
    # Common words to ignore in matching
    IGNORE_WORDS = {
        'ltd', 'limited', 'inc', 'incorporated', 'corp', 'corporation',
        'co', 'company', 'plc', 'llc', 'gmbh', 'ag', 'sa', 'spa', 'srl',
        'pvt', 'private', 'public', 'the', 'and', '&'
    }
    
    @classmethod
    def check_duplicate(cls, company_name: str, exclude_id=None, country: str = None):
        """
        Check if a company name is a duplicate or similar to existing companies.
        
        Args:
            company_name: The company name to check
            exclude_id: UUID to exclude from results (for editing existing company)
            country: Optional country filter for more accurate matching
            
        Returns:
            dict: {
                'is_duplicate': bool,
                'exact_match': Company or None,
                'similar_matches': [
                    {'company': Company, 'similarity': float, 'match_type': str},
                    ...
                ]
            }
        """
        from reports.company_models import Company
        import logging
        logger = logging.getLogger(__name__)
        
        if not company_name or not company_name.strip():
            return {
                'is_duplicate': False,
                'exact_match': None,
                'similar_matches': []
            }
        
        normalized_name = cls._normalize_name(company_name)
        logger.info(f"Checking duplicate for normalized name: '{normalized_name}', exclude_id: {exclude_id} (type: {type(exclude_id)})")
        
        # Check for exact match (case-insensitive)
        exact_query = Company.objects.filter(
            company_name_normalized=normalized_name
        )
        
        logger.info(f"Found {exact_query.count()} companies with this normalized name before exclude")
        
        if exclude_id:
            # Convert to string for comparison if needed
            exact_query = exact_query.exclude(company_id=exclude_id)
            logger.info(f"After excluding {exclude_id}, found {exact_query.count()} companies")
        
        if country:
            exact_query = exact_query.filter(country__iexact=country)
        
        exact_match = exact_query.first()
        
        if exact_match:
            logger.info(f"Exact match found: {exact_match.company_id} ({exact_match.unique_key})")
            return {
                'is_duplicate': True,
                'exact_match': exact_match,
                'similar_matches': []
            }
        
        # Check for similar names
        similar_matches = cls._find_similar_companies(
            normalized_name, 
            company_name,
            exclude_id, 
            country
        )
        
        return {
            'is_duplicate': False,
            'exact_match': None,
            'similar_matches': similar_matches
        }
    
    @classmethod
    def _normalize_name(cls, name: str) -> str:
        """
        Normalize company name for comparison.
        - Convert to lowercase
        - Strip whitespace
        - Remove extra spaces
        """
        if not name:
            return ''
        return ' '.join(name.lower().split())
    
    @classmethod
    def _clean_name_for_matching(cls, name: str) -> str:
        """
        Clean company name for fuzzy matching.
        - Remove common company suffixes
        - Remove punctuation
        - Normalize whitespace
        """
        if not name:
            return ''
        
        # Lowercase
        clean = name.lower()
        
        # Remove punctuation
        clean = re.sub(r'[^\w\s]', ' ', clean)
        
        # Remove common words
        words = clean.split()
        words = [w for w in words if w not in cls.IGNORE_WORDS]
        
        return ' '.join(words)
    
    @classmethod
    def _calculate_similarity(cls, name1: str, name2: str) -> float:
        """
        Calculate similarity between two company names.
        Uses multiple algorithms and returns the highest score.
        """
        # Clean names for comparison
        clean1 = cls._clean_name_for_matching(name1)
        clean2 = cls._clean_name_for_matching(name2)
        
        if not clean1 or not clean2:
            return 0.0
        
        # Method 1: SequenceMatcher (overall similarity)
        seq_ratio = SequenceMatcher(None, clean1, clean2).ratio()
        
        # Method 2: Word overlap (Jaccard similarity)
        words1 = set(clean1.split())
        words2 = set(clean2.split())
        
        if words1 and words2:
            intersection = len(words1 & words2)
            union = len(words1 | words2)
            jaccard = intersection / union if union > 0 else 0
        else:
            jaccard = 0.0
        
        # Method 3: Starting characters match
        start_match = 0.0
        if clean1[:3] == clean2[:3]:  # First 3 chars match
            start_match = 0.3
        if clean1[:5] == clean2[:5]:  # First 5 chars match
            start_match = 0.5
        
        # Weighted combination
        # Prioritize sequence matching but boost if words overlap
        combined = (seq_ratio * 0.5) + (jaccard * 0.3) + (start_match * 0.2)
        
        return min(combined, 1.0)  # Cap at 1.0
    
    @classmethod
    def _find_similar_companies(cls, normalized_name: str, original_name: str, 
                                 exclude_id=None, country: str = None):
        """
        Find companies with similar names using fuzzy matching.
        
        Strategy:
        1. First filter by starting characters for performance
        2. Then apply full fuzzy matching
        """
        from reports.company_models import Company
        
        similar = []
        
        # Get first few characters for initial filtering
        if len(normalized_name) >= 3:
            prefix = normalized_name[:3]
        else:
            prefix = normalized_name
        
        # Also check cleaned name
        cleaned_name = cls._clean_name_for_matching(original_name)
        cleaned_words = cleaned_name.split()
        
        # Build query for potential matches
        # Match by: prefix, or containing first significant word
        query = Q(company_name_normalized__startswith=prefix)
        
        if cleaned_words:
            # Add query for first word match
            first_word = cleaned_words[0]
            if len(first_word) >= 3:
                query |= Q(company_name_normalized__contains=first_word)
        
        potential_matches = Company.objects.filter(query)
        
        if exclude_id:
            potential_matches = potential_matches.exclude(company_id=exclude_id)
        
        if country:
            # Prioritize same country but don't exclude others
            potential_matches = potential_matches.order_by(
                models.Case(
                    models.When(country__iexact=country, then=0),
                    default=1,
                    output_field=models.IntegerField()
                )
            )
        
        # Limit for performance
        potential_matches = potential_matches[:100]
        
        for company in potential_matches:
            similarity = cls._calculate_similarity(original_name, company.company_name)
            
            if similarity >= cls.SIMILARITY_THRESHOLD:
                match_type = cls._determine_match_type(similarity, original_name, company.company_name)
                
                similar.append({
                    'company': company,
                    'similarity': round(similarity * 100, 1),  # Convert to percentage
                    'match_type': match_type,
                    'company_id': str(company.company_id),
                    'unique_key': company.unique_key,
                    'company_name': company.company_name,
                    'country': company.country,
                    'status': company.status,
                })
        
        # Sort by similarity (highest first)
        similar.sort(key=lambda x: x['similarity'], reverse=True)
        
        # Return top 5 matches
        return similar[:5]
    
    @classmethod
    def _determine_match_type(cls, similarity: float, name1: str, name2: str) -> str:
        """
        Determine the type of match for user feedback.
        """
        if similarity >= 0.95:
            return 'Very Similar'
        elif similarity >= 0.85:
            return 'Similar'
        elif similarity >= 0.75:
            return 'Possibly Related'
        else:
            return 'Partial Match'
    
    @classmethod
    def bulk_check_duplicates(cls, company_names: list, country: str = None):
        """
        Check multiple company names at once for efficiency.
        
        Args:
            company_names: List of company names to check
            country: Optional country filter
            
        Returns:
            dict: {company_name: check_result, ...}
        """
        results = {}
        for name in company_names:
            results[name] = cls.check_duplicate(name, country=country)
        return results


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def check_company_duplicate(company_name: str, exclude_id=None, country: str = None):
    """
    Convenience function for checking duplicates.
    
    Usage:
        from reports.services.duplicate_check import check_company_duplicate
        
        result = check_company_duplicate("ABC Plastics", country="Germany")
    """
    return DuplicateCheckService.check_duplicate(company_name, exclude_id, country)


def find_similar_companies(company_name: str, limit: int = 5, country: str = None):
    """
    Find similar company names (for search suggestions).
    
    Usage:
        from reports.services.duplicate_check import find_similar_companies
        
        suggestions = find_similar_companies("HMJ", limit=10)
    """
    from reports.company_models import Company
    
    normalized = DuplicateCheckService._normalize_name(company_name)
    
    # Get potential matches
    if len(normalized) >= 2:
        companies = Company.objects.filter(
            company_name_normalized__icontains=normalized[:3]
        )
        
        if country:
            companies = companies.filter(country__iexact=country)
        
        companies = companies[:50]
        
        results = []
        for company in companies:
            similarity = DuplicateCheckService._calculate_similarity(
                company_name, company.company_name
            )
            results.append({
                'company': company,
                'similarity': round(similarity * 100, 1)
            })
        
        results.sort(key=lambda x: x['similarity'], reverse=True)
        return results[:limit]
    
    return []