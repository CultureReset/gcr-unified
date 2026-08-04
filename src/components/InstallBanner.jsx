import { useCallback, useEffect, useState } from 'react'

// How far above the bottom nav the banner floats — enough to clear the
// "Ask a local" FAB, which owns the corner just above the nav (AiChat.css).
const BANNER_OFFSET = 72

export default function InstallBanner() {
  const [prompt, setPrompt] = useState(null)
  const [isIOS, setIsIOS] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  // Shrink to a small tappable icon after a few seconds so it stops
  // competing with the "Ask a local" FAB and page content below it —
  // still reachable (tap to re-expand), still fully dismissible via ×.
  useEffect(() => {
    const t = setTimeout(() => setCollapsed(true), 6000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
      return
    }
    if (localStorage.getItem('gcr_install_dismissed')) {
      setDismissed(true)
      return
    }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream
    if (ios) { setIsIOS(true); return }

    const handler = e => { e.preventDefault(); setPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setInstalled(true))
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Publish how far this banner reaches above the nav's top edge, so pages
  // can reserve that strip the same way they reserve the nav itself — see
  // .app-shell.has-nav .app-main > * in index.css. Without it the banner
  // covers the last card of the page while it's showing. Measured in the
  // same frame of reference as --gcr-fab-h (distance up from the nav, not
  // from the bottom of the screen) so index.css can just take the larger
  // of the two. The callback ref fires again on the collapsed/expanded
  // swap, and with null once the banner unmounts.
  const measure = useCallback(node => {
    const h = node ? BANNER_OFFSET + node.offsetHeight : 0
    document.documentElement.style.setProperty('--gcr-banner-h', h + 'px')
  }, [])

  useEffect(() => () => {
    document.documentElement.style.setProperty('--gcr-banner-h', '0px')
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

  // Stacks above the "Ask a local" FAB (which owns the bottom-right corner
  // just above the nav) instead of overlapping it — see AiChat.css
  // .ai-chat-fab. --gcr-nav-h is the nav's measured height, home-indicator
  // inset included (BottomNav.jsx).
  const bannerBottom = `calc(var(--gcr-nav-h, 64px) + ${BANNER_OFFSET}px)`

  if (collapsed) {
    return (
      <button
        ref={measure}
        onClick={() => setCollapsed(false)}
        aria-label="Add Gulf Coast Radar to your home screen"
        style={{
          position: 'fixed', bottom: bannerBottom, left: 16,
          width: 44, height: 44, borderRadius: '50%',
          background: 'linear-gradient(135deg, #0b5e5a, #0b7a75)',
          border: 'none', boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
          zIndex: 200, padding: 0, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
        <img
          src="/gcr-logo.png"
          alt=""
          style={{ width: 26, height: 26, borderRadius: 6, objectFit: 'cover' }}
          onError={e => { e.target.style.display = 'none' }}
        />
      </button>
    )
  }

  return (
    <>
      <div
        ref={measure}
        onClick={isIOS ? () => setShowInstructions(true) : undefined}
        style={{
          position: 'fixed', bottom: bannerBottom,
          left: '50%', transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)', maxWidth: 360,
          background: 'linear-gradient(135deg, #0b5e5a, #0b7a75)',
          backdropFilter: 'blur(20px)',
          borderRadius: 14, padding: '10px 12px',
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          zIndex: 200,
          cursor: isIOS ? 'pointer' : 'default',
          transition: 'transform 0.2s ease, opacity 0.2s ease',
        }}>
        <img
          src="/gcr-logo.png"
          alt="GCR"
          style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
          onError={e => { e.target.style.display = 'none' }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, color: '#fff', fontSize: 13 }}>Add Gulf Coast Radar</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.75)', marginTop: 1 }}>
            {isIOS ? 'Tap for instructions' : 'Install the app — free, no App Store needed'}
          </div>
        </div>
        {!isIOS && (
          <button onClick={install} style={{
            background: 'white', color: '#0b5e5a',
            fontWeight: 800, fontSize: 12,
            padding: '7px 12px', borderRadius: 9,
            border: 'none', cursor: 'pointer', flexShrink: 0,
          }}>
            Install
          </button>
        )}
        <button onClick={e => { e.stopPropagation(); dismiss() }} style={{
          background: 'none', color: 'rgba(255,255,255,.6)',
          fontSize: 18, padding: '0 2px', flexShrink: 0, border: 'none', cursor: 'pointer',
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
            background: 'linear-gradient(135deg,#0a1628,#0b3a35)',
            borderRadius: 20, padding: 28, maxWidth: 360, width: '100%',
            color: '#fff', textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,.5)',
          }}>
            <img
              src="/gcr-logo.png"
              alt="Gulf Coast Radar"
              style={{ width: 72, height: 72, borderRadius: 16, objectFit: 'cover', marginBottom: 14 }}
              onError={e => { e.target.style.display = 'none' }}
            />
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 6px' }}>Add to Home Screen</h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.65)', margin: '0 0 24px', lineHeight: 1.5 }}>
              Get the full app experience — fast launch, no browser bar, works offline
            </p>

            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              <Step n="1" text={<>Tap the <strong>Share</strong> icon <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, background: 'rgba(255,255,255,.1)', borderRadius: 6, marginLeft: 4, verticalAlign: 'middle' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7dd3fc" strokeWidth="2.5"><path d="M12 2v13M8 6l4-4 4 4M4 13v7a2 2 0 002 2h12a2 2 0 002-2v-7" /></svg>
              </span> at the bottom of Safari</>} />
              <Step n="2" text={<>Scroll down and tap <strong>"Add to Home Screen"</strong></>} />
              <Step n="3" text={<>Tap <strong>"Add"</strong> in the top right — done!</>} />
            </div>

            <button onClick={() => setShowInstructions(false)} style={{
              background: 'linear-gradient(135deg,#0b7a75,#14B8A6)',
              color: '#fff', fontWeight: 800, fontSize: 14,
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
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div style={{
        flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
        background: 'linear-gradient(135deg,#0b7a75,#14B8A6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 13,
      }}>{n}</div>
      <div style={{ fontSize: 14, lineHeight: 1.5, paddingTop: 4 }}>{text}</div>
    </div>
  )
}
