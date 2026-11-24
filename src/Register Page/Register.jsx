import { useState } from 'react'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import '../Login Page/Style.css'

function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitted(false)

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please fill in all fields.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.')
      return
    }

    if (password.length < 8) {
      setError('Your password must be at least 8 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setError('Your passwords do not match.')
      return
    }

    setIsSubmitting(true)
    let accountCreated = false

    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password)
      accountCreated = true
      await setDoc(doc(db, 'users', credential.user.uid), {
        name: name.trim(),
        email: credential.user.email,
        createdAt: serverTimestamp(),
      })
      setError('')
      setSubmitted(true)
      window.setTimeout(() => window.location.assign(`/user?email=${encodeURIComponent(email.trim())}`), 500)
    } catch (firebaseError) {
      if (accountCreated) {
        const firestoreMessages = {
          'permission-denied': 'Firestore rejected the profile write. Deploy firestore.rules and confirm they allow users/{uid} for the signed-in user.',
          'failed-precondition': 'Firestore is not ready. Create the Cloud Firestore database in the Firebase Console.',
          unavailable: 'Firestore is temporarily unavailable. Your account was created; you can still sign in.',
        }
        const message = firestoreMessages[firebaseError.code] || 'Your account was created, but the profile could not be saved. You can still sign in.'
        setError(`${message} (Firebase error: ${firebaseError.code || 'unknown'})`)
        return
      }

      const messages = {
        'auth/email-already-in-use': 'An account already exists for this email. Please sign in instead.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/weak-password': 'Your password is too weak.',
        'auth/configuration-not-found': 'Firebase Authentication is not initialized for this project. In Firebase Console, open the configured project, select Authentication, click Get started, and enable Email/Password.',
        'auth/operation-not-allowed': 'Email/password registration is disabled. Enable it in Firebase Console under Authentication > Sign-in method.',
        'auth/unauthorized-domain': 'This site domain is not authorized for Firebase Authentication. Add it under Authentication > Settings > Authorized domains.',
        'auth/network-request-failed': 'Could not reach Firebase. Check your internet connection and try again.',
      }
      const message = messages[firebaseError.code] || 'Unable to create account. Check Firebase Authentication settings and try again.'
      setError(`${message} (Firebase error: ${firebaseError.code || 'unknown'})`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="decoration decoration-one" aria-hidden="true" />
        <div className="decoration decoration-two" aria-hidden="true" />
        <div className="decoration decoration-three" aria-hidden="true" />

        <form className="login-card" onSubmit={handleSubmit} noValidate>
          <div className="login-heading">
            <div className="mascot" aria-hidden="true">
              <span className="mascot-ear mascot-ear-left" />
              <span className="mascot-ear mascot-ear-right" />
              <span className="mascot-face">
                <span className="mascot-eye mascot-eye-left" />
                <span className="mascot-eye mascot-eye-right" />
                <span className="mascot-nose" />
              </span>
            </div>
            <p className="eyebrow">LET'S GET STARTED!</p>
            <h2>Create your account</h2>
            <p className="subtitle">Your money goals are just a few steps away.</p>
          </div>

          <div className="field">
            <label htmlFor="name">Your name</label>
            <input id="name" name="name" type="text" autoComplete="name" placeholder="Your name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="register-email">Email address</label>
            <input id="register-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="register-password">Password</label>
            <input id="register-password" name="password" type="password" autoComplete="new-password" placeholder="At least 8 characters" value={password} onChange={(event) => setPassword(event.target.value)}/>
          </div>

          <div className="field">
            <label htmlFor="confirm-password">Confirm password</label>
            <input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" placeholder="Enter your password again" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
          </div>

          {error && <p className="form-message error" role="alert">{error}</p>}
          {submitted && (
            <p className="form-message success" role="status">
              Account created successfully. You can now sign in.
            </p>
          )}

          <button className="submit-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account...' : 'Create account'}
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14m-5-5 5 5-5 5" />
            </svg>
          </button>

          <p className="signup-copy">
            Already have an account? <a href="/">Sign in</a>
          </p>
        </form>
      </section>
    </main>
  )
}

export default Register