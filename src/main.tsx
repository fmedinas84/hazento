import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { DemoProvider } from './store'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><DemoProvider><App /></DemoProvider></React.StrictMode>,
)
