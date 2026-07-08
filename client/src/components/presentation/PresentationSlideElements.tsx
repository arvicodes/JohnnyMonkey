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
  onSelect?: (id: string) => void;
  onElementChange?: (id: string, patch: Partial<SlideElement>) => void;
  onTextEditorFocus?: (el: HTMLElement, elementId: string) => void;
}

const PresentationSlideElements: React.FC<PresentationSlideElementsProps> = ({
  elements,
  scale,
  revealStep = 999,
  revealEnabled = true,
  editable = false,
  selectedId,
  onSelect,
  onElementChange,
  onTextEditorFocus,
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
          onSelect={() => onSelect?.(el.id)}
          onChange={(patch) => onElementChange?.(el.id, patch)}
          onTextEditorFocus={onTextEditorFocus}
        />
      ))}
    </>
  );
};

export default PresentationSlideElements;
