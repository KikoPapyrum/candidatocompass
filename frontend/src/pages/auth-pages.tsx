import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router'

import { axiosInstance } from '../lib/axios'
import { useAuthStore } from '../auth/auth-store'
import { isValidNationalId, isValidPassword } from '../utils/validators'

export function AuthFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', justifyContent: 'center', bgcolor: 'background.default' }}>
      <Box sx={{ width: '100%', maxWidth: 480, minHeight: '100dvh', bgcolor: 'primary.main', color: 'common.white', px: 3, py: 4 }}>
        <Typography variant="overline">Compass Group</Typography>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>Ready to Work</Typography>
        <Box sx={{ bgcolor: 'background.paper', color: 'text.primary', borderRadius: 3, p: 3 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>{title}</Typography>
          {children}
        </Box>
      </Box>
    </Box>
  )
}

function useError() {
  const [error, setError] = useState('')
  return { error, setError }
}

function useNationalId(initial = '') {
  const [nationalId, setNationalId] = useState(initial.toUpperCase())
  const [, setAutofillGuard] = useState(0)

  function onNationalIdChange(value: string) {
    const next = value.toUpperCase()
    if (next.includes('@')) {
      setAutofillGuard((count) => count + 1)
      return
    }
    setNationalId(next)
  }

  return { nationalId, onNationalIdChange }
}

export function SignInPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const setSession = useAuthStore((state) => state.setSession)
  const { error, setError } = useError()
  const { nationalId, onNationalIdChange } = useNationalId(params.get('national_id') ?? '')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!isValidNationalId(nationalId)) {
      setError('El DNI/NIE no es correcto.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const response = await axiosInstance.post('/auth/login', {
        national_id: nationalId,
        password,
      })
      setSession(response.data.access_token, response.data.user)
      navigate('/datos')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Credenciales erróneas.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthFrame title="Accede">
      <Stack component="form" spacing={2} onSubmit={onSubmit}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="DNI/NIE *"
          name="username"
          autoComplete="username"
          value={nationalId}
          onChange={(event) => onNationalIdChange(event.target.value)}
        />
        <TextField
          label="Contraseña *"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Button type="submit" variant="contained" size="large" disabled={busy}>Accede</Button>
        <Button component={RouterLink} to="/auth/registro">Regístrate</Button>
        <Button component={RouterLink} to="/auth/verificar">Valida tu código de registro</Button>
        <Button component={RouterLink} to="/auth/recuperar">Olvidaste tus credenciales</Button>
        <Button component={RouterLink} to="/ayuda">Ayuda</Button>
      </Stack>
    </AuthFrame>
  )
}

