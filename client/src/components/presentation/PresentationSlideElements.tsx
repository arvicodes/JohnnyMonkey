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
  onMoveElementToNotes?: (elementId: string, clientX: number, clientY: number) => void;
  onTextEditorFocus?: (el: HTMLElement, elementId: string, field?: 'html' | 'titleHtml') => void;
  onSnapGuidesChange?: (guides: SnapGuide[]) => void;
  /** Karte gewählt → Bilder lassen Klicks durch. */
  passPointerThrough?: boolean;
  mediaInteractive?: boolean;
  imageEditable?: boolean;
  exportSnapshot?: boolean;
  imageMaxEdge?: number;
  accentColor?: string;
  pageCount?: number;
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
  onMoveElementToNotes,
  onTextEditorFocus,
  onSnapGuidesChange,
  passPointerThrough = false,
  mediaInteractive = false,
  imageEditable = false,
  exportSnapshot = false,
  imageMaxEdge,
  accentColor,
  pageCount = 1,
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
          onMoveToNotes={
            onMoveElementToNotes ? (x, y) => onMoveElementToNotes(el.id, x, y) : undefined
          }
          onTextEditorFocus={onTextEditorFocus}
          snapTargets={snapTargets}
          onSnapGuidesChange={onSnapGuidesChange}
          passPointerThrough={passPointerThrough}
          mediaInteractive={mediaInteractive}
          imageEditable={imageEditable}
          exportSnapshot={exportSnapshot}
          imageMaxEdge={imageMaxEdge}
          accentColor={accentColor}
          pageCount={pageCount}
        />
      ))}
    </>
  );
};

export default PresentationSlideElements;
