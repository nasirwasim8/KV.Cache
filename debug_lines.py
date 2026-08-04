c = open('/home/nwasim/projects/ddn-kv-cache/frontend/src/pages/About.tsx').read()
lines = c.split('\n')
# look for {([ pattern near lines 420-438
for n in range(415, 440):
    l = lines[n]
    if '{([' in l or '].map' in l or ']))}' in l or '))}'  in l:
        print(f'Line {n+1}: {repr(l[:100])}')
