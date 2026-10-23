import Alert from '@mui/material/Alert'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'

import { useAuthStore } from './auth/auth-store'
import { AppShell, LockedPage } from './layouts/app-shell'
import { EmployeeSignInPage, ForgotPasswordPage, SignInPage, SignUpPage, VerifyPage } from './pages/auth-pages'
import { DocumentsPage } from './pages/documents'
import { HelpPage } from './pages/help'
import { LegalPage } from './pages/legal'
import { OfferPage } from './pages/offer'
import { PersonalDataPage } from './pages/personal-data'
import { TaxPage } from './pages/tax-data'
import { theme } from './theme'

function GuestOnly({ children }: { children: ReactNode }) {
  const token = useAuthStore((state) => state.token)
  if (token) {
    return <Navigate to="/datos" replace />
  }
  return children
}

function SignInRoute() {
  const location = useLocation()
  const finished = Boolean((location.state as { finished?: boolean } | null)?.finished)
  return (
    <>
      {finished && <Alert severity="success" sx={{ position: 'sticky', top: 0, zIndex: 2 }}>Datos enviados. Ya puedes cerrar la aplicación.</Alert>}
      <SignInPage />
    </>
  )
}

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route path="/oferta/:code" element={<OfferPage />} />
        <Route path="/auth/empleado" element={<GuestOnly><EmployeeSignInPage /></GuestOnly>} />
        <Route path="/auth" element={<GuestOnly><SignInRoute /></GuestOnly>} />
        <Route path="/auth/registro" element={<GuestOnly><SignUpPage /></GuestOnly>} />
        <Route path="/auth/verificar" element={<GuestOnly><VerifyPage /></GuestOnly>} />
        <Route path="/auth/recuperar" element={<GuestOnly><ForgotPasswordPage /></GuestOnly>} />
        <Route element={<AppShell />}>
          <Route path="/datos" element={<PersonalDataPage />} />
          <Route path="/documentos" element={<DocumentsPage />} />
          <Route path="/fiscal" element={<TaxPage />} />
          <Route path="/legal" element={<LegalPage />} />
          <Route path="/ayuda" element={<HelpPage />} />
          <Route path="/estado" element={<LockedPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    </ThemeProvider>
  )
}
