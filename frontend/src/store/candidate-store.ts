import { create } from 'zustand'

import { axiosInstance } from '../lib/axios'
import type { Candidate, Catalogs, DocumentStatus } from '../types/domain'

type CandidateState = {
  candidate: Candidate | null
  documents: DocumentStatus[]
  catalogs: Catalogs | null
  loading: boolean
  screenError: string
  setScreenError: (message: string) => void
  load: () => Promise<void>
  setCandidate: (candidate: Candidate) => void
  loadDocuments: () => Promise<void>
}

export const useCandidateStore = create<CandidateState>((set) => ({
  candidate: null,
  documents: [],
  catalogs: null,
  loading: false,
  screenError: '',
  setScreenError: (message) => set({ screenError: message }),
  load: async () => {
    set({ loading: true })
    const [candidate, catalogs] = await Promise.all([
      axiosInstance.get<Candidate>('/candidates/me'),
      axiosInstance.get<Catalogs>('/catalogs'),
    ])
    set({ candidate: candidate.data, catalogs: catalogs.data, loading: false })
  },
  setCandidate: (candidate) => set({ candidate }),
  loadDocuments: async () => {
    const response = await axiosInstance.get<DocumentStatus[]>('/candidates/me/documents')
    set({ documents: response.data })
  },
}))
