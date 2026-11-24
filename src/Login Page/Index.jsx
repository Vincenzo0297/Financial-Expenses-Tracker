import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'
import './Style.css'

function Index() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitted(false)

    if (!email.trim() || !password) {
      setError('Please enter your email and password.')
      return
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
      setError('')
      setSubmitted(true)
      window.location.assign(`/user?email=${encodeURIComponent(email.trim())}`)
    } catch (firebaseError) {
      const messages = {
        'auth/configuration-not-found': 'Firebase Authentication is not initialized for this project. In Firebase Console, open the configured project, select Authentication, click Get started, and enable Email/Password.',
        'auth/invalid-credential': 'The email or password is incorrect.',
        'auth/user-disabled': 'This account has been disabled.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
      }
      setError(messages[firebaseError.code] || 'Unable to sign in. Please try again.')
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
            <p className="eyebrow">WELCOME BACK!</p>
            <h2>Login to Financy</h2>
            <p className="subtitle">
              Your cozy money companion is ready.
            </p>
          </div>

          <div className="field">
            <label htmlFor="email">Email address</label>
            <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>

          <div className="field">
            <div className="label-row">
              <label htmlFor="password">Password</label>
            </div>
            <div className="password-wrap">
              <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} />
              <button className="password-toggle" type="button"aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>
                {showPassword ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 4.2A11.2 11.2 0 0112 4c5.5 0 9 5.5 9 8a9.3 9.3 0 01-2.1 3.2M6.2 6.2C4.2 7.6 3 9.8 3 12c0 2.5 3.5 8 9 8a9.7 9.7 0 004.1-1" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 12c0-2.5 3.5-8 9-8s9 5.5 9 8-3.5 8-9 8-9-5.5-9-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && <p className="form-message error" role="alert">{error}</p>}
          {submitted && (
            <p className="form-message success" role="status">
              Sign-in details accepted.
            </p>
          )}

          <button className="submit-button" type="submit">
            Sign in
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14m-5-5 5 5-5 5" />
            </svg>
          </button>

          <p className="signup-copy">
            Do not have an account? <a href="/register">Create account</a>
          </p>
        </form>
      </section>
    </main>
  )
}

export default Index
