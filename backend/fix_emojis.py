"""Remove decorative emojis from AIperfBenchmark.tsx, keeping ✅ ❌ ⚠️."""
import re

f = '/home/nwasim/projects/ddn-kv-cache/frontend/src/pages/AIperfBenchmark.tsx'
with open(f, encoding='utf-8') as fh:
    content = fh.read()

# Exact string replacements (decorative only)
replacements = [
    # Label strings in comparison table
    ('🚀 5× FASTER',    '5× FASTER'),
    ('🟢 3× FASTER',    '3× FASTER'),
    ('🟢 FASTER',       'FASTER'),
    ('🟡 ON PAR',       'ON PAR'),
    ('🔴 SLOWER',       'SLOWER'),
    # Section headers
    ('⚡ This System',  'This System'),
    ('⚡ YOUR RESULT',  'YOUR RESULT'),
    ('⚡ Hardware',     'Hardware'),
    ('🔧 Inference Stack', 'Inference Stack'),
    ('🤖 Model',        'Model'),
    ('📋 This Run',     'This Run'),
    # Inline span emojis (decorative icons in JSX)
    ('<span style={{ fontSize: 18 }}>🚀</span>', ''),
    ('<span>📊</span>', ''),
    ('<span style={{ fontSize: 16 }}>💡</span>', ''),
    ('<span>🖥️</span>', ''),
    # Strip replace chain on label strings (no longer needed after removing emojis from labels)
    (".replace('🚀 ', '').replace('🟢 ', '').replace('🟡 ', '').replace('🔴 ', '')", ''),
]

changed = 0
for old, new in replacements:
    if old in content:
        content = content.replace(old, new)
        print(f'  OK  {repr(old[:40])} → {repr(new[:20])}')
        changed += 1
    else:
        print(f'  --  NOT FOUND: {repr(old[:40])}')

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print(f'\nDone — {changed}/{len(replacements)} replacements made')
