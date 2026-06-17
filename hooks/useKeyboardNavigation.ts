import { useState, useEffect, useCallback, useRef } from 'react';

interface KeyboardNavigationOptions {
  items: unknown[];
  itemHeight?: number;
  containerHeight?: number;
  onSelect?: (index: number) => void;
  onEscape?: () => void;
}

export function useKeyboardNavigation({
  items,
  itemHeight = 48,
  containerHeight = 400,
  onSelect,
  onEscape,
}: KeyboardNavigationOptions) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleCount = Math.ceil(containerHeight / itemHeight) + 2;
  const maxIndex = Math.max(0, items.length - 1);

  const goToIndex = useCallback((index: number) => {
    const newIndex = Math.max(0, Math.min(maxIndex, index));
    setSelectedIndex(newIndex);

    // Scroll into view
    if (containerRef.current) {
      const scrollOffset = newIndex * itemHeight - containerHeight / 2;
      containerRef.current.scrollTop = scrollOffset;
    }

    if (onSelect) {
      onSelect(newIndex);
    }
  }, [maxIndex, itemHeight, containerHeight, onSelect]);

  const moveUp = useCallback(() => {
    setSelectedIndex(prev => Math.max(0, prev - 1));
  }, []);

  const moveDown = useCallback(() => {
    setSelectedIndex(prev => Math.min(maxIndex, prev + 1));
  }, [maxIndex]);

  const movePageUp = useCallback(() => {
    setSelectedIndex(prev => Math.max(0, prev - visibleCount));
  }, [visibleCount]);

  const movePageDown = useCallback(() => {
    setSelectedIndex(prev => Math.min(maxIndex, prev + visibleCount));
  }, [maxIndex, visibleCount]);

  const moveToTop = useCallback(() => setSelectedIndex(0), []);
  const moveToBottom = useCallback(() => setSelectedIndex(maxIndex), [maxIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current) return;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          moveUp();
          break;
        case 'ArrowDown':
          e.preventDefault();
          moveDown();
          break;
        case 'PageUp':
          e.preventDefault();
          movePageUp();
          break;
        case 'PageDown':
          e.preventDefault();
          movePageDown();
          break;
        case 'Home':
          e.preventDefault();
          moveToTop();
          break;
        case 'End':
          e.preventDefault();
          moveToBottom();
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (onSelect) onSelect(selectedIndex);
          break;
        case 'Escape':
          e.preventDefault();
          if (onEscape) onEscape();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveUp, moveDown, movePageUp, movePageDown, moveToTop, moveToBottom, selectedIndex, onSelect, onEscape]);

  return {
    selectedIndex,
    setSelectedIndex: goToIndex,
    containerRef,
  };
}