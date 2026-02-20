#!/usr/bin/env python3
"""
Fetch OAuth Token from mzone API - ScopeUK Account

This script uses the exact credentials from your working Python example.
It bypasses browser CORS restrictions.

Usage: python get_token_carlfleet.py
"""

import requests

def main():
    url = "https://login.mzoneweb.net/connect/token"
    
    # Exact payload from your working Python code
    payload = 'client_id=mz-scopeuk&client_secret=g_SkQ.B.z3TeBU%24g%23hVeP%23c2&username=ScopeUKAPI&password=ScopeUKAPI01!&scope=mz6-api.all%20mz_username&grant_type=password&response_type=code%20id%20token'
    
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    
    print("=" * 70)
    print("🔐 FETCHING OAUTH TOKEN - ScopeUK Account")
    print("=" * 70)
    print(f"📍 URL: {url}")
    print(f"👤 Client: mz-scopeuk")
    print(f"👤 Username: ScopeUKAPI")
    print()
    
    try:
        response = requests.request("POST", url, headers=headers, data=payload)
        
        if response.status_code == 200:
            data = response.json()
            token = data.get('access_token', '')
            expires_in = data.get('expires_in', 3600)
            
            print("✅ SUCCESS! Token fetched successfully")
            print("=" * 70)
            print()
            print("📋 FULL RESPONSE:")
            print("-" * 70)
            print(response.text)
            print()
            print("=" * 70)
            print("🔑 ACCESS TOKEN:")
            print("=" * 70)
            print(token)
            print()
            print("=" * 70)
            print("⏰ TOKEN INFO:")
            print("=" * 70)
            print(f"  Expires in: {expires_in} seconds ({expires_in/60:.1f} minutes)")
            print(f"  Token type: Bearer")
            print()
            print("=" * 70)
            print("📝 COPY-PASTE INSTRUCTIONS FOR BROWSER:")
            print("=" * 70)
            print("1. Open browser console (F12)")
            print("2. Paste these TWO lines:")
            print()
            print(f'authToken = "{token}"')
            print(f'tokenExpiration = Date.now() + ({expires_in} * 1000)')
            print()
            print("3. Press Enter")
            print("4. Refresh the page or click 'View on Map' again")
            print("=" * 70)
            
            # Save to file for easy copying
            with open('token.txt', 'w') as f:
                f.write(f"Token (valid for {expires_in/60:.1f} minutes):\n")
                f.write(f"{token}\n\n")
                f.write("Browser console commands:\n")
                f.write(f'authToken = "{token}"\n')
                f.write(f'tokenExpiration = Date.now() + ({expires_in} * 1000)\n')
            
            print()
            print("💾 Token also saved to: token.txt")
            print()
            
        else:
            print(f"❌ ERROR: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"❌ EXCEPTION: {e}")

if __name__ == "__main__":
    main()
