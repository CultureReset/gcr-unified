import { initializeApp } from 'firebase/app'
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from 'firebase/auth'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)

let confirmationResult = null

/**
 * Set up invisible reCAPTCHA on a button element (by DOM id).
 * Call once before sendCode — safe to call multiple times.
 */
export function setupRecaptcha(buttonId = 'send-code-btn') {
  if (window._recaptchaVerifier) return window._recaptchaVerifier
  const el = document.getElementById(buttonId)
  if (!el) throw new Error('Send button not found — try again.')
  window._recaptchaVerifier = new RecaptchaVerifier(auth, el, {
    size: 'invisible',
    callback: () => {},
  })
  return window._recaptchaVerifier
}

/**
 * Send a 6-digit SMS code to the given E.164 phone number.
 */
export async function sendFirebaseOTP(phoneE164) {
  const verifier = setupRecaptcha('send-code-btn')
  confirmationResult = await signInWithPhoneNumber(auth, phoneE164, verifier)
  return confirmationResult
}

/**
 * Confirm the 6-digit code. Returns the Firebase ID token on success.
 */
export async function confirmFirebaseOTP(code) {
  if (!confirmationResult) throw new Error('No pending OTP — send code first.')
  const result = await confirmationResult.confirm(code)
  const idToken = await result.user.getIdToken()
  return { idToken, firebaseUser: result.user }
}

/**
 * Clear reCAPTCHA so it can be re-initialized (e.g. after an error).
 */
export function resetRecaptcha() {
  if (window._recaptchaVerifier) {
    window._recaptchaVerifier.clear()
    window._recaptchaVerifier = null
  }
  confirmationResult = null
}
