# dashboard/views.py

from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from accounts.decorators import staff_required

@login_required
@staff_required
def staff_dashboard_view(request):
    context = {}
    return render(request, 'dashboard/staff_dashboard.html', context)

# --- ADD THE TWO NEW VIEWS BELOW ---

@login_required
def client_dashboard_view(request):
    # We will add logic here later to check if the user is a client
    context = {}
    return render(request, 'dashboard/client_dashboard.html', context)

@login_required
def guest_dashboard_view(request):
    # We will add logic here later to check if the user is a guest
    context = {}
    return render(request, 'dashboard/guest_dashboard.html', context)