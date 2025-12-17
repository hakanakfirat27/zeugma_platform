# dashboard/views.py

from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.decorators import staff_required
from .models import UserActivity, RecentlyViewedCompany, ActivityType
from .serializers import (
    UserActivitySerializer,
    RecentlyViewedCompanySerializer,
)


# Comprehensive country to flag emoji mapping
COUNTRY_FLAGS = {
    # Western Europe
    'Germany': '🇩🇪', 'DE': '🇩🇪',
    'France': '🇫🇷', 'FR': '🇫🇷',
    'Italy': '🇮🇹', 'IT': '🇮🇹',
    'Spain': '🇪🇸', 'ES': '🇪🇸',
    'Portugal': '🇵🇹', 'PT': '🇵🇹',
    'United Kingdom': '🇬🇧', 'UK': '🇬🇧', 'GB': '🇬🇧', 'Great Britain': '🇬🇧', 'England': '🇬🇧',
    'Ireland': '🇮🇪', 'IE': '🇮🇪',
    'Netherlands': '🇳🇱', 'NL': '🇳🇱', 'Holland': '🇳🇱',
    'Belgium': '🇧🇪', 'BE': '🇧🇪',
    'Luxembourg': '🇱🇺', 'LU': '🇱🇺',
    'Austria': '🇦🇹', 'AT': '🇦🇹',
    'Switzerland': '🇨🇭', 'CH': '🇨🇭',
    
    # Northern Europe
    'Sweden': '🇸🇪', 'SE': '🇸🇪',
    'Denmark': '🇩🇰', 'DK': '🇩🇰',
    'Finland': '🇫🇮', 'FI': '🇫🇮',
    'Norway': '🇳🇴', 'NO': '🇳🇴',
    'Iceland': '🇮🇸', 'IS': '🇮🇸',
    
    # Central/Eastern Europe
    'Poland': '🇵🇱', 'PL': '🇵🇱',
    'Czech Republic': '🇨🇿', 'CZ': '🇨🇿', 'Czechia': '🇨🇿',
    'Slovakia': '🇸🇰', 'SK': '🇸🇰',
    'Hungary': '🇭🇺', 'HU': '🇭🇺',
    'Romania': '🇷🇴', 'RO': '🇷🇴',
    'Bulgaria': '🇧🇬', 'BG': '🇧🇬',
    'Slovenia': '🇸🇮', 'SI': '🇸🇮',
    'Croatia': '🇭🇷', 'HR': '🇭🇷',
    'Serbia': '🇷🇸', 'RS': '🇷🇸',
    'Bosnia and Herzegovina': '🇧🇦', 'BA': '🇧🇦',
    'North Macedonia': '🇲🇰', 'MK': '🇲🇰', 'Macedonia': '🇲🇰',
    'Albania': '🇦🇱', 'AL': '🇦🇱',
    'Kosovo': '🇽🇰', 'XK': '🇽🇰',
    'Montenegro': '🇲🇪', 'ME': '🇲🇪',
    
    # Baltic States
    'Estonia': '🇪🇪', 'EE': '🇪🇪',
    'Latvia': '🇱🇻', 'LV': '🇱🇻',
    'Lithuania': '🇱🇹', 'LT': '🇱🇹',
    
    # Southern Europe
    'Greece': '🇬🇷', 'GR': '🇬🇷',
    'Cyprus': '🇨🇾', 'CY': '🇨🇾',
    'Malta': '🇲🇹', 'MT': '🇲🇹',
    
    # Eastern Europe / CIS
    'Russia': '🇷🇺', 'RU': '🇷🇺', 'Russian Federation': '🇷🇺',
    'Ukraine': '🇺🇦', 'UA': '🇺🇦',
    'Belarus': '🇧🇾', 'BY': '🇧🇾',
    'Moldova': '🇲🇩', 'MD': '🇲🇩',
    'Kazakhstan': '🇰🇿', 'KZ': '🇰🇿',
    'Azerbaijan': '🇦🇿', 'AZ': '🇦🇿',
    'Georgia': '🇬🇪', 'GE': '🇬🇪',
    'Armenia': '🇦🇲', 'AM': '🇦🇲',
    'Uzbekistan': '🇺🇿', 'UZ': '🇺🇿',
    
    # Middle East
    'Turkey': '🇹🇷', 'TR': '🇹🇷', 'Türkiye': '🇹🇷',
    'Israel': '🇮🇱', 'IL': '🇮🇱',
    'United Arab Emirates': '🇦🇪', 'AE': '🇦🇪', 'UAE': '🇦🇪',
    'Saudi Arabia': '🇸🇦', 'SA': '🇸🇦',
    'Qatar': '🇶🇦', 'QA': '🇶🇦',
    'Kuwait': '🇰🇼', 'KW': '🇰🇼',
    'Bahrain': '🇧🇭', 'BH': '🇧🇭',
    'Oman': '🇴🇲', 'OM': '🇴🇲',
    'Jordan': '🇯🇴', 'JO': '🇯🇴',
    'Lebanon': '🇱🇧', 'LB': '🇱🇧',
    'Iran': '🇮🇷', 'IR': '🇮🇷',
    'Iraq': '🇮🇶', 'IQ': '🇮🇶',
    
    # North America
    'USA': '🇺🇸', 'US': '🇺🇸', 'United States': '🇺🇸', 'United States of America': '🇺🇸',
    'Canada': '🇨🇦', 'CA': '🇨🇦',
    'Mexico': '🇲🇽', 'MX': '🇲🇽',
    
    # South America
    'Brazil': '🇧🇷', 'BR': '🇧🇷',
    'Argentina': '🇦🇷', 'AR': '🇦🇷',
    'Chile': '🇨🇱', 'CL': '🇨🇱',
    'Colombia': '🇨🇴', 'CO': '🇨🇴',
    'Peru': '🇵🇪', 'PE': '🇵🇪',
    'Venezuela': '🇻🇪', 'VE': '🇻🇪',
    'Ecuador': '🇪🇨', 'EC': '🇪🇨',
    'Uruguay': '🇺🇾', 'UY': '🇺🇾',
    'Paraguay': '🇵🇾', 'PY': '🇵🇾',
    'Bolivia': '🇧🇴', 'BO': '🇧🇴',
    
    # Asia
    'China': '🇨🇳', 'CN': '🇨🇳',
    'Japan': '🇯🇵', 'JP': '🇯🇵',
    'South Korea': '🇰🇷', 'KR': '🇰🇷', 'Korea': '🇰🇷',
    'North Korea': '🇰🇵', 'KP': '🇰🇵',
    'India': '🇮🇳', 'IN': '🇮🇳',
    'Pakistan': '🇵🇰', 'PK': '🇵🇰',
    'Bangladesh': '🇧🇩', 'BD': '🇧🇩',
    'Indonesia': '🇮🇩', 'ID': '🇮🇩',
    'Malaysia': '🇲🇾', 'MY': '🇲🇾',
    'Singapore': '🇸🇬', 'SG': '🇸🇬',
    'Thailand': '🇹🇭', 'TH': '🇹🇭',
    'Vietnam': '🇻🇳', 'VN': '🇻🇳',
    'Philippines': '🇵🇭', 'PH': '🇵🇭',
    'Taiwan': '🇹🇼', 'TW': '🇹🇼',
    'Hong Kong': '🇭🇰', 'HK': '🇭🇰',
    'Sri Lanka': '🇱🇰', 'LK': '🇱🇰',
    'Myanmar': '🇲🇲', 'MM': '🇲🇲',
    'Cambodia': '🇰🇭', 'KH': '🇰🇭',
    
    # Africa
    'South Africa': '🇿🇦', 'ZA': '🇿🇦',
    'Egypt': '🇪🇬', 'EG': '🇪🇬',
    'Morocco': '🇲🇦', 'MA': '🇲🇦',
    'Tunisia': '🇹🇳', 'TN': '🇹🇳',
    'Algeria': '🇩🇿', 'DZ': '🇩🇿',
    'Nigeria': '🇳🇬', 'NG': '🇳🇬',
    'Kenya': '🇰🇪', 'KE': '🇰🇪',
    'Ethiopia': '🇪🇹', 'ET': '🇪🇹',
    'Ghana': '🇬🇭', 'GH': '🇬🇭',
    
    # Oceania
    'Australia': '🇦🇺', 'AU': '🇦🇺',
    'New Zealand': '🇳🇿', 'NZ': '🇳🇿',
}


