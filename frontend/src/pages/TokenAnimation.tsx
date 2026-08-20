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
      [1,   300],   // Scene 1  — Cost Per Token            (2.2s)
      [2,  2500],   // Scene 2  — Cost Per Useful Token     (2.5s)
      [3,  5000],   // Scene 3  — Token rivers appear       (2.0s)
      [4,  7000],   // Scene 4  — GPU heats up              (2.0s)
      [5,  9000],   // Scene 5  — Cost callout              (2.5s)
      [6, 11500],   // Scene 6  — DDN Infinia punchline     (3.5s ← main punchline)
      [7, 15000],   // Scene 7  — With Infinia layout       (1.5s)
      [8, 16500],   // Scene 8  — Infinia intercepts        (2.0s)
      [9, 18500],   // Scene 9  — GPU cools                 (2.0s)
      [10,20500],   // Scene 10 — Savings callout           (2.5s)
      [11,23000],   // Scene 11 — Closing statement         (2.5s)
      [12,25500],   // Scene 12 — CTA left/right cards      (3.5s)
      [13,29000],   // Scene 13 — Cinematic close           (holds)
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
          SCENE 3–5 — WITHOUT INFINIA
      ══════════════════════════════ */}
      {show(3,5) && (
        <div className="scene" style={{ animation:'fadeIn 0.7s ease both', justifyContent:'center', gap:32 }}>
          <div className="center-col" style={{ gap:10 }}>

            {/* Label */}
            <div style={{ fontSize:12, fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase',
              color:'#DC2626', animation:'slideDown 0.6s ease both',
              borderBottom:'2px solid rgba(220,38,38,0.2)', paddingBottom:10, width:'100%', textAlign:'center' }}>
              🖥️ GPU HBM Only — Standard Inference Today
            </div>

            {/* Token rows */}
            <div style={{ display:'flex', flexDirection:'column', gap:14, alignItems:'center', marginTop:8 }}>
              <TokenRow color="#D97706" width="280px" label="System Prompt"   count="16,000 tokens" delay={0} />
              <TokenRow color="#EA580C" width="100px" label="Conversation"    count="1,600 tokens"  delay={0.15} />
              <TokenRow color="#F97316" width="60px"  label="Prior Turn"      count="400 tokens"    delay={0.25} />
              <TokenRow color="#374151" width="32px"  label="New Question"    count="12 tokens"     delay={0.35} />
            </div>

            {/* Arrow + GPU */}
            {show(4) && (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12,
                animation:'fadeIn 0.6s ease both', marginTop:8 }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'#9CA3AF', letterSpacing:'0.08em', textTransform:'uppercase' }}>All tokens — full recompute</div>
                  <div style={{ width:2, height:28, background:'linear-gradient(180deg,rgba(220,38,38,0.3),#DC2626)' }} />
                  <div style={{ fontSize:14, color:'#DC2626' }}>▼</div>
                </div>
                <div className="gpu-chip gpu-hot">
                  <div style={{ position:'relative', zIndex:1, fontSize:28 }}>⚡</div>
                  <div style={{ position:'relative', zIndex:1, fontSize:11, fontWeight:800, letterSpacing:'0.1em' }}>GPU</div>
                  <div style={{ position:'relative', zIndex:1, fontSize:9, opacity:0.7 }}>COMPUTING</div>
                </div>
              </div>
            )}

            {/* Cost callout */}
            {show(5) && (
              <div className="callout-red" style={{ animation:'scaleIn 0.5s ease both', textAlign:'center' }}>
                <div style={{ fontSize:15, color:'#6B7280', marginBottom:6 }}>You paid for 16,012 tokens.</div>
                <div style={{ fontSize:36, fontWeight:900, color:'#DC2626', letterSpacing:'-0.02em' }}>12 were new.</div>
                <div style={{ fontSize:13, color:'#9CA3AF', marginTop:8, lineHeight:1.6 }}>
                  The other 16,000 were identical to the last turn — recomputed anyway, on every node, every session.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════
          SCENE 6 — TRANSITION
      ══════════════════════════════ */}
      {show(6,6) && (
        <div className="scene" style={{ animation:'fadeIn 0.8s ease both' }}>
          <div className="center-col" style={{ gap:18 }}>
            <div style={{ fontSize:13, fontWeight:700, letterSpacing:'0.22em', textTransform:'uppercase',
              color:'#9CA3AF', animation:'slideDown 0.6s ease both' }}>
              But now
            </div>
            <div style={{
              fontSize:84, fontWeight:900, letterSpacing:'-0.04em', lineHeight:1.04,
              animation:'scaleIn 0.9s ease 0.2s both',
              background:'linear-gradient(135deg, #00C280 0%, #1A81AF 100%)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
            }}>
              DDN Infinia<br />changes that metric.
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════
          SCENE 7–10 — WITH INFINIA
      ══════════════════════════════ */}
      {show(7,10) && (
        <div className="scene" style={{ animation:'fadeIn 0.8s ease both' }}>
          <div className="center-col" style={{ gap:10 }}>

            {/* Label */}
            <div style={{ fontSize:12, fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase',
              color:'#00C280', animation:'slideDown 0.6s ease both',
              borderBottom:'2px solid rgba(0,194,128,0.2)', paddingBottom:10, width:'100%', textAlign:'center' }}>
              ✦ With DDN Infinia — Persistent AI Memory
            </div>

            {/* Token rows — dimmed when intercepted */}
            <div style={{ display:'flex', flexDirection:'column', gap:14, alignItems:'center', marginTop:8 }}>
              <TokenRow color="#D97706" width="280px" label="System Prompt"  count="16,000 tokens" delay={0}    dimmed={show(8)} />
              <TokenRow color="#EA580C" width="100px" label="Conversation"   count="1,600 tokens"  delay={0.1}  dimmed={show(8)} />
              <TokenRow color="#F97316" width="60px"  label="Prior Turn"     count="400 tokens"    delay={0.2}  dimmed={show(8)} />
              <TokenRow color="#374151" width="32px"  label="New Question"   count="12 tokens"     delay={0.3}  dimmed={false} />
            </div>

            {/* Infinia intercept + GPU */}
            {show(8) && (
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'center', gap:48,
                animation:'fadeIn 0.7s ease both', marginTop:12 }}>

                {/* Infinia storage */}
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
                  <div style={{ fontSize:11, fontWeight:600, color:'#9CA3AF', letterSpacing:'0.08em', textTransform:'uppercase' }}>Intercepted by</div>
                  <div className="infinia-box">
                    <div style={{ fontSize:26 }}>🗄️</div>
                    <div style={{ fontSize:12, fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase', color:'#00C280' }}>DDN Infinia</div>
                    <div style={{ fontSize:11, color:'#059669', textAlign:'center', lineHeight:1.5, marginTop:2 }}>
                      16,000 tokens served ✓<br/>
                      <span style={{ fontSize:10, color:'#6B7280' }}>Persistent AI Memory</span>
                    </div>
                  </div>
                </div>

                {/* GPU */}
                {show(9) && (
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8,
                    animation:'fadeIn 0.6s ease both' }}>
                    <div style={{ fontSize:11, fontWeight:600, color:'#9CA3AF', letterSpacing:'0.08em', textTransform:'uppercase' }}>GPU only sees</div>
                    <div className="gpu-chip gpu-cool">
                      <div style={{ position:'relative', zIndex:1, fontSize:28 }}>💎</div>
                      <div style={{ position:'relative', zIndex:1, fontSize:11, fontWeight:800, letterSpacing:'0.1em' }}>GPU</div>
                      <div style={{ position:'relative', zIndex:1, fontSize:10, opacity:0.8 }}>12 tokens</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Savings callout */}
            {show(10) && (
              <div className="callout-green" style={{ animation:'scaleIn 0.5s ease both', textAlign:'center' }}>
                <div style={{ fontSize:15, color:'#6B7280', marginBottom:6 }}>GPU processed 12 tokens. Infinia served the rest.</div>
                <div style={{ fontSize:36, fontWeight:900, letterSpacing:'-0.02em' }} className="gradient-green">
                  99.9% of GPU compute — freed.
                </div>
                <div style={{ fontSize:13, color:'#9CA3AF', marginTop:8, lineHeight:1.6 }}>
                  At 250,000 queries/day — 4 billion tokens that never touch the GPU.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════
          SCENE 11 — CLOSE / CTA
      ══════════════════════════════ */}
      {show(11, 11) && (
        <div className="scene" style={{ animation:'fadeIn 1s ease both' }}>
          <div className="center-col" style={{ gap:24 }}>
            <div style={{ fontSize:14, fontWeight:700, letterSpacing:'0.22em', textTransform:'uppercase',
              color:'#00C280', animation:'slideDown 0.7s ease both' }}>
              DDN Infinia
            </div>
            <div style={{ fontSize:88, fontWeight:900, letterSpacing:'-0.04em', lineHeight:1.02,
              animation:'scaleIn 0.9s ease 0.2s both' }}
              className="gradient-green">
              You pay only for<br />the new tokens.
            </div>
            <div style={{ fontSize:22, fontWeight:500, color:'#374151', lineHeight:1.6, maxWidth:560,
              animation:'fadeIn 0.8s ease 0.7s both' }}>
              Persistent AI Memory that lives outside the GPU —<br />
              shared across every node, every session, every user.
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════
          SCENE 12 — LIVE DEMO CTA
          Left/right card reveal
      ══════════════════════════════ */}
      {show(12, 12) && (
        <div className="scene" style={{ animation:'fadeIn 0.8s ease both', gap:48 }}>

          {/* Left / Right cards */}
          <div style={{ display:'flex', gap:32, alignItems:'stretch', justifyContent:'center', width:'100%', maxWidth:780 }}>

            {/* LEFT card — GPU HBM Only */}
            <div style={{
              flex:1, padding:'32px 28px', borderRadius:24,
              border:'2px solid rgba(220,38,38,0.25)',
              background:'rgba(220,38,38,0.03)',
              display:'flex', flexDirection:'column', alignItems:'center', gap:14,
              animation:'slideFromLeft 0.7s cubic-bezier(0.22,1,0.36,1) both',
            }}>
              <div style={{ fontSize:32 }}>🖥️</div>
              <div style={{ fontSize:13, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'#DC2626' }}>GPU HBM Only</div>
              <div style={{ fontSize:44, fontWeight:900, color:'#DC2626', letterSpacing:'-0.03em', lineHeight:1 }}>16,012</div>
              <div style={{ fontSize:12, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.08em' }}>tokens to GPU — every query</div>
              <div style={{ width:'100%', height:1, background:'rgba(220,38,38,0.15)', margin:'4px 0' }} />
              <div style={{ fontSize:13, color:'#6B7280', lineHeight:1.6, textAlign:'center' }}>
                16,000 token system prompt recomputed<br />on every node, every session<br />all day, every day.
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
              <div style={{ fontSize:32 }}>✦</div>
              <div style={{ fontSize:13, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'#00C280' }}>DDN Infinia</div>
              <div style={{ fontSize:44, fontWeight:900, letterSpacing:'-0.03em', lineHeight:1 }} className="gradient-green">12</div>
              <div style={{ fontSize:12, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.08em' }}>new tokens to GPU only</div>
              <div style={{ width:'100%', height:1, background:'rgba(0,194,128,0.15)', margin:'4px 0' }} />
              <div style={{ fontSize:13, color:'#6B7280', lineHeight:1.6, textAlign:'center' }}>
                16,000 tokens served from<br />Persistent AI Memory —<br />zero GPU recompute.
              </div>
            </div>
          </div>

          {/* CTA — rises up after cards land */}
          <div style={{
            display:'flex', flexDirection:'column', alignItems:'center', gap:10,
            animation:'riseUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.6s both',
          }}>
            <div style={{ width:48, height:2, background:'linear-gradient(90deg,transparent,#00C280,transparent)', borderRadius:2 }} />
            <div style={{
              fontSize:30, fontWeight:800, color:'#00C280',
              letterSpacing:'-0.01em', display:'flex', alignItems:'center', gap:12,
            }}>
              Let's take a Live Demo of Infinia Persistent AI Memory
              <span style={{ animation:'arrowBounce 1s ease-in-out infinite', display:'inline-block' }}>→</span>
            </div>

          </div>

        </div>
      )}

      {/* ══════════════════════════════
          SCENE 13 — CINEMATIC CLOSE
      ══════════════════════════════ */}
      {show(13) && (
        <div className="scene" style={{ animation:'fadeIn 1.2s ease both' }}>
          <div className="center-col" style={{ gap:24, maxWidth:760 }}>

            <div style={{
              fontSize:88, fontWeight:900, letterSpacing:'-0.04em', lineHeight:1.02,
              animation:'scaleIn 1s cubic-bezier(0.22,1,0.36,1) 0.1s both',
              textAlign:'center',
              background:'linear-gradient(135deg,#00C280 0%,#1A81AF 55%,#00C280 100%)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
            }}>
              Compute once,<br />reuse everywhere.
            </div>

            <div style={{
              fontSize:20, fontWeight:500, color:'#6B7280', lineHeight:1.6,
              animation:'fadeIn 0.8s ease 0.9s both', textAlign:'center',
            }}>
              That&apos;s the power of persistent AI memory with{' '}
              <span style={{ fontWeight:800, color:'#00C280' }}>Infinia.</span>
            </div>

          </div>
        </div>
      )}


      {/* Progress dots — bottom center */}
      <div style={{ position:'absolute', bottom:28, left:'50%', transform:'translateX(-50%)',
        display:'flex', gap:8 }}>
        {Array.from({length:7}).map((_,i) => (
          <div key={i} style={{
            width:7, height:7, borderRadius:'50%',
            background: Math.floor(phase/1.6) > i ? '#00C280' : '#E5E7EB',
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
