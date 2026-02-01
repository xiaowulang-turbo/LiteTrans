import { create } from 'zustand'

interface AuthFormState {
  authMode: 'login' | 'register'
  email: string
  password: string
  authError: string
  authSubmitting: boolean
  
  setAuthMode: (mode: 'login' | 'register') => void
  setEmail: (email: string) => void
  setPassword: (password: string) => void
  setAuthError: (error: string) => void
  setAuthSubmitting: (submitting: boolean) => void
  reset: () => void
}

export const useAuthFormStore = create<AuthFormState>((set) => ({
  authMode: 'login',
  email: '',
  password: '',
  authError: '',
  authSubmitting: false,
  
  setAuthMode: (authMode) => set({ authMode, authError: '' }),
  setEmail: (email) => set({ email }),
  setPassword: (password) => set({ password }),
  setAuthError: (authError) => set({ authError }),
  setAuthSubmitting: (authSubmitting) => set({ authSubmitting }),
  reset: () => set({ authMode: 'login', email: '', password: '', authError: '', authSubmitting: false }),
}))
