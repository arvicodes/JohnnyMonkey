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
  onTextEditorFocus?: (el: HTMLElement, elementId: string) => void;
  mediaInteractive?: boolean;
  exportSnapshot?: boolean;
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
  onTextEditorFocus,
  mediaInteractive = false,
  exportSnapshot = false,
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
          onTextEditorFocus={onTextEditorFocus}
          mediaInteractive={mediaInteractive}
          exportSnapshot={exportSnapshot}
        />
      ))}
    </>
  );
};

export default PresentationSlideElements;
