/**
 * Laptop-/Review-Folie: rein statische Anzeige.
 * Keine Hooks, keine Effects, kein contentEditable, kein shared Editor-Baum.
 * Dadurch keine „Too many re-renders“-Schleifen aus RichZone/Select/Overlay.
 */
import React from 'react';
import {
  isLayoutZoneHidden,
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
import { isBareBlankLayout, isBlankLayout } from '../../lib/presentationLayouts';
import { hydratePresentationHtmlFontSizes, PRESENTATION_CONTENT_FONT_PX } from '../../lib/presentationFontSize';
import { shapeSupportsText, SlideShapeSvg } from '../../lib/presentationSlideShapes';
import { PRESENTATION_DEFAULT_FONT_FAMILY } from '../../lib/presentationFonts';
import { imageFrameParts } from '../../lib/presentationImageFrames';
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
  return (
    !t ||
    t === '<p></p>' ||
    t === '<p><br></p>' ||
    t === '<p style="text-align:center"><br></p>' ||
    t === '<p style="text-align: center"><br></p>'
  );
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
  align?: 'left' | 'center' | 'right' | 'justify';
  italic?: boolean;
}) {
  const display = sanitizePresentationHtml(html || textToHtml(plain || ''));
  if (isEmptyHtml(display)) return null;
  const base = VARIANT_FONT[variant] * scale;
  const resolvedAlign =
    align === 'center' || align === 'right' || align === 'justify'
      ? align
      : variant === 'body'
        ? 'justify'
        : align;
  return (
    <div
      data-pres-rich-zone
      data-pres-variant={variant}
      data-pres-align={resolvedAlign}
      style={{
        fontSize: `${base}px`,
        fontFamily: PRESENTATION_DEFAULT_FONT_FAMILY,
        lineHeight: variant === 'title' || variant === 'hero' ? 1.15 : 1.55,
        fontWeight: variant === 'title' || variant === 'hero' ? 700 : 400,
        fontStyle: italic ? 'italic' : 'normal',
        textAlign: resolvedAlign,
        width: '100%',
        minWidth: 0,
        wordBreak: 'break-word',
        overflow: 'hidden',
        color: JOHNNY_PRESENTATION.textPrimary,
      }}
      dangerouslySetInnerHTML={{ __html: display }}
    />
  );
}

