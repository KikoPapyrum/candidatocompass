import CheckIcon from '@mui/icons-material/Check'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
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
import { useEffect, useRef, useState } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router'

import { useAuthStore } from '../auth/auth-store'
import { menuNudgeSx } from '../components/motion'
import { useCandidateStore } from '../store/candidate-store'

const GOLD = '#d4bc7d'
const COMPASS_RED = '#e31837'
const STEPS = [
  { label: 'Datos', path: '/datos', icon: <PersonOutlineIcon />, doneKey: 'personal_data_complete' as const, warningKey: 'datos' },
  { label: 'Documentos', path: '/documentos', icon: <DescriptionOutlinedIcon />, doneKey: 'documents_complete' as const, warningKey: 'documentos' },
  { label: 'Fiscal', path: '/fiscal', icon: <AccountBalanceOutlinedIcon />, doneKey: 'tax_data_complete' as const, warningKey: 'fiscal' },
  { label: 'Legal', path: '/legal', icon: <GavelOutlinedIcon />, doneKey: null, warningKey: 'legal' },
  { label: 'Salir', path: 'salir', icon: <LogoutOutlinedIcon />, doneKey: null, warningKey: null },
]

function firstWarningPath(warnings: string[]) {
  const pending = new Set(warnings)
  return STEPS.find((step) => step.warningKey && pending.has(step.warningKey))?.path ?? null
}

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
  return { label: 'Ya puedes actualizar candidatura', path: '/legal', ready: true }
}