def get_flag_for_country(country_name):
    """Get flag emoji for a country name, handling various formats."""
    if not country_name:
        return '🏳️'
    
    # Try direct lookup
    flag = COUNTRY_FLAGS.get(country_name)
    if flag:
        return flag
    
    # Try uppercase
    flag = COUNTRY_FLAGS.get(country_name.upper())
    if flag:
        return flag
    
    # Try title case
    flag = COUNTRY_FLAGS.get(country_name.title())
    if flag:
        return flag
    
    return '🏳️'


@login_required
@staff_required
def staff_dashboard_view(request):
    context = {}
    return render(request, 'dashboard/staff_dashboard.html', context)


@login_required
def client_dashboard_view(request):
    context = {}
    return render(request, 'dashboard/client_dashboard.html', context)


@login_required
def guest_dashboard_view(request):
    context = {}
    return render(request, 'dashboard/guest_dashboard.html', context)


# =============================================================================
# DASHBOARD API ENDPOINTS
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recent_activities(request):
    """
    Get recent activities for the current user.
    Returns last 10 activities by default.
    """
    limit = int(request.query_params.get('limit', 10))
    
    activities = UserActivity.objects.filter(
        user=request.user
    ).order_by('-created_at')[:limit]
    
    serializer = UserActivitySerializer(activities, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recently_viewed_companies(request):
    """
    Get recently viewed companies for the current user.
    Returns last 8 companies by default.
    """
    limit = int(request.query_params.get('limit', 8))
    
    companies = RecentlyViewedCompany.objects.filter(
        user=request.user
    ).select_related('report').order_by('-viewed_at')[:limit]
    
    serializer = RecentlyViewedCompanySerializer(companies, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def track_company_view(request):
    """
    Track when a user views a company.
    Also creates an activity log entry.
    """
    from reports.models import CustomReport
    
    report_id = request.data.get('report_id')
    record_id = request.data.get('record_id')
    company_name = request.data.get('company_name')
    country = request.data.get('country')
    category = request.data.get('category')
    
    if not all([report_id, record_id, company_name]):
        return Response(
            {'error': 'report_id, record_id, and company_name are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        report = CustomReport.objects.get(report_id=report_id)
    except CustomReport.DoesNotExist:
        return Response(
            {'error': 'Report not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Add to recently viewed
    RecentlyViewedCompany.add_view(
        user=request.user,
        report=report,
        record_id=str(record_id),
        company_name=company_name,
        country=country,
        category=category
    )
    
    # Create activity log - only if not viewed in the last hour
    recent_view = UserActivity.objects.filter(
        user=request.user,
        activity_type=ActivityType.COMPANY_VIEWED,
        record_id=str(record_id),
        created_at__gte=timezone.now() - timedelta(hours=1)
    ).exists()
    
    if not recent_view:
        UserActivity.objects.create(
            user=request.user,
            activity_type=ActivityType.COMPANY_VIEWED,
            company_name=company_name,
            report_title=report.title,
            report_id=report.report_id,
            record_id=str(record_id),
            country=country
        )
    
    return Response({'success': True})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reports_by_category(request):
    """
    Get category breakdown for EACH subscribed report separately.
    Returns list of reports with their category distributions.
    """
    from reports.models import Subscription, SubscriptionStatus, CompanyCategory
    from reports.company_models import ProductionSite
    
    CATEGORY_COLORS = {
        'INJECTION': '#8B5CF6',
        'BLOW': '#3B82F6',
        'ROTO': '#10B981',
        'PE_FILM': '#F59E0B',
        'SHEET': '#EF4444',
        'PIPE': '#EC4899',
        'TUBE_HOSE': '#06B6D4',
        'PROFILE': '#84CC16',
        'CABLE': '#F97316',
        'COMPOUNDER': '#6366F1',
        'RECYCLER': '#14B8A6',
    }
    
    # Get user's active subscriptions
    subscriptions = Subscription.objects.filter(
        client=request.user,
        status=SubscriptionStatus.ACTIVE
    ).select_related('report')
    
    result = []
    
    for sub in subscriptions:
        report = sub.report
        if not report:
            continue
        
        report_data = {
            'report_id': str(report.report_id),
            'report_title': report.title,
            'categories': []
        }
        
        try:
            # Get companies from this report
            companies = report.get_filtered_records()
            
            # Count production sites by category for this report
            site_counts = ProductionSite.objects.filter(
                company__in=companies
            ).values('category').annotate(
                count=Count('id')
            ).order_by('-count')
            
            for item in site_counts:
                cat = item['category']
                if cat:
                    display_name = dict(CompanyCategory.choices).get(cat, cat)
                    report_data['categories'].append({
                        'category': cat,
                        'category_display': display_name,
                        'count': item['count'],
                        'color': CATEGORY_COLORS.get(cat, '#6B7280')
                    })
        except Exception as e:
            print(f"Error getting category stats for report {report.title}: {e}")
            # Fallback: use report's configured categories with count 0
            if report.filter_criteria:
                categories = report.filter_criteria.get('categories', [])
                if isinstance(categories, str):
                    categories = [categories]
                for cat in categories:
                    if cat:
                        display_name = dict(CompanyCategory.choices).get(cat, cat)
                        report_data['categories'].append({
                            'category': cat,
                            'category_display': display_name,
                            'count': 0,
                            'color': CATEGORY_COLORS.get(cat, '#6B7280')
                        })
        
        if report_data['categories']:
            result.append(report_data)
    
    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def companies_by_country(request):
    """
    Get top countries by company count across user's subscribed reports.
    Returns country name with flag emoji.
    """
    from reports.models import Subscription, SubscriptionStatus
    
    limit = int(request.query_params.get('limit', 5))
    
    # Get user's active subscriptions
    subscriptions = Subscription.objects.filter(
        client=request.user,
        status=SubscriptionStatus.ACTIVE
    ).select_related('report')
    
    # Aggregate countries from all subscribed reports
    country_counts = {}
    
    for sub in subscriptions:
        report = sub.report
        if report:
            try:
                # Get filtered companies from the report
                companies = report.get_filtered_records()
                countries = companies.values('country').annotate(
                    count=Count('id')
                ).order_by('-count')
                
                for item in countries:
                    country = item['country']
                    if country:
                        if country not in country_counts:
                            country_counts[country] = 0
                        country_counts[country] += item['count']
            except Exception as e:
                print(f"Error getting country stats: {e}")
    
    # Sort and limit
    sorted_countries = sorted(
        country_counts.items(),
        key=lambda x: x[1],
        reverse=True
    )[:limit]
    
    # Format response with flags
    result = []
    max_count = sorted_countries[0][1] if sorted_countries else 1
    
    for country, count in sorted_countries:
        flag = get_flag_for_country(country)
        result.append({
            'country': country,
            'count': count,
            'flag': flag,
            'percentage': round((count / max_count) * 100, 1) if max_count > 0 else 0
        })
    
    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def subscription_timeline(request):
    """
    Get subscription timeline data for visualization.
    """
    from reports.models import Subscription, SubscriptionStatus
    
    subscriptions = Subscription.objects.filter(
        client=request.user,
        status__in=[SubscriptionStatus.ACTIVE, SubscriptionStatus.PENDING]
    ).select_related('report').order_by('end_date')
    
    today = timezone.now().date()
    result = []
    
    for sub in subscriptions:
        if sub.start_date and sub.end_date:
            total_days = (sub.end_date - sub.start_date).days
            elapsed_days = (today - sub.start_date).days
            progress = (elapsed_days / total_days * 100) if total_days > 0 else 0
            progress = max(0, min(100, progress))
            
            days_remaining = (sub.end_date - today).days
            is_expiring_soon = 0 < days_remaining <= 30
            
            result.append({
                'id': str(sub.subscription_id),
                'report_title': sub.report.title if sub.report else 'Unknown Report',
                'report_id': str(sub.report.report_id) if sub.report else None,
                'start_date': sub.start_date.isoformat(),
                'end_date': sub.end_date.isoformat(),
                'days_remaining': max(0, days_remaining),
                'progress_percentage': round(progress, 1),
                'status': sub.status,
                'is_expiring_soon': is_expiring_soon,
            })
    
    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """
    Get all dashboard statistics in a single API call.
    """
    from reports.models import Subscription, SubscriptionStatus, FavoriteCompany, CompanyCollection
    
    user = request.user
    today = timezone.now().date()
    thirty_days = today + timedelta(days=30)
    
    # Get subscription stats
    subscriptions = Subscription.objects.filter(client=user)
    active_subs = subscriptions.filter(status=SubscriptionStatus.ACTIVE)
    
    expiring_count = active_subs.filter(
        end_date__lte=thirty_days,
        end_date__gt=today
    ).count()
    
    # Get favorites count
    favorites_count = FavoriteCompany.objects.filter(user=user).count()
    
    # Get collections count
    collections_count = CompanyCollection.objects.filter(user=user).count()
    
    return Response({
        'total_reports': subscriptions.count(),
        'active_subscriptions': active_subs.count(),
        'expiring_soon': expiring_count,
        'total_favorites': favorites_count,
        'total_collections': collections_count,
    })
