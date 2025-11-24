# reports/unverified_views.py
"""
API Views for Unverified Sites Management System
"""

from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count
from django.utils import timezone
from django.contrib.auth import get_user_model

from .models import (
    UnverifiedSite, 
    VerificationHistory, 
    SuperdatabaseRecord,
    VerificationStatus,
    PriorityLevel,
    DataSource
)

from .unverified_serializers import (
    UnverifiedSiteListSerializer,
    UnverifiedSiteDetailSerializer,
    UnverifiedSiteCreateUpdateSerializer,
    VerificationHistorySerializer,
    ApproveRejectSerializer,
    AssignReviewerSerializer,
    BulkActionSerializer,
    UnverifiedSiteStatsSerializer,
)

from .permissions import (
    IsStaffOrDataCollector,
    IsStaffOnly,
    CanVerifySites,
    CanTransferSites,
    CanAssignReviewers,
)

from .email_notifications import (
    send_site_submitted_notification,
    send_site_approved_notification,
    send_site_rejected_notification,
)


User = get_user_model()


# =============================================================================
# LIST & DETAIL VIEWS
# =============================================================================

class UnverifiedSiteListAPIView(generics.ListAPIView):
    """
    List all unverified sites with filtering and search.
    
    Query Parameters:
    - status: Filter by verification status (PENDING, UNDER_REVIEW, APPROVED, REJECTED)
    - category: Filter by category
    - country: Filter by country
    - priority: Filter by priority level
    - source: Filter by data source
    - is_duplicate: Filter duplicates (true/false)
    - assigned_to: Filter by assigned reviewer ID
    - search: Search in company name, country, email
    - ordering: Sort by field (e.g., -collected_date)
    """
    serializer_class = UnverifiedSiteListSerializer
    permission_classes = [IsAuthenticated, IsStaffOrDataCollector]
    
    def get_queryset(self):
        queryset = UnverifiedSite.objects.all()
        
        # Filter by verification status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(verification_status=status_filter)
        
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        
        # Filter by country
        country = self.request.query_params.get('country')
        if country:
            queryset = queryset.filter(country__icontains=country)
        
        # Filter by priority
        priority = self.request.query_params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)
        
        # Filter by source
        source = self.request.query_params.get('source')
        if source:
            queryset = queryset.filter(source=source)
        
        # Filter by duplicate status
        is_duplicate = self.request.query_params.get('is_duplicate')
        if is_duplicate:
            queryset = queryset.filter(is_duplicate=is_duplicate.lower() == 'true')
        
        # Filter by assigned reviewer
        assigned_to = self.request.query_params.get('assigned_to')
        if assigned_to:
            queryset = queryset.filter(assigned_to_id=assigned_to)
        
        # Search
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(company_name__icontains=search) |
                Q(country__icontains=search) |
                Q(company_email__icontains=search)
            )
        
        # Ordering
        ordering = self.request.query_params.get('ordering', '-collected_date')
        queryset = queryset.order_by(ordering)
        
        return queryset.select_related(
            'collected_by', 
            'verified_by', 
            'assigned_to',
            'duplicate_of'
        )


class UnverifiedSiteDetailAPIView(generics.RetrieveDestroyAPIView):
    """
    Get detailed information about a single unverified site.
    Also supports DELETE method for deleting the site.
    """
    serializer_class = UnverifiedSiteDetailSerializer
    permission_classes = [IsAuthenticated, IsStaffOrDataCollector]
    lookup_field = 'site_id'
    queryset = UnverifiedSite.objects.all()
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        company_name = instance.company_name
        
        # Create history entry before deletion
        VerificationHistory.objects.create(
            site=instance,
            action='DELETED',
            performed_by=request.user,
            comments=f'Site "{company_name}" deleted by {request.user.username}'  # Changed 'notes' to 'comments'
        )
        
        self.perform_destroy(instance)
        
        return Response(
            {
                'success': True,
                'message': f'Site "{company_name}" deleted successfully'
            },
            status=status.HTTP_200_OK
        )


