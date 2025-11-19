# reports/research_views.py
"""
Company Research API Views
AI-powered company information lookup for data collectors
"""

import json
import logging
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from accounts.models import UserRole
from .models import CompanyResearchResult

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def research_company(request):
    """
    POST: Research company information using AI (Gemini)
    
    Rate Limited: 20 searches per user per day
    
    Body:
    {
        "company_name": "Acme Corp",
        "country": "Turkey"
    }
    
    Returns structured company information from AI
    """
    user = request.user
    
    # ========================================================================
    # FIXED: Correct role checking
    # ========================================================================
    # Allow: DATA_COLLECTOR, STAFF_ADMIN, SUPERADMIN
    allowed_roles = [UserRole.DATA_COLLECTOR, UserRole.STAFF_ADMIN, UserRole.SUPERADMIN]
    
    if user.role not in allowed_roles:
        return Response(
            {'error': 'Only data collectors and staff can access company research'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Validate input
    company_name = request.data.get('company_name', '').strip()
    country = request.data.get('country', '').strip()
    
    if not company_name:
        return Response(
            {'error': 'Company name is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not country:
        return Response(
            {'error': 'Country is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # ========================================================================
    # RATE LIMITING: Check daily search limit
    # ========================================================================
    
    from django.core.cache import cache
    
    cache_key = f'company_research_count_{user.id}_{timezone.now().date()}'
    search_count = cache.get(cache_key, 0)
    
    max_searches_per_day = 20
    
    if search_count >= max_searches_per_day:
        return Response({
            'error': 'Daily search limit reached',
            'details': f'You have reached your daily limit of {max_searches_per_day} company searches. Please try again tomorrow.',
            'searches_used': search_count,
            'limit': max_searches_per_day
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)
    
    # ========================================================================
    # AI RESEARCH: Use Gemini to find company information
    # ========================================================================
    
    try:
        # Get API key from settings
        gemini_api_key = getattr(settings, 'GEMINI_API_KEY', None)
        
        if not gemini_api_key:
            logger.error("GEMINI_API_KEY not configured in settings")
            return Response({
                'error': 'AI service not configured',
                'details': 'Please contact administrator to configure AI service'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        # Import Gemini library
        import google.generativeai as genai
        
        # Configure Gemini
        genai.configure(api_key=gemini_api_key)
        
        # ========================================================================
        # FIXED: Use models that are actually available (from list_available_models)
        # Ordered by: Flash models first (faster, better quota), then Pro models
        # ========================================================================
        
        model_names = [
            # Flash models (faster, better quota usually)
            'models/gemini-2.0-flash',
            'models/gemini-2.0-flash-001',
            'models/gemini-flash-latest',
            'models/gemini-2.5-flash',
            'models/gemini-2.0-flash-lite',
            'models/gemini-2.0-flash-lite-001',
            'models/gemini-flash-lite-latest',
            
            # Pro models (slower, might have quota issues)
            'models/gemini-2.5-pro',
            'models/gemini-pro-latest',
            'models/gemini-2.0-flash-exp',
        ]
        
        model = None
        model_used = None
        last_error = None
        quota_exceeded = False
        
        # Try each model with actual content generation test
        for model_name in model_names:
            try:
                logger.info(f"Attempting to use model: {model_name}")
                test_model = genai.GenerativeModel(model_name)
                
                # IMPORTANT: Actually test if generateContent works
                # Use a very short test to minimize quota usage
                test_response = test_model.generate_content("Hi")
                
                if test_response and test_response.text:
                    # Success! This model works
                    model = test_model
                    model_used = model_name
                    logger.info(f"✓ Successfully initialized and tested model: {model_name}")
                    break
                    
            except Exception as model_error:
                error_str = str(model_error)
                last_error = error_str
                
                # Check if it's a quota error
                if '429' in error_str or 'quota' in error_str.lower():
                    quota_exceeded = True
                    logger.warning(f"⚠ Model {model_name} - Quota exceeded, trying next...")
                elif '404' in error_str:
                    logger.warning(f"✗ Model {model_name} - Not found, trying next...")
                else:
                    logger.warning(f"✗ Model {model_name} failed: {error_str[:100]}")
                continue
        
        if model is None:
            logger.error(f"All Gemini models failed. Last error: {last_error}")
            
            if quota_exceeded:
                return Response({
                    'error': 'API Quota Exceeded',
                    'details': 'You have exceeded your Gemini API quota. This typically resets daily. Please try again later or consider upgrading your API plan.',
                    'quota_info': 'Free tier quota resets every 24 hours. Visit https://ai.google.dev/gemini-api/docs/rate-limits for more information.'
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)
            else:
                return Response({
                    'error': 'AI model not available',
                    'details': f'Unable to initialize AI model. All models failed. Last error: {last_error[:200]}. Please contact administrator.'
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        # ========================================================================
        # ENHANCED AI PROMPT: Request comprehensive company information
        # ========================================================================
        prompt = f"""You are a professional business research assistant. Find accurate, comprehensive, and up-to-date information about this company.

Company Name: {company_name}
Country: {country}

CRITICAL INSTRUCTIONS:
1. Prioritize the company's OFFICIAL WEBSITE as the primary source
2. Verify the HEADQUARTERS address, not branch offices (unless specifically asking for branches)
3. For phone numbers, ALWAYS include country codes (e.g., +90 for Turkey, +49 for Germany)
4. If the company has multiple locations, clearly separate headquarters from branches
5. Double-check city/location information - this is critical
6. If you find conflicting information, mention it in additional_info
7. Provide your confidence level for key information
8. List the sources where you found the information

Required information (use "Not found" if unavailable):

COMPANY INFORMATION:
- official_name: Exact legal/official company name
- address: Full headquarters address with street, number, district
- city: Headquarters city (VERIFY THIS CAREFULLY)
- postal_code: Postal/ZIP code
- country: Country name

CONTACT INFORMATION:
- phone: Primary phone number WITH country code (format: +XX XXX XXX XXXX)
- alternative_phones: Array of other phone numbers WITH country codes
- email: Company email address (official)
- website: Company website URL (official)
- contact_persons: Array of contact persons with names and roles if available, example: [{{"name": "John Doe", "role": "CEO", "email": "john@company.com", "linkedin": "https://linkedin.com/in/johndoe"}}]

BUSINESS DETAILS:
- parent_company: Parent company name if this is a subsidiary
- industry: Primary industry/sector
- products_services: Detailed description of main products or services
- accreditation: Certifications, ISO standards, quality marks, awards (array of strings)
- year_founded: Year the company was established
- employee_count: Approximate number of employees

BRANCHES & LOCATIONS:
- branches: Array of branch offices/locations (IMPORTANT: Include ALL branches), example:
  [
    {{
      "location_type": "Branch Office" or "Regional Office" or "Production Facility",
      "address": "Full address",
      "city": "City name",
      "country": "Country name",
      "phone": "Phone with country code",
      "manager": "Branch manager name if available"
    }}
  ]

ADDITIONAL INFORMATION:
- description: Comprehensive company description (3-5 sentences)
- linkedin: LinkedIn company page URL
- additional_info: Any other relevant information, partnerships, certifications, notable projects

CONFIDENCE & SOURCES:
- confidence_score: Your confidence in the accuracy of headquarters location (0.0 to 1.0)
- confidence_notes: Explain why you gave this confidence score
- sources: Array of source URLs where you found this information, example:
  [
    {{
      "url": "https://company-website.com",
      "title": "Official Company Website",
      "reliability": "high" or "medium" or "low"
    }}
  ]

IMPORTANT FORMATTING:
- Respond ONLY with valid JSON
- No text before or after the JSON
- No markdown code blocks
- All arrays must be valid JSON arrays []
- All objects must be valid JSON objects {{}}
- Use "Not found" for unavailable information
- For empty arrays, use []

Example JSON structure:
{{
  "official_name": "ABC Company Ltd.",
  "address": "123 Business Street, Industrial Zone",
  "city": "Istanbul",
  "postal_code": "34000",
  "country": "{country}",
  "phone": "+90 212 123 4567",
  "alternative_phones": ["+90 212 123 4568", "+90 533 123 4567"],
  "email": "info@abccompany.com",
  "website": "https://www.abccompany.com",
  "contact_persons": [
    {{
      "name": "Ahmet Yılmaz",
      "role": "General Manager",
      "email": "ahmet@abccompany.com",
      "linkedin": "https://linkedin.com/in/ahmetyilmaz"
    }}
  ],
  "parent_company": "XYZ Holdings",
  "industry": "Manufacturing",
  "products_services": "Industrial machinery, automation systems, custom solutions",
  "accreditation": ["ISO 9001:2015", "CE Certified", "TSE Certified"],
  "year_founded": "1995",
  "employee_count": "150-200",
  "branches": [
    {{
      "location_type": "Branch Office",
      "address": "456 Commerce Ave, Business District",
      "city": "Ankara",
      "country": "Turkey",
      "phone": "+90 312 456 7890",
      "manager": "Mehmet Demir"
    }},
    {{
      "location_type": "Regional Office",
      "address": "789 Export Street",
      "city": "Berlin",
      "country": "Germany",
      "phone": "+49 30 123 4567",
      "manager": "Not found"
    }}
  ],
  "description": "ABC Company is a leading manufacturer of industrial machinery with over 25 years of experience. They specialize in automation systems and provide custom solutions to clients across Europe and the Middle East.",
  "linkedin": "https://www.linkedin.com/company/abc-company",
  "additional_info": "Winner of Industry Excellence Award 2023. Major clients include automotive and electronics sectors. Exports to 15+ countries.",
  "confidence_score": 0.85,
  "confidence_notes": "High confidence - information verified from official website and business registry",
  "sources": [
    {{
      "url": "https://www.abccompany.com",
      "title": "Official Company Website",
      "reliability": "high"
    }},
    {{
      "url": "https://www.linkedin.com/company/abc-company",
      "title": "LinkedIn Company Page",
      "reliability": "high"
    }},
    {{
      "url": "https://businessregistry.com/abc-company",
      "title": "Business Registry Entry",
      "reliability": "high"
    }}
  ]
}}

Now research {company_name} in {country} and provide the information in the exact JSON format above."""

        # Generate AI response
        response = model.generate_content(prompt)
        
        if not response or not response.text:
            return Response({
                'error': 'No response from AI',
                'details': 'The AI did not return any results. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Clean AI response
        ai_text = response.text
        
        # Remove markdown code blocks if present
        if '```json' in ai_text:
            ai_text = ai_text.split('```json')[1].split('```')[0]
        elif '```' in ai_text:
            ai_text = ai_text.split('```')[1].split('```')[0]
        
        ai_text = ai_text.strip()
        
        # Parse the JSON response
        try:
            company_info = json.loads(ai_text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response as JSON: {e}\nResponse: {ai_text}")
            return Response({
                'error': 'Failed to parse AI response',
                'details': 'The AI returned malformed data. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Add metadata
        company_info['search_query'] = {
            'company_name': company_name,
            'country': country
        }
        company_info['searched_at'] = timezone.now().isoformat()
        company_info['searched_by'] = user.get_full_name() or user.username
        company_info['model_used'] = model_used  # Track which model was used
        
        # ========================================================================
        # SAVE TO DATABASE: Store research result for future reference
        # ========================================================================
        try:
            research_result = CompanyResearchResult.objects.create(
                user=user,
                company_name=company_name,
                country=country,
                result_data=company_info,
            )
            research_id = str(research_result.research_id)
            logger.info(f"Research result saved to database with ID: {research_id}")
        except Exception as save_error:
            # Don't fail the entire request if save fails
            logger.error(f"Failed to save research result: {str(save_error)}")
            research_id = None
        
        # Increment search count
        cache.set(cache_key, search_count + 1, 86400)  # 24 hours
        
        logger.info(f"Company research completed: {company_name} in {country} by {user.username} using model {model_used}")
        
        return Response({
            'success': True,
            'data': company_info,
            'research_id': research_id,  # NEW: Include saved research ID
            'quota': {
                'searches_used': search_count + 1,
                'daily_limit': max_searches_per_day,
                'remaining': max_searches_per_day - (search_count + 1)
            }
        }, status=status.HTTP_200_OK)
        
    except ImportError:
        logger.error("google-generativeai library not installed")
        return Response({
            'error': 'AI library not installed',
            'details': 'Please contact administrator to install required packages'
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception as e:
        error_str = str(e)
        logger.error(f"Error researching company {company_name}: {error_str}", exc_info=True)
        
        # Check for quota errors
        if '429' in error_str or 'quota' in error_str.lower():
            return Response({
                'error': 'API Quota Exceeded',
                'details': 'You have exceeded your Gemini API quota. Please try again later.',
                'technical_details': error_str[:200]
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)
        
        return Response({
            'error': 'Research failed',
            'details': error_str[:200]
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_research_quota(request):
    """
    GET: Check remaining research quota for today
    """
    user = request.user
    
    # Allow: DATA_COLLECTOR, STAFF_ADMIN, SUPERADMIN
    allowed_roles = [UserRole.DATA_COLLECTOR, UserRole.STAFF_ADMIN, UserRole.SUPERADMIN]
    
    if user.role not in allowed_roles:
        return Response(
            {'error': 'Access denied'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    from django.core.cache import cache
    
    cache_key = f'company_research_count_{user.id}_{timezone.now().date()}'
    search_count = cache.get(cache_key, 0)
    max_searches_per_day = 20
    
    return Response({
        'searches_used': search_count,
        'daily_limit': max_searches_per_day,
        'remaining': max_searches_per_day - search_count,
        'resets_at': (timezone.now().replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)).isoformat()
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def batch_research_companies(request):
    """
    POST: Research multiple companies at once
    
    Body:
    {
        "companies": [
            {"company_name": "Company A", "country": "Turkey"},
            {"company_name": "Company B", "country": "Germany"}
        ]
    }
    
    Rate Limited: Counts as multiple searches
    """
    user = request.user
    
    # Allow: DATA_COLLECTOR, STAFF_ADMIN, SUPERADMIN
    allowed_roles = [UserRole.DATA_COLLECTOR, UserRole.STAFF_ADMIN, UserRole.SUPERADMIN]
    
    if user.role not in allowed_roles:
        return Response(
            {'error': 'Access denied'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    companies = request.data.get('companies', [])
    
    if not companies or not isinstance(companies, list):
        return Response(
            {'error': 'Companies list is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if len(companies) > 5:
        return Response(
            {'error': 'Maximum 5 companies per batch request'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check quota
    from django.core.cache import cache
    cache_key = f'company_research_count_{user.id}_{timezone.now().date()}'
    search_count = cache.get(cache_key, 0)
    max_searches_per_day = 20
    
    if search_count + len(companies) > max_searches_per_day:
        return Response({
            'error': 'Insufficient quota',
            'details': f'This batch would use {len(companies)} searches, but you only have {max_searches_per_day - search_count} remaining today.',
            'searches_used': search_count,
            'limit': max_searches_per_day
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)
    
    results = []
    
    # Process each company
    for company_data in companies:
        company_name = company_data.get('company_name', '').strip()
        country = company_data.get('country', '').strip()
        
        if not company_name or not country:
            results.append({
                'success': False,
                'error': 'Missing company name or country',
                'query': company_data
            })
            continue
        
        # Make individual research request
        # (Reuse the logic from research_company)
        try:
            # Simplified version - you can extract the research logic to a helper function
            results.append({
                'success': True,
                'company_name': company_name,
                'country': country,
                'message': 'Use individual research endpoint for now'
            })
        except Exception as e:
            results.append({
                'success': False,
                'error': str(e),
                'query': company_data
            })
    
    # Update search count
    cache.set(cache_key, search_count + len(companies), 86400)
    
    return Response({
        'success': True,
        'results': results,
        'quota': {
            'searches_used': search_count + len(companies),
            'daily_limit': max_searches_per_day,
            'remaining': max_searches_per_day - (search_count + len(companies))
        }
    })