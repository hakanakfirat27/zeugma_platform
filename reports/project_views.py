# reports/project_views.py

"""
API Views for Project-based Unverified Sites Management
"""

from rest_framework import status, generics, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Count, Avg, Case, When, F, FloatField
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction

from .models import (
    DataCollectionProject,
    UnverifiedSite,
    ReviewNote,
    ProjectActivityLog,
    VerificationStatus,
    ProjectStatus,
    SuperdatabaseRecord
)
from .project_serializers import (
    DataCollectionProjectListSerializer,
    DataCollectionProjectDetailSerializer,
    DataCollectionProjectCreateUpdateSerializer,
    UnverifiedSiteProjectSerializer,
    UnverifiedSiteDetailWithNotesSerializer,
    UnverifiedSiteUpdateSerializer,
    ReviewNoteSerializer,
    ReviewNoteCreateSerializer,
    ProjectActivityLogSerializer,
    BulkProjectActionSerializer,
    SendForRevisionSerializer,
    ProjectStatsSerializer,
)
from .permissions import (
    IsStaffOrDataCollector,
    IsStaffOnly,
    CanVerifySites,
)
from .pagination import CustomPagination
from accounts.models import UserRole



# ============================================================================
# PROJECT CRUD VIEWS
# ============================================================================

class ProjectListCreateAPIView(generics.ListCreateAPIView):
    """
    GET: List all projects (filtered by user role)
    POST: Create a new project (data collectors only)
    """
    permission_classes = [IsAuthenticated, IsStaffOrDataCollector]
    pagination_class = CustomPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['project_name', 'description', 'target_region']
    ordering_fields = ['created_at', 'updated_at', 'deadline', 'project_name']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter projects based on user role with site count annotations"""
        user = self.request.user
        queryset = DataCollectionProject.objects.all()
        
        # Data collectors see only their own projects
        if user.role == UserRole.DATA_COLLECTOR:
            queryset = queryset.filter(created_by=user)
        
        # Staff/Superadmins see projects they're assigned to review or all projects
        elif user.role in [UserRole.STAFF_ADMIN, UserRole.SUPERADMIN]:
            # Can filter to show only assigned projects if needed
            show_all = self.request.query_params.get('show_all', 'true')
            if show_all.lower() == 'false':
                queryset = queryset.filter(assigned_reviewers=user)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by category
        category_filter = self.request.query_params.get('category')
        if category_filter:
            queryset = queryset.filter(category=category_filter)
        
        # CRITICAL: Annotate with site counts
        queryset = queryset.annotate(
            total_sites=Count('unverified_sites', distinct=True),
            pending_sites=Count(
                Case(When(unverified_sites__verification_status='PENDING', then=1))
            ),
            approved_sites=Count(
                Case(When(unverified_sites__verification_status='APPROVED', then=1))
            ),
            rejected_sites=Count(
                Case(When(unverified_sites__verification_status='REJECTED', then=1))
            ),
            under_review_sites=Count(
                Case(When(unverified_sites__verification_status='UNDER_REVIEW', then=1))
            ),
            needs_revision_sites=Count(
                Case(When(unverified_sites__verification_status='NEEDS_REVISION', then=1))
            ),
        )
        
        # Add computed fields for completion and approval rates
        queryset = queryset.annotate(
            completion_percentage=Case(
                When(target_count=0, then=0.0),
                default=F('total_sites') * 100.0 / F('target_count'),
                output_field=FloatField()
            ),
            approval_rate=Case(
                When(total_sites=0, then=0.0),
                default=F('approved_sites') * 100.0 / F('total_sites'),
                output_field=FloatField()
            )
        )
        
        return queryset.select_related('created_by').prefetch_related('assigned_reviewers')
    
    def get_serializer_class(self):
        """Use different serializers for list and create"""
        if self.request.method == 'POST':
            return DataCollectionProjectCreateUpdateSerializer
        return DataCollectionProjectListSerializer
    
    def perform_create(self, serializer):
        """Set created_by to current user"""
        project = serializer.save(created_by=self.request.user)
        
        # Create activity log
        ProjectActivityLog.objects.create(
            project=project,
            action='CREATED',
            performed_by=self.request.user,
            description=f"Project '{project.project_name}' created"
        )


class ProjectDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET: Get project details
    PUT/PATCH: Update project
    DELETE: Delete project
    """
    permission_classes = [IsAuthenticated, IsStaffOrDataCollector]
    serializer_class = DataCollectionProjectDetailSerializer
    lookup_field = 'project_id'
    
    def get_queryset(self):
        """Filter based on user role"""
        user = self.request.user
        queryset = DataCollectionProject.objects.all()
        
        # Data collectors can only access their own projects
        if user.role == UserRole.DATA_COLLECTOR:
            queryset = queryset.filter(created_by=user)
        
        # Add annotations for detail view
        queryset = queryset.annotate(
            total_sites=Count('unverified_sites', distinct=True),
            pending_sites=Count(
                Case(When(unverified_sites__verification_status='PENDING', then=1))
            ),
            approved_sites=Count(
                Case(When(unverified_sites__verification_status='APPROVED', then=1))
            ),
            rejected_sites=Count(
                Case(When(unverified_sites__verification_status='REJECTED', then=1))
            ),
            under_review_sites=Count(
                Case(When(unverified_sites__verification_status='UNDER_REVIEW', then=1))
            ),
            needs_revision_sites=Count(
                Case(When(unverified_sites__verification_status='NEEDS_REVISION', then=1))
            ),
        )
        
        queryset = queryset.annotate(
            completion_percentage=Case(
                When(target_count=0, then=0.0),
                default=F('total_sites') * 100.0 / F('target_count'),
                output_field=FloatField()
            ),
            approval_rate=Case(
                When(total_sites=0, then=0.0),
                default=F('approved_sites') * 100.0 / F('total_sites'),
                output_field=FloatField()
            )
        )
        
        return queryset.select_related('created_by').prefetch_related('assigned_reviewers')
    
    def get_serializer_class(self):
        """Use different serializers for different methods"""
        if self.request.method in ['PUT', 'PATCH']:
            return DataCollectionProjectCreateUpdateSerializer
        return DataCollectionProjectDetailSerializer
    
    def perform_update(self, serializer):
        """Log update activity"""
        project = serializer.save()
        
        ProjectActivityLog.objects.create(
            project=project,
            action='UPDATED',
            performed_by=self.request.user,
            description=f"Project '{project.project_name}' updated"
        )
    
    def perform_destroy(self, instance):
        """Log deletion before deleting"""
        ProjectActivityLog.objects.create(
            project=instance,
            action='STATUS_CHANGED',
            performed_by=self.request.user,
            description=f"Project '{instance.project_name}' deleted"
        )
        instance.delete()


