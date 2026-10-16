import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useAuthStore } from '../auth/auth-store'
import { axiosInstance } from '../lib/axios'

export function LegalPage() {
  const navigate = useNavigate()
  const signOut = useAuthStore((state) => state.signOut)
  const [privacy, setPrivacy] = useState(false)
  const [email, setEmail] = useState(false)
  const [truth, setTruth] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    setError('')
    try {
      await axiosInstance.post('/candidates/me/submit', {
        privacy_accepted: privacy,
        email_accepted: email,
        truth_accepted: truth,
      })
      signOut()
      navigate('/auth', { state: { finished: true } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se ha podido finalizar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Lee y acepta las cláusulas</Typography>
      <Alert severity="info">
        Al finalizar, tus datos y documentos se envían a Kulteo para el proceso de selección.
      </Alert>
      {error && <Alert severity="error">{error}</Alert>}
      <FormControlLabel control={<Checkbox checked={privacy} onChange={(event) => setPrivacy(event.target.checked)} />} label="He leído, entiendo y acepto la política de privacidad." />
      <FormControlLabel control={<Checkbox checked={email} onChange={(event) => setEmail(event.target.checked)} />} label="Autorizo el uso de mi email personal para recibir comunicaciones corporativas." />
      <FormControlLabel control={<Checkbox checked={truth} onChange={(event) => setTruth(event.target.checked)} />} label="Los datos proporcionados son verídicos." />
      <Button variant="text" onClick={() => navigate('/fiscal')}>Volver a datos fiscales</Button>
      <Button variant="contained" size="large" disabled={busy || !privacy || !email || !truth} onClick={submit}>
        Validar las cláusulas y finalizar
      </Button>
    </Stack>
  )
}
