# accounts/password_utils.py
# Password validation utilities using dynamic SecuritySettings

from .security_models import SecuritySettings, PasswordHistory


def get_password_policy():
    """
    Get the current password policy from SecuritySettings.
    Returns a dictionary with all policy rules.
    """
    settings = SecuritySettings.get_settings()
    
    return {
        'min_length': settings.min_password_length,
        'require_uppercase': settings.require_uppercase,
        'require_lowercase': settings.require_lowercase,
        'require_numbers': settings.require_numbers,
        'require_special_chars': settings.require_special_chars,
        'password_expiry_days': settings.password_expiry_days,
        'password_history_count': settings.password_history_count,
    }


def validate_password(password, user=None):
    """
    Validate a password against the current security settings.
    
    Args:
        password: The password to validate
        user: Optional user object (for password history check)
    
    Returns:
        tuple: (is_valid: bool, errors: list)
    """
    settings = SecuritySettings.get_settings()
    errors = []
    
    # Check minimum length
    if len(password) < settings.min_password_length:
        errors.append(f'Password must be at least {settings.min_password_length} characters long')
    
    # Check uppercase requirement
    if settings.require_uppercase and not any(c.isupper() for c in password):
        errors.append('Password must contain at least one uppercase letter')
    
    # Check lowercase requirement
    if settings.require_lowercase and not any(c.islower() for c in password):
        errors.append('Password must contain at least one lowercase letter')
    
    # Check number requirement
    if settings.require_numbers and not any(c.isdigit() for c in password):
        errors.append('Password must contain at least one number')
    
    # Check special character requirement
    if settings.require_special_chars:
        special_chars = "!@#$%^&*()_+-=[]{}|;:',.<>?/~`\"\\"
        if not any(c in special_chars for c in password):
            errors.append('Password must contain at least one special character (!@#$%^&*...)')
    
    # Check password history (only if user is provided and history is enabled)
    if user and settings.password_history_count > 0:
        if PasswordHistory.is_password_used(user, password):
            history_count = settings.password_history_count
            # Use proper grammar for singular/plural
            if history_count == 1:
                errors.append('Your new password must be different from your previous password. Please choose a different password.')
            else:
                # Convert number to word for better readability (up to 10)
                number_words = {
                    2: 'two', 3: 'three', 4: 'four', 5: 'five',
                    6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten'
                }
                count_text = number_words.get(history_count, str(history_count))
                errors.append(f'Your new password must be different from your previous {count_text} passwords. Please choose a different password.')
    
    return (len(errors) == 0, errors)


def get_password_requirements_text():
    """
    Get a human-readable list of password requirements.
    Returns a list of requirement strings.
    """
    settings = SecuritySettings.get_settings()
    requirements = []
    
    requirements.append(f'At least {settings.min_password_length} characters')
    
    if settings.require_uppercase:
        requirements.append('One uppercase letter')
    
    if settings.require_lowercase:
        requirements.append('One lowercase letter')
    
    if settings.require_numbers:
        requirements.append('One number')
    
    if settings.require_special_chars:
        requirements.append('One special character (!@#$%^&*...)')
    
    return requirements


def check_password_strength(password):
    """
    Check password strength and return a score (0-100) and label.
    This is for UI feedback, not validation.
    """
    score = 0
    
    # Length scoring
    if len(password) >= 8:
        score += 20
    if len(password) >= 12:
        score += 10
    if len(password) >= 16:
        score += 10
    
    # Character variety scoring
    if any(c.isupper() for c in password):
        score += 15
    if any(c.islower() for c in password):
        score += 15
    if any(c.isdigit() for c in password):
        score += 15
    
    special_chars = "!@#$%^&*()_+-=[]{}|;:',.<>?/~`\"\\"
    if any(c in special_chars for c in password):
        score += 15
    
    # Determine label
    if score < 30:
        label = 'Weak'
        color = 'red'
    elif score < 50:
        label = 'Fair'
        color = 'orange'
    elif score < 70:
        label = 'Good'
        color = 'yellow'
    elif score < 90:
        label = 'Strong'
        color = 'green'
    else:
        label = 'Very Strong'
        color = 'green'
    
    return {
        'score': min(100, score),
        'label': label,
        'color': color
    }
