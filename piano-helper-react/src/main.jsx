import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'

// Create a default theme instance
const theme = createTheme()

ReactDOM.createRoot(document.getElementById('root')).render(
  // <React.StrictMode> // <-- Temporarily remove StrictMode
    <ThemeProvider theme={theme}>
      <CssBaseline /> {/* Applies baseline styles */}
      <App />
    </ThemeProvider>
  // </React.StrictMode>, // <-- Temporarily remove StrictMode
)
