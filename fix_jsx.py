f = '/home/nwasim/projects/ddn-kv-cache/frontend/src/pages/About.tsx'
c = open(f).read()
old = "{row.turn}:{' '}"
new = "{row.turn + ': '}"
count = c.count(old)
c = c.replace(old, new)
open(f, 'w').write(c)
print(f'Fixed {count} occurrences')
