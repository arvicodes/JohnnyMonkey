/**
 * Laptop-/Review-Folie: rein statische Anzeige.
 * Keine Hooks, keine Effects, kein contentEditable, kein shared Editor-Baum.
 * Dadurch keine „Too many re-renders“-Schleifen aus RichZone/Select/Overlay.
 */
import React from 'react';
import {
  normalizeSlide,
  PresentationSlide,
  PresentationSlideFooter,
  SlideElement,
  SLIDE_REF_HEIGHT,
  SLIDE_REF_WIDTH,
  slideImageUrl,
  textToHtml,
} from '../../lib/presentationDeck';
import { JOHNNY_PRESENTATION, accentGradient } from '../../lib/presentationTheme';
import {
  normalizeSlideFooter,
  SLIDE_FOOTER_HEIGHT,
} from '../../lib/presentationSlideFooter';
import { sanitizePresentationHtml } from '../../lib/presentationRichText';
import { getElementStackLayer } from '../../lib/presentationElementLayers';
import { slideHasImageHeroLayout } from '../../lib/presentationImageUtils';
import { slideHasFullscreenMedia } from '../../lib/presentationMediaEmbed';
import { hydratePresentationHtmlFontSizes, PRESENTATION_CONTENT_FONT_PX } from '../../lib/presentationFontSize';
import { SlideShapeSvg } from '../../lib/presentationSlideShapes';
import '../../styles/presentationLists.css';

type ZoneVariant = 'title' | 'hero' | 'subtitle' | 'body' | 'quote' | 'caption';

const VARIANT_FONT: Record<ZoneVariant, number> = {
  title: 42,
  hero: 64,
  subtitle: 28,
  body: PRESENTATION_CONTENT_FONT_PX,
  quote: 34,
  caption: 16,
};

function isEmptyHtml(html: string): boolean {
  const t = html.trim();
  return !t || t === '<p></p>' || t === '<p><br></p>';
}

function StaticHtml({
  html,
  plain,
  scale,
  variant,
  align = 'left',
  italic = false,
}: {
  html?: string;
  plain?: string;
  scale: number;
  variant: ZoneVariant;
  align?: 'left' | 'center' | 'right';
  italic?: boolean;
}) {
  const display = sanitizePresentationHtml(html || textToHtml(plain || ''));
  if (isEmptyHtml(display)) return null;
  const base = VARIANT_FONT[variant] * scale;
  return (
    <div
      data-pres-rich-zone
      style={{
        fontSize: `${base}px`,
        lineHeight: variant === 'title' || variant === 'hero' ? 1.15 : 1.55,
        fontWeight: variant === 'title' || variant === 'hero' ? 700 : 400,
        fontStyle: italic ? 'italic' : 'normal',
        textAlign: align,
        width: '100%',
        minWidth: 0,
        wordBreak: 'break-word',
        overflow: 'hidden',
        color: '#424242',
      }}
      dangerouslySetInnerHTML={{ __html: display }}
    />
  );
}

