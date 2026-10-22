import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import TextField, { type TextFieldProps } from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router'

import { useAuthStore } from '../auth/auth-store'
import { CompassMark } from '../components/compass-mark'
import { PasswordAdornment, Shake, useNotedError } from '../components/motion'
import { axiosInstance } from '../lib/axios'
import { isValidNationalId, isValidPassword } from '../utils/validators'

const GOLD = '#d4bc7d'
const INK = '#222C36'
const CARD = '#9aa4b0'
const LINK = { color: '#9a8450', fontWeight: 700, textDecoration: 'none' } as const
export const lightCard = { bgcolor: '#fff', borderRadius: '22px', boxShadow: '0 12px 32px rgba(34, 44, 54, 0.06)', px: 2.5, py: 3 }
export const pillButton = {
  borderRadius: 999,
  py: 1.25,
  letterSpacing: '0.12em',
  backgroundImage: 'none',
  bgcolor: INK,
  boxShadow: 'none',
  '&:hover': { bgcolor: '#1b2630', backgroundImage: 'none', boxShadow: 'none' },
}

export function AuthCanvas({ subtitle, children }: { subtitle: string; children: ReactNode }) {
  return (
    <Box sx={{ position: 'fixed', inset: 0, overflow: 'auto', bgcolor: '#eef1f4', display: 'flex', justifyContent: 'center' }}>
      <Box sx={{ width: '100%', maxWidth: 440, px: 2.5, pt: 5, pb: 4 }}>
        <Stack spacing={1.25} sx={{ alignItems: 'center', mb: 3 }}>
          <CompassMark height={58} ink />
          <Typography variant="h4" sx={{ fontWeight: 700, color: INK, textAlign: 'center', mt: 1 }}>Ready to Work</Typography>
          <Typography sx={{ color: '#8b93a0', textAlign: 'center', mt: -0.5 }}>{subtitle}</Typography>
        </Stack>
        {children}
      </Box>
    </Box>
  )
}

const relief = {
  position: 'absolute',
  borderRadius: '50%',
  pointerEvents: 'none',
} as const

export function AuthFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        px: 2,
        py: 4,
        position: 'relative',
        overflow: 'hidden',
        color: '#fff',
        background: `
          radial-gradient(circle at 12% 18%, rgba(255,255,255,0.16), transparent 26%),
          radial-gradient(circle at 88% 12%, rgba(212,188,125,0.38), transparent 32%),
          radial-gradient(circle at 78% 82%, rgba(255,255,255,0.1), transparent 28%),
          radial-gradient(circle at 8% 86%, rgba(212,188,125,0.22), transparent 30%),
          ${INK}
        `,
      }}
    >
      <Box sx={{ ...relief, width: 280, height: 280, top: -80, left: -70, background: 'rgba(255,255,255,0.05)', boxShadow: 'inset 14px 16px 28px rgba(255,255,255,0.16), inset -18px -20px 32px rgba(0,0,0,0.35), 18px 24px 40px rgba(0,0,0,0.2)' }} />
      <Box sx={{ ...relief, width: 220, height: 220, top: 40, right: -60, background: 'rgba(212,188,125,0.12)', boxShadow: 'inset -12px -14px 24px rgba(0,0,0,0.28), inset 10px 12px 20px rgba(255,255,255,0.2)' }} />
      <Box sx={{ ...relief, width: 340, height: 340, bottom: -120, left: '18%', background: 'rgba(255,255,255,0.04)', boxShadow: 'inset 20px 18px 36px rgba(255,255,255,0.12), inset -16px -22px 34px rgba(0,0,0,0.32)' }} />
      <Box sx={{ ...relief, width: 160, height: 160, bottom: 48, right: '12%', background: 'rgba(212,188,125,0.16)', boxShadow: 'inset 8px 10px 16px rgba(255,255,255,0.28), inset -8px -10px 16px rgba(0,0,0,0.25), 0 16px 30px rgba(0,0,0,0.18)' }} />
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          maxWidth: 420,
          px: 3.5,
          py: 4,
          borderRadius: '22px',
          background: 'linear-gradient(180deg, rgba(90,102,116,0.55), rgba(74,86,100,0.42))',
          border: '1px solid rgba(255,255,255,0.32)',
          boxShadow: '0 28px 60px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.45)',
          backdropFilter: 'blur(18px)',
          '& .MuiButton-contained': {
            color: INK,
            backgroundImage: 'linear-gradient(180deg, #ffffff 0%, #f7f4ee 100%)',
            borderRadius: 10,
            py: 1.2,
            boxShadow: '0 8px 18px rgba(0,0,0,0.18)',
            '&:hover': { backgroundImage: 'linear-gradient(180deg, #ffffff 0%, #f0ebe1 100%)' },
          },
          '& .MuiButton-text': {
            color: GOLD,
            fontWeight: 600,
          },
          '& .MuiOutlinedInput-root': {
            bgcolor: CARD,
            color: INK,
            borderRadius: '10px',
            '& fieldset': { borderColor: 'rgba(34,44,54,0.18)' },
            '&:hover fieldset': { borderColor: 'rgba(212,188,125,0.9)' },
            '&.Mui-focused fieldset': { borderColor: GOLD },
            '& input': { color: INK, fontWeight: 600 },
            '& input:-webkit-autofill': {
              WebkitTextFillColor: INK,
              caretColor: INK,
              transition: 'background-color 9999s ease-out',
            },
          },
          '& .MuiInputLabel-root': { color: INK },
          '& .MuiInputLabel-root.Mui-focused': { color: INK },
          '& .MuiAlert-root': { borderRadius: '10px' },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <CompassMark height={48} blend />
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 700, textAlign: 'center', mb: title ? 0.5 : 3 }}>Ready to Work</Typography>
        {title && (
          <Typography sx={{ textAlign: 'center', color: GOLD, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 13, mb: 3 }}>{title}</Typography>
        )}
        {children}
      </Box>
    </Box>
  )
}

