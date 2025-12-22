# dashboard/views.py

from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response

from accounts.decorators import staff_required
from .models import UserActivity, RecentlyViewedCompany, ActivityType, ThemeSettings, NotificationSettings, NotificationTypeConfig
from .serializers import (
    UserActivitySerializer,
    RecentlyViewedCompanySerializer,
    ThemeSettingsSerializer,
    ThemeSettingsPublicSerializer,
    NotificationSettingsSerializer,
    NotificationTypeConfigSerializer,
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


# =============================================================================
# THEME SETTINGS API ENDPOINTS
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_theme_settings(request):
    """
    Get theme settings for a specific layout.
    Public endpoint - returns only necessary settings for frontend.
    """
    layout_type = request.query_params.get('layout', 'client')
    
    # Validate layout type
    valid_layouts = [choice[0] for choice in ThemeSettings.LayoutType.choices]
    if layout_type not in valid_layouts:
        return Response(
            {'error': f'Invalid layout type. Must be one of: {", ".join(valid_layouts)}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    settings_data = ThemeSettings.get_settings_for_layout(layout_type)
    serializer = ThemeSettingsPublicSerializer(settings_data)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_theme_settings(request):
    """
    Get theme settings for all layouts.
    Public endpoint - returns settings needed for frontend.
    """
    all_settings = ThemeSettings.get_all_settings()
    return Response(all_settings)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_get_theme_settings(request):
    """
    Admin endpoint to get all theme settings with full details.
    """
    layout_type = request.query_params.get('layout')
    
    if layout_type:
        try:
            settings_obj = ThemeSettings.objects.get(layout_type=layout_type)
        except ThemeSettings.DoesNotExist:
            # Create default settings if not exists
            settings_obj = ThemeSettings.objects.create(layout_type=layout_type)
        
        serializer = ThemeSettingsSerializer(settings_obj)
        return Response(serializer.data)
    else:
        # Get all settings
        all_settings = []
        for layout_type, _ in ThemeSettings.LayoutType.choices:
            obj, _ = ThemeSettings.objects.get_or_create(layout_type=layout_type)
            all_settings.append(obj)
        
        serializer = ThemeSettingsSerializer(all_settings, many=True)
        return Response(serializer.data)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAdminUser])
def admin_update_theme_settings(request, layout_type):
    """
    Admin endpoint to update theme settings for a specific layout.
    """
    # Validate layout type
    valid_layouts = [choice[0] for choice in ThemeSettings.LayoutType.choices]
    if layout_type not in valid_layouts:
        return Response(
            {'error': f'Invalid layout type. Must be one of: {", ".join(valid_layouts)}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        settings_obj = ThemeSettings.objects.get(layout_type=layout_type)
    except ThemeSettings.DoesNotExist:
        settings_obj = ThemeSettings(layout_type=layout_type)
    
    serializer = ThemeSettingsSerializer(
        settings_obj,
        data=request.data,
        partial=True,
        context={'request': request}
    )
    
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_theme_choices(request):
    """
    Get all available choices for theme settings.
    Used to populate dropdowns in admin UI.
    """
    return Response({
        'layout_types': [
            {'value': choice[0], 'label': choice[1]}
            for choice in ThemeSettings.LayoutType.choices
        ],
        'default_themes': [
            {'value': choice[0], 'label': choice[1]}
            for choice in ThemeSettings.DefaultTheme.choices
        ],
        'toggle_variants': [
            {'value': choice[0], 'label': choice[1]}
            for choice in ThemeSettings.ToggleVariant.choices
        ],
        'sidebar_variants': [
            {'value': choice[0], 'label': choice[1]}
            for choice in ThemeSettings.SidebarVariant.choices
        ],
    })


# =============================================================================
# NOTIFICATION SETTINGS API ENDPOINTS
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_get_notification_settings(request):
    """
    Admin endpoint to get global notification settings.
    """
    obj, created = NotificationSettings.objects.get_or_create(
        defaults={
            'notifications_enabled': True,
            'email_notifications_enabled': True,
            'inapp_notifications_enabled': True,
        }
    )
    serializer = NotificationSettingsSerializer(obj)
    return Response(serializer.data)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAdminUser])
def admin_update_notification_settings(request):
    """
    Admin endpoint to update global notification settings.
    """
    obj, created = NotificationSettings.objects.get_or_create(
        defaults={
            'notifications_enabled': True,
            'email_notifications_enabled': True,
            'inapp_notifications_enabled': True,
        }
    )
    
    serializer = NotificationSettingsSerializer(
        obj,
        data=request.data,
        partial=True,
        context={'request': request}
    )
    
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_get_notification_type_configs(request):
    """
    Admin endpoint to get all notification type configurations.
    """
    # This will create defaults if they don't exist
    NotificationTypeConfig.get_all_configs()
    
    configs = NotificationTypeConfig.objects.all().order_by('display_name')
    serializer = NotificationTypeConfigSerializer(configs, many=True)
    return Response(serializer.data)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAdminUser])
