import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'dark',
    background: { default: '#090d0f', paper: '#11181b' },
    primary: { main: '#66d9a7', contrastText: '#07110d' },
    secondary: { main: '#f1b95b' },
    success: { main: '#66d9a7' },
    warning: { main: '#f1b95b' },
    error: { main: '#ff776f' },
    text: { primary: '#eef4f1', secondary: '#91a09a' },
    divider: 'rgba(174, 195, 186, 0.14)',
  },
  typography: {
    fontFamily: '"IBM Plex Sans", sans-serif',
    h2: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600, letterSpacing: 0 },
    h3: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600, letterSpacing: 0 },
    h4: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600, letterSpacing: 0 },
    h5: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600, letterSpacing: 0 },
    h6: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600, letterSpacing: 0 },
    button: { fontWeight: 600, textTransform: 'none', letterSpacing: 0 },
    overline: { color: '#66d9a7', fontWeight: 600, letterSpacing: '0.12em' },
  },
  shape: { borderRadius: 6 },
  components: {
    MuiButton: { styleOverrides: { root: { minHeight: 42 } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
    MuiTableCell: { styleOverrides: { root: { borderColor: 'rgba(174, 195, 186, 0.12)' }, head: { color: '#91a09a', fontWeight: 600 } } },
  },
})