function LabeledField({ label, type, slotProps, tone = 'onDark', startIcon, ...props }: TextFieldProps & { label: string; tone?: 'onDark' | 'onLight'; startIcon?: ReactNode }) {
  const id = useId()
  const [shown, setShown] = useState(false)
  const password = type === 'password'
  const onLight = tone === 'onLight'
  return (
    <Box>
      <Typography component="label" htmlFor={id} sx={{ display: 'block', color: onLight ? INK : '#fff', fontWeight: 700, mb: 0.75, fontSize: 13 }}>
        {label}
      </Typography>
      <TextField
        id={id}
        fullWidth
        hiddenLabel
        type={password && shown ? 'text' : type}
        sx={onLight ? {
          '& .MuiOutlinedInput-root': {
            bgcolor: '#f4f6f8',
            borderRadius: '10px',
            '& fieldset': { borderColor: 'transparent' },
            '&:hover fieldset': { borderColor: '#e4e7ec' },
            '&.Mui-focused fieldset': { borderColor: INK },
          },
        } : undefined}
        slotProps={{
          ...slotProps,
          input: {
            ...(typeof slotProps?.input === 'object' ? slotProps.input : {}),
            ...(startIcon ? { startAdornment: <InputAdornment position="start">{startIcon}</InputAdornment> } : {}),
            ...(password ? { endAdornment: <PasswordAdornment shown={shown} onToggle={() => setShown((value) => !value)} color={onLight ? '#8b93a0' : INK} /> } : {}),
          },
        }}
        {...props}
      />
    </Box>
  )
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
  const { error, setError, tick } = useNotedError()
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
    <AuthCanvas subtitle={"\u00a0"}>
        <Shake tick={tick}>
          <Stack component="form" spacing={1.75} onSubmit={onSubmit} sx={lightCard}>
            {error && <Alert severity="error">{error}</Alert>}
            <LabeledField
              tone="onLight"
              label="DNI / NIE *"
              name="username"
              autoComplete="username"
              value={nationalId}
              onChange={(event) => onNationalIdChange(event.target.value)}
            />
            <LabeledField
              tone="onLight"
              label="Contraseña *"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              startIcon={<LockOutlinedIcon sx={{ fontSize: 18, color: '#9aa3ad' }} />}
            />
            <Button component={RouterLink} to="/auth/recuperar" sx={{ alignSelf: 'center', color: '#9a8450', fontWeight: 600, fontSize: 14, minWidth: 0, py: 0 }}>
              ¿Olvidaste tus credenciales?
            </Button>
            <Button type="submit" variant="contained" size="large" fullWidth disabled={busy} sx={pillButton}>
              ACCEDER
            </Button>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5 }}>
              <Box sx={{ flex: 1, height: '1px', bgcolor: '#e6e9ee' }} />
              <Box sx={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #e6e9ee', color: '#9aa3ad', display: 'grid', placeItems: 'center' }}>
                <KeyboardArrowDownIcon sx={{ fontSize: 18 }} />
              </Box>
              <Box sx={{ flex: 1, height: '1px', bgcolor: '#e6e9ee' }} />
            </Box>
            <Typography sx={{ textAlign: 'center', color: '#5c6570', fontSize: 14.5 }}>
              ¿No tienes cuenta? <Box component={RouterLink} to="/auth/registro" sx={LINK}>Regístrate</Box>
            </Typography>
            <Button
              component={RouterLink}
              to="/auth/verificar"
              variant="outlined"
              fullWidth
              sx={{ borderRadius: 999, py: 1.1, color: '#5c6570', borderColor: '#e4e7ec', fontWeight: 600, '&:hover': { borderColor: '#cfd5dd', bgcolor: '#fafbfc' } }}
            >
              Valida tu código de registro
            </Button>
            <Button component={RouterLink} to="/ayuda" sx={{ alignSelf: 'center', color: '#8b93a0', fontWeight: 600, minWidth: 0 }}>
              Ayuda
            </Button>
          </Stack>
        </Shake>
    </AuthCanvas>
  )
}

