const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client'

let scriptPromise: Promise<void> | null = null

/**
 * Preload the Google Identity Services script so the popup opens faster.
 * Safe to call multiple times — the script is only loaded once.
 */
export function preloadGisScript(): void {
  if (!scriptPromise) {
    scriptPromise = loadScript()
  }
}

/**
 * Opens the Google account-chooser popup and returns an ID token.
 * Throws if the user closes the popup or the flow fails.
 */
export async function getGoogleIdToken(): Promise<string> {
  preloadGisScript()
  await scriptPromise

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!clientId) {
    throw new Error('VITE_GOOGLE_CLIENT_ID is not set')
  }

  return new Promise<string>((resolve, reject) => {
    google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        if (response.credential) {
          resolve(response.credential)
        } else {
          reject(new Error('No credential returned from Google'))
        }
      },
    })

    // Render a hidden button and programmatically click it to trigger the popup
    const container = document.createElement('div')
    container.style.position = 'fixed'
    container.style.top = '-9999px'
    container.style.left = '-9999px'
    document.body.appendChild(container)

    google.accounts.id.renderButton(container, {
      type: 'standard',
      size: 'large',
    })

    // The GIS library renders an iframe inside the container; find and click it
    requestAnimationFrame(() => {
      const btn =
        container.querySelector<HTMLElement>('[role="button"]') ??
        container.querySelector<HTMLElement>('div[style]')

      if (btn) {
        btn.click()
      } else {
        // Fallback: use the One Tap prompt
        google.accounts.id.prompt()
      }

      // Clean up the hidden container after a delay
      setTimeout(() => container.remove(), 60_000)
    })
  })
}

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${GIS_SCRIPT_URL}"]`)) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = GIS_SCRIPT_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
    document.head.appendChild(script)
  })
}
