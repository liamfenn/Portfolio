import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getProject, urlFor } from '../lib/sanity'
import { projectsData } from '../data/projects'
import './ProjectDetail.css'

export default function ProjectDetail() {
  const { slug } = useParams()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProject() {
      try {
        // Try to fetch from Sanity first
        const projectData = await getProject(slug)
        if (projectData) {
          setProject(projectData)
        } else {
          // Fallback to local data if not found in Sanity
          const localProject = projectsData[slug]
          setProject(localProject)
        }
      } catch (error) {
        console.error('Error fetching project:', error)
        // Fallback to local data if Sanity fails
        const localProject = projectsData[slug]
        setProject(localProject)
      } finally {
        setLoading(false)
      }
    }

    fetchProject()
  }, [slug])

  if (loading) {
    return <div className="project-detail-loading">Loading...</div>
  }

  if (!project) {
    return <div className="project-detail-error">Project not found</div>
  }

  return (
    <div className="project-detail">
      <header className="project-header">
        <div className="project-title-section">
          <h1 className="project-title">
            <span className="project-bullet">•</span>
            {project.title}
          </h1>
          <span className="project-year">{project.year}</span>
        </div>
        
        <div className="project-description">
          <p>{project.description}</p>
        </div>

        {project.tags && project.tags.length > 0 && (
          <div className="project-tags">
            {project.tags.map((tag, index) => (
              <span key={index} className="project-tag">{tag}</span>
            ))}
          </div>
        )}
      </header>

      {project.images && project.images.length > 0 && (
        <div className="project-images">
          {project.images.map((image, index) => (
            <div key={index} className="project-image-container">
              <img
                src={image.asset ? urlFor(image.asset).quality(100).url() : image.url}
                alt={image.alt || project.title}
                className="project-image"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 
