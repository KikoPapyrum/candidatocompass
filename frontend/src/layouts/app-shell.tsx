import MenuIcon from '@mui/icons-material/Menu'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Step from '@mui/material/Step'
import StepButton from '@mui/material/StepButton'
import Stepper from '@mui/material/Stepper'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router'

import { useAuthStore } from '../auth/auth-store'
import { CompassMark } from '../components/compass-mark'
import { useCandidateStore } from '../store/candidate-store'

const STEPS = [
  { label: 'Datos', path: '/datos' },
  { label: 'Documentos', path: '/documentos' },
  { label: 'Fiscal', path: '/fiscal' },
  { label: 'Legal', path: '/legal' },
]

export function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const token = useAuthStore((state) => state.token)
  const signOut = useAuthStore((state) => state.signOut)
  const candidate = useCandidateStore((state) => state.candidate)
  const loading = useCandidateStore((state) => state.loading)
  const load = useCandidateStore((state) => state.load)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (token) {
      load().catch(() => signOut())
    }
  }, [token, load, signOut])

  if (!token) {
    return <Navigate to="/auth" replace />
  }
  if (loading || !candidate) {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  const wizard = ['/datos', '/documentos', '/fiscal', '/legal']
  if (!candidate.editable && wizard.includes(location.pathname)) {
    return <Navigate to="/estado" replace />
  }

  const activeStep = Math.max(0, STEPS.findIndex((step) => step.path === location.pathname))
  const today = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date())

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', justifyContent: 'center', bgcolor: 'background.default' }}>
      <Box sx={{ width: '100%', maxWidth: 480, minHeight: '100dvh', bgcolor: 'background.paper', display: 'flex', flexDirection: 'column', boxShadow: { sm: 8 } }}>
        <AppBar position="sticky" elevation={0}>
          <Toolbar>
            <IconButton color="inherit" edge="start" onClick={() => setOpen(true)} aria-label="Menú">
              <MenuIcon />
            </IconButton>
            <CompassMark height={36} />
            <Box sx={{ ml: 1.5 }}>
              <Typography variant="h6" sx={{ lineHeight: 1.1 }}>Ready to Work</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.72)' }}>{today}</Typography>
            </Box>
          </Toolbar>
        </AppBar>
        {wizard.includes(location.pathname) && (
          <Stepper nonLinear activeStep={activeStep} sx={{ px: 2, py: 2 }}>
            {STEPS.map((step) => (
              <Step key={step.path} completed={false}>
                <StepButton onClick={() => navigate(step.path)}>
                  {step.label}
                </StepButton>
              </Step>
            ))}
          </Stepper>
        )}
        <Box component="main" sx={{ flex: 1, px: 2, pb: 4 }}>
          <Outlet />
        </Box>
        <Drawer open={open} onClose={() => setOpen(false)}>
          <Box sx={{ width: 280 }} role="presentation">
            <Box sx={{ bgcolor: '#111111', px: 2, py: 2 }}>
              <CompassMark height={44} />
            </Box>
            <Box sx={{ px: 2, pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{candidate.first_name}</Typography>
            <List>
              <ListItemButton onClick={() => { setOpen(false); navigate('/ayuda') }}>
                <ListItemText primary="Ayuda" />
              </ListItemButton>
              <ListItemButton onClick={() => { signOut(); navigate('/auth') }}>
                <ListItemText primary="Salir de la app" />
              </ListItemButton>
            </List>
            </Box>
          </Box>
        </Drawer>
      </Box>
    </Box>
  )
}

export function LockedPage() {
  const candidate = useCandidateStore((state) => state.candidate)
  const signOut = useAuthStore((state) => state.signOut)
  const navigate = useNavigate()
  return (
    <Box sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Información en revisión</Typography>
      <Typography sx={{ mb: 2 }}>
        Has acabado de introducir la información solicitada. El personal de Compass está verificando los datos.
        Si hace falta alguna modificación, te escribirán por email y podrás volver a entrar.
      </Typography>
      {candidate?.rejection_reason && (
        <Typography color="error" sx={{ mb: 2 }}>{candidate.rejection_reason}</Typography>
      )}
      <Button variant="contained" onClick={() => { signOut(); navigate('/auth') }}>Salir</Button>
    </Box>
  )
}