export function SignUpPage() {
  const navigate = useNavigate()
  const { error, setError } = useError()
  const { nationalId, onNationalIdChange } = useNationalId()
  const [email, setEmail] = useState('')
  const [emailRepeat, setEmailRepeat] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!isValidNationalId(nationalId)) {
      setError('El DNI/NIE no es correcto.')
      return
    }
    if (email.trim().toLowerCase() !== emailRepeat.trim().toLowerCase()) {
      setError('Los emails no son idénticos.')
      return
    }
    if (!isValidPassword(password)) {
      setError('La contraseña debe tener al menos 8 caracteres, con mayúsculas, minúsculas y números.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await axiosInstance.post('/auth/register', { national_id: nationalId, email, password })
      navigate(`/auth/verificar?national_id=${encodeURIComponent(nationalId.toUpperCase())}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se ha podido registrar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthFrame title="Regístrate">
      <Stack component="form" spacing={2} onSubmit={onSubmit}>
        <Alert severity="info">Al registrarte te enviaremos un código de 6 dígitos a tu email para confirmar la cuenta.</Alert>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="DNI/NIE *"
          name="username"
          autoComplete="username"
          value={nationalId}
          onChange={(event) => onNationalIdChange(event.target.value)}
        />
        <TextField
          label="Contraseña *"
          name="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <TextField
          label="Email *"
          name="email"
          type="text"
          autoComplete="off"
          slotProps={{ htmlInput: { inputMode: 'email' } }}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <TextField
          label="Repite el email *"
          name="email-repeat"
          type="text"
          autoComplete="off"
          slotProps={{ htmlInput: { inputMode: 'email' } }}
          value={emailRepeat}
          onChange={(event) => setEmailRepeat(event.target.value)}
        />
        <Button type="submit" variant="contained" size="large" disabled={busy}>Regístrate</Button>
        <Button component={RouterLink} to={nationalId ? `/auth?national_id=${encodeURIComponent(nationalId)}` : '/auth'}>Accede</Button>
      </Stack>
    </AuthFrame>
  )
}

export function VerifyPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { error, setError } = useError()
  const { nationalId, onNationalIdChange } = useNationalId(params.get('national_id') ?? '')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await axiosInstance.post('/auth/verify', { national_id: nationalId, code })
      navigate(`/auth?national_id=${encodeURIComponent(nationalId)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'El código no es válido.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthFrame title="Valida tu código">
      <Stack component="form" spacing={2} onSubmit={onSubmit}>
        <Alert severity="info">Introduce el código de 6 dígitos que te hemos enviado por email.</Alert>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="DNI/NIE *"
          name="username"
          autoComplete="username"
          value={nationalId}
          onChange={(event) => onNationalIdChange(event.target.value)}
        />
        <TextField label="Código de verificación *" value={code} onChange={(event) => setCode(event.target.value)} inputProps={{ maxLength: 6 }} />
        <Button type="submit" variant="contained" size="large" disabled={busy}>Confirma el código</Button>
        <Button component={RouterLink} to="/auth">Accede</Button>
      </Stack>
    </AuthFrame>
  )
}

export function ForgotPasswordPage() {
  const { error, setError } = useError()
  const [done, setDone] = useState(false)
  const { nationalId, onNationalIdChange } = useNationalId()
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [phase, setPhase] = useState<'request' | 'confirm'>('request')
  const [busy, setBusy] = useState(false)

  async function requestCode(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await axiosInstance.post('/auth/password-reset/request', { national_id: nationalId })
      setPhase('confirm')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se ha podido enviar el código.')
    } finally {
      setBusy(false)
    }
  }

  async function confirm(event: FormEvent) {
    event.preventDefault()
    if (!isValidPassword(password)) {
      setError('La contraseña debe tener al menos 8 caracteres, con mayúsculas, minúsculas y números.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await axiosInstance.post('/auth/password-reset/confirm', { national_id: nationalId, code, password })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se ha podido cambiar la contraseña.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthFrame title="Nueva contraseña">
      {done ? (
        <Stack spacing={2}>
          <Alert severity="success">Contraseña actualizada.</Alert>
          <Button component={RouterLink} to="/auth" variant="contained">Accede</Button>
        </Stack>
      ) : (
        <Stack component="form" spacing={2} onSubmit={phase === 'request' ? requestCode : confirm}>
          <Alert severity="info">Te enviaremos un código de 6 dígitos a tu email para cambiar la contraseña.</Alert>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="DNI/NIE *"
            name="username"
            autoComplete="username"
            value={nationalId}
            onChange={(event) => onNationalIdChange(event.target.value)}
            disabled={phase === 'confirm'}
          />
          {phase === 'confirm' && (
            <>
              <TextField label="Código *" value={code} onChange={(event) => setCode(event.target.value)} />
              <TextField label="Nueva contraseña *" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </>
          )}
          <Button type="submit" variant="contained" size="large" disabled={busy}>
            {phase === 'request' ? 'Enviar código' : 'Guardar contraseña'}
          </Button>
          <Button component={RouterLink} to="/auth">Accede</Button>
        </Stack>
      )}
    </AuthFrame>
  )
}
