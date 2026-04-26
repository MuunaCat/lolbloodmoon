import { useState } from 'react'

export default function AstraPage({ ddragon }) {
  const [imgError, setImgError] = useState(false)

  let splashSrc = null
  try {
    splashSrc = new URL('../assets/astra-splash.jpg', import.meta.url).href
  } catch {
    splashSrc = null
  }

  const hasImage = splashSrc && !imgError

  return (
    <div className="page astra-page" style={{ padding: 0, overflow: 'hidden', position: 'relative', height: '100%' }}>
      {hasImage ? (
        <>
          <img
            src={splashSrc}
            alt="Astra — Cafe Cuties splash art"
            className="astra-splash-img"
            onError={() => setImgError(true)}
            draggable={false}
          />
          <div className="astra-splash-hint">Find the hidden Choncc</div>
          <div className="astra-splash-title">
            <span className="astra-title-star">✦</span> Astra <span className="astra-title-star">✦</span>
          </div>
        </>
      ) : (
        <div className="astra-placeholder">
          <div className="astra-placeholder-icon">✦</div>
          <div className="astra-placeholder-title">Astra</div>
          <div className="astra-placeholder-text">
            Place your splash art at:
          </div>
          <code className="astra-placeholder-path">
            src/renderer/src/assets/astra-splash.jpg
          </code>
          <div className="astra-placeholder-sub">
            Use the ChatGPT prompt to generate it, then drop the file in that folder and rebuild.
          </div>
          <div className="astra-placeholder-cats">
            🐱 ☕ 🐾 ✨ 🍰 🐱
          </div>
        </div>
      )}
    </div>
  )
}