# ============================================================================
# PROJECT SITES MANAGEMENT
# ============================================================================

class ProjectSitesListAPIView(generics.ListAPIView):
    """
    GET: List all unverified sites in a specific project
    WITH PAGINATION AND SORTING SUPPORT
    """
    permission_classes = [IsAuthenticated, IsStaffOrDataCollector]
    serializer_class = UnverifiedSiteProjectSerializer
    pagination_class = CustomPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['company_name', 'country', 'website']
    
    # ✅ UPDATED: Added 'country' and 'verification_status' for sorting
    ordering_fields = [
        'created_at', 
        'company_name', 
        'country',  # NEW
        'verification_status',  # NEW
        'data_quality_score'
    ]
    ordering = ['-created_at']  # Default ordering
    
    def get_queryset(self):
        """Get sites for specific project with filtering"""
        project_id = self.kwargs.get('project_id')
        project = get_object_or_404(DataCollectionProject, project_id=project_id)
        
        # Check permissions
        user = self.request.user
        if user.role == UserRole.DATA_COLLECTOR and project.created_by != user:
            return UnverifiedSite.objects.none()
        
        queryset = project.unverified_sites.all()
        
        # Performance optimization
        queryset = queryset.select_related(
            'collected_by', 
            'verified_by', 
            'assigned_to'
        )
        
        # ✅ Filter by verification status
        status_filter = self.request.query_params.get('verification_status')
        if status_filter and status_filter != 'ALL':
            queryset = queryset.filter(verification_status=status_filter)
        
        # ✅ Filter by country (optional)
        country_filter = self.request.query_params.get('country')
        if country_filter:
            queryset = queryset.filter(country__icontains=country_filter)
        
        return queryset


