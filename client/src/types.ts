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