def admin_update_notification_type_config(request, notification_type):
    """
    Admin endpoint to update a specific notification type configuration.
    """
    try:
        config = NotificationTypeConfig.objects.get(notification_type=notification_type)
    except NotificationTypeConfig.DoesNotExist:
        return Response(
            {'error': f'Notification type "{notification_type}" not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = NotificationTypeConfigSerializer(
        config,
        data=request.data,
        partial=True
    )
    
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_notification_choices(request):
    """
    Get all available choices for notification settings.
    Used to populate dropdowns in admin UI.
    """
    return Response({
        'email_frequencies': [
            {'value': choice[0], 'label': choice[1]}
            for choice in NotificationSettings.EmailFrequency.choices
        ],
        'priorities': [
            {'value': choice[0], 'label': choice[1]}
            for choice in NotificationTypeConfig.PRIORITY_CHOICES
        ],
        'notification_types': [
            {'value': choice[0], 'label': choice[1]}
            for choice in NotificationTypeConfig.NOTIFICATION_TYPES
        ],
        'roles': [
            {'value': 'CLIENT', 'label': 'Client'},
            {'value': 'STAFF_ADMIN', 'label': 'Staff Admin'},
            {'value': 'SUPERADMIN', 'label': 'Super Admin'},
            {'value': 'DATA_COLLECTOR', 'label': 'Data Collector'},
        ],
    })


# ============================================
# NOTE: Security views have been moved to accounts/security_views.py
# Security models are now in accounts/security_models.py  
# Security URLs are now in accounts/security_urls.py
# ============================================


# =============================================================================
# SYSTEM SETTINGS API ENDPOINTS
# =============================================================================

import sys
import os
import platform
import psutil
import subprocess
from django.core.cache import cache
from django.db import connection, connections
from django.conf import settings
from django.contrib.sessions.models import Session
from django.core.management import call_command
from io import StringIO


@api_view(['GET'])
@permission_classes([IsAdminUser])
def system_overview(request):
    """
    Get system overview with health status of all components.
    """
    health_status = {
        'overall': 'healthy',
        'components': []
    }
    
    # Database health
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
        health_status['components'].append({
            'name': 'Database',
            'status': 'healthy',
            'message': 'Connected and responding',
            'icon': 'database',
            'color': 'green'
        })
    except Exception as e:
        health_status['components'].append({
            'name': 'Database',
            'status': 'error',
            'message': str(e)[:100],
            'icon': 'database',
            'color': 'red'
        })
        health_status['overall'] = 'degraded'
    
    # Cache health
    try:
        cache.set('health_check', 'ok', 10)
        if cache.get('health_check') == 'ok':
            cache_backend = settings.CACHES.get('default', {}).get('BACKEND', 'Unknown')
            cache_type = 'Redis' if 'redis' in cache_backend.lower() else 'Memory' if 'locmem' in cache_backend.lower() else 'File' if 'filebased' in cache_backend.lower() else 'Database'
            health_status['components'].append({
                'name': 'Cache',
                'status': 'healthy',
                'message': f'{cache_type} cache operational',
                'icon': 'zap',
                'color': 'green'
            })
        else:
            raise Exception('Cache read/write failed')
    except Exception as e:
        health_status['components'].append({
            'name': 'Cache',
            'status': 'warning',
            'message': str(e)[:100],
            'icon': 'zap',
            'color': 'yellow'
        })
        if health_status['overall'] == 'healthy':
            health_status['overall'] = 'warning'
    
    # Celery/Background Tasks health
    celery_status = 'unknown'
    celery_message = 'Status unknown'
    try:
        # Check if Redis is accessible (used as Celery broker)
        broker_url = getattr(settings, 'CELERY_BROKER_URL', '')
        if broker_url:
            if 'redis' in broker_url.lower():
                celery_status = 'healthy'
                celery_message = 'Redis broker available'
            else:
                celery_status = 'healthy'
                celery_message = 'Broker configured'
        else:
            celery_status = 'warning'
            celery_message = 'No broker configured'
    except Exception as e:
        celery_status = 'error'
        celery_message = str(e)[:100]
    
    health_status['components'].append({
        'name': 'Background Tasks',
        'status': celery_status,
        'message': celery_message,
        'icon': 'clock',
        'color': 'green' if celery_status == 'healthy' else 'yellow' if celery_status == 'warning' else 'red'
    })
    
    # Email health
    email_backend = getattr(settings, 'EMAIL_BACKEND', '')
    email_configured = bool(getattr(settings, 'EMAIL_HOST', ''))
    health_status['components'].append({
        'name': 'Email Service',
        'status': 'healthy' if email_configured else 'warning',
        'message': 'SMTP configured' if email_configured else 'Email not configured',
        'icon': 'mail',
        'color': 'green' if email_configured else 'yellow'
    })
    
    # Storage health
    try:
        media_root = getattr(settings, 'MEDIA_ROOT', '')
        if media_root and os.path.exists(media_root):
            # Check if writable
            test_file = os.path.join(media_root, '.health_check')
            with open(test_file, 'w') as f:
                f.write('test')
            os.remove(test_file)
            health_status['components'].append({
                'name': 'File Storage',
                'status': 'healthy',
                'message': 'Media storage accessible',
                'icon': 'hard-drive',
                'color': 'green'
            })
        else:
            health_status['components'].append({
                'name': 'File Storage',
                'status': 'warning',
                'message': 'Media root not configured',
                'icon': 'hard-drive',
                'color': 'yellow'
            })
    except Exception as e:
        health_status['components'].append({
            'name': 'File Storage',
            'status': 'error',
            'message': str(e)[:100],
            'icon': 'hard-drive',
            'color': 'red'
        })
    
    # System Resources
    try:
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        resource_status = 'healthy'
        if cpu_percent > 90 or memory.percent > 90 or disk.percent > 90:
            resource_status = 'warning'
        if cpu_percent > 95 or memory.percent > 95 or disk.percent > 95:
            resource_status = 'error'
            
        health_status['components'].append({
            'name': 'System Resources',
            'status': resource_status,
            'message': f'CPU: {cpu_percent}%, RAM: {memory.percent}%, Disk: {disk.percent}%',
            'icon': 'cpu',
            'color': 'green' if resource_status == 'healthy' else 'yellow' if resource_status == 'warning' else 'red'
        })
    except Exception as e:
        health_status['components'].append({
            'name': 'System Resources',
            'status': 'unknown',
            'message': 'Could not retrieve system stats',
            'icon': 'cpu',
            'color': 'gray'
        })
    
    return Response(health_status)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def database_stats(request):
    """
    Get database statistics and information.
    """
    stats = {
        'connection': {},
        'tables': [],
        'size': {},
        'migrations': {}
    }
    
    # Connection info
    db_settings = settings.DATABASES.get('default', {})
    db_name = db_settings.get('NAME', 'Unknown')
    # Convert Path objects to string (common on Windows with SQLite)
    if hasattr(db_name, '__fspath__'):
        db_name = str(db_name)
    
    stats['connection'] = {
        'engine': db_settings.get('ENGINE', '').split('.')[-1],
        'name': db_name,
        'host': db_settings.get('HOST', 'localhost') or 'localhost',
        'port': str(db_settings.get('PORT', '5432') or '5432'),
        'status': 'connected'
    }
    
    try:
        with connection.cursor() as cursor:
            # Get database size (PostgreSQL)
            if 'postgresql' in db_settings.get('ENGINE', '').lower():
                cursor.execute("""
                    SELECT pg_size_pretty(pg_database_size(current_database())) as size,
                           pg_database_size(current_database()) as bytes
                """)
                row = cursor.fetchone()
                stats['size'] = {
                    'display': row[0] if row else 'Unknown',
                    'bytes': row[1] if row else 0
                }
                
                # Get table counts
                cursor.execute("""
                    SELECT COUNT(*) FROM information_schema.tables 
                    WHERE table_schema = 'public'
                """)
                stats['tables_count'] = cursor.fetchone()[0]
                
                # Get index count
                cursor.execute("""
                    SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public'
                """)
                stats['indexes_count'] = cursor.fetchone()[0]
                
                # Get top 10 largest tables
                cursor.execute("""
                    SELECT 
                        relname as table_name,
                        pg_size_pretty(pg_total_relation_size(relid)) as size,
                        pg_total_relation_size(relid) as bytes,
                        n_live_tup as row_count
                    FROM pg_stat_user_tables
                    ORDER BY pg_total_relation_size(relid) DESC
                    LIMIT 10
                """)
                stats['top_tables'] = [
                    {
                        'name': row[0],
                        'size': row[1],
                        'bytes': row[2],
                        'rows': row[3]
                    }
                    for row in cursor.fetchall()
                ]
                
            elif 'sqlite' in db_settings.get('ENGINE', '').lower():
                # SQLite stats
                db_path = db_settings.get('NAME', '')
                # Convert Path to string if needed
                if hasattr(db_path, '__fspath__'):
                    db_path = str(db_path)
                if db_path and os.path.exists(db_path):
                    size_bytes = os.path.getsize(db_path)
                    stats['size'] = {
                        'display': f"{size_bytes / (1024*1024):.2f} MB",
                        'bytes': size_bytes
                    }
                
                cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table'")
                stats['tables_count'] = cursor.fetchone()[0]
                stats['indexes_count'] = 0
                stats['top_tables'] = []
                
    except Exception as e:
        stats['error'] = str(e)
    
    # Migration status
    try:
        out = StringIO()
        call_command('showmigrations', '--plan', stdout=out)
        migration_output = out.getvalue()
        
        applied = migration_output.count('[X]')
        pending = migration_output.count('[ ]')
        
        stats['migrations'] = {
            'applied': applied,
            'pending': pending,
            'status': 'up_to_date' if pending == 0 else 'pending'
        }
    except Exception as e:
        stats['migrations'] = {
            'applied': 0,
            'pending': 0,
            'status': 'unknown',
            'error': str(e)
        }
    
    return Response(stats)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def cache_stats(request):
    """
    Get cache statistics and information.
    """
    cache_config = settings.CACHES.get('default', {})
    backend = cache_config.get('BACKEND', '')
    
    stats = {
        'backend': backend.split('.')[-1],
        'location': cache_config.get('LOCATION', 'memory'),
        'type': 'unknown',
        'status': 'unknown',
        'keys_count': 0,
        'hit_rate': None
    }
    
    # Determine cache type
    if 'redis' in backend.lower():
        stats['type'] = 'Redis'
    elif 'locmem' in backend.lower():
        stats['type'] = 'In-Memory'
    elif 'filebased' in backend.lower():
        stats['type'] = 'File System'
    elif 'database' in backend.lower():
        stats['type'] = 'Database'
    elif 'dummy' in backend.lower():
        stats['type'] = 'Dummy (No Cache)'
    else:
        stats['type'] = 'Custom'
    
    # Test cache
    try:
        cache.set('_admin_test', 'test_value', 10)
        if cache.get('_admin_test') == 'test_value':
            stats['status'] = 'operational'
            cache.delete('_admin_test')
        else:
            stats['status'] = 'degraded'
    except Exception as e:
        stats['status'] = 'error'
        stats['error'] = str(e)
    
    # Try to get Redis-specific stats if using Redis
    if 'redis' in backend.lower():
        try:
            import redis
            location = cache_config.get('LOCATION', 'redis://localhost:6379/0')
            r = redis.from_url(location)
            info = r.info()
            stats['keys_count'] = info.get('db0', {}).get('keys', r.dbsize()) if isinstance(info.get('db0'), dict) else r.dbsize()
            stats['memory_used'] = info.get('used_memory_human', 'Unknown')
            stats['memory_peak'] = info.get('used_memory_peak_human', 'Unknown')
            stats['connected_clients'] = info.get('connected_clients', 0)
            stats['uptime_days'] = info.get('uptime_in_days', 0)
            
            # Calculate hit rate
            hits = info.get('keyspace_hits', 0)
            misses = info.get('keyspace_misses', 0)
            if hits + misses > 0:
                stats['hit_rate'] = round((hits / (hits + misses)) * 100, 2)
        except ImportError:
            stats['redis_stats_available'] = False
        except Exception as e:
            stats['redis_error'] = str(e)[:100]
    
    return Response(stats)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def clear_cache(request):
    """
    Clear the entire cache.
    """
    cache_type = request.data.get('type', 'all')  # 'all', 'sessions', 'views'
    
    try:
        if cache_type == 'all':
            cache.clear()
            message = 'All cache cleared successfully'
        elif cache_type == 'sessions':
            # Clear session cache if using cache backend for sessions
            Session.objects.all().delete()
            message = 'Session cache cleared'
        else:
            cache.clear()
            message = 'Cache cleared successfully'
            
        return Response({
            'success': True,
            'message': message
        })
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Failed to clear cache: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def performance_stats(request):
    """
    Get performance metrics and system resource usage.
    """
    stats = {
        'system': {},
        'process': {},
        'python': {}
    }
    
    try:
        # System stats
        stats['system'] = {
            'cpu_percent': psutil.cpu_percent(interval=0.1),
            'cpu_count': psutil.cpu_count(),
            'memory': {
                'total': psutil.virtual_memory().total,
                'available': psutil.virtual_memory().available,
                'percent': psutil.virtual_memory().percent,
                'total_display': f"{psutil.virtual_memory().total / (1024**3):.2f} GB",
                'available_display': f"{psutil.virtual_memory().available / (1024**3):.2f} GB"
            },
            'disk': {
                'total': psutil.disk_usage('/').total,
                'used': psutil.disk_usage('/').used,
                'free': psutil.disk_usage('/').free,
                'percent': psutil.disk_usage('/').percent,
                'total_display': f"{psutil.disk_usage('/').total / (1024**3):.2f} GB",
                'free_display': f"{psutil.disk_usage('/').free / (1024**3):.2f} GB"
            },
            'platform': platform.platform(),
            'hostname': platform.node()
        }
        
        # Current process stats
        process = psutil.Process()
        stats['process'] = {
            'memory_percent': round(process.memory_percent(), 2),
            'memory_mb': round(process.memory_info().rss / (1024**2), 2),
            'cpu_percent': round(process.cpu_percent(interval=0.1), 2),
            'threads': process.num_threads(),
            'open_files': len(process.open_files()),
            'connections': len(process.connections())
        }
        
        # Python info
        stats['python'] = {
            'version': sys.version.split()[0],
            'implementation': platform.python_implementation(),
            'django_version': __import__('django').get_version()
        }
        
    except Exception as e:
        stats['error'] = str(e)
    
    return Response(stats)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def system_logs(request):
    """
    Get recent system/application logs.
    """
    import logging
    
    logs = []
    log_type = request.query_params.get('type', 'all')  # 'all', 'error', 'warning', 'info'
    limit = int(request.query_params.get('limit', 50))
    
    # Try to read from Django's log file if configured
    log_file = None
    for handler in logging.root.handlers:
        if hasattr(handler, 'baseFilename'):
            log_file = handler.baseFilename
            break
    
    if log_file and os.path.exists(log_file):
        try:
            with open(log_file, 'r') as f:
                lines = f.readlines()[-500:]  # Last 500 lines
                
            for line in reversed(lines):
                line = line.strip()
                if not line:
                    continue
                    
                level = 'info'
                if 'ERROR' in line.upper():
                    level = 'error'
                elif 'WARNING' in line.upper():
                    level = 'warning'
                elif 'DEBUG' in line.upper():
                    level = 'debug'
                    
                if log_type != 'all' and level != log_type:
                    continue
                    
                logs.append({
                    'message': line[:500],
                    'level': level
                })
                
                if len(logs) >= limit:
                    break
                    
        except Exception as e:
            return Response({
                'logs': [],
                'error': f'Could not read log file: {str(e)}',
                'log_file': log_file
            })
    else:
        # Return message about no log file
        return Response({
            'logs': [],
            'message': 'No log file configured. Logs are output to console.',
            'log_file': None
        })
    
    return Response({
        'logs': logs,
        'log_file': log_file,
        'total': len(logs)
    })


@api_view(['POST'])
@permission_classes([IsAdminUser])
def run_maintenance(request):
    """
    Run maintenance tasks.
    """
    task = request.data.get('task')
    
    results = {
        'success': False,
        'task': task,
        'message': ''
    }
    
    try:
        if task == 'clear_sessions':
            # Clear expired sessions
            from django.contrib.sessions.models import Session
            from django.utils import timezone
            expired = Session.objects.filter(expire_date__lt=timezone.now())
            count = expired.count()
            expired.delete()
            results['success'] = True
            results['message'] = f'Cleared {count} expired sessions'
            
        elif task == 'vacuum_db':
            # Run VACUUM on PostgreSQL
            db_settings = settings.DATABASES.get('default', {})
            if 'postgresql' in db_settings.get('ENGINE', '').lower():
                with connection.cursor() as cursor:
                    cursor.execute('VACUUM ANALYZE')
                results['success'] = True
                results['message'] = 'Database vacuum completed'
            else:
                results['message'] = 'VACUUM only supported for PostgreSQL'
                
        elif task == 'clear_cache':
            cache.clear()
            results['success'] = True
            results['message'] = 'Cache cleared successfully'
            
        elif task == 'collect_static':
            out = StringIO()
            call_command('collectstatic', '--noinput', stdout=out)
            results['success'] = True
            results['message'] = 'Static files collected'
            
        elif task == 'check_migrations':
            out = StringIO()
            call_command('showmigrations', '--plan', stdout=out)
            output = out.getvalue()
            pending = output.count('[ ]')
            results['success'] = True
            results['message'] = f'{pending} pending migrations' if pending > 0 else 'All migrations applied'
            results['pending_count'] = pending
            
        else:
            results['message'] = f'Unknown task: {task}'
            
    except Exception as e:
        results['message'] = f'Error running {task}: {str(e)}'
        
    return Response(results)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def environment_info(request):
    """
    Get environment configuration (non-sensitive).
    """
    info = {
        'debug_mode': settings.DEBUG,
        'allowed_hosts': settings.ALLOWED_HOSTS,
        'timezone': str(settings.TIME_ZONE),
        'language': settings.LANGUAGE_CODE,
        'static_url': settings.STATIC_URL,
        'media_url': getattr(settings, 'MEDIA_URL', '/media/'),
        'installed_apps': len(settings.INSTALLED_APPS),
        'middleware_count': len(settings.MIDDLEWARE),
        'database_engine': settings.DATABASES.get('default', {}).get('ENGINE', '').split('.')[-1],
        'cache_backend': settings.CACHES.get('default', {}).get('BACKEND', '').split('.')[-1],
        'session_engine': settings.SESSION_ENGINE.split('.')[-1] if hasattr(settings, 'SESSION_ENGINE') else 'database',
        'email_backend': getattr(settings, 'EMAIL_BACKEND', '').split('.')[-1],
        'celery_broker': 'configured' if getattr(settings, 'CELERY_BROKER_URL', None) else 'not configured',
        'channels_enabled': 'channels' in settings.INSTALLED_APPS,
        'rest_framework': 'rest_framework' in settings.INSTALLED_APPS,
        'cors_enabled': 'corsheaders' in settings.INSTALLED_APPS,
    }
    
    return Response(info)
