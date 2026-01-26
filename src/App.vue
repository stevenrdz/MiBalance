<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import Chart from 'chart.js/auto'
import { auth, db, provider, firebaseReady } from './firebase'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'

const user = ref(null)
const authReady = ref(false)
const sidebarOpen = ref(false)
const currentView = ref('dashboard')

const transactions = ref([])
const budgets = ref([])
const categories = ref([])
const reminders = ref([])

const chartCanvas = ref(null)
let chartInstance = null
let unsubscribers = []

const defaultCategories = [
  'Alimentacion',
  'Transporte',
  'Servicios',
  'Salud',
  'Vivienda',
  'Educacion',
  'Entretenimiento',
  'Ahorro',
]

const expenseForm = ref({
  amount: '',
  category: '',
  note: '',
  date: new Date().toISOString().slice(0, 10),
})

const budgetForm = ref({
  category: '',
  limit: '',
})

const reminderForm = ref({
  title: '',
  dueDate: '',
  amount: '',
  note: '',
})

const navGroups = [
  {
    title: 'General',
    items: [{ id: 'dashboard', label: 'Dashboard' }],
  },
  {
    title: 'Gastos',
    items: [
      { id: 'expenses', label: 'Gastos' },
      { id: 'add-expense', label: 'Agregar' },
    ],
  },
]

const categoryOptions = computed(() =>
  categories.value.length ? categories.value : defaultCategories
)

const totals = computed(() => {
  const income = transactions.value
    .filter((item) => ['income', 'loan'].includes(item.type))
    .reduce((sum, item) => sum + item.amount, 0)
  const expenses = transactions.value
    .filter((item) => ['expense', 'debt'].includes(item.type))
    .reduce((sum, item) => sum + item.amount, 0)
  return {
    income,
    expenses,
    balance: income - expenses,
  }
})

const expensesOnly = computed(() =>
  transactions.value.filter((item) => item.type === 'expense')
)

const pendingReminders = computed(() =>
  reminders.value.filter((item) => !item.done)
)

const spentByCategory = computed(() => {
  const map = {}
  expensesOnly.value.forEach((item) => {
    map[item.category] = (map[item.category] || 0) + item.amount
  })
  return map
})

const chartData = computed(() => {
  const map = {}
  transactions.value.forEach((item) => {
    if (!item.date) return
    const month = item.date.slice(0, 7)
    if (!map[month]) {
      map[month] = { inflow: 0, outflow: 0 }
    }
    if (['income', 'loan'].includes(item.type)) {
      map[month].inflow += item.amount
    } else if (['expense', 'debt'].includes(item.type)) {
      map[month].outflow += item.amount
    }
  })
  const labels = Object.keys(map).sort()
  return {
    labels,
    inflow: labels.map((label) => map[label].inflow),
    outflow: labels.map((label) => map[label].outflow),
  }
})

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    maximumFractionDigits: 2,
  }).format(value || 0)

const resetExpenseForm = () => {
  expenseForm.value = {
    amount: '',
    category: categoryOptions.value[0] || '',
    note: '',
    date: new Date().toISOString().slice(0, 10),
  }
}

const resetBudgetForm = () => {
  budgetForm.value = {
    category: categoryOptions.value[0] || '',
    limit: '',
  }
}

const resetReminderForm = () => {
  reminderForm.value = {
    title: '',
    dueDate: '',
    amount: '',
    note: '',
  }
}

const login = async () => {
  if (!firebaseReady) return
  await signInWithPopup(auth, provider)
}

const logout = async () => {
  await signOut(auth)
  currentView.value = 'dashboard'
}

