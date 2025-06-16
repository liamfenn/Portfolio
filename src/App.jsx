import './App.css'
import HeadingIntro from './components/HeadingIntro'
import ProjectList from './components/ProjectList'
import MusicPlayer from './components/MusicPlayer'

// =============================
//  Main Portfolio Layout
// =============================
function App() {
  return (
    <div className="portfolio-root">
      <HeadingIntro />
      {/* =============================
          Project List Section
          ============================= */}
      <ProjectList />

      <MusicPlayer />
    </div>
  )
}

export default App
