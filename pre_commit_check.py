#!/usr/bin/env python3
"""
Pre-commit security check for BLE Tag Tracker
Prevents accidental credential commits

Install:
    cp check_secrets.py .git/hooks/pre-commit
    chmod +x .git/hooks/pre-commit
"""

import re
import sys
import subprocess

# Patterns that indicate potential credential leaks
DANGER_PATTERNS = [
    r'password\s*=\s*["\'][^"\']{6,}["\']',  # password="something"
    r'client_secret\s*=\s*["\'][^"\']{10,}["\']',  # client_secret="..."
    r'ScopeUKAPI01',  # Specific password
    r'g_SkQ\.B\.z3TeBU',  # Specific client secret
    r'oauth_password\s*=\s*["\'][^"\']+["\']',  # oauth_password="..."
]

# Files to check (only staged files)
FILE_PATTERNS = ['.py', '.js', '.html', '.json', '.yaml', '.yml']

def get_staged_files():
    """Get list of staged files"""
    try:
        result = subprocess.run(
            ['git', 'diff', '--cached', '--name-only'],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip().split('\n')
    except subprocess.CalledProcessError:
        return []

def check_file_for_secrets(filepath):
    """Check if file contains potential secrets"""
    if not any(filepath.endswith(ext) for ext in FILE_PATTERNS):
        return []
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        findings = []
        for pattern in DANGER_PATTERNS:
            matches = re.finditer(pattern, content, re.IGNORECASE)
            for match in matches:
                line_num = content[:match.start()].count('\n') + 1
                findings.append({
                    'file': filepath,
                    'line': line_num,
                    'pattern': pattern,
                    'match': match.group()
                })
        
        return findings
    except Exception as e:
        print(f"Warning: Could not check {filepath}: {e}")
        return []

def main():
    print("🔍 Checking for potential credential leaks...")
    
    staged_files = get_staged_files()
    if not staged_files or staged_files == ['']:
        print("✅ No files to check")
        return 0
    
    all_findings = []
    for filepath in staged_files:
        findings = check_file_for_secrets(filepath)
        all_findings.extend(findings)
    
    if all_findings:
        print("\n" + "=" * 70)
        print("🚨 POTENTIAL CREDENTIAL LEAK DETECTED!")
        print("=" * 70)
        
        for finding in all_findings:
            print(f"\n📁 File: {finding['file']}")
            print(f"📍 Line: {finding['line']}")
            print(f"⚠️  Found: {finding['match'][:50]}...")
        
        print("\n" + "=" * 70)
        print("❌ COMMIT BLOCKED - Remove credentials before committing")
        print("=" * 70)
        print("\nℹ️  Credentials should be in backend/.env (gitignored)")
        print("ℹ️  Run: git reset HEAD <file> to unstage")
        print("=" * 70 + "\n")
        
        return 1
    
    print("✅ No credential leaks detected - safe to commit")
    return 0

if __name__ == '__main__':
    sys.exit(main())
