import axios from 'axios'

import { CONFIG } from '../global-config'

export const ACCESS_TOKEN_KEY = 'jwt_access_token'

export const axiosInstance = axios.create({
  baseURL: CONFIG.serverUrl,
})

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const detail = error?.response?.data?.detail
    const message = typeof detail === 'string' ? detail : 'No se ha podido completar la operación.'
    return Promise.reject(Object.assign(new Error(message), { status: error?.response?.status as number | undefined }))
  },
)
