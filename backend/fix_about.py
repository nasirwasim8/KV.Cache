"""Delete orphaned old ChatObservatoryArchitectureDetail body (lines 973-1230) from About.tsx."""
f = '/mnt/c/DDN/AI-Dev/Projects/KV.Cahce/frontend/src/pages/About.tsx'
with open(f, encoding='utf-8') as fh:
    lines = fh.readlines()

print(f'Total lines before: {len(lines)}')

# Lines are 1-indexed; delete 973..1230 inclusive (0-indexed: 972..1229)
before = lines[:972]      # lines 1-972
after  = lines[1230:]     # lines 1231-end

result = before + after
with open(f, 'w', encoding='utf-8') as fh:
    fh.writelines(result)

print(f'Total lines after:  {len(result)}')
print('Done')