const connectCollections = (uid) => {
  const txRef = collection(db, 'users', uid, 'transactions')
  const budgetRef = collection(db, 'users', uid, 'budgets')
  const categoryRef = collection(db, 'users', uid, 'categories')
  const reminderRef = collection(db, 'users', uid, 'reminders')

  unsubscribers = [
    onSnapshot(query(txRef, orderBy('date', 'desc')), (snapshot) => {
      transactions.value = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))
    }),
    onSnapshot(query(budgetRef, orderBy('createdAt', 'desc')), (snapshot) => {
      budgets.value = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))
    }),
    onSnapshot(query(categoryRef, orderBy('createdAt', 'desc')), (snapshot) => {
      categories.value = snapshot.docs.map((docSnap) => docSnap.data().name)
    }),
    onSnapshot(query(reminderRef, orderBy('dueDate', 'asc')), (snapshot) => {
      reminders.value = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))
    }),
  ]
}

const clearCollections = () => {
  unsubscribers.forEach((unsub) => unsub && unsub())
  unsubscribers = []
  transactions.value = []
  budgets.value = []
  categories.value = []
  reminders.value = []
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
}

const addExpense = async () => {
  if (!user.value) return
  const amount = Number(expenseForm.value.amount)
  if (!amount || !expenseForm.value.category) return
  const txRef = collection(db, 'users', user.value.uid, 'transactions')
  await addDoc(txRef, {
    type: 'expense',
    amount,
    category: expenseForm.value.category,
    note: expenseForm.value.note.trim(),
    date: expenseForm.value.date,
    createdAt: serverTimestamp(),
  })
  resetExpenseForm()
}

const removeTransaction = async (id) => {
  if (!user.value) return
  await deleteDoc(doc(db, 'users', user.value.uid, 'transactions', id))
}

const addBudget = async () => {
  if (!user.value) return
  const limit = Number(budgetForm.value.limit)
  if (!limit || !budgetForm.value.category) return
  await addDoc(collection(db, 'users', user.value.uid, 'budgets'), {
    category: budgetForm.value.category,
    limit,
    createdAt: serverTimestamp(),
  })
  resetBudgetForm()
}

const removeBudget = async (id) => {
  if (!user.value) return
  await deleteDoc(doc(db, 'users', user.value.uid, 'budgets', id))
}

const addReminder = async () => {
  if (!user.value) return
  const title = reminderForm.value.title.trim()
  if (!title || !reminderForm.value.dueDate) return
  await addDoc(collection(db, 'users', user.value.uid, 'reminders'), {
    title,
    dueDate: reminderForm.value.dueDate,
    amount: reminderForm.value.amount
      ? Number(reminderForm.value.amount)
      : null,
    note: reminderForm.value.note.trim(),
    done: false,
    createdAt: serverTimestamp(),
  })
  resetReminderForm()
}

const toggleReminder = async (reminder) => {
  if (!user.value) return
  await updateDoc(
    doc(db, 'users', user.value.uid, 'reminders', reminder.id),
    { done: !reminder.done }
  )
}

const removeReminder = async (id) => {
  if (!user.value) return
  await deleteDoc(doc(db, 'users', user.value.uid, 'reminders', id))
}

const budgetUsage = (budget) => {
  const spent = spentByCategory.value[budget.category] || 0
  const percent = Math.min((spent / budget.limit) * 100, 100)
  return { spent, percent }
}

const updateChart = () => {
  if (!chartCanvas.value) return
  const { labels, inflow, outflow } = chartData.value
  if (chartInstance) {
    chartInstance.data.labels = labels
    chartInstance.data.datasets[0].data = inflow
    chartInstance.data.datasets[1].data = outflow
    chartInstance.update()
    return
  }
  chartInstance = new Chart(chartCanvas.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Ingresos y prestamos',
          data: inflow,
          backgroundColor: '#10b981',
          borderRadius: 6,
        },
        {
          label: 'Gastos y deudas',
          data: outflow,
          backgroundColor: '#f97316',
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
        },
      },
      plugins: {
        legend: {
          labels: {
            color: '#1f2937',
          },
        },
      },
    },
  })
}

