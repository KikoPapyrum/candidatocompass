import { createTheme } from '@mui/material/styles'

const ink = '#222C36'
const compassRed = '#e31837'

export const theme = createTheme({
  palette: {
    primary: { main: ink, contrastText: '#ffffff' },
    secondary: { main: compassRed },
    background: { default: '#eceae6', paper: '#ffffff' },
    text: { primary: ink, secondary: '#5c5854' },
  },
  shape: { borderRadius: 2 },
  typography: {
    fontFamily: '"Source Sans 3", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700, letterSpacing: '-0.02em' },
    h5: { fontWeight: 700, letterSpacing: '-0.02em', color: '#222C36' },
    h6: { fontWeight: 700 },
    button: { letterSpacing: '0.01em' },
  },
  components: {
    MuiAppBar: {
      styleOverrides: { root: { backgroundColor: '#222C36' } },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 700,
          borderRadius: 10,
          paddingLeft: 22,
          paddingRight: 22,
          boxShadow: 'none',
        },
        contained: {
          color: '#fff',
          backgroundColor: ink,
          backgroundImage: 'linear-gradient(180deg, #2e3c4a 0%, #222C36 100%)',
          boxShadow: '0 8px 18px rgba(34, 44, 54, 0.22)',
          '&:hover': {
            backgroundColor: ink,
            backgroundImage: 'linear-gradient(180deg, #3a4a5a 0%, #222C36 100%)',
            boxShadow: '0 8px 18px rgba(34, 44, 54, 0.28)',
          },
          '&.Mui-disabled': {
            color: '#fff',
            backgroundColor: '#c5c9ce',
            backgroundImage: 'none',
            boxShadow: 'none',
          },
        },
        outlined: {
          borderColor: '#e4e7ec',
          color: ink,
          backgroundColor: '#fff',
          '&:hover': { borderColor: '#cfd5dd', backgroundColor: '#f7f8fa' },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputLabel-root': {
            position: 'static',
            transform: 'none',
            marginBottom: '6px',
            fontSize: 14,
            fontWeight: 600,
            color: ink,
            '&.Mui-focused, &.Mui-error, &.MuiInputLabel-shrink': { transform: 'none', color: ink },
            '&.Mui-error': { color: '#d32f2f' },
          },
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: '#fff',
            '& fieldset': { borderColor: '#e6e9ee', top: 0 },
            '& fieldset legend': { display: 'none' },
            '&:hover fieldset': { borderColor: '#cfd5dd' },
            '&.Mui-focused fieldset': { borderColor: ink, borderWidth: 1.5 },
            '&.Mui-disabled': { backgroundColor: '#f4f6f8' },
          },
          '& .MuiOutlinedInput-input': { padding: '14px 16px' },
        },
      },
    },
    MuiLink: {
      styleOverrides: { root: { color: compassRed, fontWeight: 600 } },
    },
    MuiStepIcon: {
      styleOverrides: {
        root: {
          color: '#d4bc7d',
          '&.Mui-active': { color: '#d4bc7d' },
          '&.Mui-completed': { color: '#d4bc7d' },
        },
        text: { fill: '#ffffff', fontWeight: 700 },
      },
    },
  },
})
