import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  normalizeSlide,
  PresentationSlide,
  SlideElement,
  SLIDE_REF_HEIGHT,
  SLIDE_REF_WIDTH,
  slideImageUrl,
} from '../../lib/presentationDeck';
import { JOHNNY_PRESENTATION, accentGradient } from '../../lib/presentationTheme';
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
  onTextElementFocus?: (el: HTMLElement, elementId: string) => void;
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
  onTextElementFocus,
}) => {
  const slide = normalizeSlide(rawSlide);
  const effectiveReveal = revealEnabled && slide.revealEnabled !== false;
  const w = SLIDE_REF_WIDTH * scale;
  const h = SLIDE_REF_HEIGHT * scale;
  const accent = slide.accentColor || JOHNNY_PRESENTATION.primary;
  const align = slide.titleAlign || 'left';

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

  const zone = (
    fieldHtml: keyof PresentationSlide,
    fieldPlain: keyof PresentationSlide,
    opts: {
      variant?: 'title' | 'hero' | 'subtitle' | 'body' | 'quote' | 'caption';
      placeholder?: string;
      align?: 'left' | 'center' | 'right';
      minHeight?: number;
      flex?: number;
    } = {}
  ) => (
    <PresentationRichZone
      html={slide[fieldHtml] as string | undefined}
      plain={slide[fieldPlain] as string | undefined}
      scale={scale}
      editable={editable}
      variant={opts.variant || 'body'}
      align={opts.align || align}
      placeholder={opts.placeholder}
      minHeight={opts.minHeight}
      flex={opts.flex}
      onEditorFocus={(el) => onEditorFocus?.(el, String(fieldHtml))}
      revealStep={revealStep}
      revealEnabled={effectiveReveal}
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
  );

  const renderImage = () => {
    const url = slideImageUrl(slide.imagePath || '');
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
        {url ? (
          <Box
            component="img"
            src={url}
            alt=""
            sx={{
              maxWidth: '100%',
              maxHeight: `${420 * scale}px`,
              objectFit: 'contain',
              borderRadius: `${8 * scale}px`,
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
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
        {zone('imageCaptionHtml', 'imageCaption', {
          variant: 'caption',
          placeholder: 'Bildunterschrift',
          align: 'center',
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
              variant: 'subtitle',
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
            <Box sx={{ display: 'flex', gap: `${40 * scale}px`, flex: 1, minHeight: 0 }}>
              <Box sx={{ flex: 1 }}>{zone('bodyLeftHtml', 'bodyLeft', { placeholder: 'Linke Spalte' })}</Box>
              <Box sx={{ width: `${2 * scale}px`, bgcolor: `${accent}44`, flexShrink: 0 }} />
              <Box sx={{ flex: 1 }}>{zone('bodyRightHtml', 'bodyRight', { placeholder: 'Rechte Spalte' })}</Box>
            </Box>
          </>
        );

      case 'image-right':
        return (
          <>
            <Box sx={{ mb: `${24 * scale}px` }}>
              {zone('titleHtml', 'title', { variant: 'title', placeholder: 'Titel' })}
            </Box>
            <Box sx={{ display: 'flex', gap: `${36 * scale}px`, flex: 1, minHeight: 0 }}>
              <Box sx={{ flex: 1 }}>{zone('bodyHtml', 'body', { placeholder: 'Text…', flex: 1 })}</Box>
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
            <Box sx={{ display: 'flex', gap: `${36 * scale}px`, flex: 1, minHeight: 0 }}>
              {renderImage()}
              <Box sx={{ flex: 1 }}>{zone('bodyHtml', 'body', { placeholder: 'Text…', flex: 1 })}</Box>
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
            {zone('bodyHtml', 'body', { variant: 'quote', placeholder: 'Zitat…', align: 'center' })}
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
        return (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {zone('bodyHtml', 'body', { placeholder: 'Freier Inhalt…', flex: 1 })}
          </Box>
        );

      default:
        return (
          <>
            <Box sx={{ mb: `${24 * scale}px` }}>
              {zone('titleHtml', 'title', { variant: 'title', placeholder: 'Titel' })}
            </Box>
            {zone('bodyHtml', 'body', { placeholder: 'Inhalt…', flex: 1 })}
          </>
        );
    }
  };

  return (
    <Box
      data-pres-slide
      onPointerDown={(e) => {
        if (editable && e.target === e.currentTarget) onElementSelect?.(null);
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
      {showLogo && (
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
            zIndex: 2,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        />
      )}

      <Box
        sx={{
          position: 'absolute',
          bottom: `${32 * scale}px`,
          left: `${48 * scale}px`,
          right: `${48 * scale}px`,
          height: `${3 * scale}px`,
          borderRadius: 2,
          background: accentGradient(accent),
        }}
      />

      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          pt: `${72 * scale}px`,
          px: `${64 * scale}px`,
          pb: `${48 * scale}px`,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        {renderContent()}
      </Box>

      {(slide.elements?.length ?? 0) > 0 && (
        <Box
          sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5 }}
        >
          <PresentationSlideElements
            elements={slide.elements || []}
            scale={scale}
            revealStep={revealStep}
            revealEnabled={effectiveReveal}
            editable={editable}
            selectedId={selectedElementId}
            onSelect={(id) => onElementSelect?.(id)}
            onElementChange={onElementChange}
            onTextEditorFocus={onTextElementFocus}
          />
        </Box>
      )}
    </Box>
  );
};

export default PresentationSlideView;
