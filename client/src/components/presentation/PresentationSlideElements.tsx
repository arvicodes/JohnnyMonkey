import React from 'react';
import { SlideElement } from '../../lib/presentationDeck';
import PresentationDraggableElement from './PresentationDraggableElement';

interface PresentationSlideElementsProps {
  elements: SlideElement[];
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
  onTextEditorFocus?: (el: HTMLElement, elementId: string) => void;
  mediaInteractive?: boolean;
  exportSnapshot?: boolean;
  imageMaxEdge?: number;
}

const PresentationSlideElements: React.FC<PresentationSlideElementsProps> = ({
  elements,
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
  mediaInteractive = false,
  exportSnapshot = false,
  imageMaxEdge,
}) => {
  const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);

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
          mediaInteractive={mediaInteractive}
          exportSnapshot={exportSnapshot}
          imageMaxEdge={imageMaxEdge}
        />
      ))}
    </>
  );
};

export default PresentationSlideElements;
