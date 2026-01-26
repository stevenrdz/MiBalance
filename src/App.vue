<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import Chart from 'chart.js/auto'
import { auth, db, provider, firebaseReady } from './firebase'
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
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
const transactions = ref([])
const budgets = ref([])
const categories = ref([])
const reminders = ref([])
const chartCanvas = ref(null)
let chartInstance = null
let unsubscribers = []

const defaultCategories = [
  'Alimentación',
  'Transporte',
  'Servicios',
  'Salud',
  'Vivienda',
  'Educación',
  'Entretenimiento',
  'Ahorro',
]

const transactionForm = ref({
  type: 'expense',
  amount: '',
  category: '',
  note: '',
  date: new Date().toISOString().slice(0, 10),
})

const budgetForm = ref({
  category: '',
  limit: '',
})

const categoryForm = ref({ name: '' })
const reminderForm = ref({
  title: '',
  dueDate: '',
  amount: '',
  note: '',
})

const categoryOptions = computed(() =>
  categories.value.length ? categories.value : defaultCategories
)

const inflowTypes = ['income', 'loan']
const outflowTypes = ['expense', 'debt']

const totals = computed(() => {
  const income = transactions.value
    .filter((item) => inflowTypes.includes(item.type))
    .reduce((sum, item) => sum + item.amount, 0)
  const expenses = transactions.value
    .filter((item) => outflowTypes.includes(item.type))
    .reduce((sum, item) => sum + item.amount, 0)
  return {
    income,
    expenses,
    balance: income - expenses,
  }
})

const pendingReminders = computed(() =>
  reminders.value.filter((item) => !item.done)
)

