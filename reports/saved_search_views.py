"""
API Views for Saved Search functionality.
These handle HTTP requests for managing saved searches.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import SavedSearch, CustomReport, Subscription
from .serializers import SavedSearchSerializer, SavedSearchCreateSerializer
from accounts.models import UserRole


class SavedSearchListCreateAPIView(APIView):
    """
    API endpoint for listing and creating saved searches.

    GET /api/client/saved-searches/?report_id=<uuid>
    - Returns all saved searches for a specific report

    POST /api/client/saved-searches/
    - Creates a new saved search
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get all saved searches for a specific report."""

        # Only allow clients to access this endpoint
        if request.user.role != UserRole.CLIENT:
            return Response(
                {"error": "Only clients can access saved searches"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get report_id from query parameters
        report_id = request.query_params.get('report_id')

        if not report_id:
            return Response(
                {"error": "report_id is required as a query parameter"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify the report exists
        try:
            report = CustomReport.objects.get(report_id=report_id)
        except CustomReport.DoesNotExist:
            return Response(
                {"error": "Report not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify user has access to this report (has active subscription)
        today = timezone.now().date()
        has_subscription = Subscription.objects.filter(
            client=request.user,
            report=report,
            status='ACTIVE',
            start_date__lte=today,
            end_date__gte=today
        ).exists()

        if not has_subscription:
            return Response(
                {"error": "You don't have access to this report"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get all saved searches for this user and report
        saved_searches = SavedSearch.objects.filter(
            user=request.user,
            report=report
        )

        # Serialize the data to JSON
        serializer = SavedSearchSerializer(saved_searches, many=True)

        return Response({
            "count": saved_searches.count(),
            "results": serializer.data
        }, status=status.HTTP_200_OK)

    def post(self, request):
        """Create a new saved search."""

        # Only allow clients to create saved searches
        if request.user.role != UserRole.CLIENT:
            return Response(
                {"error": "Only clients can create saved searches"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Validate the input data
        serializer = SavedSearchCreateSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                {"error": "Invalid data", "details": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Extract validated data
        validated_data = serializer.validated_data
        name = validated_data['name']
        description = validated_data.get('description', '')
        report_id = validated_data['report_id']
        filter_params = validated_data['filter_params']
        is_default = validated_data.get('is_default', False)

        # Get the report
        report = get_object_or_404(CustomReport, report_id=report_id)

        # Verify user has access to this report
        today = timezone.now().date()
        has_subscription = Subscription.objects.filter(
            client=request.user,
            report=report,
            status='ACTIVE',
            start_date__lte=today,
            end_date__gte=today
        ).exists()

        if not has_subscription:
            return Response(
                {"error": "You don't have access to this report"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check if a saved search with this name already exists
        if SavedSearch.objects.filter(
                user=request.user,
                report=report,
                name=name
        ).exists():
            return Response(
                {"error": f"A saved search named '{name}' already exists for this report"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # If this is being set as default, unset any existing defaults
        if is_default:
            SavedSearch.objects.filter(
                user=request.user,
                report=report,
                is_default=True
            ).update(is_default=False)

        # Create the saved search
        saved_search = SavedSearch.objects.create(
            user=request.user,
            report=report,
            name=name,
            description=description,
            filter_params=filter_params,
            is_default=is_default
        )

        # Serialize and return the created saved search
        response_serializer = SavedSearchSerializer(saved_search)

        return Response({
            "message": "Saved search created successfully",
            "saved_search": response_serializer.data
        }, status=status.HTTP_201_CREATED)


class SavedSearchDetailAPIView(APIView):
    """
    API endpoint for retrieving, updating, and deleting a specific saved search.

    GET /api/client/saved-searches/<id>/
    - Returns details of a specific saved search

    PATCH /api/client/saved-searches/<id>/
    - Updates a saved search

    DELETE /api/client/saved-searches/<id>/
    - Deletes a saved search
    """

    permission_classes = [IsAuthenticated]

    def get_object(self, search_id):
        """Helper method to get a saved search and verify ownership."""
        try:
            saved_search = SavedSearch.objects.get(
                id=search_id,
                user=self.request.user
            )
            return saved_search
        except SavedSearch.DoesNotExist:
            return None

    def get(self, request, search_id):
        """Get details of a specific saved search."""

        if request.user.role != UserRole.CLIENT:
            return Response(
                {"error": "Only clients can access saved searches"},
                status=status.HTTP_403_FORBIDDEN
            )

        saved_search = self.get_object(search_id)

        if not saved_search:
            return Response(
                {"error": "Saved search not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = SavedSearchSerializer(saved_search)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, search_id):
        """Update a saved search."""

        if request.user.role != UserRole.CLIENT:
            return Response(
                {"error": "Only clients can update saved searches"},
                status=status.HTTP_403_FORBIDDEN
            )

        saved_search = self.get_object(search_id)

        if not saved_search:
            return Response(
                {"error": "Saved search not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Update fields if provided in request
        if 'name' in request.data:
            new_name = request.data['name'].strip()
            if not new_name:
                return Response(
                    {"error": "Name cannot be empty"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check if another saved search with this name exists
            if SavedSearch.objects.filter(
                    user=request.user,
                    report=saved_search.report,
                    name=new_name
            ).exclude(id=search_id).exists():
                return Response(
                    {"error": f"A saved search named '{new_name}' already exists"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            saved_search.name = new_name

        if 'description' in request.data:
            saved_search.description = request.data['description']

        if 'filter_params' in request.data:
            filter_params = request.data['filter_params']
            if not isinstance(filter_params, dict):
                return Response(
                    {"error": "filter_params must be an object"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            saved_search.filter_params = filter_params

        if 'is_default' in request.data:
            is_default = request.data['is_default']

            # If setting as default, unset other defaults
            if is_default:
                SavedSearch.objects.filter(
                    user=request.user,
                    report=saved_search.report,
                    is_default=True
                ).exclude(id=search_id).update(is_default=False)

            saved_search.is_default = is_default

        # Save the changes
        saved_search.save()

        # Return the updated saved search
        serializer = SavedSearchSerializer(saved_search)

        return Response({
            "message": "Saved search updated successfully",
            "saved_search": serializer.data
        }, status=status.HTTP_200_OK)

    def delete(self, request, search_id):
        """Delete a saved search."""

        if request.user.role != UserRole.CLIENT:
            return Response(
                {"error": "Only clients can delete saved searches"},
                status=status.HTTP_403_FORBIDDEN
            )

        saved_search = self.get_object(search_id)

        if not saved_search:
            return Response(
                {"error": "Saved search not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Delete the saved search
        saved_search_name = saved_search.name
        saved_search.delete()

        return Response({
            "message": f"Saved search '{saved_search_name}' deleted successfully"
        }, status=status.HTTP_200_OK)