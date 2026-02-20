"""
Production Build Script for BLE Tag Tracker
Optimizes JavaScript by replacing console statements with debug wrappers
"""

import re
import shutil
from pathlib import Path

def optimize_js_for_production(input_file, output_file=None):
    """
    Optimize JavaScript for production:
    - Replace console.log with debugLog
    - Replace console.error with debugError (except critical errors)
    - Remove excessive comments
    """
    if output_file is None:
        output_file = input_file
    
    # Read the file
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Keep critical error handling (server connection errors)
    critical_errors = [
        'Backend authentication failed',
        'BACKEND SERVER NOT RUNNING',
        'Failed to fetch OAuth token',
        'Token auto-refresh failed'
    ]
    
    # Replace console.log with debugLog
    content = re.sub(r'console\.log\(', 'debugLog(', content)
    
    # Replace console.warn with debugError
    content = re.sub(r'console\.warn\(', 'debugError(', content)
    
    # Replace most console.error with debugError, but keep critical ones
    lines = content.split('\n')
    new_lines = []
    
    for line in lines:
        # Check if line contains critical error
        is_critical = any(error_msg in line for error_msg in critical_errors)
        
        if 'console.error(' in line and not is_critical:
            # Replace non-critical errors
            new_line = line.replace('console.error(', 'debugError(')
            new_lines.append(new_line)
        else:
            new_lines.append(line)
    
    content = '\n'.join(new_lines)
    
    # Write optimized content
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ Optimized: {output_file}")
    print(f"   - Replaced console.log → debugLog")
    print(f"   - Replaced console.warn → debugError")
    print(f"   - Replaced non-critical console.error → debugError")
    print(f"   - Kept critical error logging")

if __name__ == '__main__':
    # Optimize map.js
    map_js = Path(__file__).parent / 'js' / 'map.js'
    
    # Create backup
    backup = Path(__file__).parent / 'js' / 'map.js.backup'
    shutil.copy(map_js, backup)
    print(f"📦 Backup created: {backup}")
    
    # Optimize
    optimize_js_for_production(map_js)
    
    print("\n✅ Production build complete!")
    print("💡 To restore backup: copy map.js.backup to map.js")
