
from django import forms
from django.contrib.auth.forms import UserCreationForm
from .models import User

# We are extending Django's built-in UserCreationForm
# to include the fields we want on our signup page.
class GuestSignUpForm(UserCreationForm):
    class Meta(UserCreationForm.Meta):
        model = User
        fields = ('username', 'first_name', 'last_name', 'email')