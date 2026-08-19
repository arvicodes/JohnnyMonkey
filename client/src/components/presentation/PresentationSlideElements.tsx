import React from 'react';
import { SlideElement } from '../../lib/presentationDeck';
import { elementToRect, type SnapGuide } from '../../lib/presentationElementSnap';
import PresentationDraggableElement from './PresentationDraggableElement';

interface PresentationSlideElementsProps {
  elements: SlideElement[];
  /** Alle Folien-Elemente (beide Ebenen) für Snap-Ziele. */
  snapSourceElements?: SlideElement[];
  scale: number;
  revealStep?: number;
  revealEnabled?: boolean;
  editable?: boolean;
  selectedId?: string | null;
  animationEditMode?: boolean;
  selectedAnimationTarget?: string | null;
  onAnimationTargetClick?: (itemId: string | null) => void;
  onSelect?: (id: string) => void;
  onElementChange?: (id: string, patch: Partial<SlideElement>) => void;
  onDeleteElement?: (id: string) => void;
  onMoveElementToSlide?: (elementId: string, targetSlideId: string) => void;
  onTextEditorFocus?: (el: HTMLElement, elementId: string, field?: 'html' | 'titleHtml') => void;
  onSnapGuidesChange?: (guides: SnapGuide[]) => void;
  /** Karte gewählt → Bilder lassen Klicks durch. */
  passPointerThrough?: boolean;
  mediaInteractive?: boolean;
  exportSnapshot?: boolean;
  imageMaxEdge?: number;
  accentColor?: string;
}

const PresentationSlideElements: React.FC<PresentationSlideElementsProps> = ({
  elements,
  snapSourceElements,
  scale,
  revealStep = 999,
  revealEnabled = true,
  editable = false,
  selectedId,
  animationEditMode = false,
  selectedAnimationTarget = null,
  onAnimationTargetClick,
  onSelect,
  onElementChange,
  onDeleteElement,
  onMoveElementToSlide,
  onTextEditorFocus,
  onSnapGuidesChange,
  passPointerThrough = false,
  mediaInteractive = false,
  exportSnapshot = false,
  imageMaxEdge,
  accentColor,
}) => {
  const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);
  const snapTargets = (snapSourceElements ?? elements).map(elementToRect);

  return (
    <>
      {sorted.map((el) => (
        <PresentationDraggableElement
          key={el.id}
          element={el}
          scale={scale}
          editable={editable}
          selected={selectedId === el.id}
          revealStep={revealStep}
          revealEnabled={revealEnabled}
          animationEditMode={animationEditMode}
          selectedAnimationTarget={selectedAnimationTarget}
          onAnimationTargetClick={onAnimationTargetClick}
          onSelect={() => onSelect?.(el.id)}
          onChange={(patch) => onElementChange?.(el.id, patch)}
          onDelete={onDeleteElement ? () => onDeleteElement(el.id) : undefined}
          onMoveToSlide={
            onMoveElementToSlide ? (targetSlideId) => onMoveElementToSlide(el.id, targetSlideId) : undefined
          }
          onTextEditorFocus={onTextEditorFocus}
          snapTargets={snapTargets}
          onSnapGuidesChange={onSnapGuidesChange}
          passPointerThrough={passPointerThrough}
          mediaInteractive={mediaInteractive}
          exportSnapshot={exportSnapshot}
          imageMaxEdge={imageMaxEdge}
          accentColor={accentColor}
        />
      ))}
    </>
  );
};

export default PresentationSlideElements;