function StaticElement({ el, scale, accent }: { el: SlideElement; scale: number; accent: string }) {
  if (el.type === 'image') {
    if (!el.src?.trim()) return null;
    const url = slideImageUrl(el.src);
    const frame = imageFrameParts(el.imageFrame, scale, accent);
    return (
      <div
        style={{
          position: 'absolute',
          left: `${el.x}%`,
          top: `${el.y}%`,
          width: `${el.w}%`,
          height: `${el.h}%`,
          zIndex: 10 + (el.zIndex || 0),
          overflow: frame.active ? 'visible' : 'hidden',
          boxSizing: 'border-box',
          pointerEvents: 'none',
        }}
      >
        <div style={frame.active ? frame.wrap : { width: '100%', height: '100%' }}>
          <div style={frame.active ? frame.inner : { width: '100%', height: '100%' }}>
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
                ...(frame.active ? frame.img : {}),
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (el.type === 'text') {
    const display = hydratePresentationHtmlFontSizes(sanitizePresentationHtml(el.html || '<p></p>'));
    if (isEmptyHtml(display)) return null;
    return (
      <div
        data-pres-html
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
          fontFamily: PRESENTATION_DEFAULT_FONT_FAMILY,
          lineHeight: 1.4,
          color: JOHNNY_PRESENTATION.textPrimary,
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

  if (el.type === 'card') {
    const accent = el.strokeColor || '#1565C0';
    const headerBg = el.fillColor || 'rgba(21,101,192,0.14)';
    const title = hydratePresentationHtmlFontSizes(
      sanitizePresentationHtml(
        el.titleHtml || '<p style="text-align:center"><strong>Titel</strong></p>',
      ),
    );
    const body = hydratePresentationHtmlFontSizes(sanitizePresentationHtml(el.html || '<p></p>'));
    const sw = Math.max(2, (el.strokeWidth || 2.5) * scale);
    return (
      <div
        style={{
          position: 'absolute',
          left: `${el.x}%`,
          top: `${el.y}%`,
          width: `${el.w}%`,
          height: `${el.h}%`,
          zIndex: 10 + (el.zIndex || 0),
          boxSizing: 'border-box',
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: `${10 * scale}px`,
          overflow: 'hidden',
          border: `${sw}px solid ${accent}`,
          background: 'transparent',
        }}
      >
        <div
          data-pres-html
          style={{
            flex: '0 0 auto',
            minHeight: `${36 * scale}px`,
            background: headerBg,
            borderBottom: `${Math.max(1.5, scale)}px solid ${accent}`,
            padding: `${8 * scale}px ${10 * scale}px`,
            color: accent,
            fontSize: `${PRESENTATION_CONTENT_FONT_PX * 1.05 * scale}px`,
            fontFamily: PRESENTATION_DEFAULT_FONT_FAMILY,
            fontWeight: 700,
            lineHeight: 1.25,
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          dangerouslySetInnerHTML={{ __html: title }}
        />
        <div
          data-pres-html
          style={{
            flex: 1,
            minHeight: 0,
            padding: `${10 * scale}px`,
            fontSize: `${PRESENTATION_CONTENT_FONT_PX * scale}px`,
            fontFamily: PRESENTATION_DEFAULT_FONT_FAMILY,
            lineHeight: 1.4,
            color: JOHNNY_PRESENTATION.textPrimary,
            overflow: 'hidden',
            background: 'transparent',
          }}
          dangerouslySetInnerHTML={{ __html: body }}
        />
      </div>
    );
  }

  if (el.type === 'table') {
    const display = hydratePresentationHtmlFontSizes(
      sanitizePresentationHtml(el.html || '<table></table>'),
    );
    const fs = Math.max(11, PRESENTATION_CONTENT_FONT_PX * 0.85) * scale;
    return (
      <div
        data-pres-html
        style={{
          position: 'absolute',
          left: `${el.x}%`,
          top: `${el.y}%`,
          width: `${el.w}%`,
          height: `${el.h}%`,
          zIndex: 10 + (el.zIndex || 0),
          boxSizing: 'border-box',
          pointerEvents: 'none',
          overflow: 'hidden',
          padding: `${4 * scale}px`,
          fontSize: `${fs}px`,
          lineHeight: 1.25,
          color: JOHNNY_PRESENTATION.textPrimary,
        }}
        dangerouslySetInnerHTML={{ __html: display }}
      />
    );
  }

  if (el.type === 'shape') {
    const bodyHtml = shapeSupportsText(el)
      ? hydratePresentationHtmlFontSizes(sanitizePresentationHtml(el.html || ''))
      : '';
    const showText = Boolean(bodyHtml && !isEmptyHtml(bodyHtml));
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
          flipH={el.flipH}
          flipV={el.flipV}
        />
        {showText ? (
          <div
            style={{
              position: 'absolute',
              inset: `${12 * scale}%`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              fontSize: `${PRESENTATION_CONTENT_FONT_PX * scale}px`,
              fontFamily: PRESENTATION_DEFAULT_FONT_FAMILY,
              lineHeight: 1.35,
              color: JOHNNY_PRESENTATION.textPrimary,
              textAlign: 'center',
            }}
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        ) : null}
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
  const bareBlank = isBareBlankLayout(slide.layout);
  const footerOn = showSlideFooter && !bareBlank;
  const footer = normalizeSlideFooter(slideFooter, deckTitle, lessonPath);
  const footerHeight = footerOn ? SLIDE_FOOTER_HEIGHT * scale : 0;
  const slideNumberLabel =
    slideNumber > 0
      ? slideTotal > 0
        ? `${slideNumber} / ${slideTotal}`
        : String(slideNumber)
      : '';
  const showFooterNumbers = footerOn && slideNumberLabel.length > 0;
  const showStandaloneNumbers = !footerOn && !bareBlank && showSlideNumbers && slideNumberLabel.length > 0;
  const fullscreenMedia = slideHasFullscreenMedia(slide);
  const imageHeroLayout = slideHasImageHeroLayout(slide);
  const bareCanvas = bareBlank || fullscreenMedia;
  const showJohnnyChrome = showLogo && !fullscreenMedia && !bareBlank;
  const hideBlankContent =
    fullscreenMedia ||
    imageHeroLayout ||
    (isBlankLayout(slide.layout) && isLayoutZoneHidden(slide, 'bodyHtml'));

  const backgroundElements = (slide.elements || []).filter(
    (el) => getElementStackLayer(el) === 'background',
  );
  const foregroundElements = (slide.elements || []).filter(
    (el) => getElementStackLayer(el) !== 'background',
  );

  const skipFlexZone = (field: string) =>
    Boolean(slide.layoutZoneBoxes?.[field]) || isLayoutZoneHidden(slide, field);

  const zone = (
    html: string | undefined,
    plain: string | undefined,
    variant: ZoneVariant,
    opts: { align?: 'left' | 'center' | 'right' | 'justify'; italic?: boolean } = {},
  ) => (
    <StaticHtml
      html={html}
      plain={plain}
      scale={scale}
      variant={variant}
      align={opts.align ?? (variant === 'body' ? 'justify' : align)}
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
              {skipFlexZone('bodyLeftHtml')
                ? null
                : zone(slide.bodyLeftHtml, slide.bodyLeft, 'body')}
            </div>
            <div style={{ width: `${2 * scale}px`, background: `${accent}44`, flexShrink: 0 }} />
            <div style={{ flex: 1, minHeight: 0 }}>
              {skipFlexZone('bodyRightHtml')
                ? null
                : zone(slide.bodyRightHtml, slide.bodyRight, 'body')}
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
            <div style={{ flex: 1, minHeight: 0 }}>
              {skipFlexZone('bodyHtml') ? null : zone(slide.bodyHtml, slide.body, 'body')}
            </div>
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
            <div style={{ flex: 1, minHeight: 0 }}>
              {skipFlexZone('bodyHtml') ? null : zone(slide.bodyHtml, slide.body, 'body')}
            </div>
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
    case 'blank-full':
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
          {!skipFlexZone('bodyHtml') ? zone(slide.bodyHtml, slide.body, 'body') : null}
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
        .pres-laptop-slide [data-pres-html] a[href] { pointer-events: auto; cursor: pointer; }
      `}</style>

      {backgroundElements.map((el) => (
        <StaticElement key={el.id} el={el} scale={scale} accent={accent} />
      ))}

      {showJohnnyChrome && (
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

      {showJohnnyChrome && (
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
          paddingTop: bareCanvas ? 0 : `${72 * scale}px`,
          paddingLeft: bareCanvas ? 0 : `${64 * scale}px`,
          paddingRight: bareCanvas ? 0 : `${64 * scale}px`,
          paddingBottom: bareCanvas ? 0 : `${(footerOn ? 56 : 48) * scale}px`,
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

      {(['bodyHtml', 'bodyLeftHtml', 'bodyRightHtml'] as const).map((field) => {
        const box = slide.layoutZoneBoxes?.[field];
        if (!box || isLayoutZoneHidden(slide, field)) return null;
        const html = slide[field];
        const plain =
          field === 'bodyHtml' ? slide.body : field === 'bodyLeftHtml' ? slide.bodyLeft : slide.bodyRight;
        return (
          <div
            key={`boxed-${field}`}
            style={{
              position: 'absolute',
              left: `${box.x}%`,
              top: `${box.y}%`,
              width: `${box.w}%`,
              height: `${box.h}%`,
              overflow: 'auto',
              zIndex: 8,
              pointerEvents: 'none',
              boxSizing: 'border-box',
            }}
          >
            {zone(html, plain, 'body')}
          </div>
        );
      })}

      {foregroundElements.map((el) => (
        <StaticElement key={el.id} el={el} scale={scale} accent={accent} />
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
