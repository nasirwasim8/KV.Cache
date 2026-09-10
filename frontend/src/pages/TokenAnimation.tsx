import { useEffect, useState } from 'react'

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

  @keyframes fadeIn     { from{opacity:0}              to{opacity:1} }
  @keyframes slideUp    { from{opacity:0;transform:translateY(36px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slideDown  { from{opacity:0;transform:translateY(-28px)} to{opacity:1;transform:translateY(0)} }
  @keyframes scaleIn    { from{opacity:0;transform:scale(0.86)} to{opacity:1;transform:scale(1)} }
  @keyframes pulse      { 0%,100%{opacity:1} 50%{opacity:0.45} }
  @keyframes glow-red   { 0%,100%{box-shadow:0 0 0 3px rgba(220,38,38,0.15),0 8px 32px rgba(220,38,38,0.2)} 50%{box-shadow:0 0 0 6px rgba(220,38,38,0.25),0 12px 48px rgba(220,38,38,0.4)} }
  @keyframes glow-green { 0%,100%{box-shadow:0 0 0 3px rgba(0,194,128,0.15),0 8px 32px rgba(0,194,128,0.2)} 50%{box-shadow:0 0 0 6px rgba(0,194,128,0.25),0 12px 48px rgba(0,194,128,0.35)} }
  @keyframes glow-blue  { 0%,100%{box-shadow:0 0 0 3px rgba(37,99,235,0.12),0 8px 24px rgba(37,99,235,0.15)} 50%{box-shadow:0 0 0 5px rgba(37,99,235,0.2),0 12px 36px rgba(37,99,235,0.28)} }
  @keyframes tokenFlow  { from{background-position:0 0} to{background-position:-200px 0} }
  @keyframes countUp    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin           { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes slideFromLeft  { from{opacity:0;transform:translateX(-100px)} to{opacity:1;transform:translateX(0)} }
  @keyframes slideFromRight { from{opacity:0;transform:translateX(100px)}  to{opacity:1;transform:translateX(0)} }
  @keyframes riseUp         { from{opacity:0;transform:translateY(40px)}   to{opacity:1;transform:translateY(0)} }
  @keyframes arrowBounce    { 0%,100%{transform:translateX(0)} 50%{transform:translateX(10px)} }

  .tok-anim * { box-sizing:border-box; }
  .tok-anim   { font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif; }

  .scene {
    position:absolute; inset:0;
    display:flex; align-items:center; justify-content:center;
    flex-direction:column; text-align:center;
    padding:48px 40px;
  }

  .center-col {
    display:flex; flex-direction:column; align-items:center;
    gap:20px; width:100%; max-width:700px;
  }

  .token-river {
    height:26px; border-radius:8px;
    background-image:repeating-linear-gradient(90deg,currentColor 0,currentColor 14px,transparent 14px,transparent 22px);
    animation:tokenFlow 0.9s linear infinite;
    background-size:200px 100%;
    opacity:0.75;
  }

  .gpu-chip {
    width:130px; height:130px; border-radius:20px;
    display:flex; align-items:center; justify-content:center;
    flex-direction:column; gap:4px;
    font-weight:800; font-size:11px; letter-spacing:0.1em;
    border:2px solid; position:relative; overflow:hidden;
  }
  .gpu-chip::before {
    content:''; position:absolute; inset:-50%;
    background:conic-gradient(transparent 0deg,rgba(0,0,0,0.04) 60deg,transparent 120deg);
    animation:spin 3s linear infinite;
  }
  .gpu-hot  { border-color:rgba(220,38,38,0.5);  background:rgba(220,38,38,0.05);  animation:glow-red   1.6s ease-in-out infinite; color:#DC2626; }
  .gpu-cool { border-color:rgba(37,99,235,0.45);  background:rgba(37,99,235,0.05);  animation:glow-blue  2s   ease-in-out infinite; color:#2563EB; }

  .infinia-box {
    border-radius:18px;
    border:2px solid rgba(0,194,128,0.4);
    background:rgba(0,194,128,0.06);
    animation:glow-green 2s ease-in-out infinite;
    padding:16px 28px;
    display:flex; flex-direction:column; align-items:center; gap:6px;
  }

  .callout-red   { background:rgba(220,38,38,0.05); border:1.5px solid rgba(220,38,38,0.2); border-radius:16px; padding:20px 32px; }
  .callout-green { background:rgba(0,194,128,0.05); border:1.5px solid rgba(0,194,128,0.2); border-radius:16px; padding:20px 32px; }

  .gradient-green {
    background:linear-gradient(135deg,#00C280 0%,#1A81AF 100%);
    -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
  }
  .gradient-warm {
    background:linear-gradient(135deg,#D97706 0%,#DC2626 100%);
    -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
  }
`

function TokenRow({ color, width, label, count, delay = 0, dimmed = false }: {
  color: string; width: string; label: string; count: string; delay?: number; dimmed?: boolean
}) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:16, justifyContent:'center',
      opacity: dimmed ? 0.2 : 1, transition:'opacity 0.8s ease',
      animation:`fadeIn 0.5s ease ${delay}s both` }}>
      <div style={{ width:140, textAlign:'right', flexShrink:0 }}>
        <div style={{ fontSize:11, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', color:'#9CA3AF' }}>{label}</div>
        <div style={{ fontSize:13, fontWeight:700, color, marginTop:2 }}>{count}</div>
      </div>
      <div className="token-river" style={{ width, color, flexShrink:0 }} />
    </div>
  )
}

export default function TokenAnimation() {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const schedule: [number, number][] = [
      [1,  300],   // Scene 1 — Cost Per Token               (~2.2s)
      [2, 2500],   // Scene 2 — Cost Per Useful Token        (~3.5s)
      [3, 6000],   // Scene 3 — Context types                (~4s)
      [4,10000],   // Scene 4 — Identical context            (~4s)
      [5,14000],   // Scene 5 — The KEY question             (~4s)
      [6,18000],   // Scene 6 — KV cache changes economics   (~3s)
      [7,21000],   // Scene 7 — Compute once, reuse          (~4s)
      [8,25000],   // Scene 8 — Side-by-side cards           (~3s)
      [9,28000],   // Scene 9 — CTA                          (holds)
    ]
    const timers = schedule.map(([p, ms]) => setTimeout(() => setPhase(p), ms))
    return () => timers.forEach(clearTimeout)
  }, [])

  const show = (min: number, max?: number) => phase >= min && (max === undefined || phase <= max)

  return (
    <div className="tok-anim" style={{
      position:'fixed', inset:0,
      background:'#ffffff',
      color:'#111827',
      overflow:'hidden',
      userSelect:'none',
    }}>
      <style>{CSS}</style>

      {/* ══════════════════════════════
          SCENE 1 — COST PER TOKEN
      ══════════════════════════════ */}
      {show(1,1) && (
        <div className="scene" style={{ animation:'fadeIn 1s ease both' }}>
          <div className="center-col">
            <div style={{ fontSize:16, fontWeight:600, letterSpacing:'0.22em', textTransform:'uppercase',
              color:'#9CA3AF', animation:'slideDown 0.7s ease both' }}>
              The{' '}
              <span style={{ color:'#00C280', fontWeight:800 }}>AI</span>
              {' '}Industry Measures
            </div>
            <div style={{ fontSize:96, fontWeight:900, letterSpacing:'-0.04em', lineHeight:1,
              animation:'slideUp 0.9s ease 0.2s both' }}
              className="gradient-warm">
              Cost Per Token
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════
          SCENE 2 — BETTER QUESTION
      ══════════════════════════════ */}
      {show(2,2) && (
        <div className="scene" style={{ animation:'fadeIn 0.8s ease both' }}>
          <div className="center-col">
            <div style={{ fontSize:20, fontWeight:400, color:'#6B7280', animation:'slideDown 0.7s ease both', letterSpacing:'0.01em' }}>
              But there's a better question:
            </div>
            <div style={{ fontSize:92, fontWeight:900, letterSpacing:'-0.04em', lineHeight:1.08,
              animation:'scaleIn 0.9s ease 0.25s both', color:'#111827' }}>
              Cost Per<br />
              <span style={{
                background:'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
              }}>Useful</span>
              {' '}
              <span style={{
                background:'linear-gradient(135deg, #00C280 0%, #1A81AF 100%)',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
              }}>Token</span>
            </div>
            <div style={{ fontSize:18, fontWeight:400, color:'#6B7280', maxWidth:540,
              lineHeight:1.7, animation:'fadeIn 0.8s ease 0.9s both' }}>
              Every LLM response today reprocesses the entire conversation — system prompt, history, everything — from scratch.
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════
          SCENE 3 — CONTEXT TYPES
          "processing context the model has already seen"
      ══════════════════════════════ */}
      {show(3,3) && (
        <div className="scene" style={{ animation:'fadeIn 0.8s ease both' }}>
          <div className="center-col" style={{ gap:28 }}>
            <div style={{
              fontSize:22, fontWeight:400, color:'#6B7280',
              lineHeight:1.6, textAlign:'center',
              animation:'slideDown 0.7s ease both',
            }}>
              A significant amount of inference compute is spent processing<br />
              <strong style={{ color:'#111827' }}>context the model has already seen.</strong>
            </div>
            <div style={{
              display:'flex', gap:16, flexWrap:'wrap', justifyContent:'center',
              animation:'fadeIn 0.7s ease 0.4s both',
            }}>
              {[
                { label:'System Prompts',         color:'#D97706', bg:'rgba(217,119,6,0.08)'  },
                { label:'Policies & Compliance',  color:'#EA580C', bg:'rgba(234,88,12,0.08)'  },
                { label:'Documents & Manuals',    color:'#DC2626', bg:'rgba(220,38,38,0.08)'  },
                { label:'Conversation History',   color:'#9333EA', bg:'rgba(147,51,234,0.08)' },
              ].map(({ label, color, bg }) => (
                <div key={label} style={{
                  padding:'10px 22px', borderRadius:40,
                  border:`1.5px solid ${color}44`,
                  background: bg,
                  fontSize:15, fontWeight:700, color,
                  animation:'scaleIn 0.5s ease both',
                }}>{label}</div>
              ))}
            </div>
            <div style={{
              fontSize:20, fontWeight:500, color:'#374151',
              textAlign:'center', lineHeight:1.7,
              animation:'fadeIn 0.7s ease 0.9s both',
            }}>
              Much of that context may be <strong>identical</strong> from one request to the next.
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════
          SCENE 4 — IDENTICAL CONTEXT
          "same context, every request, every session"
      ══════════════════════════════ */}
      {show(4,4) && (
        <div className="scene" style={{ animation:'fadeIn 0.8s ease both' }}>
          <div className="center-col" style={{ gap:24 }}>
            <div style={{
              fontSize:15, fontWeight:700, letterSpacing:'0.16em', textTransform:'uppercase',
              color:'#9CA3AF', animation:'slideDown 0.6s ease both',
            }}>
              Same context — every request, every session, every node
            </div>

            {/* Two identical request blocks */}
            <div style={{ display:'flex', gap:20, animation:'fadeIn 0.7s ease 0.3s both' }}>
              {['Request 1', 'Request 2'].map((req, i) => (
                <div key={req} style={{
                  flex:1, borderRadius:16, padding:'18px 20px',
                  border:'1.5px solid rgba(217,119,6,0.25)',
                  background:'rgba(217,119,6,0.04)',
                }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#9CA3AF', letterSpacing:'0.1em',
                    textTransform:'uppercase', marginBottom:10 }}>{req}</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    <div style={{ height:8, borderRadius:4, background:'rgba(217,119,6,0.5)', width:'100%' }} />
                    <div style={{ height:8, borderRadius:4, background:'rgba(234,88,12,0.4)', width:'80%' }} />
                    <div style={{ height:8, borderRadius:4, background:'rgba(220,38,38,0.35)', width:'60%' }} />
                    <div style={{ height:8, borderRadius:4, background:'rgba(17,24,39,0.7)', width:'15%',
                      ...(i === 1 ? { boxShadow:'0 0 8px rgba(0,194,128,0.6)', background:'#00C280' } : {}) }} />
                  </div>
                  <div style={{ fontSize:10, color:'#9CA3AF', marginTop:8 }}>
                    {i === 0 ? '16,012 tokens processed' : '16,000 recomputed · 12 new'}
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              fontSize:28, fontWeight:800, color:'#DC2626',
              textAlign:'center', lineHeight:1.4,
              animation:'scaleIn 0.7s ease 0.7s both',
            }}>
              The GPU recomputed 16,000 identical tokens<br />
              <span style={{ fontSize:18, fontWeight:500, color:'#6B7280' }}>on request 2 — and every request after that.</span>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════
          SCENE 5 — THE KEY QUESTION
          "Why should an expensive GPU keep recomputing..."
      ══════════════════════════════ */}
      {show(5,5) && (
        <div className="scene" style={{ animation:'fadeIn 0.8s ease both' }}>
          <div className="center-col" style={{ gap:20 }}>
            <div style={{
              fontSize:15, fontWeight:600, letterSpacing:'0.18em', textTransform:'uppercase',
              color:'#9CA3AF', animation:'slideDown 0.6s ease both',
            }}>
              The question becomes very simple
            </div>
            <div style={{
              fontSize: 56, fontWeight:900, letterSpacing:'-0.03em', lineHeight:1.12,
              textAlign:'center',
              animation:'scaleIn 0.9s cubic-bezier(0.22,1,0.36,1) 0.2s both',
              color:'#111827',
            }}>
              Why should an expensive GPU<br />
              <span style={{
                background:'linear-gradient(135deg,#DC2626 0%,#D97706 100%)',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
              }}>
                keep recomputing
              </span>
              <br />something it has<br />already computed?
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════
          SCENE 6 — KV CACHE ECONOMICS
          "That is where persistent KV cache changes the economics."
      ══════════════════════════════ */}
      {show(6,6) && (
        <div className="scene" style={{ animation:'fadeIn 0.8s ease both' }}>
          <div className="center-col" style={{ gap:20 }}>
            <div style={{
              fontSize:18, fontWeight:600, color:'#6B7280',
              animation:'slideDown 0.7s ease both',
            }}>
              That is where
            </div>
            <div style={{
              fontSize:72, fontWeight:900, letterSpacing:'-0.04em', lineHeight:1.05,
              textAlign:'center',
              animation:'scaleIn 0.9s ease 0.2s both',
              background:'linear-gradient(135deg,#00C280 0%,#1A81AF 100%)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
            }}>
              Persistent KV Cache
            </div>
            <div style={{
              fontSize:32, fontWeight:700, color:'#111827',
              textAlign:'center',
              animation:'fadeIn 0.8s ease 0.6s both',
            }}>
              changes the economics.
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════
          SCENE 7 — COMPUTE ONCE, REUSE
          "Compute the reusable context once, preserve its KV state..."
      ══════════════════════════════ */}
      {show(7,7) && (
        <div className="scene" style={{ animation:'fadeIn 0.8s ease both' }}>
          <div className="center-col" style={{ gap:24 }}>
            <div style={{
              fontSize:52, fontWeight:900, letterSpacing:'-0.03em', lineHeight:1.1,
              textAlign:'center', color:'#111827',
              animation:'slideUp 0.8s ease both',
            }}>
              Compute the reusable<br />context{' '}
              <span style={{
                background:'linear-gradient(135deg,#00C280 0%,#1A81AF 100%)',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
              }}>once.</span>
            </div>
            <div style={{
              display:'flex', flexDirection:'column', gap:10, width:'100%', maxWidth:520,
              animation:'fadeIn 0.8s ease 0.5s both',
            }}>
              {[
                'Preserve its KV state in Persistent AI Memory.',
                'Reuse it when that same context is needed again.',
                'Any GPU. Any session. Zero recompute.',
              ].map((line, i) => (
                <div key={i} style={{
                  display:'flex', alignItems:'center', gap:12,
                  padding:'12px 18px', borderRadius:12,
                  background: i === 2 ? 'rgba(0,194,128,0.08)' : 'rgba(17,24,39,0.03)',
                  border: i === 2 ? '1.5px solid rgba(0,194,128,0.25)' : '1.5px solid rgba(17,24,39,0.07)',
                }}>
                  <div style={{
                    width:22, height:22, borderRadius:'50%', flexShrink:0,
                    background:'rgba(0,194,128,0.15)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:12, color:'#00C280', fontWeight:800,
                  }}>✓</div>
                  <div style={{
                    fontSize:15, fontWeight: i === 2 ? 700 : 500,
                    color: i === 2 ? '#00C280' : '#374151',
                  }}>{line}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════
          SCENE 8 — SIDE-BY-SIDE CARDS
      ══════════════════════════════ */}
      {show(8,8) && (
        <div className="scene" style={{ animation:'fadeIn 0.8s ease both', gap:48 }}>
          <div style={{ display:'flex', gap:32, alignItems:'stretch', justifyContent:'center', width:'100%', maxWidth:780 }}>

            {/* LEFT card — GPU HBM Only */}
            <div style={{
              flex:1, padding:'32px 28px', borderRadius:24,
              border:'2px solid rgba(220,38,38,0.25)',
              background:'rgba(220,38,38,0.03)',
              display:'flex', flexDirection:'column', alignItems:'center', gap:14,
              animation:'slideFromLeft 0.7s cubic-bezier(0.22,1,0.36,1) both',
            }}>
              <div style={{ fontSize:13, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'#DC2626' }}>GPU HBM Only</div>
              <div style={{ fontSize:44, fontWeight:900, color:'#DC2626', letterSpacing:'-0.03em', lineHeight:1 }}>16,012</div>
              <div style={{ fontSize:12, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.08em' }}>tokens to GPU — every query</div>
              <div style={{ width:'100%', height:1, background:'rgba(220,38,38,0.15)', margin:'4px 0' }} />
              <div style={{ fontSize:13, color:'#6B7280', lineHeight:1.6, textAlign:'center' }}>
                Reusable context recomputed<br />on every request, every session.
              </div>
            </div>

            {/* Divider */}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, flexShrink:0 }}>
              <div style={{ width:1, flex:1, background:'linear-gradient(180deg,transparent,#E5E7EB,transparent)' }} />
              <div style={{ fontSize:18, color:'#D1D5DB', fontWeight:300 }}>vs</div>
              <div style={{ width:1, flex:1, background:'linear-gradient(180deg,transparent,#E5E7EB,transparent)' }} />
            </div>

            {/* RIGHT card — DDN Infinia */}
            <div style={{
              flex:1, padding:'32px 28px', borderRadius:24,
              border:'2px solid rgba(0,194,128,0.35)',
              background:'rgba(0,194,128,0.04)',
              display:'flex', flexDirection:'column', alignItems:'center', gap:14,
              animation:'slideFromRight 0.7s cubic-bezier(0.22,1,0.36,1) both',
              boxShadow:'0 0 0 3px rgba(0,194,128,0.08), 0 16px 40px rgba(0,194,128,0.1)',
            }}>
              <div style={{ fontSize:13, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'#00C280' }}>DDN Infinia</div>
              <div style={{ fontSize:44, fontWeight:900, letterSpacing:'-0.03em', lineHeight:1 }} className="gradient-green">12</div>
              <div style={{ fontSize:12, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.08em' }}>new tokens to GPU only</div>
              <div style={{ width:'100%', height:1, background:'rgba(0,194,128,0.15)', margin:'4px 0' }} />
              <div style={{ fontSize:13, color:'#6B7280', lineHeight:1.6, textAlign:'center' }}>
                KV state preserved in Persistent AI Memory —<br />zero recompute, any GPU, any session.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════
          SCENE 9 — CTA
          "Now let me show you what that actually looks like."
      ══════════════════════════════ */}
      {show(9) && (
        <div className="scene" style={{ animation:'fadeIn 1s ease both' }}>
          <div className="center-col" style={{ gap:24 }}>
            <div style={{
              fontSize:88, fontWeight:900, letterSpacing:'-0.04em', lineHeight:1.02,
              animation:'scaleIn 1s cubic-bezier(0.22,1,0.36,1) 0.1s both',
              textAlign:'center',
              background:'linear-gradient(135deg,#00C280 0%,#1A81AF 55%,#00C280 100%)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
            }}>
              Now let me show you<br />what that looks like.
            </div>
            <div style={{
              fontSize:22, fontWeight:500, color:'#6B7280',
              animation:'fadeIn 0.8s ease 0.8s both',
              display:'flex', alignItems:'center', gap:12,
            }}>
              Live demo — no slides
              <span style={{ animation:'arrowBounce 1s ease-in-out infinite', display:'inline-block', color:'#00C280' }}>→</span>
            </div>
          </div>
        </div>
      )}

      {/* Progress dots — bottom center */}
      <div style={{ position:'absolute', bottom:28, left:'50%', transform:'translateX(-50%)',
        display:'flex', gap:8 }}>
        {Array.from({length:9}).map((_,i) => (
          <div key={i} style={{
            width:7, height:7, borderRadius:'50%',
            background: Math.floor(phase/1) > i ? '#00C280' : '#E5E7EB',
            transition:'background 0.4s ease',
          }} />
        ))}
      </div>

      {/* DDN branding */}
      <div style={{ position:'absolute', bottom:26, right:32, fontSize:10, fontWeight:700,
        letterSpacing:'0.18em', textTransform:'uppercase', color:'#D1D5DB' }}>
        DDN · Infinia · Persistent AI Memory
      </div>
    </div>
  )
}

