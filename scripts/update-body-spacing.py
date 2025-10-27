#!/usr/bin/env python3
"""
Update spacing in all body templates to 20px standard
"""
import re
import glob

# Find all body template files
body_files = glob.glob('templates/bodies/*.html')

print(f"Found {len(body_files)} body template files")

for file_path in body_files:
    print(f"\nProcessing: {file_path}")

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # 1. תחילת Body - אחרי Header
    content = re.sub(
        r'<td style="padding-top: 13px;">(\s*<!-- Top border above subject -->)',
        r'<td style="padding-top: 20px;">\1',
        content
    )

    # 2. מרווח אחרי קו עליון לפני "הנדון"
    content = re.sub(
        r'<div style="border-top: 1px solid #000000; margin-bottom: 13px;"></div>',
        r'<div style="border-top: 1px solid #000000; margin-bottom: 20px;"></div>',
        content
    )

    # 3. מרווח אחרי "הנדון" (padding-bottom)
    content = re.sub(
        r'(letter-spacing: -0\.3px;)\s+(border-bottom: 1px solid #000000; padding-bottom: 13px;)',
        r'\1  border-bottom: 1px solid #000000; padding-bottom: 20px;',
        content
    )

    # 4. מרווח לפני "בפתח הדברים" / sections
    content = re.sub(
        r'<td style="padding-top: 13px;">(\s*<div style="font-family)',
        r'<td style="padding-top: 20px;">\1',
        content
    )

    # 5. מרווח אחרי כותרות sections (margin-bottom)
    content = re.sub(
        r'(text-align: right;) margin-bottom: 13px;">',
        r'\1 margin-bottom: 20px;">',
        content
    )

    # 6. מרווח בין bullets (padding-bottom: 10px → 20px)
    content = re.sub(
        r'(text-align: right;) padding-bottom: 10px;">',
        r'\1 padding-bottom: 20px;">',
        content
    )

    # 7. מרווח לפני קו מפריד (margin-top: 20px) - כבר טוב, רק בדיקה
    # No change needed - already 20px

    # 8. מרווח בין sections (padding-top: 24px → 20px)
    content = re.sub(
        r'<td style="padding-top: 24px;">',
        r'<td style="padding-top: 20px;">',
        content
    )

    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✅ Updated")
    else:
        print(f"  ⚠️  No changes made")

print("\n✅ All body templates processed!")
