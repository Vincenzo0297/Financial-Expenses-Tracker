import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { auth, db } from '../../firebase'
import '../User Page/UserPage.css'
import './ProfilePage.css'

const mobileMenuQuery = '(max-width: 720px)'

function formatCreatedAt(timestamp) {
  if (!timestamp?.toDate) return 'Not available'

  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(timestamp.toDate())
}

function ProfilePage() {
  const [sidebarOpen, setSidebarOpen] = useState(
    () => !window.matchMedia(mobileMenuQuery).matches,
  )
  const [user, setUser] = useState(null)
  const [name, setName] = useState('')
  const [savedName, setSavedName] = useState('')
  const [email, setEmail] = useState('')
  const [createdAt, setCreatedAt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    let unsubscribeProfile = () => {}
    const unsubscribeAuth = onAuthStateChanged(auth, (authenticatedUser) => {
      unsubscribeProfile()
      setUser(authenticatedUser)
      setLoading(true)
      setError('')

      if (!authenticatedUser) {
        setLoading(false)
        window.location.replace('/')
        return
      }

      unsubscribeProfile = onSnapshot(
        doc(db, 'users', authenticatedUser.uid),
        (profileSnapshot) => {
          if (!profileSnapshot.exists()) {
            setError('Your profile record was not found in the database.')
            setLoading(false)
            return
          }

          const profile = profileSnapshot.data()
          const profileName = typeof profile.name === 'string' ? profile.name : ''
          setName(profileName)
          setSavedName(profileName)
          setEmail(profile.email || authenticatedUser.email || '')
          setCreatedAt(profile.createdAt || null)
          setLoading(false)
        },
        (profileError) => {
          setError(`Unable to load your profile (Firebase error: ${profileError.code || 'unknown'}).`)
          setLoading(false)
        },
      )
    })

    return () => {
      unsubscribeAuth()
      unsubscribeProfile()
    }
  }, [])

  useEffect(() => {
    function syncSidebarToViewport() {
      setSidebarOpen(!window.matchMedia(mobileMenuQuery).matches)
    }

    function closeSidebarOnEscape(event) {
      if (event.key === 'Escape') setSidebarOpen(false)
    }

    window.addEventListener('resize', syncSidebarToViewport)
    window.addEventListener('keydown', closeSidebarOnEscape)

    return () => {
      window.removeEventListener('resize', syncSidebarToViewport)
      window.removeEventListener('keydown', closeSidebarOnEscape)
    }
  }, [])

  async function handleSave(event) {
    event.preventDefault()
    setError('')
    setStatus('')

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Please enter your name.')
      return
    }

    if (!user) {
      setError('Please sign in again to update your profile.')
      return
    }

    setSaving(true)
    try {
      await updateDoc(doc(db, 'users', user.uid), { name: trimmedName })
      setName(trimmedName)
      setSavedName(trimmedName)
      setStatus('Your profile was updated.')
    } catch (profileError) {
      setError(`Unable to update your profile (Firebase error: ${profileError.code || 'unknown'}).`)
    } finally {
      setSaving(false)
    }
  }

  async function handleLogOut() {
    try {
      await signOut(auth)
      window.location.assign('/')
    } catch (logoutError) {
      setError(`Unable to sign out (Firebase error: ${logoutError.code || 'unknown'}).`)
    }
  }

  function closeMenuAfterNavigation() {
    if (window.matchMedia(mobileMenuQuery).matches) setSidebarOpen(false)
  }

  const displayName = savedName || user?.displayName || 'Your profile'

  return (
    <div className={`dashboard${sidebarOpen ? ' menu-open' : ''}`}>
      {sidebarOpen && (
        <button className="dashboard-overlay" type="button" aria-label="Close menu" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`dashboard-sidebar${sidebarOpen ? ' open' : ''}`}>
        <a className="dashboard-logo" href="/user">financy<span>.</span></a>
        <p className="dashboard-menu-heading">MENU</p>
        <nav className="dashboard-nav" aria-label="Main navigation">
          <a className="dashboard-nav-item" href="/user" onClick={closeMenuAfterNavigation}>
            <span aria-hidden="true">⌂</span> Overview
          </a>
          <a className="dashboard-nav-item selected" href="/profile" onClick={closeMenuAfterNavigation}>
            <span aria-hidden="true">👤</span> Profile
          </a>
        </nav>
        <button className="dashboard-logout profile-logout" type="button" onClick={handleLogOut}>
          <span aria-hidden="true">↪</span> Log out
        </button>
      </aside>

      <main className={`dashboard-main${sidebarOpen ? '' : ' sidebar-closed'}`}>
        <header className="dashboard-header">
          <button className="dashboard-menu-button" type="button" aria-label={sidebarOpen ? 'Close menu' : 'Open menu'} aria-expanded={sidebarOpen} onClick={() => setSidebarOpen((open) => !open)}>
            <span />
            <span />
            <span />
          </button>
          <div>
            <p className="dashboard-date">
              {new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())}
            </p>
            <h1>{displayName}</h1>
          </div>
        </header>

        <div className="dashboard-content">
          <section className="profile-card" aria-labelledby="profile-title">
            <div className="dashboard-section-heading">
              <div>
                <h2 id="profile-title">Personal details</h2>
                <p>View and update your account information.</p>
              </div>
            </div>

            {loading ? (
              <p className="profile-message" role="status">Loading your profile...</p>
            ) : (
              <form className="profile-form" onSubmit={handleSave}>
                <div className="profile-field">
                  <label htmlFor="profile-name">Full name</label>
                  <input id="profile-name" type="text" autoComplete="name" maxLength={100} value={name} onChange={(event) => setName(event.target.value)} required />
                </div>

                <div className="profile-field">
                  <label htmlFor="profile-email">Email address</label>
                  <input id="profile-email" type="email" value={email} readOnly />
                  <p>Email is read-only and managed by Firebase Authentication.</p>
                </div>

                <div className="profile-detail">
                  <span>Member since</span>
                  <strong>{formatCreatedAt(createdAt)}</strong>
                </div>

                {error && <p className="profile-message error" role="alert">{error}</p>}
                {status && <p className="profile-message success" role="status">{status}</p>}

                <div className="profile-actions">
                  <button className="profile-save" type="submit" disabled={saving || !user}>
                    {saving ? 'Saving...' : 'Save changes'}
                  </button>
                  <button className="profile-cancel" type="button" onClick={() => { setName(savedName), setError(''), setStatus('')}}
                    disabled={saving || name === savedName}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

export default ProfilePage