class AddSiteToProjectAPIView(generics.CreateAPIView):
    """
    POST: Add a new unverified site to a project
    """
    permission_classes = [IsAuthenticated, IsStaffOrDataCollector]
    serializer_class = UnverifiedSiteDetailWithNotesSerializer
    
    def perform_create(self, serializer):
        """Add site to project with duplicate checking and country validation"""
        from rest_framework.exceptions import ValidationError
        
        project_id = self.kwargs.get('project_id')
        project = get_object_or_404(DataCollectionProject, project_id=project_id)
        
        # Check permissions
        user = self.request.user
        if user.role == UserRole.DATA_COLLECTOR and project.created_by != user:
            raise PermissionError("You can only add sites to your own projects")
        
        # ✅ VALIDATION: Ensure company_name and country are provided and not empty
        company_name = serializer.validated_data.get('company_name', '').strip()
        country = serializer.validated_data.get('country', '').strip()
        
        # ✅ NEW: Validate company_name is not empty
        if not company_name:
            raise ValidationError({
                'company_name': 'Company name is required and cannot be empty.'
            })
        
        # ✅ NEW: Validate country is not empty (REQUIRED FIELD)
        if not country:
            raise ValidationError({
                'country': 'Country is required and cannot be empty. Please select a country.'
            })
        
        # ✅ DUPLICATE DETECTION: Check if company with same name AND country already exists

        existing_site = UnverifiedSite.objects.filter(
            project=project,
            company_name__iexact=company_name,
            country__iexact=country
        ).first()
        
        if existing_site:
            raise ValidationError({
                'company_name': f'A site with company name "{company_name}" and country "{country}" already exists in this project.',
                'country': 'This combination of company name and country already exists.',
                'existing_site_id': str(existing_site.site_id),
                'existing_country': existing_site.country
            })
        
        # Save site with project reference
        site = serializer.save(
            project=project,
            collected_by=user,
            category=project.category,
            is_duplicate=False
        )
        
        # Log activity
        ProjectActivityLog.objects.create(
            project=project,
            action='SITE_ADDED',
            performed_by=user,
            description=f"Site '{site.company_name}' added to project"
        )            


