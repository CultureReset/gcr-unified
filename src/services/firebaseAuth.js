import { initializeApp } from 'firebase/app'
import { getAuth, signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth'

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
let recaptchaVerifier = null

function getVerifier() {
  if (recaptchaVerifier) return recaptchaVerifier
  const container = document.getElementById('recaptcha-container')
  if (!container) throw new Error('reCAPTCHA container missing — load the auth page first.')
  recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
    size: 'invisible',
    callback: () => {},
    'expired-callback': () => { resetRecaptcha() },
  })
  return recaptchaVerifier
}

export function setupRecaptcha() {
  getVerifier()
}

export async function sendFirebaseOTP(phoneE164) {
  const verifier = getVerifier()
  confirmationResult = await signInWithPhoneNumber(auth, phoneE164, verifier)
  return confirmationResult
}

export async function confirmFirebaseOTP(code) {
  if (!confirmationResult) throw new Error('No pending OTP — send code first.')
  const result = await confirmationResult.confirm(code)
  const idToken = await result.user.getIdToken()
  return { idToken, firebaseUser: result.user }
}

export function resetRecaptcha() {
  confirmationResult = null
  if (recaptchaVerifier) {
    try { recaptchaVerifier.clear() } catch {}
    recaptchaVerifier = null
  }
}
