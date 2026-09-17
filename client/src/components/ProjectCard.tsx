import type { Project } from '../types'

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="card">
      <h3>{project.title}</h3>
      <p>{project.description}</p>
      <ul className="tags">
        {project.tags.map((tag) => (
          <li key={tag}>{tag}</li>
        ))}
      </ul>
      <div className="card-links">
        {project.href && (
          <a href={project.href} target="_blank" rel="noreferrer">
            Live
          </a>
        )}
        {project.repo && (
          <a href={project.repo} target="_blank" rel="noreferrer">
            Code
          </a>
        )}
      </div>
    </article>
  )
}