const spentByCategory = computed(() => {
  const map = {}
  transactions.value
    .filter((item) => item.type === 'expense')
    .forEach((item) => {
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
    if (inflowTypes.includes(item.type)) {
      map[month].inflow += item.amount
    } else if (outflowTypes.includes(item.type)) {
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

const resetTransactionForm = () => {
  transactionForm.value = {
    type: 'expense',
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

const resetCategoryForm = () => {
  categoryForm.value = { name: '' }
}

const login = async () => {
  if (!firebaseReady) return
  await signInWithPopup(auth, provider)
}

const logout = async () => {
  await signOut(auth)
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

const addTransaction = async () => {
  if (!user.value) return
  const amount = Number(transactionForm.value.amount)
  if (!amount || !transactionForm.value.category) return
  const txRef = collection(db, 'users', user.value.uid, 'transactions')
  await addDoc(txRef, {
    type: transactionForm.value.type,
    amount,
    category: transactionForm.value.category,
    note: transactionForm.value.note.trim(),
    date: transactionForm.value.date,
    createdAt: serverTimestamp(),
  })
  resetTransactionForm()
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

const addCategory = async () => {
  if (!user.value) return
  const name = categoryForm.value.name.trim()
  if (!name) return
  await addDoc(collection(db, 'users', user.value.uid, 'categories'), {
    name,
    createdAt: serverTimestamp(),
  })
  resetCategoryForm()
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
          label: 'Ingresos / Préstamos',
          data: inflow,
          backgroundColor: '#7bd389',
        },
        {
          label: 'Gastos / Deudas',
          data: outflow,
          backgroundColor: '#ff8c7a',
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

onMounted(() => {
  if (!firebaseReady) {
    authReady.value = true
    return
  }
  resetTransactionForm()
  resetBudgetForm()
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
</script>

<template>
  <main class="app">
    <header class="topbar">
      <div class="brand">
        <div class="logo">FP</div>
        <div>
          <h1>MiBalance</h1>
          <p class="subtitle">Control claro para tus ingresos, gastos y metas.</p>
        </div>
      </div>
      <div class="actions">
        <button v-if="firebaseReady && !user" class="ghost" @click="login">
          Entrar con Google
        </button>
        <div v-else-if="user" class="user">
          <span>{{ user.displayName }}</span>
          <button @click="logout">Salir</button>
        </div>
      </div>
    </header>

    <section v-if="!firebaseReady" class="notice">
      <h2>Configura Firebase</h2>
      <p>
        Crea un proyecto en Firebase, habilita Google Sign-In y completa las
        variables en <code>.env</code>. Luego reinicia el servidor.
      </p>
    </section>

    <section v-else-if="authReady && !user" class="welcome">
      <div>
        <h2>Tu tablero financiero en GitHub Pages</h2>
        <p>
          Registra ingresos, gastos, préstamos y deudas. Define presupuestos y
          crea recordatorios para no perder el control.
        </p>
        <ul>
          <li>Gráficos mensuales con tus movimientos.</li>
          <li>Presupuestos por categoría.</li>
          <li>Recordatorios con montos y fechas.</li>
        </ul>
      </div>
      <div class="panel">
        <h3>Antes de iniciar</h3>
        <ol>
          <li>Configura Firebase Auth + Firestore.</li>
          <li>Agrega tus variables en <code>.env</code>.</li>
          <li>Conéctate con Google.</li>
        </ol>
      </div>
    </section>

    <section v-else class="dashboard">
      <div class="grid">
        <section class="card summary">
          <h2>Resumen</h2>
          <div class="metrics">
            <div>
              <span>Balance actual</span>
              <strong>{{ formatCurrency(totals.balance) }}</strong>
            </div>
            <div>
              <span>Ingresos + préstamos</span>
              <strong>{{ formatCurrency(totals.income) }}</strong>
            </div>
            <div>
              <span>Gastos + deudas</span>
              <strong>{{ formatCurrency(totals.expenses) }}</strong>
            </div>
            <div>
              <span>Recordatorios pendientes</span>
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
          <h2>Nuevo movimiento</h2>
          <form class="form" @submit.prevent="addTransaction">
            <label>
              Tipo
              <select v-model="transactionForm.type">
                <option value="income">Ingreso</option>
                <option value="expense">Gasto</option>
                <option value="loan">Préstamo</option>
                <option value="debt">Deuda</option>
              </select>
            </label>
            <label>
              Monto
              <input v-model="transactionForm.amount" type="number" step="0.01" />
            </label>
            <label>
              Categoría
              <select v-model="transactionForm.category">
                <option v-for="cat in categoryOptions" :key="cat" :value="cat">
                  {{ cat }}
                </option>
              </select>
            </label>
            <label>
              Fecha
              <input v-model="transactionForm.date" type="date" />
            </label>
            <label class="full">
              Nota
              <input v-model="transactionForm.note" type="text" />
            </label>
            <button class="primary" type="submit">Registrar</button>
          </form>

          <div class="list">
            <div v-for="item in transactions" :key="item.id" class="list-item">
              <div>
                <strong>{{ item.category }}</strong>
                <span>{{ item.note || item.type }}</span>
              </div>
              <div class="list-meta">
                <span>{{ item.date }}</span>
                <span
                  :class="[
                    'amount',
                    inflowTypes.includes(item.type) ? 'in' : 'out',
                  ]"
                >
                  {{ formatCurrency(item.amount) }}
                </span>
                <button class="link" @click="removeTransaction(item.id)">
                  Quitar
                </button>
              </div>
            </div>
          </div>
        </section>

        <section class="card">
          <h2>Presupuestos</h2>
          <form class="form" @submit.prevent="addBudget">
            <label>
              Categoría
              <select v-model="budgetForm.category">
                <option v-for="cat in categoryOptions" :key="cat" :value="cat">
                  {{ cat }}
                </option>
              </select>
            </label>
            <label>
              Límite
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
      </div>

      <div class="grid two">
        <section class="card">
          <h2>Categorías</h2>
          <form class="form" @submit.prevent="addCategory">
            <label class="full">
              Nueva categoría
              <input v-model="categoryForm.name" type="text" />
            </label>
            <button class="primary" type="submit">Agregar</button>
          </form>
          <div class="pill-list">
            <span v-for="cat in categoryOptions" :key="cat" class="pill">
              {{ cat }}
            </span>
          </div>
        </section>

        <section class="card">
          <h2>Recordatorios</h2>
          <form class="form" @submit.prevent="addReminder">
            <label>
              Título
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
  </main>
</template>
