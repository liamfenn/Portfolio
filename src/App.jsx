import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import HeadingIntro from './components/HeadingIntro'
import ProjectList from './components/ProjectList'
import ProjectDetail from './components/ProjectDetail'
import MusicPlayer from './components/MusicPlayer'

// =============================
//  Home Page Component
// =============================
function HomePage() {
  return (
    <div className="portfolio-root">
      <HeadingIntro />
      {/* =============================
          Project List Section
          ============================= */}
      <ProjectList />
    </div>
  )
}

// =============================
//  Main App with Routing
// =============================
function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/:slug" element={<ProjectDetail />} />
        </Routes>
        <MusicPlayer />
      </div>
    </Router>
  )
}

export default App
