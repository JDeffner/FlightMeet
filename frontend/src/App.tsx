import './App.css'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { HomePage } from '@/pages/home/HomePage'
import { WeatherPage } from "@/pages/WeatherPage"

// BASE_URL is '/public/' in production builds and '/' in dev (see vite.config.ts).
const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

function App() {
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route
          path="/"
          element={
            <HomePage />
          }
        />
        <Route path="/weather" element={<WeatherPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