function StaticElement({ el, scale }: { el: SlideElement; scale: number }) {
  if (el.type === 'image') {
    if (!el.src?.trim()) return null;
    const url = slideImageUrl(el.src);
    return (
      <div
        style={{
          position: 'absolute',
          left: `${el.x}%`,
          top: `${el.y}%`,
          width: `${el.w}%`,
          height: `${el.h}%`,
          zIndex: 10 + (el.zIndex || 0),
          overflow: 'hidden',
          boxSizing: 'border-box',
          pointerEvents: 'none',
        }}
      >
        <img
          src={url}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: el.imageFit === 'cover' ? 'cover' : 'contain',
            objectPosition: el.imageObjectPosition || '50% 50%',
            display: 'block',
            background: 'transparent',
          }}
        />
      </div>
    );
  }

  if (el.type === 'text') {
    const display = hydratePresentationHtmlFontSizes(sanitizePresentationHtml(el.html || '<p></p>'));
    if (isEmptyHtml(display)) return null;
    return (
      <div
        style={{
          position: 'absolute',
          left: `${el.x}%`,
          top: `${el.y}%`,
          width: `${el.w}%`,
          height: `${el.h}%`,
          zIndex: 10 + (el.zIndex || 0),
          overflow: 'hidden',
          boxSizing: 'border-box',
          pointerEvents: 'none',
          fontSize: `${PRESENTATION_CONTENT_FONT_PX * scale}px`,
          lineHeight: 1.4,
          color: '#424242',
          background: el.fillColor || 'transparent',
          padding: `${8 * scale}px`,
          borderRadius: `${6 * scale}px`,
          boxShadow: el.strokeColor
            ? `inset 0 0 0 ${Math.max(1, (el.strokeWidth || 2) * scale)}px ${el.strokeColor}`
            : undefined,
        }}
        dangerouslySetInnerHTML={{ __html: display }}
      />
    );
  }

  if (el.type === 'shape') {
    return (
      <div
        style={{
          position: 'absolute',
          left: `${el.x}%`,
          top: `${el.y}%`,
          width: `${el.w}%`,
          height: `${el.h}%`,
          zIndex: 10 + (el.zIndex || 0),
          overflow: 'visible',
          boxSizing: 'border-box',
          pointerEvents: 'none',
        }}
      >
        <SlideShapeSvg
          kind={el.shapeKind || 'arrow'}
          strokeColor={el.strokeColor}
          fillColor={el.fillColor}
          strokeWidth={el.strokeWidth ?? 3}
        />
      </div>
    );
  }

  // video/embed: only show a quiet placeholder in laptop mode
  if ((el.type === 'video' || el.type === 'embed') && el.src?.trim()) {
    return (
      <div
        style={{
          position: 'absolute',
          left: `${el.x}%`,
          top: `${el.y}%`,
          width: `${el.w}%`,
          height: `${el.h}%`,
          zIndex: 10 + (el.zIndex || 0),
          background: '#111',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: `${14 * scale}px`,
          pointerEvents: 'none',
        }}
      >
        {el.type === 'video' ? 'Video' : 'Medien'}
      </div>
    );
  }

  return null;
}

export interface PresentationLaptopSlideProps {
  slide: PresentationSlide;
  scale?: number;
  showLogo?: boolean;
  showShadow?: boolean;
  showSlideNumbers?: boolean;
  slideNumber?: number;
  slideTotal?: number;
  showSlideFooter?: boolean;
  slideFooter?: PresentationSlideFooter;
  deckTitle?: string;
  lessonPath?: string;
}

