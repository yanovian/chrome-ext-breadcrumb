import { GITHUB_URL } from '../site-meta';

export {
  CHROME_STORE_URL,
  GITHUB_URL,
  POUYAN_RAZIAN_NAME,
  POUYAN_RAZIAN_URL,
  SITE_NAME,
  SITE_URL,
  YANOVIAN_LLC_NAME,
  YANOVIAN_LLC_URL,
} from '../site-meta';

export const PRIVACY_PATH = 'privacy';

export const TERMS_PATH = 'terms';

export const PRIVACY_REPO_URL = `${GITHUB_URL}/blob/master/PRIVACY.md`;

export const TERMS_REPO_URL = `${GITHUB_URL}/blob/master/TERMS.md`;

/** How long each hero screenshot stays visible (ms). */
export const HERO_SCENE_MS = 7_000;

/** Crossfade between hero screenshots (ms). */
export const HERO_TRANSITION_MS = 600;

export const heroSceneDefs = [
  { id: 'save', key: 'Save', image: 'screenshots/screenshot-1.jpg' },
  { id: 'search', key: 'Search', image: 'screenshots/screenshot-2.jpg' },
  { id: 'library', key: 'Library', image: 'screenshots/screenshot-3.jpg' },
  { id: 'timeline', key: 'Timeline', image: 'screenshots/screenshot-4.jpg' },
] as const;

export const featureDefs = [
  { id: 'capture', key: 'Capture', image: 'screenshots/screenshot-1.jpg' },
  { id: 'search', key: 'Search', image: 'screenshots/screenshot-2.jpg' },
  { id: 'ondevice', key: 'OnDevice', image: 'screenshots/screenshot-2.jpg' },
  { id: 'similar', key: 'Similar', image: 'screenshots/screenshot-3.jpg' },
  { id: 'timeline', key: 'Timeline', image: 'screenshots/screenshot-4.jpg' },
  { id: 'topics', key: 'Topics', image: 'screenshots/screenshot-4.jpg' },
] as const;

export const privacyPointKeys = [
  'privacyPoint1',
  'privacyPoint2',
  'privacyPoint3',
  'privacyPoint4',
] as const;

export const topicDefs = [
  { key: 'Aws', tone: 'amber' },
  { key: 'K8s', tone: 'teal' },
  { key: 'Ai', tone: 'violet' },
  { key: 'Rust', tone: 'rust' },
] as const;
