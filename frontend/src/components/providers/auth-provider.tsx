"use client"

import { createContext, useContext, useEffect, ReactNode } from 'react'
import { useAuthStore } from '@/store/authStore'
import { apiClient } from '@/lib/api'

interface AuthContextType {
  // This will be provided by the store
}

const AuthContext = createContext<AuthContextType>({})

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { isAuthenticated, refreshAuthToken } = useAuthStore()

  useEffect(() => {
    // Set up token refresh interval
    const refreshInterval = setInterval(async () => {
      if (isAuthenticated) {
        try {
          await refreshAuthToken()
        } catch (error) {
          console.error('Token refresh failed:', error)
        }
      }
    }, 14 * 60 * 1000) // Refresh every 14 minutes

    return () => clearInterval(refreshInterval)
  }, [isAuthenticated, refreshAuthToken])

  useEffect(() => {
    // Set up axios interceptor for token refresh
    const interceptor = apiClient.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true

          try {
            await refreshAuthToken()
            return apiClient.client(originalRequest)
          } catch (refreshError) {
            // If refresh fails, redirect to login
            window.location.href = '/auth/login'
            return Promise.reject(refreshError)
          }
        }

        return Promise.reject(error)
      }
    )

    return () => {
      apiClient.client.interceptors.response.eject(interceptor)
    }
  }, [refreshAuthToken])

  return (
    <AuthContext.Provider value={{}}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
