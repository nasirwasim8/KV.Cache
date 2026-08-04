f = '/home/nwasim/projects/ddn-kv-cache/frontend/src/pages/About.tsx'
c = open(f).read()

# Fix: {([ ... ].map(  ))  }  →  {[ ... ].map(  )  }
# The pattern left by removing 'as const' from '{([ ... ] as const).map'
c = c.replace('{([\n', '{[\n')           # opening: {([ → {[
c = c.replace('                ))}',    '                )}')   # 3 closers → 2 (deep indent)
c = c.replace('            ))}',        '            )}')        # stats block

open(f, 'w').write(c)

# Verify
import subprocess
result = subprocess.run(['npx', 'tsc', '--noEmit'], capture_output=True, text=True,
                       cwd='/home/nwasim/projects/ddn-kv-cache/frontend')
lines = [l for l in result.stdout.split('\n') if 'About' in l]
if lines:
    print('Still errors:', '\n'.join(lines))
else:
    print('About.tsx: CLEAN')
