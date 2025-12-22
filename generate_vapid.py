# generate_vapid.py
# Run this script to generate VAPID keys for push notifications
# Usage: python generate_vapid.py

import base64
import os

def generate_vapid_keys():
    """Generate VAPID keys using cryptography library."""
    try:
        from cryptography.hazmat.primitives.asymmetric import ec
        from cryptography.hazmat.backends import default_backend
        from cryptography.hazmat.primitives import serialization
        
        # Generate private key
        private_key = ec.generate_private_key(ec.SECP256R1(), default_backend())
        
        # Get public key
        public_key = private_key.public_key()
        
        # Serialize private key to raw bytes (32 bytes for P-256)
        private_numbers = private_key.private_numbers()
        private_bytes = private_numbers.private_value.to_bytes(32, byteorder='big')
        
        # Serialize public key to uncompressed point format (65 bytes: 0x04 + x + y)
        public_numbers = public_key.public_numbers()
        x_bytes = public_numbers.x.to_bytes(32, byteorder='big')
        y_bytes = public_numbers.y.to_bytes(32, byteorder='big')
        public_bytes = b'\x04' + x_bytes + y_bytes
        
        # Base64url encode (without padding)
        private_key_b64 = base64.urlsafe_b64encode(private_bytes).decode('utf-8').rstrip('=')
        public_key_b64 = base64.urlsafe_b64encode(public_bytes).decode('utf-8').rstrip('=')
        
        print("\n" + "="*70)
        print("VAPID KEYS GENERATED SUCCESSFULLY!")
        print("="*70)
        print("\nAdd these to your settings.py:\n")
        print(f"VAPID_PUBLIC_KEY = '{public_key_b64}'")
        print(f"\nVAPID_PRIVATE_KEY = '{private_key_b64}'")
        print(f"\nVAPID_CLAIMS_EMAIL = 'admin@zeugma.com'")
        print("\n" + "="*70)
        
        return {
            'public_key': public_key_b64,
            'private_key': private_key_b64
        }
        
    except ImportError:
        print("cryptography library not found. Installing...")
        import subprocess
        subprocess.check_call(['pip', 'install', 'cryptography', '--break-system-packages'])
        print("Please run this script again.")
        return None

if __name__ == '__main__':
    generate_vapid_keys()
