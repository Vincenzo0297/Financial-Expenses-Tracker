import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc,} from 'firebase/firestore'
import { auth, db } from '../../firebase'
import './UserPage.css'

const mobileMenuQuery = '(max-width: 720px)'
const transactionCategories = [
  'Food',
  'Transport',
  'Housing',
  'Utilities',
  'Shopping',
  'Health',
  'Entertainment',
  'Salary',
  'Freelance',
  'Investment',
  'Other',
]

const pageSize = 10

function getLocalDateValue() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

function formatTransactionDate(date) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`))
}

function getDisplayName(email) {
  const name = email?.split('@')[0].replace(/[._-]+/g, ' ').trim()

  return name ? name.replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Friend'
}

function UserPage() {
  const [sidebarOpen, setSidebarOpen] = useState(
    () => !window.matchMedia(mobileMenuQuery).matches,
  )
  const [user, setUser] = useState(null)
  const [profileName, setProfileName] = useState('')
  const [profileError, setProfileError] = useState('')
  const [transactions, setTransactions] = useState([])
  const [transactionsLoading, setTransactionsLoading] = useState(true)
  const [transactionsError, setTransactionsError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [date, setDate] = useState(getLocalDateValue)
  const [transactionType, setTransactionType] = useState('')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [formError, setFormError] = useState('')
  const [formStatus, setFormStatus] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [editingTransactionId, setEditingTransactionId] = useState(null)
  const [deletingTransactionId, setDeletingTransactionId] = useState(null)
  const [actionError, setActionError] = useState('')
  const [actionStatus, setActionStatus] = useState('')
  const displayName = profileName || user?.displayName || getDisplayName(user?.email)
  const pageCount = Math.ceil(transactions.length / pageSize)
  const safeCurrentPage = Math.min(currentPage, Math.max(pageCount, 1))
  const visibleTransactions = transactions.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize,
  )
  const firstTransaction = transactions.length ? (safeCurrentPage - 1) * pageSize + 1 : 0
  const lastTransaction = Math.min(safeCurrentPage * pageSize, transactions.length)
  const income = transactions.reduce(
    (total, transaction) => total + (transaction.amount > 0 ? transaction.amount : 0),
    0,
  )
  const expenses = transactions.reduce(
    (total, transaction) => total + (transaction.amount < 0 ? Math.abs(transaction.amount) : 0),
    0,
  )

  useEffect(() => {
    let unsubscribeTransactions = () => {}
    let unsubscribeProfile = () => {}

    const unsubscribeAuth = onAuthStateChanged(auth, (authenticatedUser) => {
      unsubscribeTransactions()
      unsubscribeProfile()
      setUser(authenticatedUser)
      setProfileName('')
      setProfileError('')
      setTransactions([])
      setTransactionsError('')

      if (!authenticatedUser) {
        setTransactionsLoading(false)
        return
      }

      unsubscribeProfile = onSnapshot(
        doc(db, 'users', authenticatedUser.uid),
        (profileSnapshot) => {
          const name = profileSnapshot.data()?.name
          setProfileName(typeof name === 'string' ? name.trim() : '')
        },
        (error) => {
          setProfileError(`Unable to load your profile name (Firebase error: ${error.code || 'unknown'}).`)
        },
      )

      setTransactionsLoading(true)
      const transactionsQuery = query(
        collection(db, 'users', authenticatedUser.uid, 'transactions'),
        orderBy('date', 'desc'),
      )

      unsubscribeTransactions = onSnapshot(
        transactionsQuery,
        (snapshot) => {
          setTransactions(snapshot.docs.map((transactionDocument) => ({
            id: transactionDocument.id,
            ...transactionDocument.data(),
          })))
          setTransactionsLoading(false)
        },
        (error) => {
          setTransactionsError(`Unable to load transactions (Firebase error: ${error.code || 'unknown'}).`)
          setTransactionsLoading(false)
        },
      )
    })

    return () => {
      unsubscribeAuth()
      unsubscribeTransactions()
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

  function closeMenuAfterNavigation() {
    if (window.matchMedia(mobileMenuQuery).matches) setSidebarOpen(false)
  }

  function resetTransactionForm() {
    setEditingTransactionId(null)
    setDate(getLocalDateValue())
    setTransactionType('')
    setCategory('')
    setAmount('')
    setFormError('')
    setFormStatus('')
  }

  function handleEditTransaction(transaction) {
    setEditingTransactionId(transaction.id)
    setDate(transaction.date)
    setTransactionType(
      transaction.transaction === 'Income' || transaction.transaction === 'Expense'
        ? transaction.transaction
        : transaction.amount < 0 ? 'Expense' : 'Income',
    )
    setCategory(transaction.category)
    setAmount(String(Math.abs(transaction.amount)))
    setFormError('')
    setFormStatus('')
    setActionError('')
    setActionStatus('')
    document.getElementById('add-transaction')?.scrollIntoView({ behavior: 'smooth' })
  }

  async function handleAddTransaction(event) {
    event.preventDefault()
    setFormError('')
    setFormStatus('')

    if (!user) {
      setFormError('Please sign in before adding a transaction.')
      return
    }

    const numericAmount = Number(amount)
    if (!transactionType || !category || !date || !amount.trim()
      || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setFormError('Choose a date, transaction, and category, then enter an amount greater than zero.')
      return
    }

    setIsSaving(true)
    try {
      const transactionData = {
        date,
        transaction: transactionType,
        category,
        amount: transactionType === 'Expense' ? -numericAmount : numericAmount,
      }

      if (editingTransactionId) {
        await updateDoc(doc(db, 'users', user.uid, 'transactions', editingTransactionId), transactionData)
      } else {
        await addDoc(collection(db, 'users', user.uid, 'transactions'), {
          ...transactionData,
          createdAt: serverTimestamp(),
        })
      }

      setEditingTransactionId(null)
      setTransactionType('')
      setCategory('')
      setAmount('')
      setDate(getLocalDateValue())
      setCurrentPage(1)
      setFormStatus(editingTransactionId ? 'Transaction updated.' : 'Transaction added.')
    } catch (error) {
      setFormError(`Unable to ${editingTransactionId ? 'update' : 'save'} transaction (Firebase error: ${error.code || 'unknown'}). Check that Firestore rules are deployed.`)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteTransaction(transaction) {
    if (!user || !window.confirm('Delete this transaction? This cannot be undone.')) return

    setActionError('')
    setActionStatus('')
    setDeletingTransactionId(transaction.id)

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'transactions', transaction.id))
      if (editingTransactionId === transaction.id) resetTransactionForm()
      setActionStatus('Transaction deleted.')
    } catch (error) {
      setActionError(`Unable to delete transaction (Firebase error: ${error.code || 'unknown'}). Check that Firestore rules are deployed.`)
    } finally {
      setDeletingTransactionId(null)
    }
  }

  return (
    <div className={`dashboard${sidebarOpen ? ' menu-open' : ''}`}>
      {sidebarOpen && (
        <button className="dashboard-overlay" type="button" aria-label="Close menu" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`dashboard-sidebar${sidebarOpen ? ' open' : ''}`}>
        <a className="dashboard-logo" href="/user">financy<span>.</span></a>
        <p className="dashboard-menu-heading">MENU</p>
        <nav className="dashboard-nav" aria-label="Main navigation">
          <a className="dashboard-nav-item selected" href="#overview" onClick={closeMenuAfterNavigation}>
            <span aria-hidden="true">⌂</span> Overview
          </a>
          <a className="dashboard-nav-item" href="/profile" onClick={closeMenuAfterNavigation}>
            <span aria-hidden="true">👤</span> Profile
          </a>
          <a className="dashboard-nav-item" href="#CPF" onClick={closeMenuAfterNavigation}>
            <span aria-hidden="true">💰</span> CPF
          </a>
        </nav>
        <a className="dashboard-logout" href="/" onClick={closeMenuAfterNavigation}>
          <span aria-hidden="true">↪</span> Log out
        </a>
      </aside>

      <main className={`dashboard-main${sidebarOpen ? '' : ' sidebar-closed'}`} id="overview">
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
            <h1>Hi, {displayName}!</h1>
            {profileError && <p className="dashboard-profile-error" role="alert">{profileError}</p>}
          </div>
        </header>

        <div className="dashboard-content">
          <section aria-labelledby="summary-title">
            <div className="dashboard-section-heading">
              <h2 id="summary-title">Financial Summary</h2>
            </div>
            <div className="summary-grid">
              <article className="summary-card balance">
                <p>Total balance</p>
                <strong>{formatCurrency(income - expenses)}</strong>
              </article>
              <article className="summary-card">
                <p>Income</p>
                <strong>{formatCurrency(income)}</strong>
              </article>
              <article className="summary-card">
                <p>Expenses</p>
                <strong>{formatCurrency(expenses)}</strong>
              </article>
            </div>
          </section>

          <section className="transactions-card add-transaction-card" id="add-transaction" aria-labelledby="add-transaction-title">
            <div className="dashboard-section-heading">
              <div>
                <h2 id="add-transaction-title">{editingTransactionId ? 'Edit Transaction' : 'Add Transaction'}</h2>
                <p>Select the transaction type and category. Enter a positive amount; expenses are saved as negative values.</p>
              </div>
            </div>
            <form className="transaction-form" onSubmit={handleAddTransaction}>
              <div className="transaction-field">
                <label htmlFor="transaction-date">Date</label>
                <input id="transaction-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
              </div>
              <div className="transaction-field">
                <label htmlFor="transaction-type">Transaction</label>
                <select id="transaction-type" value={transactionType} onChange={(event) => setTransactionType(event.target.value)} required>
                  <option value="">Select type</option>
                  <option value="Income">Income</option>
                  <option value="Expense">Expense</option>
                </select>
              </div>
              <div className="transaction-field">
                <label htmlFor="transaction-category">Category</label>
                <select id="transaction-category" value={category} onChange={(event) => setCategory(event.target.value)} required>
                  <option value="">Select category</option>
                  {category && !transactionCategories.includes(category) && (
                    <option value={category}>{category}</option>
                  )}
                  {transactionCategories.map((transactionCategory) => (
                    <option key={transactionCategory} value={transactionCategory}>{transactionCategory}</option>
                  ))}
                </select>
              </div>
              <div className="transaction-field">
                <label htmlFor="transaction-amount">Amount (USD)</label>
                <input id="transaction-amount" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="e.g. 25.00" required />
              </div>
              <button className="transaction-submit" type="submit" disabled={isSaving || !user}>
                {isSaving ? 'Saving...' : editingTransactionId ? 'Save changes' : 'Add'}
              </button>
              {editingTransactionId && (
                <button className="transaction-cancel" type="button" onClick={resetTransactionForm} disabled={isSaving}>
                  Cancel
                </button>
              )}
            </form>
            {!user && <p className="transaction-message error" role="alert">Sign in to add and view your transactions.</p>}
            {formError && <p className="transaction-message error" role="alert">{formError}</p>}
            {formStatus && <p className="transaction-message success" role="status">{formStatus}</p>}
          </section>

          <section className="transactions-card" id="transactions" aria-labelledby="transactions-title">
            <div className="dashboard-section-heading">
              <div>
                <h2 id="transactions-title">Transactions</h2>
                <p>Your recent income and expenses</p>
              </div>
            </div>
            <div className="transaction-table-wrapper">
              <table className="transaction-table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Transaction</th>
                    <th scope="col">Category</th>
                    <th className="amount-column" scope="col">Amount</th>
                    <th className="actions-column" scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactionsLoading && (
                    <tr><td className="transaction-empty" colSpan="5">Loading transactions...</td></tr>
                  )}
                  {!transactionsLoading && transactionsError && (
                    <tr><td className="transaction-empty" colSpan="5">{transactionsError}</td></tr>
                  )}
                  {!transactionsLoading && !transactionsError && transactions.length === 0 && (
                    <tr><td className="transaction-empty" colSpan="5">No transactions yet. Add one above to get started.</td></tr>
                  )}
                  {!transactionsLoading && !transactionsError && visibleTransactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>{formatTransactionDate(transaction.date)}</td>
                      <td><strong className="transaction-title">{transaction.transaction}</strong></td>
                      <td>{transaction.category}</td>
                      <td className={`transaction-amount ${transaction.amount > 0 ? 'income' : 'expense'}`}>
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="transaction-actions">
                        <span className="transaction-action-buttons">
                          <button className="transaction-action edit" type="button" onClick={() => handleEditTransaction(transaction)} disabled={isSaving || deletingTransactionId !== null} >Edit</button>
                          <button className="transaction-action delete" type="button" onClick={() => handleDeleteTransaction(transaction)} disabled={isSaving || deletingTransactionId !== null} > {deletingTransactionId === transaction.id ? 'Deleting...' : 'Delete'} </button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {actionError && <p className="transaction-message error" role="alert">{actionError}</p>}
            {actionStatus && <p className="transaction-message success" role="status">{actionStatus}</p>}
            {!transactionsLoading && !transactionsError && transactions.length > 0 && (
              <nav className="transaction-pagination" aria-label="Transaction pages">
                <span aria-live="polite">
                  Showing {firstTransaction}–{lastTransaction} of {transactions.length}
                </span>
                {pageCount > 1 && (
                  <div className="pagination-controls">
                    <button type="button" aria-label="Previous page" disabled={safeCurrentPage === 1} onClick={() => setCurrentPage(safeCurrentPage - 1)}> Previous </button>
                    {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => (
                      <button className={safeCurrentPage === page ? 'current' : ''} type="button" aria-label={`Go to page ${page}`} aria-current={safeCurrentPage === page ? 'page' : undefined} key={page} onClick={() => setCurrentPage(page)}> {page} </button>
                    ))}
                    <button type="button" aria-label="Next page" disabled={safeCurrentPage === pageCount} onClick={() => setCurrentPage(safeCurrentPage + 1)} >Next</button>
                  </div>
                )}
              </nav>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

export default UserPage