class SiteDetailAPIView(generics.RetrieveAPIView):
    """
    GET: Get detailed information about a single site
    Used for viewing and editing site details
    """
    permission_classes = [IsAuthenticated, IsStaffOrDataCollector]
    serializer_class = UnverifiedSiteDetailWithNotesSerializer
    lookup_field = 'site_id'
    
    def get_queryset(self):
        """Filter sites based on user role"""
        user = self.request.user
        queryset = UnverifiedSite.objects.all()
        
        # Data collectors can only view sites in their projects
        if user.role == UserRole.DATA_COLLECTOR:
            queryset = queryset.filter(
                Q(collected_by=user) | Q(project__created_by=user)
            )
        
        return queryset


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_site_to_project(request, project_id):
    """Add a new unverified site to a project"""
    project = get_object_or_404(DataCollectionProject, project_id=project_id)
    
    # Create unverified site
    site_data = request.data
    site_data['project'] = project.project_id
    site_data['collected_by'] = request.user.id
    site_data['verification_status'] = 'PENDING'
    
    serializer = UnverifiedSiteSerializer(data=site_data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ============================================================================
# SITE UPDATE AND DELETE VIEWS
# ============================================================================

class UpdateSiteInProjectAPIView(generics.UpdateAPIView):
    """
    ✅ FIXED: PUT/PATCH: Update an unverified site with duplicate checking
    """
    permission_classes = [IsAuthenticated, IsStaffOrDataCollector]
    serializer_class = UnverifiedSiteUpdateSerializer  # Uses our fixed serializer
    lookup_field = 'site_id'
    
    def get_queryset(self):
        """Filter sites based on user role"""
        user = self.request.user
        queryset = UnverifiedSite.objects.all()
        
        # Data collectors can only update their own sites
        if user.role == UserRole.DATA_COLLECTOR:
            queryset = queryset.filter(collected_by=user)
        
        return queryset
    
    def perform_update(self, serializer):
        """
        ✅ UPDATED: Validate and log update activity.
        Duplicate checking is now handled in the serializer's validate() method.
        """
        site = serializer.save()
        
        # Log activity if site is part of a project
        if site.project:
            ProjectActivityLog.objects.create(
                project=site.project,
                action='UPDATED',
                performed_by=self.request.user,
                description=f"Site '{site.company_name}' updated"
            )
    
    def update(self, request, *args, **kwargs):
        """
        ✅ UPDATED: Override to handle partial updates properly and return full site data
        """
        partial = True  # Always allow partial updates
        instance = self.get_object()
        
        # The serializer will validate including duplicate checking
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Return the full site data using the detail serializer
        detail_serializer = UnverifiedSiteDetailWithNotesSerializer(instance)
        return Response(detail_serializer.data)


class DeleteSiteFromProjectAPIView(generics.DestroyAPIView):
    """
    DELETE: Delete an unverified site
    Data collectors can only delete their own sites
    Staff/Superadmin can delete any site
    """
    permission_classes = [IsAuthenticated, IsStaffOrDataCollector]
    lookup_field = 'site_id'
    
    def get_queryset(self):
        """Filter sites based on user role"""
        user = self.request.user
        queryset = UnverifiedSite.objects.all()
        
        # Data collectors can only delete their own sites
        if user.role == UserRole.DATA_COLLECTOR:
            queryset = queryset.filter(collected_by=user)
        
        return queryset
    
    def perform_destroy(self, instance):
        """Log deletion activity before deleting"""
        project = instance.project
        company_name = instance.company_name
        
        # Log activity if site is part of a project
        if project:
            ProjectActivityLog.objects.create(
                project=project,
                action='SITE_REMOVED',
                performed_by=self.request.user,
                description=f"Site '{company_name}' deleted from project"
            )
        
        instance.delete()


# ============================================================================
# REVIEW WORKFLOW VIEWS
# ============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated, CanVerifySites])
def send_for_revision(request, site_id):
    """
    Send a site back to data collector for revision.
    Staff/Superadmin only.
    """
    site = get_object_or_404(UnverifiedSite, site_id=site_id)
    serializer = SendForRevisionSerializer(data=request.data)
    
    if serializer.is_valid():
        # Update site status
        site.verification_status = VerificationStatus.NEEDS_REVISION
        site.verified_by = request.user
        site.verified_date = timezone.now()
        site.save()
        
        # Create review note
        ReviewNote.objects.create(
            site=site,
            note_text=serializer.validated_data['note'],
            created_by=request.user,
            is_internal=False  # Visible to data collector
        )
        
        # Log verification history
        from .models import VerificationHistory
        VerificationHistory.objects.create(
            site=site,
            action='NEEDS_REVISION',
            performed_by=request.user,
            comments=serializer.validated_data['note']
        )
        
        # Log project activity
        if site.project:
            ProjectActivityLog.objects.create(
                project=site.project,
                action='SITE_REMOVED',  # Or create a new action type
                performed_by=request.user,
                description=f"Site '{site.company_name}' sent back for revision"
            )
        
        # Send notification to data collector
        # TODO: Implement notification
        
        return Response({
            'message': 'Site sent back for revision',
            'site_id': str(site.site_id),
            'status': site.verification_status
        }, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsStaffOrDataCollector])
