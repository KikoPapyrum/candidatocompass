import { createTheme } from '@mui/material/styles'

const ink = '#1a1a1a'
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
    h5: { fontWeight: 700, letterSpacing: '-0.02em' },
    h6: { fontWeight: 700 },
    button: { letterSpacing: '0.01em' },
  },
  components: {
    MuiAppBar: {
      styleOverrides: { root: { backgroundColor: '#111111' } },
    },
    MuiButton: {
      styleOverrides: { root: { textTransform: 'none', fontWeight: 700, borderRadius: 2 } },
    },
    MuiLink: {
      styleOverrides: { root: { color: compassRed, fontWeight: 600 } },
    },
    MuiStepIcon: {
      styleOverrides: {
        root: {
          '&.Mui-active': { color: compassRed },
          '&.Mui-completed': { color: ink },
        },
      },
    },
  },
})
