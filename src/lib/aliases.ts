import { slugify, TEAMS, type TeamId } from '../data/tournament'

const VALID = new Set(TEAMS.map((t) => t.id))

// Known spelling differences between the football API and our country names.
// Keys are slugified upstream names; values are our team ids.
const ALIASES: Record<string, TeamId> = {
  'korea-republic': 'south-korea',
  'south-korea': 'south-korea',
  usa: 'usa',
  'united-states': 'usa',
  'united-states-of-america': 'usa',
  czechia: 'czech-republic',
  'ir-iran': 'iran',
  'iran-islamic-republic-of': 'iran',
  turkiye: 'turkey',
  'cote-d-ivoire': 'ivory-coast',
  "cote-divoire": 'ivory-coast',
  'congo-dr': 'dr-congo',
  'dr-congo': 'dr-congo',
  'democratic-republic-of-congo': 'dr-congo',
  'cape-verde-islands': 'cape-verde',
  'bosnia-and-herzegovina': 'bosnia-and-herzegovina',
  curacao: 'curacao',
}

/** Resolve an upstream team name to our team id, or null if unknown. */
export function resolveTeamId(name: string): TeamId | null {
  if (!name) return null
  const slug = slugify(name)
  if (VALID.has(slug)) return slug
  return ALIASES[slug] ?? null
}
