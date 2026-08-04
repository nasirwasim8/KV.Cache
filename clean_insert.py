"""
Clean insert using Windows git via subprocess call to the Windows side.
"""
import subprocess, os

src = '/home/nwasim/projects/ddn-kv-cache/frontend/src/pages/About.tsx'
win_repo = '/mnt/c/DDN/AI-Dev/Projects/KV.Cahce'

# Step 1: restore original from Windows git
result = subprocess.run(
    ['git', 'show', 'HEAD:frontend/src/pages/About.tsx'],
    capture_output=True, text=True, cwd=win_repo
)
if result.returncode != 0:
    print('git show failed:', result.stderr[:200])
    exit(1)

original = result.stdout
lines = original.split('\n')
print(f'Restored {len(lines)} lines from git')

# Step 2: find insertion point
insert_idx = None
for i, l in enumerate(lines):
    if 'GPU vs Infinia table' in l:
        insert_idx = i
        print(f'Insertion point: line {i+1}')
        break

if insert_idx is None:
    print('NOT FOUND')
    exit(1)

# Step 3: new block (using template literal for span turn label)
NL = '\n'
new_block = '''      {/* ── GPU Memory Eviction & Session Resume ── */}
      <div className="mt-6 rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(26,129,175,0.3)' }}>
        <div className="px-4 py-2.5 font-bold text-sm flex items-center gap-2" style={{ background: 'rgba(26,129,175,0.08)', color: '#1A81AF' }}>
          🧠 Real-World Scenario — What Happens When the GPU Forgets You?
        </div>
        <div className="p-5 space-y-5">
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            In enterprise AI, a GPU serves <strong>thousands of users simultaneously</strong>. When memory gets full,
            it evicts older conversations to make room. Without external storage, your conversation is{' '}
            <strong>gone</strong> — the GPU re-reads your entire chat history from scratch when you return.
            With <strong>DDN Infinia</strong>, conversation state is stored externally and reloaded in milliseconds.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(237,39,56,0.25)' }}>
              <div className="px-4 py-2 text-xs font-bold uppercase tracking-wider" style={{ background: 'rgba(237,39,56,0.07)', color: '#ED2738' }}>
                Without External KV Cache
              </div>
              <div className="p-4 space-y-2">
                {[
                  { turn: 'Turn 1', lbl: 'User asks Q1', detail: 'GPU computes → KV state stored in HBM', icon: '💬', bad: false, hl: false },
                  { turn: 'Turn 2', lbl: 'User asks Q2', detail: 'GPU has KV state → responds fast', icon: '💬', bad: false, hl: false },
                  { turn: 'Turn 3', lbl: 'User asks Q3', detail: 'GPU has KV state → responds fast', icon: '💬', bad: false, hl: false },
                  { turn: '⚠️ Event', lbl: 'GPU serves 1,000 other users', detail: "Memory pressure — User's KV state EVICTED from HBM", icon: '🔥', bad: false, hl: true },
                  { turn: 'Turn 4', lbl: 'User asks Q4', detail: 'GPU must re-read Turns 1–3 → 10,000+ tokens → 3–8 sec wasted → slow, expensive', icon: '❌', bad: true, hl: false },
                ].map((row, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs p-2 rounded-lg"
                    style={{ background: row.bad ? 'rgba(237,39,56,0.06)' : row.hl ? 'rgba(237,39,56,0.04)' : 'transparent', border: row.bad ? '1px solid rgba(237,39,56,0.2)' : '1px solid transparent' }}>
                    <span className="text-base flex-shrink-0 mt-0.5">{row.icon}</span>
                    <div>
                      <span className="font-bold" style={{ color: row.bad || row.hl ? '#ED2738' : 'var(--text-primary)' }}>{row.turn + ': '}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{row.lbl}</span>
                      <div className="mt-0.5" style={{ color: row.bad ? '#ED2738' : 'var(--text-muted)', fontSize: '10px' }}>{row.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,194,128,0.25)' }}>
              <div className="px-4 py-2 text-xs font-bold uppercase tracking-wider" style={{ background: 'rgba(0,194,128,0.07)', color: '#00C280' }}>
                With DDN Infinia (External KV Cache)
              </div>
              <div className="p-4 space-y-2">
                {[
                  { turn: 'Turn 1–3', lbl: 'Same as left panel', detail: 'GPU computing normally, KV state in HBM', icon: '💬', good: false, hl: false },
                  { turn: '⚡ Event', lbl: 'Memory pressure hits', detail: 'KV state written to DDN Infinia → evicted safely from HBM', icon: '💾', good: false, hl: true },
                  { turn: 'Turn 4', lbl: 'User returns and asks Q4', detail: 'GPU loads KV state FROM Infinia (~50ms) → only Q4 processed → conversation continues instantly', icon: '✅', good: true, hl: false },
                  { turn: '∞ Any Turn', lbl: 'User can always resume', detail: 'Context in Infinia — survives GPU restarts, scaling events, failures', icon: '🛡️', good: false, hl: false },
                ].map((row, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs p-2 rounded-lg"
                    style={{ background: row.good ? 'rgba(0,194,128,0.07)' : row.hl ? 'rgba(0,194,128,0.04)' : 'transparent', border: row.good ? '1px solid rgba(0,194,128,0.2)' : '1px solid transparent' }}>
                    <span className="text-base flex-shrink-0 mt-0.5">{row.icon}</span>
                    <div>
                      <span className="font-bold" style={{ color: row.good || row.hl ? '#00C280' : 'var(--text-primary)' }}>{row.turn + ': '}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{row.lbl}</span>
                      <div className="mt-0.5" style={{ color: row.good ? '#00C280' : 'var(--text-muted)', fontSize: '10px' }}>{row.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'rgba(26,129,175,0.06)', border: '1px solid rgba(26,129,175,0.2)' }}>
            <div className="text-xs font-bold mb-2" style={{ color: '#1A81AF' }}>💡 Plain-English Analogy</div>
            <div className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Think of the GPU like a <strong>busy doctor's short-term memory</strong>. After seeing 50 patients,
              the doctor cannot recall patient #1's earlier visit. Without Infinia, that patient re-tells their full history.
              <strong> With Infinia, the notes are stored externally</strong> — retrieved in seconds so the conversation
              picks up exactly where it left off. <strong>No repeated context. No wasted time.</strong>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            {[
              { icon: '⏱️', stat: '3–8 sec', lbl: 'Wasted per user return', sub: 'Without Infinia — GPU re-reads full history', color: '#ED2738' },
              { icon: '⚡', stat: '~50 ms', lbl: 'Session resume time', sub: 'With Infinia — context loaded from object store', color: '#00C280' },
              { icon: '♾️', stat: '∞ Users', lbl: 'Concurrent sessions', sub: "Each user's context in Infinia, not GPU RAM", color: '#1A81AF' },
            ].map(item => (
              <div key={item.lbl} className="text-center p-3 rounded-xl" style={{ background: `${item.color}0c`, border: `1px solid ${item.color}25` }}>
                <div className="text-xl mb-1">{item.icon}</div>
                <div className="font-mono font-black text-lg" style={{ color: item.color }}>{item.stat}</div>
                <div className="font-semibold mt-0.5" style={{ color: 'var(--text-primary)', fontSize: '11px' }}>{item.lbl}</div>
                <div className="mt-1" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{item.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

'''

# Step 4: insert
new_lines = lines[:insert_idx] + new_block.split('\n') + lines[insert_idx:]
open(src, 'w').write('\n'.join(new_lines))
print(f'Written {len(new_lines)} lines')

# Step 5: tsc
r = subprocess.run(['npx', 'tsc', '--noEmit'], capture_output=True, text=True,
                   cwd='/home/nwasim/projects/ddn-kv-cache/frontend')
about_errors = [l for l in r.stdout.split('\n') if 'About' in l]
if about_errors:
    print('About.tsx errors:')
    for e in about_errors: print(' ', e)
else:
    print('About.tsx: CLEAN ✓')
