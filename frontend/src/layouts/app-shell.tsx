import CheckIcon from '@mui/icons-material/Check'
import HourglassTopIcon from '@mui/icons-material/HourglassTop'
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import GavelOutlinedIcon from '@mui/icons-material/GavelOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import Badge from '@mui/material/Badge'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import { useEffect } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router'

import { useAuthStore } from '../auth/auth-store'
import { menuNudgeSx } from '../components/motion'
import { useCandidateStore } from '../store/candidate-store'

const GOLD = '#d4bc7d'
const COMPASS_RED = '#e31837'
const STEPS = [
  { label: 'Datos', path: '/datos', icon: <PersonOutlineIcon />, doneKey: 'personal_data_complete' as const },
  { label: 'Documentos', path: '/documentos', icon: <DescriptionOutlinedIcon />, doneKey: 'documents_complete' as const },
  { label: 'Fiscal', path: '/fiscal', icon: <AccountBalanceOutlinedIcon />, doneKey: 'tax_data_complete' as const },
  { label: 'Legal', path: '/legal', icon: <GavelOutlinedIcon />, doneKey: null },
  { label: 'Salir', path: 'salir', icon: <LogoutOutlinedIcon />, doneKey: null },
]

function nextStep(candidate: { personal_data_complete: boolean; documents_complete: boolean; tax_data_complete: boolean }) {
  if (!candidate.personal_data_complete) {
    return { label: 'Siguiente: datos', path: '/datos', ready: false }
  }
  if (!candidate.documents_complete) {
    return { label: 'Siguiente: documentos', path: '/documentos', ready: false }
  }
  if (!candidate.tax_data_complete) {
    return { label: 'Siguiente: datos fiscales', path: '/fiscal', ready: false }
  }
  return { label: 'Ya puedes enviar a Kulteo', path: '/legal', ready: true }
}

export function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const token = useAuthStore((state) => state.token)
  const signOut = useAuthStore((state) => state.signOut)
  const candidate = useCandidateStore((state) => state.candidate)
  const loading = useCandidateStore((state) => state.loading)
  const load = useCandidateStore((state) => state.load)

  useEffect(() => {
    if (token) {
      load().catch(() => signOut())
    }
  }, [token, load, signOut])

  if (!token) {
    if (location.pathname === '/ayuda') {
      return <Outlet />
    }
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

  const showNav = wizard.includes(location.pathname) || location.pathname === '/ayuda'
  const canSubmit = candidate.personal_data_complete && candidate.documents_complete && candidate.tax_data_complete
  const upcoming = nextStep(candidate)
  const showGuide = wizard.includes(location.pathname)
  if (location.pathname === '/legal' && !canSubmit) {
    return <Navigate to="/datos" replace />
  }

  return (
    <Box sx={{ height: '100dvh', display: 'flex', justifyContent: 'center', bgcolor: 'background.default' }}>
      <Box sx={{ width: '100%', maxWidth: 480, height: '100dvh', bgcolor: '#f3f5f8', display: 'flex', flexDirection: 'column', boxShadow: { sm: 8 } }}>
        {showGuide && (
          <Box sx={{ px: 2, pt: 2, bgcolor: '#f3f5f8' }}>
            <Button
              fullWidth
              onClick={() => navigate(upcoming.path)}
              sx={{
                justifyContent: 'flex-start',
                py: 1.1,
                px: 1.5,
                borderRadius: 2,
                fontWeight: 700,
                color: upcoming.ready ? '#fff' : '#222C36',
                bgcolor: upcoming.ready ? '#222C36' : '#fff',
                boxShadow: 'none',
                backgroundImage: 'none',
                '&:hover': { bgcolor: upcoming.ready ? '#2e3c4a' : '#fff', backgroundImage: 'none' },
              }}
            >
              {upcoming.label}
            </Button>
          </Box>
        )}
        <Box component="main" sx={{ flex: 1, overflow: 'auto', px: 2, py: 2, bgcolor: '#f3f5f8', display: 'flex', flexDirection: 'column' }}>
          <Outlet />
        </Box>
        {showNav && (
          <BottomNavigation
            showLabels
            value={location.pathname}
            onChange={(_, path: string) => {
              if (path === 'salir') {
                signOut()
                navigate('/auth')
                return
              }
              if (path === '/legal' && !canSubmit) {
                return
              }
              navigate(path)
            }}
            sx={{
              borderTop: '1px solid',
              borderColor: 'divider',
              height: 72,
              '& .MuiBottomNavigationAction-root': { color: '#9aa3ad', minWidth: 0 },
              '& .MuiBottomNavigationAction-root.Mui-selected': { color: GOLD },
              '& .MuiBottomNavigationAction-label': { fontSize: 11, mt: 0.5, color: 'inherit' },
              '& .Mui-selected .MuiBottomNavigationAction-label': { fontSize: 11, fontWeight: 700, color: GOLD },
            }}
          >
            {STEPS.map((step) => {
              const done = step.doneKey ? candidate[step.doneKey] : false
              const icon = done ? (
                <Badge
                  overlap="circular"
                  badgeContent={<CheckIcon sx={{ fontSize: 10, color: '#fff' }} />}
                  sx={{ '& .MuiBadge-badge': { bgcolor: '#2e7d32', minWidth: 14, height: 14, p: 0 } }}
                >
                  {step.icon}
                </Badge>
              ) : step.icon
              const nudge = menuNudgeSx(step.path === upcoming.path && !upcoming.ready && location.pathname !== upcoming.path)
              const exit = step.path === 'salir'
                ? { color: `${COMPASS_RED} !important`, '& .MuiBottomNavigationAction-label': { color: `${COMPASS_RED} !important` } }
                : undefined
              return (
                <BottomNavigationAction
                  key={step.path}
                  label={step.label}
                  value={step.path}
                  icon={icon}
                  disabled={step.path === '/legal' && !canSubmit}
                  sx={{ ...nudge, ...exit }}
                />
              )
            })}
          </BottomNavigation>
        )}
      </Box>
    </Box>
  )
}

export function LockedPage() {
  const candidate = useCandidateStore((state) => state.candidate)
  const signOut = useAuthStore((state) => state.signOut)
  const navigate = useNavigate()
  return (
    <Box sx={{ flex: 1, mx: -2, my: -2, px: 3, display: 'grid', gridTemplateRows: '1fr auto 1fr', justifyItems: 'center', textAlign: 'center', bgcolor: '#fff' }}>
      <Box sx={{ alignSelf: 'center', width: 112, height: 112, borderRadius: '50%', bgcolor: '#222C36', display: 'grid', placeItems: 'center' }}>
        <HourglassTopIcon sx={{ fontSize: 52, color: '#d4bc7d' }} />
      </Box>
      <Box>
        <Typography variant="h5" sx={{ mb: 1.5 }}>Información en revisión</Typography>
        <Typography sx={{ maxWidth: 320, color: '#5c6570' }}>
          Has acabado de introducir la información solicitada. El personal de Compass está verificando los datos.
          Si hace falta alguna modificación, te escribirán por email y podrás volver a entrar.
        </Typography>
        {candidate?.rejection_reason && (
          <Typography color="error" sx={{ maxWidth: 320, mt: 2 }}>{candidate.rejection_reason}</Typography>
        )}
      </Box>
      <Box sx={{ alignSelf: 'stretch', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" size="large" sx={{ width: '100%', maxWidth: 360, py: 1.2 }} onClick={() => { signOut(); navigate('/auth') }}>Salir</Button>
        <Box sx={{ flex: 2 }} />
      </Box>
    </Box>
  )
}