def resubmit_site(request, site_id):
    """
    Data collector resubmits a revised site for review.
    """
    site = get_object_or_404(UnverifiedSite, site_id=site_id)
    
    # Check if user is the original collector
    if site.collected_by != request.user:
        return Response(
            {'error': 'You can only resubmit sites you collected'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Check if site needs revision
    if site.verification_status != VerificationStatus.NEEDS_REVISION:
        return Response(
            {'error': 'This site is not marked for revision'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Update site status back to pending
    site.verification_status = VerificationStatus.PENDING
    site.save()
    
    # Add note if provided
    note_text = request.data.get('note', '')
    if note_text:
        ReviewNote.objects.create(
            site=site,
            note_text=note_text,
            created_by=request.user,
            is_internal=False
        )
    
    # Send notification to reviewers
    # TODO: Implement notification
    
    return Response({
        'message': 'Site resubmitted for review',
        'site_id': str(site.site_id),
        'status': site.verification_status
    }, status=status.HTTP_200_OK)


# ============================================================================
# REVIEW NOTES VIEWS
# ============================================================================

class SiteReviewNotesListCreateAPIView(generics.ListCreateAPIView):
    """
    GET: List all review notes for a site
    POST: Add a new review note
    """
    permission_classes = [IsAuthenticated, IsStaffOrDataCollector]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ReviewNoteCreateSerializer
        return ReviewNoteSerializer
    
    def get_queryset(self):
        """Get notes for specific site"""
        site_id = self.kwargs.get('site_id')
        site = get_object_or_404(UnverifiedSite, site_id=site_id)
        
        queryset = site.review_notes.all()
        
        # Data collectors can't see internal notes
        if self.request.user.role == UserRole.DATA_COLLECTOR:
            queryset = queryset.filter(is_internal=False)
        
        return queryset
    
    def perform_create(self, serializer):
        """Create note for site"""
        site_id = self.kwargs.get('site_id')
        site = get_object_or_404(UnverifiedSite, site_id=site_id)
        
        serializer.save(
            site=site,
            created_by=self.request.user
        )


# ============================================================================
# BULK ACTIONS
# ============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated, CanVerifySites])
@transaction.atomic
def bulk_project_action(request, project_id):
    """
    Perform bulk actions on multiple sites within a project.
    Actions: approve, reject, transfer, under_review
    """
    project = get_object_or_404(DataCollectionProject, project_id=project_id)
    serializer = BulkProjectActionSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    site_ids = serializer.validated_data['site_ids']
    action = serializer.validated_data['action']
    note = serializer.validated_data.get('note', '')
    
    # Get sites
    sites = UnverifiedSite.objects.filter(
        site_id__in=site_ids,
        project=project
    )
    
    if not sites.exists():
        return Response(
            {'error': 'No valid sites found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    results = {
        'success': 0,
        'failed': 0,
        'errors': []
    }
    
    # Perform action based on type
    for site in sites:
        try:
            if action == 'approve':
                site.verification_status = VerificationStatus.APPROVED
                site.verified_by = request.user
                site.verified_date = timezone.now()
                site.save()
                
                # Log verification history
                from .models import VerificationHistory
                VerificationHistory.objects.create(
                    site=site,
                    action='APPROVED',
                    performed_by=request.user,
                    comments=note
                )
                
            elif action == 'reject':
                site.verification_status = VerificationStatus.REJECTED
                site.verified_by = request.user
                site.verified_date = timezone.now()
                site.save()
                
                from .models import VerificationHistory
                VerificationHistory.objects.create(
                    site=site,
                    action='REJECTED',
                    performed_by=request.user,
                    comments=note
                )
                
            elif action == 'transfer':
                # Check if already approved
                if site.verification_status != VerificationStatus.APPROVED:
                    results['failed'] += 1
                    results['errors'].append(
                        f"Site '{site.company_name}' not approved"
                    )
                    continue
                
                # Transfer to Superdatabase
                superdatabase_record = site.transfer_to_superdatabase()
                
                results['success'] += 1
                continue
                
            elif action == 'under_review':
                site.verification_status = VerificationStatus.UNDER_REVIEW
                site.save()
            
            elif action == 'needs_revision':
                site.verification_status = VerificationStatus.NEEDS_REVISION
                site.verified_by = request.user
                site.verified_date = timezone.now()
                site.save()
                
                # Create review note if provided
                if note:
                    ReviewNote.objects.create(
                        site=site,
                        note_text=note,
                        created_by=request.user,
                        is_internal=False
                    )
            
            results['success'] += 1
            
        except Exception as e:
            results['failed'] += 1
            results['errors'].append(str(e))
    
    # Log project activity
    ProjectActivityLog.objects.create(
        project=project,
        action=f'BULK_{action.upper()}',
        performed_by=request.user,
        description=f"Bulk {action}: {results['success']} successful, {results['failed']} failed"
    )
    
    return Response({
        'message': f'Bulk {action} completed',
        'results': results
    }, status=status.HTTP_200_OK)


# ============================================================================
# STATISTICS VIEWS
# ============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsStaffOrDataCollector])
def project_stats(request):
    """
    Get overall statistics for projects.
    """
    user = request.user
    
    # Base queryset
    if user.role == UserRole.DATA_COLLECTOR:
        projects = DataCollectionProject.objects.filter(created_by=user)
    else:
        projects = DataCollectionProject.objects.all()
    
    # Calculate stats
    total_projects = projects.count()
    active_projects = projects.filter(status=ProjectStatus.ACTIVE).count()
    completed_projects = projects.filter(status=ProjectStatus.COMPLETED).count()
    
    # Sites stats
    if user.role == UserRole.DATA_COLLECTOR:
        sites = UnverifiedSite.objects.filter(project__created_by=user)
    else:
        sites = UnverifiedSite.objects.filter(project__isnull=False)
    
    total_sites = sites.count()
    pending_sites = sites.filter(verification_status=VerificationStatus.PENDING).count()
    needs_revision_sites = sites.filter(verification_status=VerificationStatus.NEEDS_REVISION).count()
    approved_sites = sites.filter(verification_status=VerificationStatus.APPROVED).count()
    
    # By category
    by_category = {}
    for category in DataCollectionProject.objects.values_list('category', flat=True).distinct():
        count = projects.filter(category=category).count()
        by_category[category] = count
    
    # By status
    by_status = {}
    for status_choice in ProjectStatus.choices:
        count = projects.filter(status=status_choice[0]).count()
        by_status[status_choice[0]] = count
    
    # Recent projects with annotations
    recent_projects = DataCollectionProject.objects.select_related(
        'created_by'
    ).prefetch_related(
        'assigned_reviewers'
    ).annotate(
        total_sites=Count('unverified_sites', distinct=True),
        pending_sites=Count(
            Case(When(unverified_sites__verification_status='PENDING', then=1))
        ),
        approved_sites=Count(
            Case(When(unverified_sites__verification_status='APPROVED', then=1))
        ),
        rejected_sites=Count(
            Case(When(unverified_sites__verification_status='REJECTED', then=1))
        ),
        under_review_sites=Count(
            Case(When(unverified_sites__verification_status='UNDER_REVIEW', then=1))
        ),
        needs_revision_sites=Count(
            Case(When(unverified_sites__verification_status='NEEDS_REVISION', then=1))
        ),
        completion_percentage=Case(
            When(target_count=0, then=0.0),
            default=F('total_sites') * 100.0 / F('target_count'),
            output_field=FloatField()
        ),
        approval_rate=Case(
            When(total_sites=0, then=0.0),
            default=F('approved_sites') * 100.0 / F('total_sites'),
            output_field=FloatField()
        )
    )[:5]
    
    stats_data = {
        'total_projects': total_projects,
        'active_projects': active_projects,
        'completed_projects': completed_projects,
        'total_sites_in_projects': total_sites,
        'pending_review_sites': pending_sites,
        'needs_revision_sites': needs_revision_sites,
        'approved_sites': approved_sites,
        'by_category': by_category,
        'by_status': by_status,
        'recent_projects': recent_projects,
    }
    
    serializer = ProjectStatsSerializer(stats_data)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsStaffOrDataCollector])
def my_tasks(request):
    """
    Get tasks for current user (data collector or reviewer).
    """
    user = request.user
    
    if user.role == UserRole.DATA_COLLECTOR:
        # Get sites needing revision by this collector
        needs_revision = UnverifiedSite.objects.filter(
            collected_by=user,
            verification_status=VerificationStatus.NEEDS_REVISION
        ).select_related('project', 'verified_by').order_by('-verified_date')
        
        serializer = UnverifiedSiteProjectSerializer(needs_revision, many=True)
        
        return Response({
            'needs_revision': serializer.data,
            'count': needs_revision.count()
        })
    
    elif user.role in [UserRole.STAFF_ADMIN, UserRole.SUPERADMIN]:
        # Get sites pending review from assigned projects
        assigned_projects = DataCollectionProject.objects.filter(
            assigned_reviewers=user
        )
        
        pending_sites = UnverifiedSite.objects.filter(
            project__in=assigned_projects,
            verification_status__in=[VerificationStatus.PENDING, VerificationStatus.UNDER_REVIEW]
        ).select_related('project', 'collected_by').order_by('-created_at')
        
        serializer = UnverifiedSiteProjectSerializer(pending_sites, many=True)
        
        return Response({
            'pending_review': serializer.data,
            'count': pending_sites.count(),
            'assigned_projects_count': assigned_projects.count()
        })
    
    return Response({'error': 'Invalid user role'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsStaffOrDataCollector])
def check_duplicate_site(request, project_id):
    """
    POST: Check if a company name already exists in the project
    """
    from rest_framework.response import Response
    from rest_framework import status
    
    project = get_object_or_404(DataCollectionProject, project_id=project_id)
    
    company_name = request.data.get('company_name', '').strip()
    
    if not company_name:
        return Response(
            {'error': 'company_name is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check for exact match (case-insensitive)
    exact_match = UnverifiedSite.objects.filter(
        project=project,
        company_name__iexact=company_name
    ).first()
    
    if exact_match:
        return Response({
            'is_duplicate': True,
            'match_type': 'exact',
            'existing_site': {
                'site_id': str(exact_match.site_id),
                'company_name': exact_match.company_name,
                'country': exact_match.country,
                'verification_status': exact_match.get_verification_status_display()
            }
        })
    
    return Response({
        'is_duplicate': False,
        'message': 'No duplicates found'
    })