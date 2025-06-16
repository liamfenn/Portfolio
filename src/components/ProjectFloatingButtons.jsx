import { Link } from 'react-router-dom'
import './FloatingButtons.css'

export default function ProjectFloatingButtons({ currentProject, allProjects }) {
  if (!currentProject || !allProjects || allProjects.length === 0) {
    return null
  }

  // Filter out external projects for navigation
  const internalProjects = allProjects.filter(p => p.type === 'internal')
  
  if (internalProjects.length === 0) {
    return null
  }

  // Handle both Sanity data (slug.current) and local data (slug)
  const getCurrentSlug = (project) => project?.slug?.current || project?.slug
  const currentSlug = getCurrentSlug(currentProject)
  
  const currentIndex = internalProjects.findIndex(p => getCurrentSlug(p) === currentSlug)
  const prevProject = currentIndex > 0 ? internalProjects[currentIndex - 1] : internalProjects[internalProjects.length - 1]
  const nextProject = currentIndex < internalProjects.length - 1 ? internalProjects[currentIndex + 1] : internalProjects[0]

  const handleNavigation = () => {
    window.scrollTo(0, 0)
  }

  return (
    <div className="floating-buttons">
      <Link 
        to="/" 
        className="floating-button floating-button-light"
      >
        Exit
      </Link>
      <Link 
        to={`/${getCurrentSlug(prevProject)}`}
        className="floating-button floating-button-light"
        onClick={handleNavigation}
      >
        P
      </Link>
      <Link 
        to={`/${getCurrentSlug(nextProject)}`}
        className="floating-button floating-button-light"
        onClick={handleNavigation}
      >
        N
      </Link>
    </div>
  )
} 
