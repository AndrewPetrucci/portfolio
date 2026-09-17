export type SocialLink = {
  label: string
  href: string
}

export type SkillGroup = {
  group: string
  items: string[]
}

export type Profile = {
  name: string
  title: string
  location: string
  email: string
  summary: string
  socials: SocialLink[]
  skills: SkillGroup[]
}

export type Project = {
  id: string
  title: string
  description: string
  tags: string[]
  href?: string
  repo?: string
}

export const profile: Profile = {
  name: 'Andrew Petrucci',
  title: 'Senior Front-End/Full-stack developer',
  location: 'Available for new work',
  email: 'andrewpetrucci@gmail.com',
  summary:
    'I build web applications with React and Node.js — from polished interfaces to the APIs that power them.',
  socials: [
    { label: 'GitHub', href: 'https://github.com/AndrewPetrucci' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/andrew-petrucci-97a14797/' },
    { label: 'Email', href: 'mailto:andrewpetrucci@gmail.com' },
  ],
  skills: [
    {
      group: 'Frontend',
      items: ['React', 'TypeScript', 'Vite', 'CSS'],
    },
    {
      group: 'Backend',
      items: ['Node.js', 'Express', 'REST APIs'],
    },
    {
      group: 'Tools',
      items: ['Git', 'npm', 'Playwright'],
    },
  ],
}

export const projects: Project[] = [
  {
    id: 'portfolio',
    title: 'This portfolio',
    description:
      'A React + Express starter with a public API for profile data, projects, and a contact form. Built to be customized and deployed as one Node app.',
    tags: ['React', 'Node.js', 'Express', 'TypeScript'],
    repo: 'https://github.com',
  },
  {
    id: 'api-service',
    title: 'API-backed project board',
    description:
      'Replace this card with a real project. The React client fetches work from GET /api/projects, so new pieces of work only need a data change on the server.',
    tags: ['REST', 'JSON', 'Vite'],
  },
  {
    id: 'contact-inbox',
    title: 'Contact inbox',
    description:
      'The contact section posts to /api/contact. Wire this endpoint to email or a database when you are ready to receive messages for real.',
    tags: ['Express', 'Forms'],
  },
  {
    id: 'design-system',
    title: 'Component library',
    description:
      'Placeholder for a shared UI kit — buttons, cards, and theme tokens that keep a React app visually consistent.',
    tags: ['React', 'TypeScript', 'CSS'],
  },
  {
    id: 'auth-service',
    title: 'Auth service',
    description:
      'Placeholder for signup, login, and session handling behind a small Express API. Swap this card for a real auth project.',
    tags: ['Node.js', 'Express', 'REST'],
  },
  {
    id: 'dashboard',
    title: 'Metrics dashboard',
    description:
      'Placeholder for a client that charts data from an API. Useful as a stand-in until you have a real analytics or admin view.',
    tags: ['React', 'Vite', 'JSON'],
  },
]
