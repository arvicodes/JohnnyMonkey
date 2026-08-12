import React, { useCallback, useState } from 'react';
import { Box, Typography } from '@mui/material';
import {
  isLayoutZoneHidden,
  normalizeSlide,
  PresentationSlide,
  PresentationSlideFooter,
  SlideElement,
  SLIDE_REF_HEIGHT,
  SLIDE_REF_WIDTH,
  SLIDE_IMAGE_EDITOR_MAX,
  slideImageUrl,
  withHiddenLayoutZone,
} from '../../lib/presentationDeck';
import { JOHNNY_PRESENTATION, accentGradient } from '../../lib/presentationTheme';
import {
  presentationImageElementSx,
  slideHasImageHeroLayout,
} from '../../lib/presentationImageUtils';
import { getZoneRevealStep, isZoneVisible, shouldAnimateReveal } from '../../lib/presentationReveal';
import {
  ANIMATION_LAYOUT_IMAGE_ID,
  animationBadgeBoxSx,
  layoutImageHasRevealAssignment,
  type HtmlAnimField,
} from '../../lib/presentationAnimation';
import {
  normalizeSlideFooter,
  SLIDE_FOOTER_HEIGHT,
} from '../../lib/presentationSlideFooter';
import { slideHasFullscreenMedia } from '../../lib/presentationMediaEmbed';
import { getElementStackLayer, splitElementsByStackLayer } from '../../lib/presentationElementLayers';
import type { SnapGuide } from '../../lib/presentationElementSnap';
import PresentationRichZone from './PresentationRichZone';
import PresentationSlideElements from './PresentationSlideElements';

interface PresentationSlideViewProps {
  slide: PresentationSlide;
  scale?: number;
  showLogo?: boolean;
  showShadow?: boolean;
  editable?: boolean;
  onChange?: (patch: Partial<PresentationSlide>) => void;
  onEditorFocus?: (el: HTMLElement, fieldKey?: string) => void;
  revealStep?: number;
  revealEnabled?: boolean;
  selectedElementId?: string | null;
  onElementSelect?: (id: string | null) => void;
  onElementChange?: (id: string, patch: Partial<SlideElement>) => void;
  onDeleteElement?: (id: string) => void;
  onMoveElementToSlide?: (elementId: string, targetSlideId: string) => void;
  onTextElementFocus?: (el: HTMLElement, elementId: string, field?: 'html' | 'titleHtml') => void;
  showSlideNumbers?: boolean;
  slideNumber?: number;
  slideTotal?: number;
  showSlideFooter?: boolean;
  slideFooter?: PresentationSlideFooter;
  deckTitle?: string;
  lessonPath?: string;
  animationEditMode?: boolean;
  selectedAnimationTarget?: string | null;
  onAnimationTargetClick?: (itemId: string | null) => void;
  mediaInteractive?: boolean;
  /** PDF-Export: Layout wie im Editor, ohne Animations-Artefakte. */
  exportSnapshot?: boolean;
  /** Bildgröße begrenzen (Editor). Ohne Wert: Original / Export. */
  imageMaxEdge?: number;
}

