import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Index from './Login Page/Index.jsx'
import Register from './Register Page/Register.jsx'
import UserPage from './User/User Page/UserPage.jsx'
import ProfilePage from './User/Profile Page/ProfilePage.jsx'

const route = window.location.pathname.replace(/\/+$/, '')
const page = route === '/register'
  ? <Register />
  : route === '/profile'
    ? <ProfilePage />
  : route === '/user'
    ? <UserPage />
    : <Index />

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {page}
  </StrictMode>,
)
