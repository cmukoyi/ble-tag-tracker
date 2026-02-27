"""
Generate PWA icons from logo.png
Run: python generate_icons.py
"""

from PIL import Image
import os

# Icon sizes needed for PWA
ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

# Paths
LOGO_PATH = 'assets/logo.png'
ICONS_DIR = 'icons'

def generate_icons():
    """Generate all required PWA icon sizes from logo"""
    
    # Create icons directory if it doesn't exist
    os.makedirs(ICONS_DIR, exist_ok=True)
    
    # Open the source logo
    try:
        logo = Image.open(LOGO_PATH)
        print(f"✅ Loaded logo: {LOGO_PATH}")
        print(f"   Original size: {logo.size}")
    except FileNotFoundError:
        print(f"❌ Error: {LOGO_PATH} not found!")
        print(f"   Please ensure your logo is at: {LOGO_PATH}")
        return
    
    # Convert to RGBA if necessary
    if logo.mode != 'RGBA':
        logo = logo.convert('RGBA')
    
    # Generate each icon size
    for size in ICON_SIZES:
        # Resize maintaining aspect ratio and add padding if needed
        icon = resize_with_padding(logo, (size, size))
        
        # Save as PNG
        icon_path = os.path.join(ICONS_DIR, f'icon-{size}x{size}.png')
        icon.save(icon_path, 'PNG', optimize=True)
        print(f"✅ Generated: {icon_path}")
    
    print(f"\n🎉 Successfully generated {len(ICON_SIZES)} PWA icons!")
    print(f"   Icons saved to: {ICONS_DIR}/")

def resize_with_padding(img, target_size):
    """Resize image maintaining aspect ratio and add padding if needed"""
    
    # Calculate scaling to fit within target size
    img_ratio = img.width / img.height
    target_ratio = target_size[0] / target_size[1]
    
    if img_ratio > target_ratio:
        # Image is wider
        new_width = target_size[0]
        new_height = int(target_size[0] / img_ratio)
    else:
        # Image is taller or square
        new_height = target_size[1]
        new_width = int(target_size[1] * img_ratio)
    
    # Resize image
    img_resized = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    # Create new image with padding
    new_img = Image.new('RGBA', target_size, (255, 255, 255, 0))
    
    # Calculate position to center the resized image
    x = (target_size[0] - new_width) // 2
    y = (target_size[1] - new_height) // 2
    
    # Paste resized image onto padded background
    new_img.paste(img_resized, (x, y), img_resized if img_resized.mode == 'RGBA' else None)
    
    return new_img

if __name__ == '__main__':
    print("=" * 60)
    print("PWA Icon Generator")
    print("=" * 60)
    generate_icons()