const PresentationSlideView: React.FC<PresentationSlideViewProps> = ({
  slide: rawSlide,
  scale = 1,
  showLogo = true,
  showShadow = true,
  editable = false,
  onChange,
  onEditorFocus,
  revealStep = 999,
  revealEnabled = true,
  selectedElementId,
  onElementSelect,
  onElementChange,
  onDeleteElement,
  onMoveElementToSlide,
  onTextElementFocus,
  showSlideNumbers = false,
  slideNumber = 0,
  slideTotal = 0,
  showSlideFooter = false,
  slideFooter,
  deckTitle = '',
  lessonPath = '',
  animationEditMode = false,
  selectedAnimationTarget = null,
  onAnimationTargetClick,
  mediaInteractive = false,
  exportSnapshot = false,
  imageMaxEdge,
}) => {
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
  const handleSnapGuidesChange = useCallback((guides: SnapGuide[]) => {
    setSnapGuides(guides);
  }, []);
  const slide = normalizeSlide(rawSlide);
  const resolvedImageMax =
    imageMaxEdge ?? (editable && !exportSnapshot ? SLIDE_IMAGE_EDITOR_MAX : undefined);
  const effectiveReveal = revealEnabled && slide.revealEnabled !== false;
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
  const hasFreeElements = (slide.elements?.length ?? 0) > 0;
  const hideBlankContent =
    fullscreenMedia ||
    imageHeroLayout ||
    (slide.layout === 'blank' && hasFreeElements) ||
    (slide.layout === 'blank' && isLayoutZoneHidden(slide, 'bodyHtml'));
  /** Freie Elemente (z. B. PPTX): ohne Johnny-Rahmen/Logo — sonst „Felder“ um alles herum. */
  const freeformCanvas = slide.layout === 'blank' && hasFreeElements;
  const showJohnnyChrome = showLogo && !fullscreenMedia && !freeformCanvas;
  const { background: backgroundElements, foreground: foregroundElements } = splitElementsByStackLayer(
    slide.elements,
  );
  const selectedElement = slide.elements?.find((el) => el.id === selectedElementId);
  /** Karten bleiben unter Vordergrund-Bildern — sonst blockieren sie das Verschieben. */
  const selectedBackground =
    editable &&
    selectedElement != null &&
    selectedElement.type !== 'card' &&
    getElementStackLayer(selectedElement) === 'background';
  /** Gewählte Karte: Bilder lassen Klicks durch → Inhalt tippbar. */
  const passPointerThrough =
    editable && selectedElement != null && selectedElement.type === 'card';
  const hasBackgroundElements = backgroundElements.length > 0;
  const heroSlide = imageHeroLayout;
  const textZonesInteractive = editable;
  /**
   * Editor: Hintergrund-Elemente über den Layout-Inhaltsfeldern (z≈4), sonst fängt
   * title/body alle Klicks ab. Präsentation: weiter unter dem Folientext (z=1).
   * Ausgewählt: kurz über Vordergrund, damit Formen hinter Textfeldern greifbar bleiben.
   */
  const backgroundLayerZ = heroSlide
    ? 1
    : editable && selectedBackground
      ? 30
      : editable
        ? 12
        : 1;
  const logoZ = 38;

  const renderElementLayer = (layerElements: SlideElement[], zIndex: number) => {
    if (layerElements.length === 0) return null;
    return (
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex,
        }}
      >
        <PresentationSlideElements
          elements={layerElements}
          snapSourceElements={slide.elements}
          scale={scale}
          revealStep={revealStep}
          revealEnabled={effectiveReveal}
          exportSnapshot={exportSnapshot}
          editable={editable}
          selectedId={selectedElementId}
          onSelect={(id) => onElementSelect?.(id)}
          onElementChange={onElementChange}
          onDeleteElement={onDeleteElement}
          onMoveElementToSlide={onMoveElementToSlide}
          onTextEditorFocus={onTextElementFocus}
          onSnapGuidesChange={editable ? handleSnapGuidesChange : undefined}
          passPointerThrough={passPointerThrough}
          animationEditMode={animationEditMode}
          selectedAnimationTarget={selectedAnimationTarget}
          onAnimationTargetClick={onAnimationTargetClick}
          mediaInteractive={mediaInteractive}
          imageMaxEdge={resolvedImageMax}
        />
      </Box>
    );
  };

  const patchHtml = (
    fields: Partial<
      Pick<
        PresentationSlide,
        | 'titleHtml'
        | 'bodyHtml'
        | 'subtitleHtml'
        | 'bodyLeftHtml'
        | 'bodyRightHtml'
        | 'imageCaptionHtml'
        | 'title'
        | 'body'
        | 'subtitle'
        | 'bodyLeft'
        | 'bodyRight'
        | 'imageCaption'
      >
    >
  ) => onChange?.(fields);

  const hideLayoutZone = (zoneKey: string) => {
    if (!editable || !onChange) return;
    const next = withHiddenLayoutZone(slide, zoneKey, true);
    onChange({ hiddenLayoutZones: next.hiddenLayoutZones });
  };

  const zone = (
    fieldHtml: keyof PresentationSlide,
    fieldPlain: keyof PresentationSlide,
    opts: {
      variant?: 'title' | 'hero' | 'subtitle' | 'body' | 'quote' | 'caption';
      italic?: boolean;
      placeholder?: string;
      align?: 'left' | 'center' | 'right';
      minHeight?: number;
      flex?: number;
      zoneKey?: string;
      /** Inhaltsbox darf gelöscht/ausgeblendet werden (Titel & Inhalt). */
      deletable?: boolean;
    } = {}
  ) => {
    const htmlField = String(fieldHtml) as HtmlAnimField;
    if (isLayoutZoneHidden(slide, htmlField)) return null;

    const canDeleteZone =
      Boolean(opts.deletable) && editable && !animationEditMode && !exportSnapshot && Boolean(onChange);

    return (
      <Box
        sx={{
          minWidth: 0,
          flex: opts.flex,
          position: 'relative',
          zIndex: animationEditMode ? 1 : undefined,
          // Parent hat pointer-events:none — Zone muss selbst klickbar sein.
          pointerEvents: textZonesInteractive || animationEditMode ? 'auto' : 'none',
          display: opts.flex ? 'flex' : undefined,
          flexDirection: opts.flex ? 'column' : undefined,
          minHeight: opts.flex && editable ? `${80 * scale}px` : undefined,
          '&:hover .pres-zone-delete': { opacity: 1 },
          '& a[href]': {
            pointerEvents: 'auto',
            cursor: 'pointer',
            color: '#1565C0',
            textDecoration: 'underline',
            position: 'relative',
            zIndex: 2,
          },
        }}
      >
        {canDeleteZone && (
          <Box
            className="pres-zone-delete"
            component="button"
            type="button"
            title="Inhaltsbox löschen"
            aria-label="Inhaltsbox löschen"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              hideLayoutZone(htmlField);
            }}
            sx={{
              position: 'absolute',
              top: `${-2 * scale}px`,
              right: `${-2 * scale}px`,
              zIndex: 4,
              opacity: 0,
              transition: 'opacity 0.12s ease',
              width: `${22 * scale}px`,
              height: `${22 * scale}px`,
              minWidth: 0,
              p: 0,
              border: `1px solid ${accent}55`,
              borderRadius: `${4 * scale}px`,
              bgcolor: 'rgba(255,255,255,0.92)',
              color: '#c62828',
              fontSize: `${14 * scale}px`,
              fontWeight: 700,
              lineHeight: 1,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'auto',
              '&:hover': { bgcolor: '#ffebee', borderColor: '#c62828' },
            }}
          >
            ×
          </Box>
        )}
        <PresentationRichZone
          html={slide[fieldHtml] as string | undefined}
          plain={slide[fieldPlain] as string | undefined}
          scale={scale}
          editable={editable}
          exportSnapshot={exportSnapshot}
          htmlField={String(fieldHtml)}
          slideId={slide.id}
          variant={opts.variant || 'body'}
          italic={opts.italic}
          align={opts.align || align}
          placeholder={opts.placeholder}
          minHeight={opts.minHeight}
          flex={opts.flex}
          onEditorFocus={(el) => onEditorFocus?.(el, String(fieldHtml))}
          pointerEvents={textZonesInteractive ? 'auto' : 'none'}
          revealStep={revealStep}
          revealEnabled={effectiveReveal}
          animationEditMode={animationEditMode}
          animationFieldKey={htmlField}
          selectedAnimationTarget={selectedAnimationTarget}
          onAnimationTargetClick={onAnimationTargetClick}
          onChange={
            editable
              ? (html, plain) =>
                  patchHtml({
                    [fieldHtml]: html,
                    [fieldPlain]: plain,
                  } as Partial<PresentationSlide>)
              : undefined
          }
        />
      </Box>
    );
  };

  const renderImage = () => {
    const url = slideImageUrl(slide.imagePath || '', resolvedImageMax);
    const imageVisible = animationEditMode || isZoneVisible(slide, 'layoutImage', revealStep, effectiveReveal);
    const layoutImageStep = getZoneRevealStep(slide, 'layoutImage');
    const layoutImageSelected = selectedAnimationTarget === ANIMATION_LAYOUT_IMAGE_ID;
    return (
      <Box
        sx={{
          flex: '0 0 42%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: `${8 * scale}px`,
        }}
      >
        <Box
          onMouseDown={(e) => {
            if (!animationEditMode || !onAnimationTargetClick) return;
            e.preventDefault();
            e.stopPropagation();
            onAnimationTargetClick(ANIMATION_LAYOUT_IMAGE_ID);
          }}
          sx={{
            display: imageVisible ? 'flex' : 'none',
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            cursor: animationEditMode ? 'pointer' : undefined,
            outline: layoutImageSelected ? `${2 * scale}px solid #E65100` : undefined,
            outlineOffset: `${4 * scale}px`,
            borderRadius: `${8 * scale}px`,
            animation:
              shouldAnimateReveal(getZoneRevealStep(slide, 'layoutImage'), revealStep, effectiveReveal)
                ? 'presRevealIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) both'
                : undefined,
          }}
        >
          {animationEditMode && layoutImageHasRevealAssignment(slide) && (
            <Box sx={animationBadgeBoxSx(scale, layoutImageSelected)}>{layoutImageStep}</Box>
          )}
          {url ? (
            <Box
              component="img"
              src={url}
              alt=""
              decoding="async"
              loading={exportSnapshot ? undefined : 'lazy'}
              sx={{
                ...presentationImageElementSx(slide.imagePath, 'contain'),
                maxHeight: `${720 * scale}px`,
              }}
            />
          ) : (
            <Box
              sx={{
                width: '100%',
                height: `${320 * scale}px`,
                borderRadius: `${8 * scale}px`,
                border: `${2 * scale}px dashed ${accent}55`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: `${accent}99`,
                fontSize: `${18 * scale}px`,
                bgcolor: `${accent}0a`,
              }}
            >
              {editable ? 'Bild über Toolbar einfügen →' : ''}
            </Box>
          )}
        </Box>
        {zone('imageCaptionHtml', 'imageCaption', {
          variant: 'caption',
          placeholder: 'Bildunterschrift',
          align: 'center',
          zoneKey: 'imageCaptionHtml',
        })}
      </Box>
    );
  };

  const renderContent = () => {
    switch (slide.layout) {
      case 'title-slide':
        return (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              px: `${80 * scale}px`,
              gap: `${20 * scale}px`,
            }}
          >
            <Box sx={{ width: '100%', textAlign: 'center' }}>
              {zone('titleHtml', 'title', { variant: 'hero', placeholder: 'Titel', align: 'center' })}
            </Box>
            {zone('bodyHtml', 'body', {
              variant: 'body',
              placeholder: 'Untertitel',
              align: 'center',
            })}
          </Box>
        );

      case 'section':
        return (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              px: `${96 * scale}px`,
            }}
          >
            <Box
              sx={{
                borderLeft: `${6 * scale}px solid ${accent}`,
                pl: `${32 * scale}px`,
                width: '100%',
              }}
            >
              <Box sx={{ fontSize: `${56 * scale}px`, fontWeight: 700 }}>
                {zone('titleHtml', 'title', { variant: 'title', placeholder: 'Abschnittstitel' })}
              </Box>
              {zone('subtitleHtml', 'subtitle', {
                variant: 'subtitle',
                placeholder: 'Optionaler Untertitel',
              })}
            </Box>
          </Box>
        );

      case 'two-column':
        return (
          <>
            <Box sx={{ mb: `${28 * scale}px` }}>
              {zone('titleHtml', 'title', { variant: 'title', placeholder: 'Titel' })}
            </Box>
            <Box sx={{ display: 'flex', gap: `${40 * scale}px`, flex: 1, minHeight: exportSnapshot ? 'auto' : 0 }}>
              <Box sx={{ flex: 1, minHeight: exportSnapshot ? 'auto' : 0 }}>
                {zone('bodyLeftHtml', 'bodyLeft', { variant: 'body', placeholder: 'Linke Spalte' })}
              </Box>
              <Box sx={{ width: `${2 * scale}px`, bgcolor: `${accent}44`, flexShrink: 0 }} />
              <Box sx={{ flex: 1, minHeight: exportSnapshot ? 'auto' : 0 }}>
                {zone('bodyRightHtml', 'bodyRight', { variant: 'body', placeholder: 'Rechte Spalte' })}
              </Box>
            </Box>
          </>
        );

      case 'image-right':
        return (
          <>
            <Box sx={{ mb: `${24 * scale}px` }}>
              {zone('titleHtml', 'title', { variant: 'title', placeholder: 'Titel' })}
            </Box>
            <Box sx={{ display: 'flex', gap: `${36 * scale}px`, flex: 1, minHeight: exportSnapshot ? 'auto' : 0 }}>
              <Box sx={{ flex: 1, minHeight: exportSnapshot ? 'auto' : 0 }}>
                {zone('bodyHtml', 'body', { variant: 'body', placeholder: 'Text…', flex: 1 })}
              </Box>
              {renderImage()}
            </Box>
          </>
        );

      case 'image-left':
        return (
          <>
            <Box sx={{ mb: `${24 * scale}px` }}>
              {zone('titleHtml', 'title', { variant: 'title', placeholder: 'Titel' })}
            </Box>
            <Box sx={{ display: 'flex', gap: `${36 * scale}px`, flex: 1, minHeight: exportSnapshot ? 'auto' : 0 }}>
              {renderImage()}
              <Box sx={{ flex: 1, minHeight: exportSnapshot ? 'auto' : 0 }}>
                {zone('bodyHtml', 'body', { variant: 'body', placeholder: 'Text…', flex: 1 })}
              </Box>
            </Box>
          </>
        );

      case 'quote':
        return (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              px: `${120 * scale}px`,
            }}
          >
            <Typography
              sx={{
                fontSize: `${96 * scale}px`,
                color: `${accent}55`,
                lineHeight: 0.8,
                mb: `${8 * scale}px`,
              }}
            >
              „
            </Typography>
            {zone('bodyHtml', 'body', {
              variant: 'body',
              placeholder: 'Zitat…',
              align: 'center',
              italic: true,
            })}
            <Box sx={{ mt: `${24 * scale}px`, width: '100%' }}>
              {zone('subtitleHtml', 'subtitle', {
                variant: 'caption',
                placeholder: '— Quelle',
                align: 'center',
              })}
            </Box>
          </Box>
        );

      case 'blank':
        return hideBlankContent ? null : (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {zone('bodyHtml', 'body', { variant: 'body', placeholder: 'Freier Inhalt…', flex: 1 })}
          </Box>
        );

      default:
        return (
          <>
            <Box sx={{ mb: `${24 * scale}px` }}>
              {zone('titleHtml', 'title', { variant: 'title', placeholder: 'Titel' })}
            </Box>
            {zone('bodyHtml', 'body', {
              variant: 'body',
              placeholder: 'Inhalt…',
              flex: 1,
              deletable: true,
            })}
          </>
        );
    }
  };

  return (
    <Box
      data-pres-slide
      data-pres-slide-id={slide.id}
      onPointerDown={(e) => {
        if (animationEditMode && e.target === e.currentTarget) {
          onAnimationTargetClick?.(null);
          return;
        }
        if (!editable || e.target !== e.currentTarget) return;
        onElementSelect?.(null);
      }}
      sx={{
        width: w,
        height: h,
        bgcolor: JOHNNY_PRESENTATION.slideBg,
        borderRadius: `${8 * scale}px`,
        boxShadow: showShadow ? '0 8px 32px rgba(0,0,0,0.12)' : 'none',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        minWidth: 0,
        maxWidth: w,
      }}
    >
      {renderElementLayer(backgroundElements, backgroundLayerZ)}

      {showJohnnyChrome && (
        <Box
          component="img"
          src={JOHNNY_PRESENTATION.logoUrl}
          alt="Johnny"
          sx={{
            position: 'absolute',
            top: `${14 * scale}px`,
            left: `${18 * scale}px`,
            height: `${46 * scale}px`,
            width: 'auto',
            zIndex: logoZ,
            pointerEvents: 'none',
            userSelect: 'none',
            bgcolor: 'transparent',
            backgroundColor: 'transparent',
          }}
        />
      )}

      {showJohnnyChrome && (
      <Box
        sx={{
          position: 'absolute',
          bottom: footerOn ? `${footerHeight + 10 * scale}px` : `${32 * scale}px`,
          left: `${48 * scale}px`,
          right: `${48 * scale}px`,
          height: `${3 * scale}px`,
          borderRadius: 2,
          background: accentGradient(accent),
          zIndex: logoZ - 1,
          pointerEvents: 'none',
        }}
      />
      )}

      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          pt: fullscreenMedia || freeformCanvas ? 0 : `${(showLogo ? 72 : 36) * scale}px`,
          px: fullscreenMedia || freeformCanvas ? 0 : `${64 * scale}px`,
          pb: fullscreenMedia || freeformCanvas ? 0 : `${(footerOn ? 56 : 48) * scale}px`,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: exportSnapshot ? 'auto' : 0,
          overflow: exportSnapshot ? 'visible' : 'hidden',
          zIndex:
            animationEditMode || (hasBackgroundElements && !heroSlide) ? 4 : undefined,
          pointerEvents: editable ? 'none' : 'auto',
        }}
      >
        {renderContent()}
      </Box>

      {renderElementLayer(
        foregroundElements,
        editable ? 25 : animationEditMode ? 12 : 5,
      )}

      {editable && snapGuides.length > 0 && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 120,
            overflow: 'hidden',
          }}
        >
          {snapGuides.map((g, i) =>
            g.axis === 'x' ? (
              <Box
                key={`gx-${i}-${g.pos}`}
                sx={{
                  position: 'absolute',
                  left: `${g.pos}%`,
                  top: 0,
                  bottom: 0,
                  width: 0,
                  borderLeft:
                    g.kind === 'spacing'
                      ? '1px dashed #00BCD4'
                      : g.kind === 'center'
                        ? '1px solid #FF6F00'
                        : '1px solid #00E5FF',
                  boxShadow: '0 0 0 0.5px rgba(255,255,255,0.7)',
                  opacity: 0.95,
                }}
              />
            ) : (
              <Box
                key={`gy-${i}-${g.pos}`}
                sx={{
                  position: 'absolute',
                  top: `${g.pos}%`,
                  left: 0,
                  right: 0,
                  height: 0,
                  borderTop:
                    g.kind === 'spacing'
                      ? '1px dashed #00BCD4'
                      : g.kind === 'center'
                        ? '1px solid #FF6F00'
                        : '1px solid #00E5FF',
                  boxShadow: '0 0 0 0.5px rgba(255,255,255,0.7)',
                  opacity: 0.95,
                }}
              />
            ),
          )}
        </Box>
      )}

      {footerOn && (
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: footerHeight,
            zIndex: 20,
            bgcolor: 'rgba(255,255,255,0.97)',
            borderTop: `1px solid ${accent}33`,
            px: `${48 * scale}px`,
            py: `${8 * scale}px`,
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'baseline',
              gap: `${18 * scale}px`,
              minWidth: 0,
              width: '100%',
            }}
          >
            {footer.title ? (
              <Typography
                sx={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: `${16 * scale}px`,
                  fontWeight: 700,
                  color: accent,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.25,
                }}
              >
                {footer.title}
              </Typography>
            ) : (
              <Box sx={{ flex: 1 }} />
            )}
            {footer.right ? (
              <Typography
                sx={{
                  flexShrink: 0,
                  maxWidth: '42%',
                  fontSize: `${14 * scale}px`,
                  fontWeight: 500,
                  color: JOHNNY_PRESENTATION.textSecondary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.25,
                }}
              >
                {footer.right}
              </Typography>
            ) : null}
            {showFooterNumbers ? (
              <Typography
                sx={{
                  flexShrink: 0,
                  fontSize: `${15 * scale}px`,
                  fontWeight: 700,
                  color: `${accent}cc`,
                  letterSpacing: 0.4,
                  lineHeight: 1.25,
                }}
              >
                {slideNumberLabel}
              </Typography>
            ) : null}
          </Box>
        </Box>
      )}

      {showStandaloneNumbers && (
        <Typography
          sx={{
            position: 'absolute',
            right: `${28 * scale}px`,
            bottom: `${18 * scale}px`,
            zIndex: 6,
            fontSize: `${15 * scale}px`,
            fontWeight: 700,
            color: `${accent}cc`,
            letterSpacing: 0.4,
            pointerEvents: 'none',
            userSelect: 'none',
            lineHeight: 1,
          }}
        >
          {slideNumberLabel}
        </Typography>
      )}
    </Box>
  );
};

export default PresentationSlideView;