export function SignUpPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { error, setError, tick } = useNotedError()
  const { nationalId, onNationalIdChange } = useNationalId(params.get('national_id') ?? '')
  const email = params.get('email') ?? ''
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!isValidNationalId(nationalId)) {
      setError('El DNI/NIE no es correcto.')
      return
    }
    if (!isValidPassword(password)) {
      setError('La contraseña debe tener al menos 8 caracteres, con mayúsculas, minúsculas y números.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await axiosInstance.post('/auth/register', { national_id: nationalId, password })
      navigate(`/auth/verificar?national_id=${encodeURIComponent(nationalId.toUpperCase())}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se ha podido registrar.')
    } finally {
      setBusy(false)
    }
  }

  const loginPath = nationalId ? `/auth?national_id=${encodeURIComponent(nationalId)}` : '/auth'

  return (
    <AuthCanvas subtitle={"\u00a0"}>
      <Shake tick={tick}>
        <Stack component="form" spacing={1.75} onSubmit={onSubmit} sx={lightCard}>
          <Alert severity="info">
            {email
              ? `Al registrarte te enviaremos un código de 6 dígitos a ${email} para confirmar la cuenta.`
              : 'Al registrarte te enviaremos un código de 6 dígitos al email de tu solicitud para confirmar la cuenta.'}
          </Alert>
          {error && <Alert severity="error">{error}</Alert>}
          <LabeledField
            tone="onLight"
            label="DNI / NIE *"
            name="username"
            autoComplete="username"
            value={nationalId}
            onChange={(event) => onNationalIdChange(event.target.value)}
          />
          <LabeledField
            tone="onLight"
            label="Contraseña *"
            name="new-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            startIcon={<LockOutlinedIcon sx={{ fontSize: 18, color: '#9aa3ad' }} />}
          />
          <Button type="submit" variant="contained" size="large" fullWidth disabled={busy} sx={pillButton}>
            REGÍSTRATE
          </Button>
          <Typography sx={{ textAlign: 'center', color: '#5c6570', fontSize: 14.5 }}>
            ¿Ya tienes cuenta? <Box component={RouterLink} to={loginPath} sx={LINK}>Accede</Box>
          </Typography>
          <Button component={RouterLink} to="/ayuda" sx={{ alignSelf: 'center', color: '#8b93a0', fontWeight: 600, minWidth: 0 }}>
            Ayuda
          </Button>
        </Stack>
      </Shake>
    </AuthCanvas>
  )
}

export function VerifyPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { error, setError, tick } = useNotedError()
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
    <AuthCanvas subtitle={"\u00a0"}>
      <Shake tick={tick}>
        <Stack component="form" spacing={1.75} onSubmit={onSubmit} sx={lightCard}>
          <Alert severity="info">Introduce el código de 6 dígitos que te hemos enviado por email.</Alert>
          {error && <Alert severity="error">{error}</Alert>}
          <LabeledField
            tone="onLight"
            label="DNI / NIE *"
            name="username"
            autoComplete="username"
            value={nationalId}
            onChange={(event) => onNationalIdChange(event.target.value)}
          />
          <LabeledField
            tone="onLight"
            label="Código de verificación *"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 6, inputMode: 'numeric' } }}
          />
          <Button type="submit" variant="contained" size="large" fullWidth disabled={busy} sx={pillButton}>
            CONFIRMA EL CÓDIGO
          </Button>
          <Typography sx={{ textAlign: 'center', color: '#5c6570', fontSize: 14.5 }}>
            <Box component={RouterLink} to="/auth" sx={LINK}>Accede</Box>
          </Typography>
          <Button component={RouterLink} to="/ayuda" sx={{ alignSelf: 'center', color: '#8b93a0', fontWeight: 600, minWidth: 0 }}>
            Ayuda
          </Button>
        </Stack>
      </Shake>
    </AuthCanvas>
  )
}

export function ForgotPasswordPage() {
  const { error, setError, tick } = useNotedError()
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
        <Shake tick={tick}>
        <Stack component="form" spacing={2} onSubmit={phase === 'request' ? requestCode : confirm}>
          <Alert severity="info">Te enviaremos un código de 6 dígitos a tu email para cambiar la contraseña.</Alert>
          {error && <Alert severity="error">{error}</Alert>}
          <LabeledField
            label="DNI/NIE *"
            name="username"
            autoComplete="username"
            value={nationalId}
            onChange={(event) => onNationalIdChange(event.target.value)}
            disabled={phase === 'confirm'}
          />
          {phase === 'confirm' && (
            <>
              <LabeledField label="Código *" value={code} onChange={(event) => setCode(event.target.value)} />
              <LabeledField label="Nueva contraseña *" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </>
          )}
          <Button type="submit" variant="contained" size="large" disabled={busy}>
            {phase === 'request' ? 'Enviar código' : 'Guardar contraseña'}
          </Button>
          <Button component={RouterLink} to="/auth">Accede</Button>
        </Stack>
        </Shake>
      )}
    </AuthFrame>
  )
}
