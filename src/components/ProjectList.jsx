// =============================
// ProjectList.jsx - Projects Section
// =============================

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getProjects } from '../lib/sanity'
import './ProjectList.css'

// Temporary hardcoded data until Sanity CORS is configured
const fallbackProjects = [
  { title: 'Plasticity', metaCompany: 'OpenPurpose', metaCompanyMobile: 'OP', year: '2025', type: 'internal', slug: { current: 'plasticity' } },
  { title: 'Azura', metaCompany: 'OpenPurpose', metaCompanyMobile: 'OP', year: '2024', type: 'internal', slug: { current: 'azura' } },
  { title: 'Fitag', year: '2025', type: 'internal', slug: { current: 'fitag' } },
  { title: 'Bird', metaCompany: 'OpenPurpose', metaCompanyMobile: 'OP', year: '2024', type: 'external', externalUrl: 'https://bird.com' },
  { title: 'HCC', year: '2025', type: 'external', externalUrl: 'https://humanchemical.com' },
  { title: 'Archive', year: 'Ongoing', type: 'archive' },
]

export default function ProjectList() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProjects() {
      try {
        const projectsData = await getProjects()
        if (projectsData && projectsData.length > 0) {
          setProjects(projectsData)
        } else {
          // Use fallback data if no projects in Sanity yet
          setProjects(fallbackProjects)
        }
      } catch (error) {
        console.error('Error fetching projects:', error)
        // Use fallback data if Sanity fails
        setProjects(fallbackProjects)
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [])

  // Group projects by type for display
  const groupProjects = (projects) => {
    const internal = projects.filter(p => p.type === 'internal')
    const external = projects.filter(p => p.type === 'external')
    const archive = projects.filter(p => p.type === 'archive')

    const groups = []
    
    // Group 1: Internal projects (Plasticity, Azura, Fitag)
    if (internal.length > 0) {
      groups.push({ projects: internal })
    }
    
    // Group 2: External projects (Bird, HCC)
    if (external.length > 0) {
      groups.push({ projects: external })
    }
    
    // Archive group
    if (archive.length > 0) {
      groups.push({ projects: archive })
    }

    return groups
  }

  if (loading) {
    return <div className="project-wrapper">Loading projects...</div>
  }

  const projectGroups = groupProjects(projects)

  return (
    <div className="project-wrapper">
      {projectGroups.map((group, groupIndex) => (
        <ul key={groupIndex} className="project-list">
          {group.projects.map(({ title, metaCompany, metaCompanyMobile, year, type, externalUrl, slug }) => (
            <li
              key={title}
              className={`project-item project-${type}`}
            >
              {type === 'external' ? (
                <a 
                  href={externalUrl || (title === 'Bird' ? 'https://bird.com' : 'https://humanchemical.com')} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="project-link"
                >
                  <span className="project-title">{title}</span>
                  {metaCompany && (
                    <span className="project-meta">
                      with <span className="company-name company-desktop">{metaCompany}<sup>®</sup></span>
                      <span className="company-name company-mobile">{metaCompanyMobile}<sup>®</sup></span>
                    </span>
                  )}
                  <span className="project-year">{year}</span>
                </a>
              ) : type === 'archive' ? (
                <Link to={`/${slug?.current || title.toLowerCase()}`} className="project-link">
                  <span className="project-title">{title}</span>
                  <span className="project-year text-secondary">{year}</span>
                </Link>
              ) : (
                <Link to={`/${slug?.current || title.toLowerCase()}`} className="project-link">
                  <span className="project-title">{title}</span>
                  {metaCompany && (
                    <span className="project-meta">
                      with <span className="company-name company-desktop">{metaCompany}<sup>®</sup></span>
                      <span className="company-name company-mobile">{metaCompanyMobile}<sup>®</sup></span>
                    </span>
                  )}
                  <span className="project-year">{year}</span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      ))}
    </div>
  )
} 