const setView = (viewId) => {
  currentView.value = viewId
  sidebarOpen.value = false
}

onMounted(() => {
  resetExpenseForm()
  resetBudgetForm()
  if (!firebaseReady) {
    authReady.value = true
    return
  }
  onAuthStateChanged(auth, (currentUser) => {
    user.value = currentUser
    authReady.value = true
    if (currentUser) {
      connectCollections(currentUser.uid)
    } else {
      clearCollections()
    }
  })
})

watch(
  () => transactions.value,
  () => {
    updateChart()
  },
  { deep: true }
)

watch(
  () => currentView.value,
  (viewId) => {
    if (viewId === 'dashboard') {
      updateChart()
    }
  }
)
</script>

<template>
  <main class="app">
    <section v-if="!authReady" class="loading">Cargando...</section>

    <section v-else-if="!user" class="login">
      <div class="login-card">
        <div class="login-brand">
          <span class="logo">MB</span>
          <h1 data-testid="login-title">MiBalance</h1>
          <p>
            Control claro para tus ingresos y gastos, todo en un solo lugar.
          </p>
        </div>
        <button
          class="primary"
          :disabled="!firebaseReady"
          @click="login"
        >
          Inicia sesion con Google
        </button>
        <p v-if="!firebaseReady" class="warning" data-testid="firebase-warning">
          Falta configurar Firebase en el archivo .env.
        </p>
      </div>
    </section>

    <section v-else class="layout" data-testid="dashboard">
      <aside :class="['sidebar', { open: sidebarOpen }]">
        <div class="sidebar-header">
          <span class="logo">MB</span>
          <div>
            <strong>MiBalance</strong>
            <small>Personal Finance</small>
          </div>
        </div>

        <nav class="nav">
          <div v-for="group in navGroups" :key="group.title" class="nav-group">
            <span class="nav-title">{{ group.title }}</span>
            <button
              v-for="item in group.items"
              :key="item.id"
              :class="['nav-item', { active: currentView === item.id }]"
              @click="setView(item.id)"
            >
              {{ item.label }}
            </button>
          </div>
        </nav>
      </aside>

      <div v-if="sidebarOpen" class="backdrop" @click="sidebarOpen = false"></div>

      <div class="content">
        <header class="topbar">
          <div class="topbar-left">
            <button class="menu-button" @click="sidebarOpen = true">Menu</button>
            <div>
              <h1>{{ currentView === 'dashboard' ? 'Dashboard' : 'Gastos' }}</h1>
              <p class="subtitle">
                {{ user.displayName }} · {{ pendingReminders.length }}
                recordatorios pendientes
              </p>
            </div>
          </div>
          <div class="topbar-right">
            <button class="ghost" @click="logout">Salir</button>
          </div>
        </header>

        <section v-if="currentView === 'dashboard'" class="dashboard">
          <div class="grid">
            <section class="card summary">
              <h2>Resumen</h2>
              <div class="metrics">
                <div>
                  <span>Balance actual</span>
                  <strong>{{ formatCurrency(totals.balance) }}</strong>
                </div>
                <div>
                  <span>Ingresos y prestamos</span>
                  <strong>{{ formatCurrency(totals.income) }}</strong>
                </div>
                <div>
                  <span>Gastos y deudas</span>
                  <strong>{{ formatCurrency(totals.expenses) }}</strong>
                </div>
                <div>
                  <span>Recordatorios</span>
                  <strong>{{ pendingReminders.length }}</strong>
                </div>
              </div>
            </section>

            <section class="card chart">
              <h2>Flujo mensual</h2>
              <canvas ref="chartCanvas" height="140"></canvas>
            </section>
          </div>

          <div class="grid two">
            <section class="card">
              <h2>Presupuestos</h2>
              <form class="form" @submit.prevent="addBudget">
                <label>
                  Categoria
                  <select v-model="budgetForm.category">
                    <option v-for="cat in categoryOptions" :key="cat" :value="cat">
                      {{ cat }}
                    </option>
                  </select>
                </label>
                <label>
                  Limite
                  <input v-model="budgetForm.limit" type="number" step="0.01" />
                </label>
                <button class="primary" type="submit">Guardar</button>
              </form>

              <div class="budget-list">
                <div v-for="budget in budgets" :key="budget.id" class="budget-item">
                  <div class="budget-head">
                    <span>{{ budget.category }}</span>
                    <span>{{ formatCurrency(budget.limit) }}</span>
                  </div>
                  <div class="progress">
                    <div
                      class="bar"
                      :style="{ width: budgetUsage(budget).percent + '%' }"
                    ></div>
                  </div>
                  <small>
                    {{ formatCurrency(budgetUsage(budget).spent) }} gastado
                  </small>
                  <button class="link" @click="removeBudget(budget.id)">
                    Eliminar
                  </button>
                </div>
              </div>
            </section>

            <section class="card">
              <h2>Recordatorios</h2>
              <form class="form" @submit.prevent="addReminder">
                <label>
                  Titulo
                  <input v-model="reminderForm.title" type="text" />
                </label>
                <label>
                  Fecha
                  <input v-model="reminderForm.dueDate" type="date" />
                </label>
                <label>
                  Monto (opcional)
                  <input v-model="reminderForm.amount" type="number" step="0.01" />
                </label>
                <label class="full">
                  Nota
                  <input v-model="reminderForm.note" type="text" />
                </label>
                <button class="primary" type="submit">Crear</button>
              </form>

              <div class="list">
                <div
                  v-for="item in reminders"
                  :key="item.id"
                  class="list-item"
                  :class="{ done: item.done }"
                >
                  <div>
                    <strong>{{ item.title }}</strong>
                    <span>{{ item.note || 'Sin nota' }}</span>
                  </div>
                  <div class="list-meta">
                    <span>{{ item.dueDate }}</span>
                    <span v-if="item.amount" class="amount in">
                      {{ formatCurrency(item.amount) }}
                    </span>
                    <button class="link" @click="toggleReminder(item)">
                      {{ item.done ? 'Reabrir' : 'Hecho' }}
                    </button>
                    <button class="link" @click="removeReminder(item.id)">
                      Quitar
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </section>

        <section v-else-if="currentView === 'expenses'" class="card">
          <div class="section-head">
            <h2>Gastos</h2>
            <button class="ghost" @click="setView('add-expense')">Agregar</button>
          </div>
          <div class="list">
            <div v-for="item in expensesOnly" :key="item.id" class="list-item">
              <div>
                <strong>{{ item.category }}</strong>
                <span>{{ item.note || 'Sin nota' }}</span>
              </div>
              <div class="list-meta">
                <span>{{ item.date }}</span>
                <span class="amount out">
                  {{ formatCurrency(item.amount) }}
                </span>
                <button class="link" @click="removeTransaction(item.id)">
                  Quitar
                </button>
              </div>
            </div>
          </div>
        </section>

        <section v-else class="card">
          <div class="section-head">
            <h2>Agregar gasto</h2>
            <button class="ghost" @click="setView('expenses')">Ver gastos</button>
          </div>
          <form class="form" @submit.prevent="addExpense">
            <label>
              Monto
              <input v-model="expenseForm.amount" type="number" step="0.01" />
            </label>
            <label>
              Categoria
              <select v-model="expenseForm.category">
                <option v-for="cat in categoryOptions" :key="cat" :value="cat">
                  {{ cat }}
                </option>
              </select>
            </label>
            <label>
              Fecha
              <input v-model="expenseForm.date" type="date" />
            </label>
            <label class="full">
              Nota
              <input v-model="expenseForm.note" type="text" />
            </label>
            <button class="primary" type="submit">Registrar gasto</button>
          </form>
        </section>
      </div>
    </section>
  </main>
</template>
