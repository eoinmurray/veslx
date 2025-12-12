import { BrowserRouter, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "./components/theme-provider"
import { ContentRouter } from "./pages/content-router"

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <BrowserRouter>
          <Routes>
            {/* Single catch-all route - ContentRouter determines page type */}
            <Route path="/*" element={<ContentRouter />} />
          </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