export function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const token = useAuthStore((state) => state.token)
  const landing = useAuthStore((state) => state.landing)
  const consumeLanding = useAuthStore((state) => state.consumeLanding)
  const signOut = useAuthStore((state) => state.signOut)
  const candidate = useCandidateStore((state) => state.candidate)
  const loading = useCandidateStore((state) => state.loading)
  const load = useCandidateStore((state) => state.load)
  const documents = useCandidateStore((state) => state.documents)
  const loadDocuments = useCandidateStore((state) => state.loadDocuments)
  const screenError = useCandidateStore((state) => state.screenError)
  const [noticePath, setNoticePath] = useState<string | null>(null)
  const [noticeReady, setNoticeReady] = useState(false)
  const pendingNotice = useRef<string | null>(null)

  useEffect(() => {
    if (!token) {
      useCandidateStore.setState({ candidate: null, documents: [], loading: false })
      return
    }
    let active = true
    load()
      .then(() => {
        if (!active || !useAuthStore.getState().landing) {
          return
        }
        const current = useCandidateStore.getState().candidate
        const target = firstWarningPath(current?.step_warnings ?? [])
        if (target) {
          pendingNotice.current = target
          setNoticeReady(false)
          setNoticePath(target)
        }
        consumeLanding()
      })
      .catch(() => {
        if (active) {
          signOut()
        }
      })
    return () => {
      active = false
    }
  }, [token, load, consumeLanding, signOut])

  useEffect(() => {
    if (!noticePath) {
      return
    }
    let active = true
    loadDocuments()
      .catch(() => undefined)
      .finally(() => {
        if (active) {
          setNoticeReady(true)
        }
      })
    return () => {
      active = false
    }
  }, [noticePath, loadDocuments])

  if (!token) {
    if (location.pathname === '/ayuda') {
      return <Outlet />
    }
    return <Navigate to="/auth" replace />
  }
  if (landing || loading || !candidate) {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  const wizard = ['/datos', '/documentos', '/fiscal', '/legal']
  const hasWarning = (candidate.step_warnings ?? []).length > 0
  if (!candidate.editable && !hasWarning && wizard.includes(location.pathname)) {
    return <Navigate to="/estado" replace />
  }

  const activeNotice = noticePath ?? pendingNotice.current
  if (activeNotice) {
    const missing = documents.filter((document) => !document.uploaded)
    return (
      <Box sx={{ height: '100dvh', display: 'flex', justifyContent: 'center', bgcolor: 'background.default' }}>
        <Box sx={{ width: '100%', maxWidth: 480, height: '100dvh', bgcolor: '#fff', display: 'grid', gridTemplateRows: '1fr auto 1fr', justifyItems: 'center', textAlign: 'center', px: 3 }}>
          <Box sx={{ alignSelf: 'center', width: 112, height: 112, borderRadius: '50%', bgcolor: '#ed6c02', display: 'grid', placeItems: 'center' }}>
            <WarningAmberIcon sx={{ fontSize: 56, color: '#fff' }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ mb: 1.5 }}>Documentación nueva</Typography>
            <Typography sx={{ maxWidth: 340, color: '#5c6570' }}>
              Compass te pide estos documentos. Al cerrar este aviso pasarás a gestionarlos.
            </Typography>
            {candidate.rejection_reason && (
              <Typography color="error" sx={{ maxWidth: 340, mt: 2 }}>{candidate.rejection_reason}</Typography>
            )}
            {!noticeReady && <CircularProgress size={22} sx={{ mt: 2 }} />}
            {noticeReady && missing.length > 0 && (
              <Box component="ul" sx={{ maxWidth: 340, mx: 'auto', mt: 2, mb: 0, pl: 2.5, textAlign: 'left', color: '#1c2731' }}>
                {missing.map((document) => (
                  <Typography key={document.document_type} component="li" sx={{ lineHeight: 1.5 }}>{document.label}</Typography>
                ))}
              </Box>
            )}
          </Box>
          <Box sx={{ alignSelf: 'stretch', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box sx={{ flex: 1 }} />
            <Button
              variant="contained"
              size="large"
              sx={{ width: '100%', maxWidth: 360, py: 1.2 }}
              onClick={() => {
                const target = activeNotice
                pendingNotice.current = null
                setNoticePath(null)
                navigate(target, { replace: true })
              }}
            >
              Continuar
            </Button>
            <Box sx={{ flex: 2 }} />
          </Box>
        </Box>
      </Box>
    )
  }

  const showNav = wizard.includes(location.pathname) || location.pathname === '/ayuda'
  const warningPath = firstWarningPath(candidate.step_warnings ?? [])
  const canSubmit = candidate.personal_data_complete && candidate.documents_complete && candidate.tax_data_complete && !hasWarning
  const upcoming = warningPath
    ? { label: `Siguiente: ${STEPS.find((step) => step.path === warningPath)?.label.toLowerCase() ?? 'documentos'}`, path: warningPath, ready: false }
    : nextStep(candidate)
  const showGuide = wizard.includes(location.pathname) && !(screenError && upcoming.ready)
  if (location.pathname === '/legal' && !canSubmit) {
    return <Navigate to={warningPath ?? '/datos'} replace />
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
              '& .MuiBottomNavigationAction-root.Mui-disabled': {
                opacity: 0.38,
                color: '#d5dbe3',
              },
              '& .MuiBottomNavigationAction-root.Mui-disabled .MuiBottomNavigationAction-label': {
                color: '#d5dbe3',
              },
              '& .MuiBottomNavigationAction-root.Mui-selected': { color: GOLD },
              '& .MuiBottomNavigationAction-label': { fontSize: 11, mt: 0.5, color: 'inherit' },
              '& .Mui-selected .MuiBottomNavigationAction-label': { fontSize: 11, fontWeight: 700, color: GOLD },
            }}
          >
            {STEPS.map((step) => {
              const done = step.doneKey ? candidate[step.doneKey] : false
              const warned = Boolean(step.warningKey && (candidate.step_warnings ?? []).includes(step.warningKey))
              const icon = warned ? (
                <Badge
                  overlap="circular"
                  badgeContent={<WarningAmberIcon sx={{ fontSize: 11, color: '#fff' }} />}
                  sx={{ '& .MuiBadge-badge': { bgcolor: '#ed6c02', minWidth: 16, height: 16, p: 0 } }}
                >
                  {step.icon}
                </Badge>
              ) : done ? (
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