const PresentationLaptopSlide: React.FC<PresentationLaptopSlideProps> = ({
  slide: rawSlide,
  scale = 1,
  showLogo = true,
  showShadow = true,
  showSlideNumbers = false,
  slideNumber = 0,
  slideTotal = 0,
  showSlideFooter = false,
  slideFooter,
  deckTitle = '',
  lessonPath = '',
}) => {
  const slide = normalizeSlide(rawSlide);
  const w = SLIDE_REF_WIDTH * scale;
  const h = SLIDE_REF_HEIGHT * scale;
  const accent = slide.accentColor || JOHNNY_PRESENTATION.primary;
  const align = slide.titleAlign || 'left';
  const footerOn = showSlideFooter;
  const footer = normalizeSlideFooter(slideFooter, deckTitle, lessonPath);
  const footerHeight = footerOn ? SLIDE_FOOTER_HEIGHT * scale : 0;
  const slideNumberLabel =
    slideNumber > 0
      ? slideTotal > 0
        ? `${slideNumber} / ${slideTotal}`
        : String(slideNumber)
      : '';
  const showFooterNumbers = footerOn && slideNumberLabel.length > 0;
  const showStandaloneNumbers = !footerOn && showSlideNumbers && slideNumberLabel.length > 0;
  const fullscreenMedia = slideHasFullscreenMedia(slide);
  const imageHeroLayout = slideHasImageHeroLayout(slide);
  const hideBlankContent = fullscreenMedia || imageHeroLayout;

  const backgroundElements = (slide.elements || []).filter(
    (el) => getElementStackLayer(el) === 'background',
  );
  const foregroundElements = (slide.elements || []).filter(
    (el) => getElementStackLayer(el) !== 'background',
  );

  const zone = (
    html: string | undefined,
    plain: string | undefined,
    variant: ZoneVariant,
    opts: { align?: 'left' | 'center' | 'right'; italic?: boolean } = {},
  ) => (
    <StaticHtml
      html={html}
      plain={plain}
      scale={scale}
      variant={variant}
      align={opts.align || align}
      italic={opts.italic}
    />
  );

  const layoutImage = () => {
    const url = slideImageUrl(slide.imagePath || '');
    if (!url && !slide.imageCaptionHtml && !slide.imageCaption) return null;
    return (
      <div
        style={{
          flex: '0 0 42%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: `${8 * scale}px`,
        }}
      >
        {url ? (
          <img
            src={url}
            alt=""
            style={{
              maxWidth: '100%',
              maxHeight: `${420 * scale}px`,
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              display: 'block',
              background: 'transparent',
            }}
          />
        ) : null}
        {zone(slide.imageCaptionHtml, slide.imageCaption, 'caption', { align: 'center' })}
      </div>
    );
  };

  let content: React.ReactNode = null;
  switch (slide.layout) {
    case 'title-slide':
      content = (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: `0 ${80 * scale}px`,
            gap: `${20 * scale}px`,
          }}
        >
          <div style={{ width: '100%', textAlign: 'center' }}>
            {zone(slide.titleHtml, slide.title, 'hero', { align: 'center' })}
          </div>
          {zone(slide.bodyHtml, slide.body, 'body', { align: 'center' })}
        </div>
      );
      break;
    case 'section':
      content = (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: `0 ${96 * scale}px`,
          }}
        >
          <div
            style={{
              borderLeft: `${6 * scale}px solid ${accent}`,
              paddingLeft: `${32 * scale}px`,
              width: '100%',
            }}
          >
            {zone(slide.titleHtml, slide.title, 'title')}
            {zone(slide.subtitleHtml, slide.subtitle, 'subtitle')}
          </div>
        </div>
      );
      break;
    case 'two-column':
      content = (
        <>
          <div style={{ marginBottom: `${28 * scale}px` }}>
            {zone(slide.titleHtml, slide.title, 'title')}
          </div>
          <div style={{ display: 'flex', gap: `${40 * scale}px`, flex: 1, minHeight: 0 }}>
            <div style={{ flex: 1, minHeight: 0 }}>
              {zone(slide.bodyLeftHtml, slide.bodyLeft, 'body')}
            </div>
            <div style={{ width: `${2 * scale}px`, background: `${accent}44`, flexShrink: 0 }} />
            <div style={{ flex: 1, minHeight: 0 }}>
              {zone(slide.bodyRightHtml, slide.bodyRight, 'body')}
            </div>
          </div>
        </>
      );
      break;
    case 'image-right':
      content = (
        <>
          <div style={{ marginBottom: `${24 * scale}px` }}>
            {zone(slide.titleHtml, slide.title, 'title')}
          </div>
          <div style={{ display: 'flex', gap: `${36 * scale}px`, flex: 1, minHeight: 0 }}>
            <div style={{ flex: 1, minHeight: 0 }}>{zone(slide.bodyHtml, slide.body, 'body')}</div>
            {layoutImage()}
          </div>
        </>
      );
      break;
    case 'image-left':
      content = (
        <>
          <div style={{ marginBottom: `${24 * scale}px` }}>
            {zone(slide.titleHtml, slide.title, 'title')}
          </div>
          <div style={{ display: 'flex', gap: `${36 * scale}px`, flex: 1, minHeight: 0 }}>
            {layoutImage()}
            <div style={{ flex: 1, minHeight: 0 }}>{zone(slide.bodyHtml, slide.body, 'body')}</div>
          </div>
        </>
      );
      break;
    case 'quote':
      content = (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: `0 ${120 * scale}px`,
          }}
        >
          <div style={{ fontSize: `${96 * scale}px`, color: `${accent}55`, lineHeight: 0.8 }}>
            „
          </div>
          {zone(slide.bodyHtml, slide.body, 'body', { align: 'center', italic: true })}
          <div style={{ marginTop: `${24 * scale}px`, width: '100%' }}>
            {zone(slide.subtitleHtml, slide.subtitle, 'caption', { align: 'center' })}
          </div>
        </div>
      );
      break;
    case 'blank':
      content = hideBlankContent ? null : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {zone(slide.bodyHtml, slide.body, 'body')}
        </div>
      );
      break;
    default:
      content = (
        <>
          <div style={{ marginBottom: `${24 * scale}px` }}>
            {zone(slide.titleHtml, slide.title, 'title')}
          </div>
          {zone(slide.bodyHtml, slide.body, 'body')}
        </>
      );
  }

  return (
    <div
      data-pres-slide
      data-pres-laptop-slide
      style={{
        width: w,
        height: h,
        background: JOHNNY_PRESENTATION.slideBg,
        borderRadius: `${8 * scale}px`,
        boxShadow: showShadow ? '0 8px 32px rgba(0,0,0,0.12)' : 'none',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}
      className="pres-laptop-slide"
    >
      <style>{`
        .pres-laptop-slide [data-pres-rich-zone] p { margin: 0 0 ${6 * scale}px; }
        .pres-laptop-slide [data-pres-rich-zone] p:last-child { margin-bottom: 0; }
        .pres-laptop-slide [data-pres-rich-zone] img { max-width: 100%; height: auto; display: block; }
      `}</style>

      {backgroundElements.map((el) => (
        <StaticElement key={el.id} el={el} scale={scale} />
      ))}

      {showLogo && !fullscreenMedia && (
        <img
          src={JOHNNY_PRESENTATION.logoUrl}
          alt="Johnny"
          style={{
            position: 'absolute',
            top: `${14 * scale}px`,
            left: `${18 * scale}px`,
            height: `${46 * scale}px`,
            width: 'auto',
            zIndex: 38,
            pointerEvents: 'none',
            userSelect: 'none',
            background: 'transparent',
          }}
        />
      )}

      {!fullscreenMedia && (
        <div
          style={{
            position: 'absolute',
            bottom: footerOn ? `${footerHeight + 10 * scale}px` : `${32 * scale}px`,
            left: `${48 * scale}px`,
            right: `${48 * scale}px`,
            height: `${3 * scale}px`,
            borderRadius: 2,
            background: accentGradient(accent),
            zIndex: 37,
            pointerEvents: 'none',
          }}
        />
      )}

      <div
        style={{
          position: 'absolute',
          inset: 0,
          paddingTop: fullscreenMedia ? 0 : `${72 * scale}px`,
          paddingLeft: fullscreenMedia ? 0 : `${64 * scale}px`,
          paddingRight: fullscreenMedia ? 0 : `${64 * scale}px`,
          paddingBottom: fullscreenMedia ? 0 : `${(footerOn ? 56 : 48) * scale}px`,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          overflow: 'hidden',
          zIndex: 4,
          pointerEvents: 'none',
        }}
      >
        {content}
      </div>

      {foregroundElements.map((el) => (
        <StaticElement key={el.id} el={el} scale={scale} />
      ))}

      {footerOn && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: footerHeight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `0 ${48 * scale}px`,
            fontSize: `${13 * scale}px`,
            color: '#616161',
            zIndex: 40,
            pointerEvents: 'none',
            boxSizing: 'border-box',
          }}
        >
          <span style={{ fontWeight: 600 }}>{footer.title}</span>
          <span>
            {footer.right}
            {showFooterNumbers ? `  ${slideNumberLabel}` : ''}
          </span>
        </div>
      )}

      {showStandaloneNumbers && (
        <div
          style={{
            position: 'absolute',
            right: `${24 * scale}px`,
            bottom: `${16 * scale}px`,
            fontSize: `${14 * scale}px`,
            color: '#757575',
            zIndex: 40,
            pointerEvents: 'none',
          }}
        >
          {slideNumberLabel}
        </div>
      )}
    </div>
  );
};

export default PresentationLaptopSlide;
