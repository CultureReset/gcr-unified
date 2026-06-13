import { initializeApp } from 'firebase/app'
import { getAuth, signInWithPhoneNumber } from 'firebase/auth'

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

// Firebase v11+ with reCAPTCHA Enterprise: no RecaptchaVerifier needed
export async function sendFirebaseOTP(phoneE164) {
  confirmationResult = await signInWithPhoneNumber(auth, phoneE164)
  return confirmationResult
}

export async function confirmFirebaseOTP(code) {
  if (!confirmationResult) throw new Error('No pending OTP — send code first.')
  const result = await confirmationResult.confirm(code)
  const idToken = await result.user.getIdToken()
  return { idToken, firebaseUser: result.user }
}

export function setupRecaptcha() {}
export function resetRecaptcha() { confirmationResult = null }
