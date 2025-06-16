// =============================
// ProjectList.jsx - Projects Section
// =============================

import './ProjectList.css';

const projectGroups = [
  // Group 1: Plasticity, Azura, Fitag
  {
    projects: [
      { title: 'Plasticity', metaCompany: 'OpenPurpose', metaCompanyMobile: 'OP', year: '2025', type: 'internal' },
      { title: 'Azura', metaCompany: 'OpenPurpose', metaCompanyMobile: 'OP', year: '2024', type: 'internal' },
      { title: 'Fitag', year: '2025', type: 'internal' },
    ]
  },
  // Group 2: Bird, HCC, ScyAI
  {
    projects: [
      { title: 'Bird', metaCompany: 'OpenPurpose', metaCompanyMobile: 'OP', year: '2024', type: 'external' },
      { title: 'HCC', year: '2025', type: 'external' },
    ]
  },
  // Archive (special)
  {
    projects: [
      { title: 'Archive', year: 'Ongoing', muted: true, type: 'archive' },
    ]
  }
];

export default function ProjectList() {
  return (
    <div className="project-wrapper">
      {projectGroups.map((group, groupIndex) => (
        <ul key={groupIndex} className="project-list">
          {group.projects.map(({ title, metaCompany, metaCompanyMobile, year, muted, type }) => (
            <li
              key={title}
              className={`project-item project-${type}`}
            >
              <span className="project-title">{title}</span>
              {metaCompany && (
                <span className="project-meta">
                  with <span className="company-name company-desktop">{metaCompany}<sup>®</sup></span>
                  <span className="company-name company-mobile">{metaCompanyMobile}<sup>®</sup></span>
                </span>
              )}
              <span className={`project-year ${muted ? 'text-secondary' : ''}`}>{year}</span>
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
} 
