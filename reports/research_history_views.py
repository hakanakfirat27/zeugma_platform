# reports/research_history_views.py
"""
API Views for Company Research History
Manage saved research results
"""

import logging
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Count, Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from .models import CompanyResearchResult
from .research_serializers import (
    CompanyResearchResultListSerializer,
    CompanyResearchResultDetailSerializer,
    CompanyResearchResultUpdateSerializer,
    CompanyResearchStatsSerializer,
)

logger = logging.getLogger(__name__)


class ResearchResultPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_research_history(request):
    """
    GET: List all research history for the current user
    
    Query Parameters:
    - page: Page number
    - page_size: Results per page (default: 20, max: 100)
    - search: Search in company name, city, industry
    - country: Filter by country
    - is_favorite: Filter favorites only (true/false)
    - date_from: Filter by date (YYYY-MM-DD)
    - date_to: Filter by date (YYYY-MM-DD)
    """
    user = request.user
    
    # Get queryset - only user's own research
    queryset = CompanyResearchResult.objects.filter(user=user)
    
    # Apply filters
    search = request.query_params.get('search', '').strip()
    if search:
        queryset = queryset.filter(
            Q(company_name__icontains=search) |
            Q(official_name__icontains=search) |
            Q(city__icontains=search) |
            Q(industry__icontains=search)
        )
    
    country = request.query_params.get('country', '').strip()
    if country:
        queryset = queryset.filter(country__iexact=country)
    
    is_favorite = request.query_params.get('is_favorite', '').strip().lower()
    if is_favorite == 'true':
        queryset = queryset.filter(is_favorite=True)
    
    date_from = request.query_params.get('date_from', '').strip()
    if date_from:
        try:
            date_from_obj = datetime.strptime(date_from, '%Y-%m-%d').date()
            queryset = queryset.filter(searched_at__date__gte=date_from_obj)
        except ValueError:
            pass
    
    date_to = request.query_params.get('date_to', '').strip()
    if date_to:
        try:
            date_to_obj = datetime.strptime(date_to, '%Y-%m-%d').date()
            queryset = queryset.filter(searched_at__date__lte=date_to_obj)
        except ValueError:
            pass
    
    # Paginate
    paginator = ResearchResultPagination()
    page = paginator.paginate_queryset(queryset, request)
    
    if page is not None:
        serializer = CompanyResearchResultListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
    
    serializer = CompanyResearchResultListSerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_research_detail(request, research_id):
    """
    GET: Get detailed information about a specific research result
    """
    user = request.user
    
    try:
        research = CompanyResearchResult.objects.get(
            research_id=research_id,
            user=user  # Only allow access to own research
        )
    except CompanyResearchResult.DoesNotExist:
        return Response(
            {'error': 'Research result not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = CompanyResearchResultDetailSerializer(research)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_research(request, research_id):
    """
    PATCH: Update research result (favorite status, notes)
    
    Body:
    {
        "is_favorite": true,
        "notes": "Important company for Project X"
    }
    """
    user = request.user
    
    try:
        research = CompanyResearchResult.objects.get(
            research_id=research_id,
            user=user
        )
    except CompanyResearchResult.DoesNotExist:
        return Response(
            {'error': 'Research result not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = CompanyResearchResultUpdateSerializer(
        research,
        data=request.data,
        partial=True
    )
    
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_research(request, research_id):
    """
    DELETE: Delete a research result
    """
    user = request.user
    
    try:
        research = CompanyResearchResult.objects.get(
            research_id=research_id,
            user=user
        )
    except CompanyResearchResult.DoesNotExist:
        return Response(
            {'error': 'Research result not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    research.delete()
    logger.info(f"Research result {research_id} deleted by {user.username}")
    
    return Response(
        {'success': True, 'message': 'Research result deleted'},
        status=status.HTTP_200_OK
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_delete_research(request):
    """
    POST: Delete multiple research results
    
    Body:
    {
        "research_ids": ["uuid1", "uuid2", "uuid3"]
    }
    """
    user = request.user
    research_ids = request.data.get('research_ids', [])
    
    if not research_ids:
        return Response(
            {'error': 'No research IDs provided'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Delete only user's own research
    deleted_count, _ = CompanyResearchResult.objects.filter(
        research_id__in=research_ids,
        user=user
    ).delete()
    
    logger.info(f"{deleted_count} research results deleted by {user.username}")
    
    return Response({
        'success': True,
        'deleted_count': deleted_count,
        'message': f'{deleted_count} research result(s) deleted'
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_research_stats(request):
    """
    GET: Get statistics about user's research history
    """
    user = request.user
    
    # Get all user's research
    all_research = CompanyResearchResult.objects.filter(user=user)
    
    # Calculate stats
    total_searches = all_research.count()
    
    # Today's searches
    today = timezone.now().date()
    searches_today = all_research.filter(searched_at__date=today).count()
    
    # This week's searches
    week_start = today - timedelta(days=today.weekday())
    searches_this_week = all_research.filter(searched_at__date__gte=week_start).count()
    
    # This month's searches
    month_start = today.replace(day=1)
    searches_this_month = all_research.filter(searched_at__date__gte=month_start).count()
    
    # Favorites
    favorite_count = all_research.filter(is_favorite=True).count()
    
    # Top countries (top 5)
    top_countries = list(
        all_research.values('country')
        .annotate(count=Count('country'))
        .order_by('-count')[:5]
    )
    
    # Top industries (top 5)
    top_industries = list(
        all_research.exclude(industry__isnull=True)
        .exclude(industry='')
        .values('industry')
        .annotate(count=Count('industry'))
        .order_by('-count')[:5]
    )
    
    # Recent searches (last 5)
    recent_searches = all_research.order_by('-searched_at')[:5]
    
    stats_data = {
        'total_searches': total_searches,
        'searches_today': searches_today,
        'searches_this_week': searches_this_week,
        'searches_this_month': searches_this_month,
        'favorite_count': favorite_count,
        'top_countries': top_countries,
        'top_industries': top_industries,
        'recent_searches': recent_searches,
    }
    
    serializer = CompanyResearchStatsSerializer(stats_data)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_favorite(request, research_id):
    """
    POST: Toggle favorite status of a research result
    """
    user = request.user
    
    try:
        research = CompanyResearchResult.objects.get(
            research_id=research_id,
            user=user
        )
    except CompanyResearchResult.DoesNotExist:
        return Response(
            {'error': 'Research result not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Toggle favorite
    research.is_favorite = not research.is_favorite
    research.save()
    
    return Response({
        'success': True,
        'is_favorite': research.is_favorite,
        'message': f"Research {'added to' if research.is_favorite else 'removed from'} favorites"
    })