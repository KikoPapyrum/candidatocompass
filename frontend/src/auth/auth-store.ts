import { create } from 'zustand'

import { axiosInstance, ACCESS_TOKEN_KEY } from '../lib/axios'
import type { Account } from '../types/domain'

type AuthState = {
  token: string | null
  account: Account | null
  setSession: (token: string, account: Account) => void
  signOut: () => void
  loadAccount: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem(ACCESS_TOKEN_KEY),
  account: null,
  setSession: (token, account) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, token)
    set({ token, account })
  },
  signOut: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    set({ token: null, account: null })
  },
  loadAccount: async () => {
    const response = await axiosInstance.get<Account>('/auth/me')
    set({ account: response.data })
  },
}))
