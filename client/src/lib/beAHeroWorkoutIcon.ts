import type { SvgIconComponent } from '@mui/icons-material';
import {
  DirectionsBike,
  DirectionsRun,
  EmojiEvents,
  FitnessCenter,
  FlashOn,
  Groups,
  NightlightRound,
  Park,
  Pool,
  RocketLaunch,
  SelfImprovement,
  SportsGymnastics,
  SportsMartialArts,
  SportsSoccer,
  Star,
  Terrain,
  WbSunny,
  Whatshot,
  CircleOutlined,
  Deck,
  AutoAwesome,
} from '@mui/icons-material';

export type BeAHeroWorkoutIconMeta = {
  Icon: SvgIconComponent | null;
  initials: string;
  color: string;
};

type IconRule = {
  pattern: RegExp;
  Icon: SvgIconComponent;
  color: string;
};

const ICON_TINTS = ['#1976d2', '#ed6c02', '#2e7d32', '#7b1fa2', '#0288d1', '#c62828'] as const;

/** Spezifische Regeln zuerst — nur klare Fitness-/Bewegungsbegriffe (DE/EN). */
const WORKOUT_ICON_RULES: IconRule[] = [
  { pattern: /\b(kartenlesen|kartelesen|karte.?lesen|orakel|tarot|lenormand|wahrsag)\b/i, Icon: AutoAwesome, color: '#7b1fa2' },
  { pattern: /\b(kartelegen|kartenlegen|karte.?legen|karten.?legen|maumau|mau.?mau|kartenspiel|spielkarten|spielkarte|skat|canasta|uno)\b/i, Icon: Deck, color: '#5e35b1' },
  { pattern: /\b(zirkel|kreis|circle)\b/i, Icon: CircleOutlined, color: '#00838f' },
  { pattern: /\b(hero|held|superheld|legende|champion|be a hero)\b/i, Icon: EmojiEvents, color: '#1976d2' },
  { pattern: /\b(lauf|jog|run|sprint|marathon|wandern|trail|ausdauerlauf)\b/i, Icon: DirectionsRun, color: '#ed6c02' },
  { pattern: /\b(yoga|pilates|dehn|stretch|meditation|achtsam)\b/i, Icon: SelfImprovement, color: '#7b1fa2' },
  { pattern: /\b(kraft|strength|muskel|liegest|push.?up|hantel|bankdr|gewichtheb)\b/i, Icon: FitnessCenter, color: '#c62828' },
  { pattern: /\b(boxen|kickbox|karate|judo|kampfsport|fight)\b/i, Icon: SportsMartialArts, color: '#5d4037' },
  { pattern: /\b(fahrrad|radfahr|spinning|bike|cycle|cycling)\b/i, Icon: DirectionsBike, color: '#0288d1' },
  { pattern: /\b(schwimm|swim|aqua|pool)\b/i, Icon: Pool, color: '#0277bd' },
  { pattern: /\b(tanz|dance|zumba|aerobic)\b/i, Icon: SportsGymnastics, color: '#ad1457' },
  { pattern: /\b(spring|jump|huepf|hüpf|jumping.?jack|turnen|gymnast)\b/i, Icon: SportsGymnastics, color: '#6a1b9a' },
  { pattern: /\b(hiit|intervall|cardio|tabata|schnell|tempo)\b/i, Icon: FlashOn, color: '#ef6c00' },
  { pattern: /\b(feuer|burn|intens|explos|power.?hour)\b/i, Icon: Whatshot, color: '#e65100' },
  { pattern: /\b(warm.?up|aufwarm|morgen|morning|frueh|früh)\b/i, Icon: WbSunny, color: '#f9a825' },
  { pattern: /\b(cool.?down|entspann|relax|abend|evening|schlaf)\b/i, Icon: NightlightRound, color: '#3949ab' },
  { pattern: /\b(outdoor|park|natur|wald|garten|frischluft)\b/i, Icon: Park, color: '#2e7d32' },
  { pattern: /\b(berg|klettern|climb|boulder|wand)\b/i, Icon: Terrain, color: '#558b2f' },
  { pattern: /\b(team|gruppe|klasse|gemeinsam|crew|squad)\b/i, Icon: Groups, color: '#00838f' },
  { pattern: /\b(sieg|meister|trophy|pokal|challenge|turnier)\b/i, Icon: EmojiEvents, color: '#f9a825' },
  { pattern: /\b(rakete|rocket|boost|launch|start)\b/i, Icon: RocketLaunch, color: '#1565c0' },
  { pattern: /\b(stern|star|glanz|highlight)\b/i, Icon: Star, color: '#fbc02d' },
  { pattern: /\b(fussball|fußball|soccer|handball|ball)\b/i, Icon: SportsSoccer, color: '#2e7d32' },
  { pattern: /\b(ganzkoerper|ganzkörper|workout|training|sport|bewegung|fitness|station)\b/i, Icon: FitnessCenter, color: '#1976d2' },
];

function normalizeWorkoutName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss');
}

function hashWorkoutName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function beAHeroWorkoutInitials(name: string): string {
  const parts = name
    .trim()
    .split(/[\s\-–—·/]+/)
    .map((part) => part.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, ''))
    .filter(Boolean);

  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    const word = parts[0];
    if (/^\d+$/.test(word)) return `#${word.slice(0, 2)}`;
    return word.slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export function beAHeroWorkoutIconMeta(name: string): BeAHeroWorkoutIconMeta {
  const normalized = normalizeWorkoutName(name);
  const initials = beAHeroWorkoutInitials(name);
  const fallbackColor = ICON_TINTS[hashWorkoutName(normalized || initials) % ICON_TINTS.length];

  if (!normalized) {
    return { Icon: FitnessCenter, initials, color: ICON_TINTS[0] };
  }

  for (const { pattern, Icon, color } of WORKOUT_ICON_RULES) {
    if (pattern.test(normalized)) {
      return { Icon, initials, color };
    }
  }

  return { Icon: null, initials, color: fallbackColor };
}
