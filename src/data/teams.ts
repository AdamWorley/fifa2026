// Maps the 48 World Cup 2026 country names (as they appear in the source data)
// to ISO 3166-1 alpha-2 codes. England/Scotland use GB subdivision flags.
const ISO_BY_NAME: Record<string, string> = {
  Mexico: 'MX',
  'South Africa': 'ZA',
  'South Korea': 'KR',
  'Czech Republic': 'CZ',
  Canada: 'CA',
  'Bosnia & Herzegovina': 'BA',
  Qatar: 'QA',
  Switzerland: 'CH',
  Brazil: 'BR',
  Morocco: 'MA',
  Haiti: 'HT',
  Scotland: 'GB-SCT',
  USA: 'US',
  Paraguay: 'PY',
  Australia: 'AU',
  Turkey: 'TR',
  Germany: 'DE',
  'Curaçao': 'CW',
  'Ivory Coast': 'CI',
  Ecuador: 'EC',
  Netherlands: 'NL',
  Japan: 'JP',
  Sweden: 'SE',
  Tunisia: 'TN',
  Belgium: 'BE',
  Egypt: 'EG',
  Iran: 'IR',
  'New Zealand': 'NZ',
  Spain: 'ES',
  'Cape Verde': 'CV',
  'Saudi Arabia': 'SA',
  Uruguay: 'UY',
  France: 'FR',
  Senegal: 'SN',
  Iraq: 'IQ',
  Norway: 'NO',
  Argentina: 'AR',
  Algeria: 'DZ',
  Austria: 'AT',
  Jordan: 'JO',
  Portugal: 'PT',
  'DR Congo': 'CD',
  Uzbekistan: 'UZ',
  Colombia: 'CO',
  England: 'GB-ENG',
  Croatia: 'HR',
  Ghana: 'GH',
  Panama: 'PA',
}

const SUBDIVISION_FLAGS: Record<string, string> = {
  'GB-ENG': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'GB-SCT': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
}

/** Convert a 2-letter ISO country code to its emoji flag. */
function isoToFlag(iso: string): string {
  if (SUBDIVISION_FLAGS[iso]) return SUBDIVISION_FLAGS[iso]
  return iso
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
}

export function isoForName(name: string): string | null {
  return ISO_BY_NAME[name] ?? null
}

export function flagForName(name: string): string {
  const iso = ISO_BY_NAME[name]
  return iso ? isoToFlag(iso) : '🏳️'
}
