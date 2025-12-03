# reports/company_views.py
"""
API Views for Company-Centric Database

These views handle:
- Company CRUD operations
- Production site management
- Version history (view and create versions)
- Notes/comments
- Duplicate checking
- Bulk operations

All endpoints follow REST conventions:
- GET /companies/ - List companies
- POST /companies/ - Create company
- GET /companies/<id>/ - Company detail
- PUT /companies/<id>/ - Update company
- DELETE /companies/<id>/ - Hard delete (permanent), use ?soft=true for soft delete
"""

from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
from django.http import Http404, FileResponse
from django.db.models import Q, Count, Prefetch
from django.utils import timezone
from django.conf import settings
import os
import tempfile

from .company_models import (
    Company, ProductionSite, ProductionSiteVersion,
    CompanyNote, CompanyHistory, CompanyStatus
)
from .company_serializers import (
    CompanyListSerializer, CompanyDetailSerializer,
    CompanyCreateSerializer, CompanyUpdateSerializer,
    ProductionSiteListSerializer, ProductionSiteDetailSerializer,
    ProductionSiteVersionListSerializer, ProductionSiteVersionDetailSerializer,
    ProductionSiteVersionCreateSerializer,
    CompanyNoteSerializer, CompanyNoteCreateSerializer,
    CompanyHistorySerializer,
    DuplicateCheckSerializer, DuplicateCheckResponseSerializer,
    BulkStatusUpdateSerializer, AddProductionSiteSerializer
)
from .permissions import IsStaffOnly, CanVerifySites
from .pagination import CustomPagination
from accounts.models import UserRole


# =============================================================================
# COMPANY VIEWS
# =============================================================================

class CompanyListCreateAPIView(generics.ListCreateAPIView):
    """
    GET: List all companies with filtering
    POST: Create a new company
    
    Supports filters:
    - status: Complete, Incomplete, Deleted (comma-separated)
    - country: Country name
    - category: Filter by production category
    - search: Search company name
    - ordering: company_name, -company_name, created_at, etc.
    """
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['company_name']
    ordering_fields = ['company_name', 'country', 'created_at', 'updated_at', 'unique_key']
    ordering = ['-updated_at']
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CompanyCreateSerializer
        return CompanyListSerializer
    
    def get_queryset(self):
        import json
        
        queryset = Company.objects.prefetch_related(
            'production_sites'
        ).select_related('created_by', 'last_modified_by')
        
        # Filter by status (supports multiple)
        status_param = self.request.query_params.get('status')
        if status_param:
            statuses = [s.strip().upper() for s in status_param.split(',')]
            queryset = queryset.filter(status__in=statuses)
        
        # Filter by country (supports multiple, comma-separated)
        country = self.request.query_params.get('country')
        if country:
            countries = [c.strip() for c in country.split(',')]
            if len(countries) == 1:
                queryset = queryset.filter(country__iexact=countries[0])
            else:
                queryset = queryset.filter(country__in=countries)
        
        # Filter by category (companies that have production in this category)
        category = self.request.query_params.get('category')
        if category:
            categories = [c.strip().upper() for c in category.split(',')]
            queryset = queryset.filter(
                production_sites__category__in=categories
            ).distinct()
        
        # Filter by active production
        has_active = self.request.query_params.get('has_active_production')
        if has_active and has_active.lower() == 'true':
            queryset = queryset.filter(
                production_sites__versions__is_current=True,
                production_sites__versions__is_active=True
            ).distinct()
        
        # Handle filter groups (material and technical filters)
        # Filter groups use OR logic within a group, AND logic between groups
        # This filters companies based on their production site versions
        filter_groups_param = self.request.query_params.get('filter_groups')
        if filter_groups_param:
            try:
                filter_groups = json.loads(filter_groups_param)
                if isinstance(filter_groups, list):
                    for group in filter_groups:
                        if not isinstance(group, dict):
                            continue
                        
                        # Build OR query for all filters within this group
                        group_query = Q()
                        
                        # Handle boolean/material filters
                        filters = group.get('filters', {})
                        if filters:
                            for field_name, field_value in filters.items():
                                # Check if field exists on ProductionSiteVersion model
                                try:
                                    ProductionSiteVersion._meta.get_field(field_name)
                                    
                                    if field_value is True:
                                        # Include: find versions where field is True
                                        group_query |= Q(**{
                                            f'production_sites__versions__is_current': True,
                                            f'production_sites__versions__{field_name}': True
                                        })
                                    elif field_value is False:
                                        # Exclude: find versions where field is False or null
                                        group_query |= Q(**{
                                            f'production_sites__versions__is_current': True,
                                            f'production_sites__versions__{field_name}': False
                                        }) | Q(**{
                                            f'production_sites__versions__is_current': True,
                                            f'production_sites__versions__{field_name}__isnull': True
                                        })
                                except Exception:
                                    continue
                        
                        # Handle technical filters (with equals and range modes)
                        technical_filters = group.get('technicalFilters', {})
                        if technical_filters:
                            for field_name, filter_config in technical_filters.items():
                                if not isinstance(filter_config, dict):
                                    continue
                                
                                try:
                                    field = ProductionSiteVersion._meta.get_field(field_name)
                                    mode = filter_config.get('mode', 'range')
                                    
                                    if mode == 'equals':
                                        # EQUALS MODE: field = exact_value
                                        equals_val = filter_config.get('equals', '')
                                        
                                        if equals_val != '' and equals_val is not None:
                                            try:
                                                if field.get_internal_type() == 'FloatField':
                                                    equals_val = float(equals_val)
                                                else:
                                                    equals_val = int(equals_val)
                                                
                                                group_query |= Q(**{
                                                    f'production_sites__versions__is_current': True,
                                                    f'production_sites__versions__{field_name}': equals_val
                                                })
                                            except (ValueError, TypeError):
                                                pass
                                    
                                    elif mode == 'range':
                                        # RANGE MODE: field >= min AND field <= max
                                        min_val = filter_config.get('min', '')
                                        max_val = filter_config.get('max', '')
                                        
                                        range_query = Q(**{
                                            f'production_sites__versions__is_current': True
                                        })
                                        
                                        if min_val != '' and min_val is not None:
                                            try:
                                                if field.get_internal_type() == 'FloatField':
                                                    min_val = float(min_val)
                                                else:
                                                    min_val = int(min_val)
                                                range_query &= Q(**{f'production_sites__versions__{field_name}__gte': min_val})
                                            except (ValueError, TypeError):
                                                pass
                                        
                                        if max_val != '' and max_val is not None:
                                            try:
                                                if field.get_internal_type() == 'FloatField':
                                                    max_val = float(max_val)
                                                else:
                                                    max_val = int(max_val)
                                                range_query &= Q(**{f'production_sites__versions__{field_name}__lte': max_val})
                                            except (ValueError, TypeError):
                                                pass
                                        
                                        group_query |= range_query
                                
                                except Exception:
                                    continue
                        
                        # AND this group with the queryset
                        if group_query:
                            queryset = queryset.filter(group_query).distinct()
            
            except json.JSONDecodeError:
                pass  # Invalid JSON, ignore
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Check for similar companies (warning, not error)
        similar_companies = serializer.context.get('similar_companies', [])
        
        company = serializer.save()
        
        response_data = CompanyDetailSerializer(company).data
        
        if similar_companies:
            response_data['warning'] = {
                'message': 'Similar companies found. Please verify this is not a duplicate.',
                'similar_companies': similar_companies
            }
        
        return Response(response_data, status=status.HTTP_201_CREATED)


class CompanyDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET: Get company details with all production sites
    PUT/PATCH: Update company core info
    DELETE: Hard delete (permanent) - use ?soft=true for soft delete
    
    Supports both integer pk and UUID company_id for lookup.
    """
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        """Support both pk (integer) and company_id (UUID) lookup"""
        queryset = self.get_queryset()
        
        # Check if pk (integer) or company_id (UUID) is provided
        pk = self.kwargs.get('pk')
        company_id = self.kwargs.get('company_id')
        
        if pk:
            obj = get_object_or_404(queryset, pk=pk)
        elif company_id:
            obj = get_object_or_404(queryset, company_id=company_id)
        else:
            raise Http404("No company identifier provided")
        
        self.check_object_permissions(self.request, obj)
        return obj
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return CompanyUpdateSerializer
        return CompanyDetailSerializer
    
    def get_queryset(self):
        return Company.objects.prefetch_related(
            Prefetch(
                'production_sites',
                queryset=ProductionSite.objects.prefetch_related(
                    Prefetch(
                        'versions',
                        queryset=ProductionSiteVersion.objects.select_related('created_by', 'verified_by')
                    )
                )
            ),
            'notes',
            'history'
        ).select_related('created_by', 'last_modified_by', 'source_project')
    
    def destroy(self, request, *args, **kwargs):
        """Delete company - default is hard delete, ?soft=true for soft delete"""
        company = self.get_object()
        
        # Check if soft delete requested
        soft_delete = request.query_params.get('soft', '').lower() == 'true'
        
        if soft_delete:
            # Soft delete: change status to DELETED
            old_status = company.status
            company.status = CompanyStatus.DELETED
            company.last_modified_by = request.user
            company.save()
            
            # Create history entry
            CompanyHistory.objects.create(
                company=company,
                action='STATUS_CHANGED',
                performed_by=request.user,
                description='Company marked as deleted',
                changes={'status': {'old': old_status, 'new': 'DELETED'}}
            )
            
            return Response(
                {'message': 'Company marked as deleted', 'company_id': str(company.company_id)},
                status=status.HTTP_200_OK
            )
        else:
            # Hard delete: permanently remove the company and all related data
            company_id = str(company.company_id)
            company_name = company.company_name
            unique_key = company.unique_key
            
            # Delete the company (cascade will delete production sites, versions, notes, history)
            company.delete()
            
            return Response(
                {
                    'message': f'Company "{company_name}" permanently deleted',
                    'deleted_company_id': company_id,
                    'deleted_unique_key': unique_key
                },
                status=status.HTTP_200_OK
            )


# =============================================================================
# PRODUCTION SITE VIEWS
# =============================================================================

class ProductionSiteListAPIView(generics.ListAPIView):
    """
    GET: List all production sites for a company
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ProductionSiteListSerializer
    
    def get_queryset(self):
        company_id = self.kwargs.get('company_id')
        return ProductionSite.objects.filter(
            company__company_id=company_id
        ).prefetch_related('versions').select_related('company')


