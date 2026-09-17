import { useEffect, useState, type FormEvent } from 'react'
import { getProfile, getProjects, sendMessage } from './api'
import { Carousel } from './components/Carousel'
import { ProjectCard } from './components/ProjectCard'
import { ThemeSettings } from './components/ThemeSettings'
import type { Profile, Project } from './types'
import './App.css'

function App() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loadError, setLoadError] = useState('')
  const [status, setStatus] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    Promise.all([getProfile(), getProjects()])
      .then(([nextProfile, nextProjects]) => {
        setProfile(nextProfile)
        setProjects(nextProjects)
      })
      .catch(() => {
        setLoadError('Could not reach the API. Start the server with npm run dev.')
      })
  }, [])

  async function handleContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)

    setSending(true)
    setStatus('')

    try {
      const result = await sendMessage({
        name: String(data.get('name') ?? ''),
        email: String(data.get('email') ?? ''),
        message: String(data.get('message') ?? ''),
      })
      setStatus(result.message)
      form.reset()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not send the message.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="page">
      <header className="nav">
        <a className="mark" href="#top">
          AP
        </a>
        <div className="nav-end">
          <nav className="nav-links">
            <a href="#work">Work</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
          </nav>
          <ThemeSettings />
        </div>
      </header>

      {loadError && <p className="banner">{loadError}</p>}

      <main id="top">
        <section className="hero">
          <p className="eyebrow">{profile?.title ?? 'Full-stack developer'}</p>
          <h1>{profile?.name ?? 'Andrew Petrucci'}</h1>
          <p className="lede">
            {profile?.summary ??
              'A React and Node.js portfolio you can run locally and customize.'}
          </p>
          <div className="actions">
            <a className="button" href="#work">
              See work
            </a>
            <a className="button ghost" href="#contact">
              Get in touch
            </a>
          </div>
        </section>

        <section id="work" className="section">
          <div className="section-head">
            <h2>Selected work</h2>
            <p>
              Loaded from the Express API at <code>/api/projects</code>.
            </p>
          </div>
          <Carousel>
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </Carousel>
        </section>

        <section id="about" className="section">
          <div className="section-head">
            <h2>About</h2>
            <p>{profile?.location}</p>
          </div>
          <div className="skills">
            {profile?.skills.map((group) => (
              <div key={group.group}>
                <h3>{group.group}</h3>
                <ul>
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section id="contact" className="section">
          <div className="section-head">
            <h2>Contact</h2>
            <p>
              Messages post to <code>/api/contact</code> and are logged by the Node
              server.
            </p>
          </div>
          <form className="contact" onSubmit={handleContact}>
            <label>
              Name
              <input name="name" type="text" autoComplete="name" required minLength={2} />
            </label>
            <label>
              Email
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label>
              Message
              <textarea name="message" rows={5} required minLength={10} />
            </label>
            <button className="button" type="submit" disabled={sending}>
              {sending ? 'Sending…' : 'Send message'}
            </button>
            {status && <p className="status">{status}</p>}
          </form>
        </section>
      </main>

      <footer className="footer">
        <p>
          {profile?.name ?? 'Andrew Petrucci'} · React + Node.js
        </p>
        <div className="socials">
          {profile?.socials.map((social) => (
            <a key={social.label} href={social.href} target="_blank" rel="noreferrer">
              {social.label}
            </a>
          ))}
        </div>
      </footer>
    </div>
  )
}

export default App