class UnverifiedSiteCreateAPIView(generics.CreateAPIView):
    """
    Create a new unverified site (manual entry).
    FIXED: Now returns the created site with site_id
    """
    serializer_class = UnverifiedSiteCreateUpdateSerializer
    permission_classes = [IsAuthenticated, IsStaffOrDataCollector]
    
    def perform_create(self, serializer):
        serializer.save(
            collected_by=self.request.user,
            collected_date=timezone.now()
        )
    
    def create(self, request, *args, **kwargs):
        """
        Override create to return the full detail serializer response
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Use detail serializer for the response to include site_id
        instance = serializer.instance
        detail_serializer = UnverifiedSiteDetailSerializer(instance)
        
        headers = self.get_success_headers(detail_serializer.data)
        return Response(
            detail_serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers
        )


class UnverifiedSiteUpdateAPIView(generics.UpdateAPIView):
    """
    Update an existing unverified site.
    """
    serializer_class = UnverifiedSiteCreateUpdateSerializer
    permission_classes = [IsAuthenticated, IsStaffOrDataCollector]
    lookup_field = 'site_id'
    queryset = UnverifiedSite.objects.all()


class UnverifiedSiteDeleteAPIView(generics.DestroyAPIView):
    """
    Delete an unverified site.
    Only staff members can delete unverified sites.
    """
    permission_classes = [IsAuthenticated, IsStaffOnly]
    lookup_field = 'site_id'
    queryset = UnverifiedSite.objects.all()
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        company_name = instance.company_name
        
        # Create history entry before deletion
        VerificationHistory.objects.create(
            site=instance,
            action='DELETED',
            performed_by=request.user,
            notes=f'Site "{company_name}" deleted by {request.user.username}'
        )
        
        self.perform_destroy(instance)
        
        return Response(
            {
                'success': True,
                'message': f'Site "{company_name}" deleted successfully'
            },
            status=status.HTTP_200_OK
        )


# =============================================================================
# VERIFICATION ACTIONS
# =============================================================================

class ApproveUnverifiedSiteAPIView(APIView):
    """
    Approve an unverified site.
    Optionally transfer to Superdatabase immediately.
    
    POST body:
    {
        "comments": "Looks good, approved",
        "transfer_immediately": true  // Optional
    }
    """
    permission_classes = [IsAuthenticated, CanVerifySites]
    
    def post(self, request, site_id):
        site = get_object_or_404(UnverifiedSite, site_id=site_id)
        
        # Check if already approved
        if site.verification_status == VerificationStatus.APPROVED:
            return Response(
                {'error': 'Site is already approved'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update status
        site.verification_status = VerificationStatus.APPROVED
        site.verified_by = request.user
        site.verified_date = timezone.now()
        site.save()
        
        send_site_approved_notification(site, request.user)

        # Create history entry
        VerificationHistory.objects.create(
            site=site,
            action='APPROVED',
            performed_by=request.user,
            notes=request.data.get('comments', '')
        )
        
        # Transfer to Superdatabase if requested
        transfer_immediately = request.data.get('transfer_immediately', False)
        if transfer_immediately:
            try:
                self._transfer_to_superdatabase(site)
                return Response({
                    'success': True,
                    'message': 'Site approved and transferred to Superdatabase',
                    'site': UnverifiedSiteDetailSerializer(site).data
                })
            except Exception as e:
                return Response(
                    {'error': f'Approved but transfer failed: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response({
            'success': True,
            'message': 'Site approved successfully',
            'site': UnverifiedSiteDetailSerializer(site).data
        })
    
    def _transfer_to_superdatabase(self, site):
        """Helper method to transfer approved site to Superdatabase"""
        # Get all field names from UnverifiedSite except verification fields
        exclude_fields = {
            'site_id', 'verification_status', 'collected_by', 'verified_by',
            'collected_date', 'verified_date', 'source', 'priority',
            'notes', 'rejection_reason', 'data_quality_score',
            'assigned_to', 'is_duplicate', 'duplicate_of',
            'created_at', 'updated_at'
        }
        
        # Build data dict for SuperdatabaseRecord
        transfer_data = {}
        for field in UnverifiedSite._meta.fields:
            field_name = field.name
            if field_name not in exclude_fields:
                transfer_data[field_name] = getattr(site, field_name)
        
        # Create SuperdatabaseRecord
        superdatabase_record = SuperdatabaseRecord.objects.create(**transfer_data)
        
        # Create history entry
        VerificationHistory.objects.create(
            site=site,
            action='TRANSFERRED',
            performed_by=self.request.user,
            notes=f'Transferred to Superdatabase (ID: {superdatabase_record.factory_id})'
        )
        
        return superdatabase_record


class RejectUnverifiedSiteAPIView(APIView):
    """
    Reject an unverified site.
    
    POST body:
    {
        "rejection_reason": "Duplicate entry / Invalid data / etc."
    }
    """
    permission_classes = [IsAuthenticated, CanVerifySites]
    
    def post(self, request, site_id):
        site = get_object_or_404(UnverifiedSite, site_id=site_id)
        
        serializer = ApproveRejectSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Update status
        site.verification_status = VerificationStatus.REJECTED
        site.verified_by = request.user
        site.verified_date = timezone.now()
        site.rejection_reason = serializer.validated_data.get('rejection_reason', '')
        site.save()
        
        send_site_rejected_notification(
            site, 
            request.user, 
            site.rejection_reason
        )

        # Create history entry
        VerificationHistory.objects.create(
            site=site,
            action='REJECTED',
            performed_by=request.user,
            notes=site.rejection_reason
        )
        
        return Response({
            'success': True,
            'message': 'Site rejected',
            'site': UnverifiedSiteDetailSerializer(site).data
        })


class AssignReviewerAPIView(APIView):
    """
    Assign a reviewer to an unverified site.
    
    POST body:
    {
        "assigned_to": 123,  // User ID
        "comments": "Please review this"
    }
    """
    permission_classes = [IsAuthenticated, CanAssignReviewers]
    
    def post(self, request, site_id):
        site = get_object_or_404(UnverifiedSite, site_id=site_id)
        
        serializer = AssignReviewerSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Assign reviewer
        assigned_to_id = serializer.validated_data['assigned_to']
        assigned_to = get_object_or_404(User, id=assigned_to_id)
        
        site.assigned_to = assigned_to
        site.save()
        
        # Create history entry
        VerificationHistory.objects.create(
            site=site,
            action='ASSIGNED',
            performed_by=request.user,
            notes=f"Assigned to {assigned_to.username}. {serializer.validated_data.get('comments', '')}"
        )
        
        return Response({
            'success': True,
            'message': f'Site assigned to {assigned_to.username}',
            'site': UnverifiedSiteDetailSerializer(site).data
        })


class TransferToSuperdatabaseAPIView(APIView):
    """
    Transfer an approved unverified site to Superdatabase.
    Only works for APPROVED sites.
    """
    permission_classes = [IsAuthenticated, CanTransferSites]
    
    def post(self, request, site_id):
        site = get_object_or_404(UnverifiedSite, site_id=site_id)
        
        # Check if already transferred
        if site.verification_status == VerificationStatus.TRANSFERRED:
            return Response(
                {'error': 'This site has already been transferred to Superdatabase'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if approved
        if site.verification_status != VerificationStatus.APPROVED:
            return Response(
                {'error': 'Site must be approved before transfer'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Use the model's transfer method which handles everything
            superdatabase_record = site.transfer_to_superdatabase(transferred_by=request.user)
            
            return Response({
                'success': True,
                'message': 'Site transferred to Superdatabase',
                'superdatabase_id': str(superdatabase_record.factory_id)
            })
            
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Transfer failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# =============================================================================
# BULK ACTIONS
# =============================================================================

class UnverifiedSiteBulkActionAPIView(APIView):
    """
    Perform bulk actions on multiple unverified sites.
    
    UPDATED: Added support for needs_revision and transfer actions
    
    POST body:
    {
        "site_ids": ["uuid1", "uuid2", "uuid3"],
        "action": "approve" | "reject" | "under_review" | "needs_revision" | "transfer",
        "comments": "Optional comments"
    }
    """
    permission_classes = [IsAuthenticated, CanVerifySites]
    
    def post(self, request):
        serializer = BulkActionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        site_ids = serializer.validated_data['site_ids']
        action = serializer.validated_data['action']
        comments = serializer.validated_data.get('comments', '')
        
        sites = UnverifiedSite.objects.filter(site_id__in=site_ids)
        
        if not sites.exists():
            return Response({
                'error': 'No valid sites found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        results = {
            'success': 0,
            'failed': 0,
            'errors': []
        }
        
        for site in sites:
            try:
                if action == 'approve':
                    site.verification_status = VerificationStatus.APPROVED
                    site.verified_by = request.user
                    site.verified_date = timezone.now()
                    site.save()
                    action_label = 'APPROVED'
                    
                elif action == 'reject':
                    site.verification_status = VerificationStatus.REJECTED
                    site.verified_by = request.user
                    site.verified_date = timezone.now()
                    site.rejection_reason = comments
                    site.save()
                    action_label = 'REJECTED'
                    
                elif action == 'under_review':
                    site.verification_status = VerificationStatus.UNDER_REVIEW
                    site.save()
                    action_label = 'UNDER_REVIEW'
                
                elif action == 'needs_revision':
                    site.verification_status = VerificationStatus.NEEDS_REVISION
                    site.verified_by = request.user
                    site.verified_date = timezone.now()
                    site.save()
                    action_label = 'NEEDS_REVISION'
                    
                    # Create review note if comment provided
                    if comments:
                        from .models import ReviewNote
                        ReviewNote.objects.create(
                            site=site,
                            note_text=comments,
                            created_by=request.user,
                            is_internal=False
                        )
                
                elif action == 'transfer':
                    # Check if already transferred
                    if site.verification_status == VerificationStatus.TRANSFERRED:
                        results['failed'] += 1
                        results['errors'].append(f"Site '{site.company_name}' already transferred")
                        continue
                    
                    # Only transfer approved sites
                    if site.verification_status != VerificationStatus.APPROVED:
                        results['failed'] += 1
                        results['errors'].append(f"Site '{site.company_name}' not approved")
                        continue
                    
                    # Transfer to superdatabase (model method handles status update and history)
                    try:
                        site.transfer_to_superdatabase(transferred_by=request.user)
                        # Skip history entry creation - model method already handles it
                        results['success'] += 1
                        continue
                    except Exception as e:
                        results['failed'] += 1
                        results['errors'].append(f"Transfer failed for '{site.company_name}': {str(e)}")
                        continue
                
                # Create history entry (for non-transfer actions)
                VerificationHistory.objects.create(
                    site=site,
                    action=action_label,
                    performed_by=request.user,
                    comments=comments
                )
                
                results['success'] += 1
                
            except Exception as e:
                results['failed'] += 1
                results['errors'].append(f"Error processing '{site.company_name}': {str(e)}")
        
        return Response({
            'success': True,
            'message': f'Bulk {action} completed',
            'results': results
        })


# =============================================================================
# STATISTICS
# =============================================================================

class UnverifiedSiteStatsAPIView(APIView):
    """
    Get statistics about unverified sites for dashboard widgets.
    """
    permission_classes = [IsAuthenticated, IsStaffOnly]
    
    def get(self, request):
        # Count by status
        by_status = {}
        for status_choice in VerificationStatus.choices:
            status_value = status_choice[0]
            count = UnverifiedSite.objects.filter(
                verification_status=status_value
            ).count()
            by_status[status_value] = count
        
        # Count by priority
        by_priority = {}
        for priority_choice in PriorityLevel.choices:
            priority_value = priority_choice[0]
            count = UnverifiedSite.objects.filter(priority=priority_value).count()
            by_priority[priority_value] = count
        
        # Count by source
        by_source = {}
        for source_choice in DataSource.choices:
            source_value = source_choice[0]
            count = UnverifiedSite.objects.filter(source=source_value).count()
            by_source[source_value] = count
        
        # Count by category
        from .models import CompanyCategory
        by_category = {}
        for category_choice in CompanyCategory.choices:
            category_value = category_choice[0]
            count = UnverifiedSite.objects.filter(category=category_value).count()
            by_category[category_value] = count
        
        # Calculate average quality score
        from django.db.models import Avg
        avg_quality = UnverifiedSite.objects.aggregate(
            avg=Avg('data_quality_score')
        )['avg'] or 0
        
        # Count duplicates
        duplicates_count = UnverifiedSite.objects.filter(is_duplicate=True).count()
        
        # Count pending review
        pending_review = UnverifiedSite.objects.filter(
            verification_status=VerificationStatus.PENDING
        ).count()
        
        # Count approved not transferred
        approved_not_transferred = UnverifiedSite.objects.filter(
            verification_status=VerificationStatus.APPROVED
        ).count()
        
        stats = {
            'total': UnverifiedSite.objects.count(),
            'by_status': by_status,
            'by_priority': by_priority,
            'by_source': by_source,
            'by_category': by_category,
            'avg_quality_score': round(avg_quality, 2),
            'duplicates_count': duplicates_count,
            'pending_review': pending_review,
            'approved_not_transferred': approved_not_transferred,
        }
        
        serializer = UnverifiedSiteStatsSerializer(stats)
        return Response(serializer.data)


# =============================================================================
# VERIFICATION HISTORY
# =============================================================================

class VerificationHistoryListAPIView(generics.ListAPIView):
    """
    Get verification history for a specific site.
    """
    serializer_class = VerificationHistorySerializer
    permission_classes = [IsAuthenticated, IsStaffOrDataCollector]
    
    def get_queryset(self):
        site_id = self.kwargs['site_id']
        return VerificationHistory.objects.filter(
            site__site_id=site_id
        ).order_by('-timestamp').select_related('performed_by', 'site')


# =============================================================================
# IMPORT
# =============================================================================

class UnverifiedSiteImportAPIView(APIView):
    """
    Import unverified sites from Excel file.
    This is a placeholder - actual import is done via management command.
    This endpoint could trigger the import or provide status.
    """
    permission_classes = [IsAuthenticated, IsStaffOnly]
    
    def post(self, request):
        # This would handle file upload and trigger import
        # For now, return a message
        return Response({
            'message': 'Use Django management command: python manage.py import_unverified'
        })