class ProductionSiteCreateAPIView(APIView):
    """
    POST: Add a new production site (category) to a company
    """
    permission_classes = [IsAuthenticated, IsStaffOnly]
    
    # Fields that should NOT be passed to version creation
    EXCLUDED_VERSION_FIELDS = {
        'category', 'version_id', 'id', 'production_site', 'production_site_id',
        'version_number', 'is_current', 'created_at', 'created_by',
        'created_by_id', 'verified_at', 'verified_by', 'verified_by_id',
        'site_id', 'company_id'
    }
    
    def post(self, request, company_id):
        from .company_models import ProductionSiteVersion
        
        company = get_object_or_404(Company, company_id=company_id)
        
        # Get category from request data
        category = request.data.get('category')
        if not category:
            return Response(
                {'error': 'Category is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if category already exists for this company
        if company.production_sites.filter(category=category).exists():
            return Response(
                {'error': f'Company already has a {category} production site'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get field info from model to determine types
        field_types = {}
        for field in ProductionSiteVersion._meta.get_fields():
            if hasattr(field, 'column'):
                field_types[field.name] = field.get_internal_type()
        
        valid_field_names = set(field_types.keys())
        
        # Extract and clean version data
        version_data = {}
        for k, v in request.data.items():
            if k in self.EXCLUDED_VERSION_FIELDS or k not in valid_field_names:
                continue
            
            # Clean the value based on field type
            field_type = field_types.get(k, 'CharField')
            
            if field_type in ('IntegerField', 'FloatField', 'DecimalField', 'PositiveIntegerField'):
                # Convert empty string to None for numeric fields
                if v == '' or v is None:
                    version_data[k] = None
                else:
                    try:
                        version_data[k] = int(v) if field_type == 'IntegerField' or field_type == 'PositiveIntegerField' else float(v)
                    except (ValueError, TypeError):
                        version_data[k] = None
            elif field_type == 'BooleanField':
                # Ensure boolean
                version_data[k] = bool(v) if v not in ('', None) else False
            else:
                # String fields - keep empty strings or actual values
                version_data[k] = v if v is not None else ''
        
        try:
            # Create production site and initial version
            site, version = company.add_production_site(
                category=category,
                created_by=request.user,
                version_data=version_data
            )
            
            # Create history
            CompanyHistory.objects.create(
                company=company,
                action='SITE_ADDED',
                performed_by=request.user,
                description=f'Added {site.get_category_display()} production site',
                related_production_site=site,
                related_version=version
            )
            
            return Response(
                ProductionSiteDetailSerializer(site).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            import logging
            import traceback
            logger = logging.getLogger(__name__)
            logger.error(f"Error creating production site: {e}")
            logger.error(traceback.format_exc())
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ProductionSiteDetailAPIView(generics.RetrieveDestroyAPIView):
    """
    GET: Get production site details with all versions
    DELETE: Hard delete production site (permanent) - use ?soft=true for soft delete
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ProductionSiteDetailSerializer
    lookup_field = 'site_id'
    
    def get_queryset(self):
        company_id = self.kwargs.get('company_id')
        return ProductionSite.objects.filter(
            company__company_id=company_id
        ).prefetch_related(
            Prefetch(
                'versions',
                queryset=ProductionSiteVersion.objects.select_related('created_by', 'verified_by')
            ),
            'notes'
        )
    
    def destroy(self, request, *args, **kwargs):
        """Delete production site - default is hard delete, ?soft=true for soft delete"""
        site = self.get_object()
        company = site.company
        category_display = site.get_category_display()
        
        # Check if soft delete requested
        soft_delete = request.query_params.get('soft', '').lower() == 'true'
        
        if soft_delete:
            # Soft delete: mark current version as inactive
            current_version = site.current_version
            if current_version:
                current_version.is_active = False
                current_version.save()
            
            # Create history
            CompanyHistory.objects.create(
                company=company,
                action='SITE_REMOVED',
                performed_by=request.user,
                description=f'{category_display} production marked as inactive',
                related_production_site=site
            )
            
            return Response(
                {'message': 'Production site marked as inactive'},
                status=status.HTTP_200_OK
            )
        else:
            # Hard delete: permanently remove the production site and all versions
            site_id = str(site.site_id)
            
            # Create history before deleting (site reference will be null)
            CompanyHistory.objects.create(
                company=company,
                action='SITE_REMOVED',
                performed_by=request.user,
                description=f'{category_display} production site permanently deleted',
                changes={'deleted_site_id': site_id, 'deleted_category': site.category}
            )
            
            # Delete the site (cascade will delete versions)
            site.delete()
            
            return Response(
                {'message': f'{category_display} production site permanently deleted'},
                status=status.HTTP_200_OK
            )


# =============================================================================
# VERSION VIEWS
# =============================================================================

class VersionListAPIView(generics.ListAPIView):
    """
    GET: List all versions for a production site with FULL data
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ProductionSiteVersionDetailSerializer  # Use detail serializer for full data
    
    def get_queryset(self):
        site_id = self.kwargs.get('site_id')
        return ProductionSiteVersion.objects.filter(
            production_site__site_id=site_id
        ).select_related('created_by', 'verified_by', 'production_site')


class VersionDetailAPIView(generics.RetrieveDestroyAPIView):
    """
    GET: Get specific version details
    DELETE: Delete a version (cannot delete initial version)
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ProductionSiteVersionDetailSerializer
    lookup_field = 'version_id'
    
    def get_queryset(self):
        site_id = self.kwargs.get('site_id')
        return ProductionSiteVersion.objects.filter(
            production_site__site_id=site_id
        ).select_related('created_by', 'verified_by', 'production_site')
    
    def destroy(self, request, *args, **kwargs):
        import logging
        import traceback
        logger = logging.getLogger(__name__)
        
        try:
            logger.info(f"DELETE request received for version. kwargs: {kwargs}")
            
            version = self.get_object()
            site = version.production_site
            
            logger.info(f"Attempting to delete version {version.version_id}: "
                        f"version_number={version.version_number}, "
                        f"is_initial={version.is_initial}, "
                        f"is_current={version.is_current}")
            
            # Cannot delete initial version (is_initial=True OR version_number=0)
            if version.is_initial or version.version_number == 0:
                logger.warning(f"Cannot delete initial version {version.version_id}")
                return Response(
                    {'error': 'Cannot delete the Initial Version. It is the baseline snapshot.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Versions (other than Initial) are read-only snapshots.
            # Deleting them should NEVER affect the live working data.
            # The live working data always lives on the Initial Version (is_current=True).
            # So we do NOT change is_current on any other version when deleting.
            
            # Create history before deleting
            CompanyHistory.objects.create(
                company=version.production_site.company,
                action='VERSION_CREATED',  # Using this since no 'VERSION_DELETED' option
                performed_by=request.user,
                description=f'Deleted version {version.version_number} from {version.production_site.get_category_display()}',
                related_production_site=version.production_site,
                changes={'deleted_version': version.version_number}
            )
            
            version_number = version.version_number
            version.delete()
            
            logger.info(f"Successfully deleted version {version_number}")
            
            return Response(
                {'message': f'Version {version_number} deleted'},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            logger.error(f"Error deleting version: {e}")
            logger.error(traceback.format_exc())
            return Response(
                {'error': f'Failed to delete version: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CreateVersionAPIView(APIView):
    """
    POST: Create a new version for a production site
    
    This is explicitly triggered - NOT automatic on every update.
    Use this when you want to create a historical snapshot.
    """
    permission_classes = [IsAuthenticated, IsStaffOnly]
    
    def post(self, request, company_id, site_id):
        site = get_object_or_404(
            ProductionSite,
            site_id=site_id,
            company__company_id=company_id
        )
        
        serializer = ProductionSiteVersionCreateSerializer(
            data=request.data,
            context={'production_site': site, 'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        version = serializer.save()
        
        # Create history
        CompanyHistory.objects.create(
            company=site.company,
            action='VERSION_CREATED',
            performed_by=request.user,
            description=f'New version created for {site.get_category_display()}',
            related_production_site=site,
            related_version=version
        )
        
        return Response(
            ProductionSiteVersionDetailSerializer(version).data,
            status=status.HTTP_201_CREATED
        )


class UpdateCurrentVersionAPIView(APIView):
    """
    PUT: Update the current version without creating a new version
    
    Use this for minor corrections that don't warrant a new version.
    
    NOTE: If the only version is the Initial Version, this will automatically
    create a new version (Version 1) with the changes, preserving the Initial
    Version as the baseline snapshot.
    """
    permission_classes = [IsAuthenticated, IsStaffOnly]
    
    # Fields that should NOT be updated via this endpoint
    EXCLUDED_FIELDS = {
        'version_id', 'id', 'production_site', 'production_site_id',
        'version_number', 'is_current', 'created_at', 'created_by',
        'created_by_id', 'verified_at', 'verified_by', 'verified_by_id',
        'category', 'category_display', 'display_fields',
        # Also exclude any computed/serializer-only fields
        'site_id', 'company_id', 'is_initial', 'is_active',
        # Exclude snapshot fields - these are only set on version creation
        'company_data_snapshot', 'contact_data_snapshot', 'notes_snapshot',
        # Exclude version_notes - handled separately
        'version_notes'
    }
    
    def put(self, request, company_id, site_id):
        import logging
        import traceback
        logger = logging.getLogger(__name__)
        
        try:
            from django.db.models import Max
            
            logger.info(f"UpdateCurrentVersion called for company={company_id}, site={site_id}")
            
            # Check if site exists
            try:
                site = ProductionSite.objects.get(
                    site_id=site_id,
                    company__company_id=company_id
                )
                logger.info(f"Found site: {site.site_id}, category={site.category}")
            except ProductionSite.DoesNotExist:
                logger.error(f"Site not found: site_id={site_id}, company_id={company_id}")
                return Response(
                    {'error': 'Production site not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            current_version = site.current_version
            if not current_version:
                # No current version - try to find any version and make it current
                logger.warning("No current version found, attempting to recover...")
                any_version = site.versions.order_by('-version_number').first()
                if any_version:
                    any_version.is_current = True
                    any_version.save()
                    current_version = any_version
                    logger.info(f"Recovered: Set version {current_version.version_number} as current")
                else:
                    logger.error("No versions exist for this site at all")
                    return Response(
                        {'error': 'No versions found for this production site'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            
            logger.info(f"Current version: {current_version.version_id}, is_initial={current_version.is_initial}, version_number={current_version.version_number}")
            
            # Update the current version directly (whether it's Initial or not)
            # Versions are only created when user explicitly clicks "Create Version"
            logger.info("Updating current version...")
            # Track changes - only update allowed fields
            changes = {}
            for field, new_value in request.data.items():
                # Skip excluded fields
                if field in self.EXCLUDED_FIELDS:
                    continue
                    
                # Check if field exists on model
                if hasattr(current_version, field):
                    old_value = getattr(current_version, field)
                    if old_value != new_value:
                        changes[field] = {'old': str(old_value), 'new': str(new_value)}
                        setattr(current_version, field, new_value)
            
            if changes:
                current_version.save()
                logger.info(f"Updated {len(changes)} fields")
            
            return Response(
                ProductionSiteVersionDetailSerializer(current_version).data,
                status=status.HTTP_200_OK
            )
        except Exception as e:
            logger.error(f"Error in UpdateCurrentVersion: {e}")
            logger.error(traceback.format_exc())
            return Response(
                {'error': f'Failed to update: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class RestoreVersionAPIView(APIView):
    """
    POST: Restore an old version by copying its technical data to the current working version (Initial Version).
    
    This does NOT create a new version - it updates the live working data.
    """
    permission_classes = [IsAuthenticated, IsStaffOnly]
    
    def post(self, request, company_id, site_id, version_id):
        import logging
        logger = logging.getLogger(__name__)
        
        site = get_object_or_404(
            ProductionSite,
            site_id=site_id,
            company__company_id=company_id
        )
        
        old_version = get_object_or_404(
            ProductionSiteVersion,
            version_id=version_id,
            production_site=site
        )
        
        # Get the current working version (should be Initial Version)
        current_version = site.current_version
        if not current_version:
            return Response(
                {'error': 'No current version found to restore to'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Fields to exclude when copying
        excluded_fields = {
            'version_id', 'id', 'production_site', 'production_site_id',
            'version_number', 'is_current', 'is_initial', 'created_at', 'created_by',
            'created_by_id', 'version_notes', 'verified_at', 'verified_by',
            'verified_by_id', 'is_active',
            # Don't copy snapshot fields - they belong to the snapshot version
            'company_data_snapshot', 'contact_data_snapshot', 'notes_snapshot'
        }
        
        # Copy technical fields from old version to current version
        changes = {}
        for field in ProductionSiteVersion._meta.get_fields():
            if hasattr(field, 'concrete') and field.concrete:
                field_name = field.name
                if field_name not in excluded_fields:
                    try:
                        old_value = getattr(current_version, field_name)
                        new_value = getattr(old_version, field_name)
                        if old_value != new_value:
                            changes[field_name] = {'old': str(old_value), 'new': str(new_value)}
                            setattr(current_version, field_name, new_value)
                    except AttributeError:
                        pass
        
        if changes:
            current_version.save()
            logger.info(f"Restored {len(changes)} fields from version {old_version.version_number}")
        
        # Create history
        CompanyHistory.objects.create(
            company=site.company,
            action='VERSION_CREATED',
            performed_by=request.user,
            description=f'Restored {site.get_category_display()} data from version {old_version.version_number}',
            related_production_site=site,
            changes={'restored_from_version': old_version.version_number, 'fields_changed': len(changes)}
        )
        
        return Response(
            ProductionSiteVersionDetailSerializer(current_version).data,
            status=status.HTTP_200_OK
        )


# =============================================================================
# NOTE VIEWS
# =============================================================================

class CompanyNoteListCreateAPIView(generics.ListCreateAPIView):
    """
    GET: List all notes for a company
    POST: Add a new note
    """
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CompanyNoteCreateSerializer
        return CompanyNoteSerializer
    
    def get_queryset(self):
        company_id = self.kwargs.get('company_id')
        return CompanyNote.objects.filter(
            company__company_id=company_id
        ).select_related('created_by', 'production_site')
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        company_id = self.kwargs.get('company_id')
        context['company'] = get_object_or_404(Company, company_id=company_id)
        return context
    
    def perform_create(self, serializer):
        note = serializer.save()
        
        # Create history
        CompanyHistory.objects.create(
            company=note.company,
            action='NOTE_ADDED',
            performed_by=self.request.user,
            description=f'Note added: {note.get_note_type_display()}'
        )


class CompanyNoteDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET: Get note detail
    PUT: Update note
    DELETE: Delete note
    """
    permission_classes = [IsAuthenticated]
    serializer_class = CompanyNoteSerializer
    lookup_field = 'note_id'
    
    def get_queryset(self):
        company_id = self.kwargs.get('company_id')
        return CompanyNote.objects.filter(
            company__company_id=company_id
        ).select_related('created_by')


# =============================================================================
# DUPLICATE CHECK VIEWS
# =============================================================================

class DuplicateCheckAPIView(APIView):
    """
    POST: Check if a company name is a duplicate or similar to existing
    
    Request:
        {
            "company_name": "HMJ Plastic",
            "country": "Germany",  # optional
            "exclude_id": "uuid"   # optional, for editing
        }
    
    Response:
        {
            "is_duplicate": false,
            "exact_match": null,
            "similar_matches": [
                {
                    "company_id": "uuid",
                    "unique_key": "ZGM-00001",
                    "company_name": "HMJ Plastics Ltd",
                    "country": "Germany",
                    "similarity": 85.5,
                    "match_type": "Similar"
                }
            ]
        }
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = DuplicateCheckSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        from .services.duplicate_check import DuplicateCheckService
        
        result = DuplicateCheckService.check_duplicate(
            company_name=serializer.validated_data['company_name'],
            country=serializer.validated_data.get('country'),
            exclude_id=serializer.validated_data.get('exclude_id')
        )
        
        return Response(DuplicateCheckResponseSerializer(result).data)


# =============================================================================
# BULK OPERATION VIEWS
# =============================================================================

class BulkStatusUpdateAPIView(APIView):
    """
    POST: Update status for multiple companies at once
    """
    permission_classes = [IsAuthenticated, IsStaffOnly]
    
    def post(self, request):
        serializer = BulkStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        company_ids = serializer.validated_data['company_ids']
        new_status = serializer.validated_data['status']
        
        updated = Company.objects.filter(
            company_id__in=company_ids
        ).update(
            status=new_status,
            last_modified_by=request.user,
            updated_at=timezone.now()
        )
        
        # Create history entries
        for company_id in company_ids:
            try:
                company = Company.objects.get(company_id=company_id)
                CompanyHistory.objects.create(
                    company=company,
                    action='STATUS_CHANGED',
                    performed_by=request.user,
                    description=f'Bulk status update to {new_status}',
                    changes={'status': {'new': new_status}}
                )
            except Company.DoesNotExist:
                pass
        
        return Response({
            'message': f'Updated {updated} companies',
            'updated_count': updated
        })


# =============================================================================
# HISTORY VIEW
# =============================================================================

class CompanyHistoryAPIView(generics.ListAPIView):
    """
    GET: List company history/audit trail
    """
    permission_classes = [IsAuthenticated]
    serializer_class = CompanyHistorySerializer
    pagination_class = CustomPagination
    
    def get_queryset(self):
        company_id = self.kwargs.get('company_id')
        return CompanyHistory.objects.filter(
            company__company_id=company_id
        ).select_related('performed_by', 'related_production_site', 'related_version')


# =============================================================================
# STATISTICS VIEW
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def company_stats(request):
    """
    GET: Get statistics about companies
    
    Supports filters (same as company list):
    - status: Complete, Incomplete, Deleted (comma-separated)
    - country: Country name (comma-separated)
    - category: Filter by production category (comma-separated)
    - search: Search company name
    - filter_groups: JSON array of filter groups for material/technical filters
    """
    import json
    from django.db.models import Count
    
    # Start with base queryset
    queryset = Company.objects.all()
    
    # Apply filters (same logic as CompanyListCreateAPIView)
    
    # Filter by status
    status_param = request.query_params.get('status')
    if status_param:
        statuses = [s.strip().upper() for s in status_param.split(',')]
        queryset = queryset.filter(status__in=statuses)
    
    # Filter by country
    country = request.query_params.get('country')
    if country:
        countries = [c.strip() for c in country.split(',')]
        if len(countries) == 1:
            queryset = queryset.filter(country__iexact=countries[0])
        else:
            queryset = queryset.filter(country__in=countries)
    
    # Filter by category
    category = request.query_params.get('category')
    if category:
        categories = [c.strip().upper() for c in category.split(',')]
        queryset = queryset.filter(
            production_sites__category__in=categories
        ).distinct()
    
    # Filter by search (company name only)
    search = request.query_params.get('search')
    if search:
        queryset = queryset.filter(company_name__icontains=search)
    
    # Handle filter groups (material and technical filters)
    filter_groups_param = request.query_params.get('filter_groups')
    if filter_groups_param:
        try:
            filter_groups = json.loads(filter_groups_param)
            if isinstance(filter_groups, list):
                for group in filter_groups:
                    if not isinstance(group, dict):
                        continue
                    
                    group_query = Q()
                    
                    # Handle boolean/material filters
                    filters = group.get('filters', {})
                    if filters:
                        for field_name, field_value in filters.items():
                            try:
                                ProductionSiteVersion._meta.get_field(field_name)
                                
                                if field_value is True:
                                    group_query |= Q(**{
                                        f'production_sites__versions__is_current': True,
                                        f'production_sites__versions__{field_name}': True
                                    })
                                elif field_value is False:
                                    group_query |= Q(**{
                                        f'production_sites__versions__is_current': True,
                                        f'production_sites__versions__{field_name}': False
                                    }) | Q(**{
                                        f'production_sites__versions__is_current': True,
                                        f'production_sites__versions__{field_name}__isnull': True
                                    })
                            except Exception:
                                continue
                    
                    # Handle technical filters
                    technical_filters = group.get('technicalFilters', {})
                    if technical_filters:
                        for field_name, filter_config in technical_filters.items():
                            if not isinstance(filter_config, dict):
                                continue
                            
                            try:
                                field = ProductionSiteVersion._meta.get_field(field_name)
                                mode = filter_config.get('mode', 'range')
                                
                                if mode == 'equals':
                                    equals_val = filter_config.get('equals', '')
                                    if equals_val != '' and equals_val is not None:
                                        try:
                                            if field.get_internal_type() == 'FloatField':
                                                equals_val = float(equals_val)
                                            else:
                                                equals_val = int(equals_val)
                                            
                                            group_query |= Q(**{
                                                f'production_sites__versions__is_current': True,
                                                f'production_sites__versions__{field_name}': equals_val
                                            })
                                        except (ValueError, TypeError):
                                            pass
                                
                                elif mode == 'range':
                                    min_val = filter_config.get('min', '')
                                    max_val = filter_config.get('max', '')
                                    
                                    range_query = Q(**{
                                        f'production_sites__versions__is_current': True
                                    })
                                    
                                    if min_val != '' and min_val is not None:
                                        try:
                                            if field.get_internal_type() == 'FloatField':
                                                min_val = float(min_val)
                                            else:
                                                min_val = int(min_val)
                                            range_query &= Q(**{f'production_sites__versions__{field_name}__gte': min_val})
                                        except (ValueError, TypeError):
                                            pass
                                    
                                    if max_val != '' and max_val is not None:
                                        try:
                                            if field.get_internal_type() == 'FloatField':
                                                max_val = float(max_val)
                                            else:
                                                max_val = int(max_val)
                                            range_query &= Q(**{f'production_sites__versions__{field_name}__lte': max_val})
                                        except (ValueError, TypeError):
                                            pass
                                    
                                    group_query |= range_query
                            
                            except Exception:
                                continue
                    
                    if group_query:
                        queryset = queryset.filter(group_query).distinct()
        
        except json.JSONDecodeError:
            pass
    
    # Now calculate stats based on filtered queryset
    total = queryset.count()
    
    by_status = dict(
        queryset.values('status')
        .annotate(count=Count('id'))
        .values_list('status', 'count')
    )
    
    by_country = list(
        queryset.values('country')
        .annotate(count=Count('id'))
        .order_by('-count')
    )
    
    # Categories with most companies (from filtered set)
    company_ids = queryset.values_list('id', flat=True)
    by_category = list(
        ProductionSite.objects.filter(company_id__in=company_ids)
        .values('category')
        .annotate(count=Count('company', distinct=True))
        .order_by('-count')
    )
    
    # Companies with multiple categories
    multi_category = queryset.annotate(
        site_count=Count('production_sites')
    ).filter(site_count__gt=1).count()
    
    # Calculate unique countries count
    countries_count = queryset.exclude(country__isnull=True).exclude(country='').values('country').distinct().count()
    
    return Response({
        'total_companies': total,
        'countries_count': countries_count,
        'by_status': {
            'complete': by_status.get('COMPLETE', 0),
            'incomplete': by_status.get('INCOMPLETE', 0),
            'deleted': by_status.get('DELETED', 0)
        },
        'by_country': by_country,
        'by_category': by_category,
        'multi_category_companies': multi_category
    })


# =============================================================================
# IMPORT COMPANIES VIEW
# =============================================================================

class ImportCompaniesAPIView(APIView):
    """
    POST: Import companies from an Excel file
    
    The Excel file can have multiple sheets, one per category:
    - Injection Moulders
    - Blow Moulders
    - Roto Moulders
    - PE Film Extruders
    - Sheet Extruders
    - Pipe Extruders
    - Tube & Hose Extruders
    - Profile Extruders
    - Cable Extruders
    - Compounders
    
    Import Logic:
    1. If ALL 29 company fields (COMMON_FIELDS + CONTACT_FIELDS) match exactly:
       - If company already has this category → Skip (no update)
       - If company doesn't have this category → Add the category/process
    2. If company fields don't match but same name+address+country exists:
       - Mark as potential duplicate, create new company
    3. If company doesn't exist → Create new company with all fields
    
    Returns:
    - Import statistics
    - List of potential duplicates (for manual review)
    - Path to duplicates report Excel file
    """
    permission_classes = [IsAuthenticated, IsStaffOnly]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request):
        import uuid
        import logging
        import traceback
        from .services.company_import import CompanyImportService
        
        logger = logging.getLogger(__name__)
        logger.info("Import request received")
        
        # Check if file was provided
        if 'file' not in request.FILES:
            return Response(
                {'error': 'No file provided. Please upload an Excel file.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        uploaded_file = request.FILES['file']
        logger.info(f"Uploaded file: {uploaded_file.name}, size: {uploaded_file.size}")
        
        # Validate file extension
        if not uploaded_file.name.endswith(('.xlsx', '.xls')):
            return Response(
                {'error': 'Invalid file format. Please upload an Excel file (.xlsx or .xls)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Save uploaded file to temp location
        temp_dir = os.path.join(settings.MEDIA_ROOT, 'temp_imports')
        os.makedirs(temp_dir, exist_ok=True)
        
        # Generate unique filename
        unique_id = str(uuid.uuid4())[:8]
        temp_filename = f'import_{unique_id}_{uploaded_file.name}'
        temp_filepath = os.path.join(temp_dir, temp_filename)
        
        # Write uploaded file to temp location
        with open(temp_filepath, 'wb+') as destination:
            for chunk in uploaded_file.chunks():
                destination.write(chunk)
        
        logger.info(f"File saved to: {temp_filepath}")
        
        # Generate report path for potential duplicates
        report_filename = f'potential_duplicates_{unique_id}.xlsx'
        report_filepath = os.path.join(temp_dir, report_filename)
        
        try:
            # Run the import
            logger.info("Starting import...")
            result = CompanyImportService.import_from_excel(
                file_path=temp_filepath,
                user=request.user,
                report_path=report_filepath
            )
            logger.info(f"Import completed. Companies created: {result.get('companies_created', 0)}")
            
            # Build response
            response_data = {
                'success': True,
                'message': 'Import completed successfully',
                'statistics': {
                    'total_rows_processed': result.get('total_rows', 0),
                    'companies_created': result.get('companies_created', 0),
                    'companies_updated': result.get('companies_updated', 0),
                    'exact_matches_merged': result.get('merged_count', 0),
                    'production_sites_created': result.get('sites_created', 0),
                    'versions_created': result.get('versions_created', 0),
                },
                'sheets_processed': result.get('sheets_processed', []),
                'potential_duplicates_count': len(result.get('potential_duplicates', [])),
                'errors_count': len(result.get('errors', [])),
                'errors': result.get('errors', [])[:50],  # Limit to first 50 errors
            }
            
            # Include report download info if duplicates were found
            if result.get('potential_duplicates'):
                response_data['duplicates_report'] = {
                    'filename': report_filename,
                    'download_url': f'/api/companies/import/download-report/{report_filename}/',
                    'message': 'Potential duplicates found. Download the report for manual review.'
                }
                # Include first 10 duplicates in response
                response_data['potential_duplicates_sample'] = [
                    {
                        'new_company': dup['new_record']['data'].get('company_name', 'Unknown'),
                        'new_category': dup['new_record']['category'],
                        'existing_key': dup['existing_record']['unique_key'],
                        'existing_categories': dup['existing_record']['categories'],
                        'different_fields': [d['field'] for d in dup['differences']]
                    }
                    for dup in result.get('potential_duplicates', [])[:10]
                ]
            
            # Clean up temp import file (keep report file for download)
            if os.path.exists(temp_filepath):
                os.remove(temp_filepath)
            
            logger.info("Returning response")
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Import error: {e}")
            logger.error(traceback.format_exc())
            
            # Clean up temp files on error
            if os.path.exists(temp_filepath):
                os.remove(temp_filepath)
            if os.path.exists(report_filepath):
                os.remove(report_filepath)
            
            return Response(
                {
                    'success': False,
                    'error': str(e),
                    'traceback': traceback.format_exc()
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DownloadImportReportAPIView(APIView):
    """
    GET: Download the potential duplicates report from an import
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, filename):
        # Security: Only allow downloading from temp_imports directory
        temp_dir = os.path.join(settings.MEDIA_ROOT, 'temp_imports')
        file_path = os.path.join(temp_dir, filename)
        
        # Validate filename (prevent directory traversal)
        if '..' in filename or '/' in filename or '\\' in filename:
            return Response(
                {'error': 'Invalid filename'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not os.path.exists(file_path):
            return Response(
                {'error': 'Report file not found. It may have expired.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Return file for download
        response = FileResponse(
            open(file_path, 'rb'),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class ImportTemplateAPIView(APIView):
    """
    GET: Get information about the expected Excel import template
    
    Returns the expected sheet names and column headers for each category.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        from .services.company_import import (
            COMMON_FIELDS, CONTACT_FIELDS, CATEGORY_FIELDS, SHEET_TO_CATEGORY
        )
        
        # Build template info
        template_info = {
            'common_fields': COMMON_FIELDS,
            'contact_fields': CONTACT_FIELDS,
            'total_company_fields': len(COMMON_FIELDS) + len(CONTACT_FIELDS),
            'sheets': []
        }
        
        # Category info
        categories = [
            ('Injection Moulders', 'INJECTION'),
            ('Blow Moulders', 'BLOW'),
            ('Roto Moulders', 'ROTO'),
            ('PE Film Extruders', 'PE_FILM'),
            ('Sheet Extruders', 'SHEET'),
            ('Pipe Extruders', 'PIPE'),
            ('Tube & Hose Extruders', 'TUBE_HOSE'),
            ('Profile Extruders', 'PROFILE'),
            ('Cable Extruders', 'CABLE'),
            ('Compounders', 'COMPOUNDER'),
        ]
        
        for sheet_name, category_code in categories:
            category_fields = CATEGORY_FIELDS.get(category_code, [])
            template_info['sheets'].append({
                'sheet_name': sheet_name,
                'category_code': category_code,
                'category_specific_fields': category_fields,
                'total_fields': len(COMMON_FIELDS) + len(CONTACT_FIELDS) + len(category_fields)
            })
        
        return Response(template_info)
