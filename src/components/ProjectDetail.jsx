import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getProject, getProjects, urlFor } from '../lib/sanity'
import { projectsData } from '../data/projects'
import ProjectFloatingButtons from './ProjectFloatingButtons'
import './ProjectDetail.css'

export default function ProjectDetail() {
  const { slug } = useParams()
  const [project, setProject] = useState(null)
  const [allProjects, setAllProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        // Try to fetch from Sanity first
        const [projectData, allProjectsData] = await Promise.all([
          getProject(slug),
          getProjects()
        ])
        
        if (projectData) {
          setProject(projectData)
        } else {
          // Fallback to local data if not found in Sanity
          const localProject = projectsData[slug]
          setProject(localProject)
        }

        // Set all projects for navigation
        if (allProjectsData && allProjectsData.length > 0) {
          setAllProjects(allProjectsData)
        } else {
          setAllProjects(Object.values(projectsData))
        }
      } catch (error) {
        console.error('Error fetching project:', error)
        // Fallback to local data if Sanity fails
        const localProject = projectsData[slug]
        setProject(localProject)
        setAllProjects(Object.values(projectsData))
      } finally {
        setLoading(false)
      }
    }

    fetchData()
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
          <Link 
            to="/" 
            className="project-title"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <span className="project-bullet">•</span>
            {isHovered ? 'Exit' : project.title}
          </Link>
          <span className="project-year">{project.year}</span>
        </div>
        
        <div className={`project-description ${!project.metaCompany ? 'no-collaboration' : ''}`}>
          <p>{project.description}</p>
        </div>

        {project.metaCompany && (
          <div className="project-collaboration">
            <p>In collaboration with{' '}
              {(project.metaCompany === 'OpenPurpose' || project.metaCompany === 'OpenPurpose®') ? (
                <a href="https://openpurpose.com" target="_blank" rel="noopener noreferrer">
                  OpenPurpose<sup>®</sup>
                </a>
              ) : (
                project.metaCompany
              )}
            </p>
          </div>
        )}

        {project.externalUrl && (
          <div className="project-visit">
            <p>
              <a href={project.externalUrl} target="_blank" rel="noopener noreferrer">
                Visit {project.title}
              </a>
            </p>
          </div>
        )}
      </header>

      {project.media && project.media.length > 0 && (
        <div className="project-images">
          {project.media.map((item, index) => {
            console.log('Media item:', item); // Debug log
            return (
            <div key={index} className="project-image-container">
              {item._type === 'image' ? (
                <img
                  src={item.asset ? urlFor(item.asset).quality(100).url() : item.url}
                  alt={item.alt || project.title}
                  className="project-image"
                  loading="lazy"
                />
              ) : item._type === 'file' ? (
                <video
                  src={`https://cdn.sanity.io/files/acg1tvxx/production/${item.asset._ref.replace('file-', '').replace('-mp4', '.mp4')}`}
                  className="project-image"
                  autoPlay
                  loop
                  muted
                  playsInline
                  onError={(e) => console.error('Video error:', e)}
                  onLoadStart={() => console.log('Video loading started')}
                >
                  Your browser does not support the video tag.
                </video>
              ) : null}
            </div>
            )
          })}
        </div>
      )}
      
      <ProjectFloatingButtons currentProject={project} allProjects={allProjects} />
    </div>
  )
} 
