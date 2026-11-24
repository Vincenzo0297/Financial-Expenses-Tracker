import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyA7Eiztd3nsmjZK6yXYX1XA-BA4JgEyG4o',
  authDomain: 'financials-and-expense-tracker.firebaseapp.com',
  projectId: 'financials-and-expense-tracker',
  storageBucket: 'financials-and-expense-tracker.firebasestorage.app',
  messagingSenderId: '37497355062',
  appId: '1:37497355062:web:0e0ce5aec9b796781dd197',
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export default app
