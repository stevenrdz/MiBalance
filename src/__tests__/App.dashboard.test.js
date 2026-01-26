import { mount } from '@vue/test-utils'
import App from '../App.vue'
import { vi } from 'vitest'

vi.mock('../firebase', () => ({
  firebaseReady: true,
  auth: {},
  db: {},
  provider: {},
}))

vi.mock('firebase/auth', () => ({
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: (auth, callback) =>
    callback({ uid: 'user-1', displayName: 'Test User' }),
}))

vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn(),
  collection: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  onSnapshot: vi.fn(() => () => {}),
  orderBy: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(),
  updateDoc: vi.fn(),
}))

vi.mock('chart.js/auto', () => ({
  default: class {
    update() {}
    destroy() {}
  },
}))

test('renders dashboard after authentication', async () => {
  const wrapper = mount(App)
  await wrapper.vm.$nextTick()

  expect(wrapper.get('[data-testid="dashboard"]').text()).toContain('Dashboard')
})
