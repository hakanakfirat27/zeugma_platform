# reports/client_favorites_views.py
"""
API views for client favorites, pinned reports, and collections.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db import models
from django.db.models import Count, Max
from django.shortcuts import get_object_or_404

from .models import (
    FavoriteCompany, PinnedReport, CompanyCollection, CollectionItem,
    CustomReport, Subscription
)
from dashboard.models import UserActivity, ActivityType


def verify_client_access(user):
    """Verify user has client role and active subscription."""
    if not hasattr(user, 'role') or user.role != 'CLIENT':
        return False, "Only clients can access this feature"
    
    # Check for active subscription
    has_subscription = Subscription.objects.filter(
        client=user,
        status='ACTIVE'
    ).exists()
    
    if not has_subscription:
        return False, "No active subscription found"
    
    return True, None


def get_report_by_uuid(report_uuid):
    """Get CustomReport by its report_id UUID field."""
    try:
        return CustomReport.objects.get(report_id=report_uuid)
    except CustomReport.DoesNotExist:
        return None


# =============================================================================
# FAVORITE COMPANIES
# =============================================================================

class FavoriteCompanyListCreateAPIView(APIView):
    """List, create, and delete favorite companies."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get all favorite companies for the user with pagination and search."""
        is_valid, error = verify_client_access(request.user)
        if not is_valid:
            return Response({'error': error}, status=status.HTTP_403_FORBIDDEN)
        
        report_uuid = request.query_params.get('report_id')
        search_query = request.query_params.get('search', '').strip()
        
        # Pagination
        try:
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 10))
        except (ValueError, TypeError):
            page = 1
            page_size = 10
        
        # Limit page size
        page_size = min(page_size, 100)
        
        favorites = FavoriteCompany.objects.filter(user=request.user).select_related('report')
        
        if report_uuid:
            favorites = favorites.filter(report__report_id=report_uuid)
        
        # Search filter
        if search_query:
            favorites = favorites.filter(
                models.Q(company_name__icontains=search_query) |
                models.Q(country__icontains=search_query)
            )
        
        # Order by most recent first
        favorites = favorites.order_by('-created_at')
        
        # Get total count before pagination
        total_count = favorites.count()
        
        # Calculate pagination
        total_pages = (total_count + page_size - 1) // page_size if total_count > 0 else 1
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        
        # Paginate
        favorites = favorites[start_idx:end_idx]
        
        # Serialize
        data = []
        for fav in favorites:
            data.append({
                'id': str(fav.id),
                'report_id': str(fav.report.report_id),
                'report_title': fav.report.title,
                'record_id': fav.record_id,
                'company_name': fav.company_name,
                'country': fav.country,
                'created_at': fav.created_at.isoformat(),
            })
        
        return Response({
            'results': data,
            'count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': total_pages,
        })
    
    def delete(self, request):
        """Remove a company from favorites using report_id + record_id."""
        is_valid, error = verify_client_access(request.user)
        if not is_valid:
            return Response({'error': error}, status=status.HTTP_403_FORBIDDEN)
        
        report_uuid = request.data.get('report_id')
        record_id = request.data.get('record_id')
        
        if not all([report_uuid, record_id]):
            return Response(
                {'error': 'report_id and record_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        favorite = FavoriteCompany.objects.filter(
            user=request.user,
            report__report_id=report_uuid,
            record_id=str(record_id)
        ).first()
        
        if not favorite:
            return Response(
                {'error': 'Favorite not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        favorite.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    def post(self, request):
        """Add a company to favorites."""
        is_valid, error = verify_client_access(request.user)
        if not is_valid:
            return Response({'error': error}, status=status.HTTP_403_FORBIDDEN)
        
        report_uuid = request.data.get('report_id')
        record_id = request.data.get('record_id')
        company_name = request.data.get('company_name')
        country = request.data.get('country', '')
        
        if not all([report_uuid, record_id, company_name]):
            return Response(
                {'error': 'report_id, record_id, and company_name are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the report object
        report = get_report_by_uuid(report_uuid)
        if not report:
            return Response(
                {'error': 'Report not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verify user has access to this report
        has_access = Subscription.objects.filter(
            client=request.user,
            report=report,
            status='ACTIVE'
        ).exists()
        
        if not has_access:
            return Response(
                {'error': 'You do not have access to this report'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if already favorited
        existing = FavoriteCompany.objects.filter(
            user=request.user,
            report=report,
            record_id=str(record_id)
        ).first()
        
        if existing:
            return Response(
                {'error': 'Company is already in favorites'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create favorite
        favorite = FavoriteCompany.objects.create(
            user=request.user,
            report=report,
            record_id=str(record_id),
            company_name=company_name,
            country=country
        )
        
        # Track activity
        UserActivity.objects.create(
            user=request.user,
            activity_type=ActivityType.FAVORITE_ADDED,
            company_name=company_name,
            report_title=report.title,
            report_id=report.report_id,
            record_id=str(record_id),
            country=country
        )
        
        return Response({
            'id': str(favorite.id),
            'report_id': str(report.report_id),
            'record_id': favorite.record_id,
            'company_name': favorite.company_name,
            'country': favorite.country,
            'created_at': favorite.created_at.isoformat(),
        }, status=status.HTTP_201_CREATED)


class FavoriteCompanyDeleteAPIView(APIView):
    """Delete a favorite company."""
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, favorite_id=None):
        """Remove a company from favorites."""
        is_valid, error = verify_client_access(request.user)
        if not is_valid:
            return Response({'error': error}, status=status.HTTP_403_FORBIDDEN)
        
        # Can delete by favorite_id or by report_id + record_id
        if favorite_id:
            favorite = get_object_or_404(
                FavoriteCompany,
                id=favorite_id,
                user=request.user
            )
        else:
            report_uuid = request.data.get('report_id')
            record_id = request.data.get('record_id')
            
            if not all([report_uuid, record_id]):
                return Response(
                    {'error': 'Either favorite_id or report_id+record_id required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            favorite = get_object_or_404(
                FavoriteCompany,
                user=request.user,
                report__report_id=report_uuid,
                record_id=str(record_id)
            )
        
        # Track activity
        UserActivity.objects.create(
            user=request.user,
            activity_type=ActivityType.FAVORITE_REMOVED,
            company_name=favorite.company_name,
            report_title=favorite.report.title,
            report_id=favorite.report.report_id,
            record_id=favorite.record_id,
            country=favorite.country
        )
        
        favorite.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class FavoriteCompanyCheckAPIView(APIView):
    """Check if a company is favorited."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Check favorite status for a company."""
        is_valid, error = verify_client_access(request.user)
        if not is_valid:
            return Response({'error': error}, status=status.HTTP_403_FORBIDDEN)
        
        report_uuid = request.query_params.get('report_id')
        record_id = request.query_params.get('record_id')
        
        if not all([report_uuid, record_id]):
            return Response(
                {'error': 'report_id and record_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        is_favorited = FavoriteCompany.objects.filter(
            user=request.user,
            report__report_id=report_uuid,
            record_id=str(record_id)
        ).exists()
        
        return Response({'is_favorited': is_favorited})


class FavoriteCompanyStatsAPIView(APIView):
    """Get favorite stats including which records are favorited."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get favorite stats for a report."""
        is_valid, error = verify_client_access(request.user)
        if not is_valid:
            return Response({'error': error}, status=status.HTTP_403_FORBIDDEN)
        
        report_uuid = request.query_params.get('report_id')
        
        if not report_uuid:
            return Response(
                {'error': 'report_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        favorites = FavoriteCompany.objects.filter(
            user=request.user,
            report__report_id=report_uuid
        )
        
        # Build a set of favorited record IDs
        favorited_records = set(favorites.values_list('record_id', flat=True))
        
        return Response({
            'total_favorites': len(favorited_records),
            'favorited_record_ids': list(favorited_records)
        })


# =============================================================================
# PINNED REPORTS
# =============================================================================

class PinnedReportListCreateAPIView(APIView):
    """List and create pinned reports."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get all pinned reports for the user."""
        is_valid, error = verify_client_access(request.user)
        if not is_valid:
            return Response({'error': error}, status=status.HTTP_403_FORBIDDEN)
        
        pinned = PinnedReport.objects.filter(
            user=request.user
        ).select_related('subscription__report')
        
        data = []
        for pin in pinned:
            sub = pin.subscription
            data.append({
                'id': str(pin.id),
                'subscription_id': sub.id,  # Primary key ID for frontend compatibility
                'subscription_uuid': str(sub.subscription_id),  # UUID for reference
                'report_id': str(sub.report.report_id),
                'report_title': sub.report.title,
                'report_description': sub.report.description,
                'display_order': pin.display_order,
                'created_at': pin.created_at.isoformat(),
                'end_date': sub.end_date.isoformat() if sub.end_date else None,
            })
        
        return Response({
            'results': data,
            'count': len(data)
        })
    
    def post(self, request):
        """Pin a report to dashboard."""
        is_valid, error = verify_client_access(request.user)
        if not is_valid:
            return Response({'error': error}, status=status.HTTP_403_FORBIDDEN)
        
        subscription_id = request.data.get('subscription_id')
        
        if not subscription_id:
            return Response(
                {'error': 'subscription_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Try to find subscription - support both primary key (int) and UUID
        subscription = None
        
        # First try as primary key (integer)
        try:
            sub_pk = int(subscription_id)
            subscription = Subscription.objects.filter(
                id=sub_pk,
                client=request.user,
                status='ACTIVE'
            ).first()
        except (ValueError, TypeError):
            pass
        
        # If not found, try as UUID
        if not subscription:
            subscription = Subscription.objects.filter(
                subscription_id=subscription_id,
                client=request.user,
                status='ACTIVE'
            ).first()
        
        if not subscription:
            return Response(
                {'error': 'Subscription not found or not active'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if already pinned
        existing = PinnedReport.objects.filter(
            user=request.user,
            subscription=subscription
        ).first()
        
        if existing:
            return Response(
                {'error': 'Report is already pinned'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get next display order
        max_order = PinnedReport.objects.filter(
            user=request.user
        ).aggregate(max_order=models.Max('display_order'))['max_order'] or 0
        
        # Create pinned report
        pinned = PinnedReport.objects.create(
            user=request.user,
            subscription=subscription,
            display_order=max_order + 1
        )
        
        return Response({
            'id': str(pinned.id),
            'subscription_id': subscription.id,  # Primary key
            'subscription_uuid': str(subscription.subscription_id),  # UUID
            'report_id': str(subscription.report.report_id),
            'report_title': subscription.report.title,
            'display_order': pinned.display_order,
            'created_at': pinned.created_at.isoformat(),
        }, status=status.HTTP_201_CREATED)


class PinnedReportDeleteAPIView(APIView):
    """Unpin a report."""
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, pin_id):
        """Unpin a report from dashboard."""
        is_valid, error = verify_client_access(request.user)
        if not is_valid:
            return Response({'error': error}, status=status.HTTP_403_FORBIDDEN)
        
        pinned = get_object_or_404(
            PinnedReport,
            id=pin_id,
            user=request.user
        )
        
        pinned.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PinnedReportReorderAPIView(APIView):
    """Reorder pinned reports."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Update display order of pinned reports."""
        is_valid, error = verify_client_access(request.user)
        if not is_valid:
            return Response({'error': error}, status=status.HTTP_403_FORBIDDEN)
        
        order = request.data.get('order', [])  # List of pin IDs in new order
        
        if not order:
            return Response(
                {'error': 'order list is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        for index, pin_id in enumerate(order):
            PinnedReport.objects.filter(
                id=pin_id,
                user=request.user
            ).update(display_order=index)
        
        return Response({'success': True})


# =============================================================================
# COMPANY COLLECTIONS
# =============================================================================

class CollectionListCreateAPIView(APIView):
    """List and create collections."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get all collections for the user."""
        is_valid, error = verify_client_access(request.user)
        if not is_valid:
            return Response({'error': error}, status=status.HTTP_403_FORBIDDEN)
        
        collections = CompanyCollection.objects.filter(
            user=request.user
        ).annotate(
            items_count=Count('items')
        )
        
        data = []
        for coll in collections:
            data.append({
                'id': str(coll.id),
                'name': coll.name,
                'description': coll.description,
                'color': coll.color,
                'icon': coll.icon,
                'item_count': coll.items_count,
                'created_at': coll.created_at.isoformat(),
                'updated_at': coll.updated_at.isoformat(),
            })
        
        return Response({
            'results': data,
            'count': len(data)
        })
    
    def post(self, request):
        """Create a new collection."""
        is_valid, error = verify_client_access(request.user)
        if not is_valid:
            return Response({'error': error}, status=status.HTTP_403_FORBIDDEN)
        
        name = request.data.get('name')
        description = request.data.get('description', '')
        color = request.data.get('color', 'blue')
        icon = request.data.get('icon', 'folder')
        
        if not name:
            return Response(
                {'error': 'name is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create collection
        collection = CompanyCollection.objects.create(
            user=request.user,
            name=name,
            description=description,
            color=color,
            icon=icon
        )
        
        # Track activity
        UserActivity.objects.create(
            user=request.user,
            activity_type=ActivityType.COLLECTION_CREATED,
            collection_name=name,
            collection_id=collection.id
        )
        
        return Response({
            'id': str(collection.id),
            'name': collection.name,
            'description': collection.description,
            'color': collection.color,
            'icon': collection.icon,
            'item_count': 0,
            'created_at': collection.created_at.isoformat(),
            'updated_at': collection.updated_at.isoformat(),
        }, status=status.HTTP_201_CREATED)


class CollectionDetailAPIView(APIView):
    """Get, update, or delete a collection."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, collection_id):
        """Get collection with its items."""
        is_valid, error = verify_client_access(request.user)
        if not is_valid:
            return Response({'error': error}, status=status.HTTP_403_FORBIDDEN)
        
        collection = get_object_or_404(
            CompanyCollection,
            id=collection_id,
            user=request.user
        )
        
        # Get items
        items = collection.items.select_related('report').all()
        items_data = []
        for item in items:
            items_data.append({
                'id': str(item.id),
                'report_id': str(item.report.report_id),
                'report_title': item.report.title,
                'record_id': item.record_id,
                'company_name': item.company_name,
                'country': item.country,
                'note': item.note,
                'added_at': item.added_at.isoformat(),
            })
        
        return Response({
            'id': str(collection.id),
            'name': collection.name,
            'description': collection.description,
            'color': collection.color,
            'icon': collection.icon,
            'item_count': len(items_data),
            'items': items_data,
            'created_at': collection.created_at.isoformat(),
            'updated_at': collection.updated_at.isoformat(),
        })
    
    def patch(self, request, collection_id):
        """Update a collection."""
        is_valid, error = verify_client_access(request.user)
        if not is_valid:
            return Response({'error': error}, status=status.HTTP_403_FORBIDDEN)
        
        collection = get_object_or_404(
            CompanyCollection,
            id=collection_id,
            user=request.user
        )
        
        # Update fields
        if 'name' in request.data:
            collection.name = request.data['name']
        if 'description' in request.data:
            collection.description = request.data['description']
        if 'color' in request.data:
            collection.color = request.data['color']
        if 'icon' in request.data:
            collection.icon = request.data['icon']
        
        collection.save()
        
        return Response({
            'id': str(collection.id),
            'name': collection.name,
            'description': collection.description,
            'color': collection.color,
            'icon': collection.icon,
            'item_count': collection.item_count,
            'updated_at': collection.updated_at.isoformat(),
        })
    
    def delete(self, request, collection_id):
        """Delete a collection."""
        is_valid, error = verify_client_access(request.user)
        if not is_valid:
            return Response({'error': error}, status=status.HTTP_403_FORBIDDEN)
        
        collection = get_object_or_404(
            CompanyCollection,
            id=collection_id,
            user=request.user
        )
        
        # Track activity
        UserActivity.objects.create(
            user=request.user,
            activity_type=ActivityType.COLLECTION_DELETED,
            collection_name=collection.name,
            collection_id=collection.id
        )
        
        collection.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CollectionItemAddAPIView(APIView):
    """Add a company to a collection."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, collection_id):
        """Add a company to the collection."""
        is_valid, error = verify_client_access(request.user)
        if not is_valid:
            return Response({'error': error}, status=status.HTTP_403_FORBIDDEN)
        
        collection = get_object_or_404(
            CompanyCollection,
            id=collection_id,
            user=request.user
        )
        
        report_uuid = request.data.get('report_id')
        record_id = request.data.get('record_id')
        company_name = request.data.get('company_name')
        country = request.data.get('country', '')
        note = request.data.get('note', '')
        
        if not all([report_uuid, record_id, company_name]):
            return Response(
                {'error': 'report_id, record_id, and company_name are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the report object
        report = get_report_by_uuid(report_uuid)
        if not report:
            return Response(
                {'error': 'Report not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if already in collection
        existing = CollectionItem.objects.filter(
            collection=collection,
            report=report,
            record_id=str(record_id)
        ).first()
        
        if existing:
            return Response(
                {'error': 'Company is already in this collection'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create item
        item = CollectionItem.objects.create(
            collection=collection,
            report=report,
            record_id=str(record_id),
            company_name=company_name,
            country=country,
            note=note
        )
        
        # Track activity
        UserActivity.objects.create(
            user=request.user,
            activity_type=ActivityType.COLLECTION_ITEM_ADDED,
            company_name=company_name,
            collection_name=collection.name,
            report_title=report.title,
            report_id=report.report_id,
            record_id=str(record_id),
            collection_id=collection.id,
            country=country
        )
        
        return Response({
            'id': str(item.id),
            'collection_id': str(collection.id),
            'report_id': str(report.report_id),
            'record_id': item.record_id,
            'company_name': item.company_name,
            'country': item.country,
            'note': item.note,
            'added_at': item.added_at.isoformat(),
        }, status=status.HTTP_201_CREATED)


class CollectionItemRemoveAPIView(APIView):
    """Remove a company from a collection."""
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, collection_id, item_id):
        """Remove a company from the collection."""
        is_valid, error = verify_client_access(request.user)
        if not is_valid:
            return Response({'error': error}, status=status.HTTP_403_FORBIDDEN)
        
        collection = get_object_or_404(
            CompanyCollection,
            id=collection_id,
            user=request.user
        )
        
        item = get_object_or_404(
            CollectionItem,
            id=item_id,
            collection=collection
        )
        
        # Track activity
        UserActivity.objects.create(
            user=request.user,
            activity_type=ActivityType.COLLECTION_ITEM_REMOVED,
            company_name=item.company_name,
            collection_name=collection.name,
            report_title=item.report.title,
            report_id=item.report.report_id,
            record_id=item.record_id,
            collection_id=collection.id,
            country=item.country
        )
        
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CollectionItemUpdateAPIView(APIView):
    """Update a collection item's note."""
    permission_classes = [IsAuthenticated]
    
    def patch(self, request, collection_id, item_id):
        """Update item note."""
        is_valid, error = verify_client_access(request.user)
        if not is_valid:
            return Response({'error': error}, status=status.HTTP_403_FORBIDDEN)
        
        collection = get_object_or_404(
            CompanyCollection,
            id=collection_id,
            user=request.user
        )
        
        item = get_object_or_404(
            CollectionItem,
            id=item_id,
            collection=collection
        )
        
        if 'note' in request.data:
            item.note = request.data['note']
            item.save()
        
        return Response({
            'id': str(item.id),
            'note': item.note,
        })


class AddToMultipleCollectionsAPIView(APIView):
    """Add a company to multiple collections at once."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Add company to selected collections."""
        is_valid, error = verify_client_access(request.user)
        if not is_valid:
            return Response({'error': error}, status=status.HTTP_403_FORBIDDEN)
        
        collection_ids = request.data.get('collection_ids', [])
        report_uuid = request.data.get('report_id')
        record_id = request.data.get('record_id')
        company_name = request.data.get('company_name')
        country = request.data.get('country', '')
        
        if not all([collection_ids, report_uuid, record_id, company_name]):
            return Response(
                {'error': 'collection_ids, report_id, record_id, and company_name are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the report object
        report = get_report_by_uuid(report_uuid)
        if not report:
            return Response(
                {'error': 'Report not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        added = []
        skipped = []
        
        for coll_id in collection_ids:
            collection = CompanyCollection.objects.filter(
                id=coll_id,
                user=request.user
            ).first()
            
            if not collection:
                skipped.append({'collection_id': str(coll_id), 'reason': 'Not found'})
                continue
            
            # Check if already in collection
            existing = CollectionItem.objects.filter(
                collection=collection,
                report=report,
                record_id=str(record_id)
            ).first()
            
            if existing:
                skipped.append({'collection_id': str(coll_id), 'reason': 'Already exists'})
                continue
            
            # Create item
            item = CollectionItem.objects.create(
                collection=collection,
                report=report,
                record_id=str(record_id),
                company_name=company_name,
                country=country
            )
            
            added.append({
                'collection_id': str(collection.id),
                'collection_name': collection.name,
                'item_id': str(item.id)
            })
        
        return Response({
            'added': added,
            'skipped': skipped,
            'added_count': len(added),
            'skipped_count': len(skipped)
        })


class CompanyCollectionMembershipAPIView(APIView):
    """Check which collections a company belongs to."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get collection IDs that contain a specific company."""
        is_valid, error = verify_client_access(request.user)
        if not is_valid:
            return Response({'error': error}, status=status.HTTP_403_FORBIDDEN)
        
        report_uuid = request.query_params.get('report_id')
        record_id = request.query_params.get('record_id')
        
        if not all([report_uuid, record_id]):
            return Response(
                {'error': 'report_id and record_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get collections that contain this company
        collection_items = CollectionItem.objects.filter(
            collection__user=request.user,
            report__report_id=report_uuid,
            record_id=str(record_id)
        ).select_related('collection')
        
        collection_ids = [str(item.collection.id) for item in collection_items]
        collection_details = [
            {
                'id': str(item.collection.id),
                'name': item.collection.name,
                'color': item.collection.color,
                'icon': item.collection.icon
            }
            for item in collection_items
        ]
        
        return Response({
            'collection_ids': collection_ids,
            'collections': collection_details,
            'count': len(collection_ids)
        })


class CollectionStatsForReportAPIView(APIView):
    """Get collection stats for all records in a report."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get which records are in collections for a specific report."""
        is_valid, error = verify_client_access(request.user)
        if not is_valid:
            return Response({'error': error}, status=status.HTTP_403_FORBIDDEN)
        
        report_uuid = request.query_params.get('report_id')
        
        if not report_uuid:
            return Response(
                {'error': 'report_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get all collection items for this report belonging to user's collections
        collection_items = CollectionItem.objects.filter(
            collection__user=request.user,
            report__report_id=report_uuid
        ).values('record_id').annotate(count=Count('id'))
        
        # Build a map of record_id -> collection count
        record_collection_counts = {
            item['record_id']: item['count']
            for item in collection_items
        }
        
        return Response({
            'record_collection_counts': record_collection_counts,
            'total_items_in_collections': sum(record_collection_counts.values())
        })
