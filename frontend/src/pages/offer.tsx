import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'

import { useAuthStore } from '../auth/auth-store'
import { CompassMark } from '../components/compass-mark'
import { SecretField, Shake, useNotedError } from '../components/motion'
import { axiosInstance } from '../lib/axios'
import type { Account } from '../types/domain'
import { isValidNationalId, isValidPassword } from '../utils/validators'

type PublicOffer = {
  code: string
  title: string
  description: string
  open: boolean
  documents: { code: string; label: string }[]
}

type EnrollResult = {
  status: 'verify' | 'authenticated'
  detail: string
  access_token?: string
  user?: Account
}

export function OfferPage() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const setSession = useAuthStore((state) => state.setSession)
  const [offer, setOffer] = useState<PublicOffer | null>(null)
  const [loading, setLoading] = useState(true)
  const { error, setError, tick } = useNotedError()
  const [formOpen, setFormOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [nationalId, setNationalId] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [secondLastName, setSecondLastName] = useState('')
  const [email, setEmail] = useState('')
  const [emailRepeat, setEmailRepeat] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    axiosInstance
      .get<PublicOffer>(`/offers/${encodeURIComponent(code)}`)
      .then((response) => {
        if (active) {
          setOffer(response.data)
        }
      })
      .catch((err: Error) => {
        if (active) {
          setError(err.message)
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [code])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!isValidNationalId(nationalId)) {
      setError('El DNI/NIE no es correcto.')
      return
    }
    if (!firstName.trim() || !lastName.trim()) {
      setError('Indica nombre y apellidos.')
      return
    }
    if (email.trim().toLowerCase() !== emailRepeat.trim().toLowerCase()) {
      setError('Los emails no son idénticos.')
      return
    }
    if (!/^\d{9}$/.test(phone.replace(/\s+/g, ''))) {
      setError('El móvil debe tener 9 dígitos.')
      return
    }
    if (!isValidPassword(password)) {
      setError('La contraseña debe tener al menos 8 caracteres, con mayúsculas, minúsculas y números.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const response = await axiosInstance.post<EnrollResult>(`/offers/${encodeURIComponent(code)}/enroll`, {
        national_id: nationalId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        second_last_name: secondLastName.trim() || null,
        email,
        phone,
        password,
      })
      if (response.data.status === 'authenticated' && response.data.access_token && response.data.user) {
        setSession(response.data.access_token, response.data.user)
        navigate('/datos')
        return
      }
      navigate(`/auth/verificar?national_id=${encodeURIComponent(nationalId.toUpperCase())}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se ha podido completar la inscripción.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack sx={{ minHeight: '100dvh', bgcolor: 'background.default', alignItems: 'center' }}>
      <Stack sx={{ width: '100%', maxWidth: 480, bgcolor: 'background.paper', minHeight: '100dvh' }}>
        <Box sx={{ bgcolor: '#222C36', px: 3, py: 2 }}>
          <CompassMark height={44} />
        </Box>
        <Stack spacing={2} sx={{ px: 3, py: 3 }}>
          {loading && <CircularProgress />}
          {!loading && !offer && <Alert severity="error">{error || 'Esta oferta no está disponible.'}</Alert>}
          {offer && (
            <>
              <Typography variant="h5">{offer.title}</Typography>
              {offer.description && <Typography sx={{ whiteSpace: 'pre-line' }}>{offer.description}</Typography>}
              <Typography variant="h6">Documentación obligatoria</Typography>
              {offer.documents.length === 0 && (
                <Typography color="text.secondary">Esta oferta no tiene documentos marcados.</Typography>
              )}
              {offer.documents.map((document) => (
                <Typography key={document.code}>{document.label}</Typography>
              ))}
              {!offer.open && <Alert severity="warning">Esta oferta ya no admite inscripciones.</Alert>}
              {offer.open && !formOpen && (
                <Button variant="contained" size="large" onClick={() => setFormOpen(true)}>Inscribirse</Button>
              )}
              {offer.open && formOpen && (
                <Shake tick={tick}>
                <Stack component="form" spacing={2} onSubmit={onSubmit}>
                  <Typography variant="h6">Inscripción</Typography>
                  <Typography color="text.secondary">
                    Indica tus datos básicos. Con la contraseña completarás el registro y podrás entrar a subir la documentación.
                  </Typography>
                  {error && <Alert severity="error">{error}</Alert>}
                  <TextField label="NIF/NIE *" value={nationalId} onChange={(event) => setNationalId(event.target.value.toUpperCase())} autoComplete="username" />
                  <TextField label="Nombre *" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
                  <TextField label="Primer apellido *" value={lastName} onChange={(event) => setLastName(event.target.value)} />
                  <TextField label="Segundo apellido" value={secondLastName} onChange={(event) => setSecondLastName(event.target.value)} />
                  <TextField label="Email *" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
                  <TextField label="Repite el email *" type="email" value={emailRepeat} onChange={(event) => setEmailRepeat(event.target.value)} autoComplete="email" />
                  <TextField label="Móvil *" value={phone} onChange={(event) => setPhone(event.target.value)} helperText="9 dígitos" />
                  <SecretField label="Contraseña *" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" />
                  <Button type="submit" variant="contained" size="large" disabled={busy}>Completar registro</Button>
                </Stack>
                </Shake>
              )}
            </>
          )}
        </Stack>
      </Stack>
    </Stack>
  )
}
