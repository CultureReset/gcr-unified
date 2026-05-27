import { useEffect, useState } from 'react'

export default function InstallBanner() {
  const [prompt, setPrompt] = useState(null)      // Android/Chrome deferred prompt
  const [isIOS, setIsIOS] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)

  useEffect(() => {
    // Don't show if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
      return
    }
    // Don't show if user dismissed before
    if (localStorage.getItem('gcr_install_dismissed')) {
      setDismissed(true)
      return
    }
    // iOS detection
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream
    if (ios) { setIsIOS(true); return }

    // Android / Chrome — capture beforeinstallprompt
    const handler = e => { e.preventDefault(); setPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setInstalled(true))
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    localStorage.setItem('gcr_install_dismissed', '1')
    setDismissed(true)
    setPrompt(null)
    setIsIOS(false)
  }

  async function install() {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setPrompt(null)
  }

  if (installed || dismissed || (!prompt && !isIOS)) return null

  return (
    <>
      <div
        onClick={isIOS ? () => setShowInstructions(true) : undefined}
        style={{
          position: 'fixed', bottom: 'calc(80px + env(safe-area-inset-bottom))',
          left: '50%', transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)', maxWidth: 398,
          background: 'linear-gradient(135deg,rgba(124,106,247,.95),rgba(91,77,224,.95))',
          backdropFilter: 'blur(20px)',
          borderRadius: 18, padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          zIndex: 200,
          cursor: isIOS ? 'pointer' : 'default',
        }}>
        <div style={{fontSize: 32, flexShrink: 0}}>🌊</div>
        <div style={{flex: 1, minWidth: 0}}>
          <div style={{fontWeight: 700, color: '#fff', fontSize: 14}}>Add to Home Screen</div>
          <div style={{fontSize: 12, color: 'rgba(255,255,255,.75)', marginTop: 2}}>
            {isIOS
              ? 'Tap here to see how'
              : 'Install Trip Swipe as an app'}
          </div>
        </div>
        {!isIOS && (
          <button onClick={install} style={{
            background: 'white', color: '#7c6af7',
            fontWeight: 700, fontSize: 13,
            padding: '8px 14px', borderRadius: 10,
            flexShrink: 0,
          }}>
            Install
          </button>
        )}
        <button onClick={e => { e.stopPropagation(); dismiss() }} style={{
          background: 'none', color: 'rgba(255,255,255,.6)',
          fontSize: 20, padding: '0 4px', flexShrink: 0,
        }}>×</button>
      </div>

      {showInstructions && (
        <div onClick={() => setShowInstructions(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)',
          backdropFilter: 'blur(8px)', zIndex: 300,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'linear-gradient(135deg,#1a1a2e,#16213e)',
            borderRadius: 20, padding: 28, maxWidth: 360, width: '100%',
            color: '#fff', textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,.5)',
          }}>
            <div style={{fontSize: 48, marginBottom: 12}}>🌊</div>
            <h2 style={{fontSize: 20, fontWeight: 800, margin: '0 0 8px'}}>Install Trip Swipe</h2>
            <p style={{fontSize: 13, color: 'rgba(255,255,255,.7)', margin: '0 0 24px'}}>
              Add to your home screen for the full app experience
            </p>

            <div style={{textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24}}>
              <Step n="1" text={<>Tap the <strong>Share</strong> icon <span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:24,height:24,background:'rgba(255,255,255,.1)',borderRadius:6,marginLeft:4,verticalAlign:'middle'}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7dd3fc" strokeWidth="2.5"><path d="M12 2v13M8 6l4-4 4 4M4 13v7a2 2 0 002 2h12a2 2 0 002-2v-7"/></svg>
              </span> at the bottom of Safari</>} />
              <Step n="2" text={<>Scroll down and tap <strong>"Add to Home Screen"</strong></>} />
              <Step n="3" text={<>Tap <strong>"Add"</strong> in the top right</>} />
            </div>

            <button onClick={() => setShowInstructions(false)} style={{
              background: 'linear-gradient(135deg,#7c6af7,#5b4de0)',
              color: '#fff', fontWeight: 700, fontSize: 14,
              padding: '12px 24px', borderRadius: 12, width: '100%',
              border: 'none', cursor: 'pointer',
            }}>Got it</button>
          </div>
        </div>
      )}
    </>
  )
}

function Step({ n, text }) {
  return (
    <div style={{display: 'flex', alignItems: 'flex-start', gap: 12}}>
      <div style={{
        flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
        background: 'linear-gradient(135deg,#7c6af7,#5b4de0)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 13,
      }}>{n}</div>
      <div style={{fontSize: 14, lineHeight: 1.5, paddingTop: 4}}>{text}</div>
    </div>
  )
}
