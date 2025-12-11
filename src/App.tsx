import { BrowserRouter, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "./components/theme-provider"
import { Home } from "./pages/home"
import { Post } from "./pages/post"
import { SlidesPage } from "./pages/slides"

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <BrowserRouter>
          <Routes>
            <Route path=":path/SLIDES.mdx" element={<SlidesPage />} />
            <Route path=":path/README.mdx" element={<Post />} />
            <Route path="/*" element={<Home />} />
          </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
