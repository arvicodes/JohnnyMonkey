/** Darstellung wie Word-Vorlage „Protokoll Vorstandssitzung“ (KeinLeerraum, Tabs, Blocksatz). */
import { RICH_TEXT_EDITOR_FONT_FAMILY } from '../../lib/richTextEditorFont';
import { VEREIN_PROTOKOLL_LOGO_WIDTH } from './vereinProtokollAssets';

export const velProtokollDisplaySx = {
  '& .vel-protokoll': {
    fontFamily: RICH_TEXT_EDITOR_FONT_FAMILY,
    fontSize: '11pt',
    lineHeight: 1,
    color: '#000',
    maxWidth: '100%',
    mx: 'auto',
    position: 'relative',
    pt: '0.4cm',
  },
  '& .vel-protokoll .proto-p': {
    m: 0,
    mb: 0,
    textAlign: 'justify',
    lineHeight: 1,
  },
  '& .vel-protokoll .proto-empty': {
    minHeight: '12pt',
    lineHeight: 1,
  },
  '& .vel-protokoll .proto-center': {
    textAlign: 'center',
  },
  '& .vel-protokoll .proto-meta': {
    fontSize: '20pt',
    textAlign: 'center',
    lineHeight: 1.15,
  },
  '& .vel-protokoll .proto-meta + .proto-meta': {
    fontSize: '11pt',
  },
  '& .vel-protokoll .proto-logo': {
    position: 'absolute',
    left: '2.8cm',
    top: '0.55cm',
    textAlign: 'left',
    m: 0,
    mb: 0,
    lineHeight: 0,
    zIndex: 1,
  },
  '& .vel-protokoll .proto-logo img, & .vel-protokoll img[data-protokoll-logo]': {
    display: 'block',
    width: VEREIN_PROTOKOLL_LOGO_WIDTH,
    maxWidth: VEREIN_PROTOKOLL_LOGO_WIDTH,
    height: 'auto',
    borderRadius: 0,
    m: 0,
  },
  '& .vel-protokoll .proto-header-title': {
    textAlign: 'center',
    fontWeight: 700,
    fontSize: '18pt',
    lineHeight: 1.15,
    m: 0,
    mb: 0,
    minHeight: '2.35cm',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  '& .vel-protokoll .proto-header-title strong': {
    fontWeight: 700,
  },
  '& .vel-protokoll .proto-top': {
    fontSize: '14pt',
    fontWeight: 700,
    textAlign: 'justify',
  },
  '& .vel-protokoll .proto-top strong': {
    fontWeight: 700,
  },
  '& .vel-protokoll .proto-label strong': {
    fontWeight: 700,
  },
  '& .vel-protokoll .proto-tab': {
    display: 'inline-block',
    width: '1.27cm',
    minHeight: '1em',
    verticalAlign: 'baseline',
  },
  '& .vel-protokoll .proto-indent': {
    textAlign: 'justify',
  },
  '& .vel-protokoll .proto-list': {
    m: 0,
    pl: '1.27cm',
    listStyleType: 'disc',
    textAlign: 'justify',
  },
  '& .vel-protokoll .proto-list li': {
    m: 0,
    mb: 0,
    pl: '0.25cm',
    lineHeight: 1,
  },
  '& .vel-protokoll .proto-signatur': {
    fontStyle: 'italic',
    textAlign: 'justify',
  },
  '& .vel-protokoll .proto-signatur em': {
    fontStyle: 'italic',
  },
} as const;
