import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { DemoProvider } from './store'
import { SupabaseDataProvider } from './persistence/SupabaseDataProvider'
import { dataSource } from './persistence/dataSource'
import './styles.css'

const Provider = dataSource === 'supabase' ? SupabaseDataProvider : DemoProvider

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><Provider><App /></Provider></React.StrictMode>,
)
