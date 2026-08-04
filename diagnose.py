content = open('/home/nwasim/projects/ddn-kv-cache/backend/app/api/routes.py').read()
lines = content.split('\n')
# Line 1839 (index 1838) is the extra '}'
print('Before fix - lines 1837-1841:')
for i in range(1836, 1842):
    print(str(i+1) + ': ' + repr(lines[i]))

# Remove the extra '}'
del lines[1838]

print('\nAfter fix - lines 1837-1841:')
for i in range(1836, 1841):
    print(str(i+1) + ': ' + repr(lines[i]))

# Write back
open('/home/nwasim/projects/ddn-kv-cache/backend/app/api/routes.py', 'w').write('\n'.join(lines))
print('\nFixed. Running syntax check...')

import ast
try:
    ast.parse('\n'.join(lines))
    print('Syntax OK!')
except SyntaxError as e:
    print(f'Still error: line {e.lineno}: {e.msg}')
