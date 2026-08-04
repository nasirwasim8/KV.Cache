import re

path = '/mnt/c/DDN/AI-Dev/Projects/KV.Cahce/frontend/src/pages/About.tsx'
content = open(path).read()

# The exact marker — last line of the Core Demo Point block before GPU vs Infinia table
marker = "      {/* \u2500\u2500 GPU vs Infinia table \u2500\u2500 */}"

new_section = """      {/* \u2500\u2500 GPU Memory Eviction & Session Resume \u2500\u2500 */}
      <div className="mt-6 rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(26,129,175,0.3)' }}>
        <div className="px-4 py-2.5 font-bold text-sm flex items-center gap-2" style={{ background: 'rgba(26,129,175,0.08)', color: '#1A81AF' }}>
          \U0001f9e0 Real-World Scenario \u2014 What Happens When the GPU Forgets You?
        </div>
        <div className="p-5 space-y-5">
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            In enterprise AI, a GPU serves <strong>thousands of users simultaneously</strong>. When memory gets full,
            it evicts older conversations to make room for new ones. Without external storage, your conversation is{' '}
            <strong>gone</strong> \u2014 the GPU re-reads your entire chat history from scratch when you return.
            With <strong>DDN Infinia</strong>, the conversation state is safely stored and reloaded in milliseconds.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(237,39,56,0.25)' }}>
              <div className="px-4 py-2 text-xs font-bold uppercase tracking-wider" style={{ background: 'rgba(237,39,56,0.07)', color: '#ED2738' }}>
                Without External KV Cache
              </div>
              <div className="p-4 space-y-2">
                {([
                  { turn: 'Turn 1', label: 'User asks Q1', detail: 'GPU computes \u2192 KV state stored in HBM', icon: '\U0001f4ac', bad: false, hl: false },
                  { turn: 'Turn 2', label: 'User asks Q2', detail: 'GPU has KV state \u2192 responds fast', icon: '\U0001f4ac', bad: false, hl: false },
                  { turn: 'Turn 3', label: 'User asks Q3', detail: 'GPU has KV state \u2192 responds fast', icon: '\U0001f4ac', bad: false, hl: false },
                  { turn: '\u26a0\ufe0f Event', label: 'GPU serves 1,000 other users', detail: "Memory pressure \u2014 User's KV state EVICTED from HBM", icon: '\U0001f525', bad: false, hl: true },
                  { turn: 'Turn 4', label: 'User asks Q4', detail: 'GPU must re-read ALL of Turns 1\u20133 \u2192 10,000+ tokens re-processed \u2192 3\u20138 sec wasted \u2192 slow, expensive, bad UX', icon: '\u274c', bad: true, hl: false },
                ] as const).map((row, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs p-2 rounded-lg"
                    style={{ background: row.bad ? 'rgba(237,39,56,0.06)' : row.hl ? 'rgba(237,39,56,0.04)' : 'transparent', border: row.bad ? '1px solid rgba(237,39,56,0.2)' : '1px solid transparent' }}>
                    <span className="text-base flex-shrink-0 mt-0.5">{row.icon}</span>
                    <div>
                      <span className="font-bold" style={{ color: row.bad || row.hl ? '#ED2738' : 'var(--text-primary)' }}>{row.turn}:{' '}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
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
                {([
                  { turn: 'Turn 1\u20133', label: 'Same as left panel', detail: 'GPU computing normally, KV state in HBM', icon: '\U0001f4ac', good: false, hl: false },
                  { turn: '\u26a1 Event', label: 'Memory pressure hits', detail: 'KV state written to DDN Infinia \u2192 evicted safely from HBM', icon: '\U0001f4be', good: false, hl: true },
                  { turn: 'Turn 4', label: 'User returns and asks Q4', detail: 'GPU loads KV state FROM Infinia (\u223c50ms) \u2192 only Q4 processed \u2192 conversation continues instantly', icon: '\u2705', good: true, hl: false },
                  { turn: '\u221e Any Turn', label: 'User can always resume', detail: 'Context lives in Infinia \u2014 survives GPU restarts, scaling events, failures', icon: '\U0001f6e1\ufe0f', good: false, hl: false },
                ] as const).map((row, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs p-2 rounded-lg"
                    style={{ background: row.good ? 'rgba(0,194,128,0.07)' : row.hl ? 'rgba(0,194,128,0.04)' : 'transparent', border: row.good ? '1px solid rgba(0,194,128,0.2)' : '1px solid transparent' }}>
                    <span className="text-base flex-shrink-0 mt-0.5">{row.icon}</span>
                    <div>
                      <span className="font-bold" style={{ color: row.good || row.hl ? '#00C280' : 'var(--text-primary)' }}>{row.turn}:{' '}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                      <div className="mt-0.5" style={{ color: row.good ? '#00C280' : 'var(--text-muted)', fontSize: '10px' }}>{row.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl p-4" style={{ background: 'rgba(26,129,175,0.06)', border: '1px solid rgba(26,129,175,0.2)' }}>
            <div className="text-xs font-bold mb-2" style={{ color: '#1A81AF' }}>\U0001f4a1 Plain-English Analogy</div>
            <div className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Think of the GPU like a <strong>busy doctor\u2019s short-term memory</strong>. After seeing 50 patients, the
              doctor can\u2019t recall patient #1\u2019s earlier visit. Without Infinia, that patient re-tells their full history
              from scratch. <strong>With Infinia, the notes are stored externally</strong> \u2014 retrieved in seconds so the
              conversation picks up exactly where it left off. <strong>No repeated context. No wasted time.</strong>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            {([
              { icon: '\u23f1\ufe0f', stat: '3\u20138 sec', label: 'Wasted per user return', sub: 'Without Infinia \u2014 GPU re-reads full history', color: '#ED2738' },
              { icon: '\u26a1', stat: '\u223c50 ms', label: 'Session resume time', sub: 'With Infinia \u2014 context loaded from object store', color: '#00C280' },
              { icon: '\u267e\ufe0f', stat: '\u221e Users', label: 'Concurrent sessions', sub: "Each user's context lives in Infinia, not GPU RAM", color: '#1A81AF' },
            ] as const).map(item => (
              <div key={item.label} className="text-center p-3 rounded-xl" style={{ background: `${item.color}0c`, border: `1px solid ${item.color}25` }}>
                <div className="text-xl mb-1">{item.icon}</div>
                <div className="font-mono font-black text-lg" style={{ color: item.color }}>{item.stat}</div>
                <div className="font-semibold mt-0.5" style={{ color: 'var(--text-primary)', fontSize: '11px' }}>{item.label}</div>
                <div className="mt-1" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{item.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* \u2500\u2500 GPU vs Infinia table \u2500\u2500 */}"""

if marker in content:
    new_content = content.replace(marker, new_section, 1)
    open(path, 'w').write(new_content)
    print('SUCCESS')
else:
    print('MARKER NOT FOUND, searching...')
    lines = content.split('\n')
    for i, l in enumerate(lines):
        if 'GPU vs Infinia' in l:
            print(f'Line {i+1}: {repr(l)}')
