import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import TextField, { type TextFieldProps } from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useEffect, useRef, useState, type ReactNode } from 'react'

const shakeFrames = {
  '@keyframes shakeX': {
    '0%, 100%': { transform: 'translateX(0)' },
    '20%': { transform: 'translateX(-6px)' },
    '40%': { transform: 'translateX(5px)' },
    '60%': { transform: 'translateX(-3px)' },
    '80%': { transform: 'translateX(2px)' },
  },
  '@media (prefers-reduced-motion: reduce)': { animation: 'none !important' },
} as const

export function useNotedError() {
  const [error, setErrorState] = useState('')
  const [tick, setTick] = useState(0)

  function setError(message: string) {
    setErrorState(message)
    if (message) {
      setTick((value) => value + 1)
    }
  }

  return { error, setError, tick }
}

export function Shake({ tick, children }: { tick: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node || tick === 0) {
      return
    }
    node.style.animation = 'none'
    void node.offsetWidth
    node.style.animation = 'shakeX 0.45s ease-in-out'
  }, [tick])

  return (
    <Box ref={ref} sx={shakeFrames}>
      {children}
    </Box>
  )
}

export function menuNudgeSx(active: boolean) {
  if (!active) {
    return undefined
  }
  return {
    animation: 'menuNudge 4.8s ease-in-out infinite',
    '@keyframes menuNudge': {
      '0%, 82%, 100%': { transform: 'translateX(0)' },
      '86%': { transform: 'translateX(-4px)' },
      '90%': { transform: 'translateX(4px)' },
      '93%': { transform: 'translateX(-2px)' },
      '96%': { transform: 'translateX(2px)' },
    },
    '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
  }
}

export function PasswordAdornment({ shown, onToggle, color }: { shown: boolean; onToggle: () => void; color: string }) {
  return (
    <InputAdornment position="end">
      <IconButton
        aria-label={shown ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        onClick={onToggle}
        onMouseDown={(event) => event.preventDefault()}
        edge="end"
        size="small"
        sx={{ color }}
      >
        {shown ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
      </IconButton>
    </InputAdornment>
  )
}

export function SecretField(props: TextFieldProps) {
  const [shown, setShown] = useState(false)
  return (
    <TextField
      {...props}
      type={shown ? 'text' : 'password'}
      slotProps={{
        ...props.slotProps,
        input: {
          ...(typeof props.slotProps?.input === 'object' ? props.slotProps.input : {}),
          endAdornment: <PasswordAdornment shown={shown} onToggle={() => setShown((value) => !value)} color="#5c6570" />,
        },
      }}
    />
  )
}

export function StepFeedback({ title, onDone }: { title: string; onDone: () => void }) {
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    const timer = window.setTimeout(() => doneRef.current(), 900)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 1600,
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'rgba(243, 245, 248, 0.94)',
      }}
    >
      <Box sx={{ textAlign: 'center', px: 3 }}>
        <Box
          sx={{
            width: 104,
            height: 104,
            mx: 'auto',
            mb: 2,
            animation: 'stepPop 0.4s cubic-bezier(.2,1.3,.4,1)',
            '@keyframes stepPop': {
              '0%': { transform: 'scale(0.6)', opacity: 0 },
              '100%': { transform: 'scale(1)', opacity: 1 },
            },
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}
        >
          <Box
            component="svg"
            viewBox="0 0 52 52"
            sx={{ width: 104, height: 104, display: 'block' }}
          >
            <circle cx="26" cy="26" r="25" fill="#222C36" />
            <Box
              component="path"
              d="M15 27.5 L22.5 35 L38 18"
              fill="none"
              stroke="#d4bc7d"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              sx={{
                strokeDasharray: 36,
                strokeDashoffset: 36,
                animation: 'stepTick 0.35s 0.2s ease forwards',
                '@keyframes stepTick': { to: { strokeDashoffset: 0 } },
                '@media (prefers-reduced-motion: reduce)': { strokeDashoffset: 0, animation: 'none' },
              }}
            />
          </Box>
        </Box>
        <Typography variant="h5">{title}</Typography>
      </Box>
    </Box>
  )
}
