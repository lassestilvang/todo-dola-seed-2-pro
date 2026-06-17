'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useIntersection } from '@/hooks/useIntersection';

interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  itemHeight?: number;
  itemMargin?: number;
  containerHeight?: number;
  onEndReached?: () => void;
  endReachedThreshold?: number;
  isLoading?: boolean;
}

export function VirtualizedList<T>({
  items,
  renderItem,
  keyExtractor,
  itemHeight = 60,
  itemMargin = 4,
  containerHeight = 600,
  onEndReached,
  endReachedThreshold = 0.5,
  isLoading = false,
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const visibleCount = Math.ceil(containerHeight / (itemHeight + itemMargin)) + 2;
  const startIndex = Math.max(0, Math.floor(scrollTop / (itemHeight + itemMargin)) - 1);
  const endIndex = Math.min(items.length, startIndex + visibleCount);

  const visibleItems = items.slice(startIndex, endIndex);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const totalHeight = items.length * (itemHeight + itemMargin);
  const offsetY = startIndex * (itemHeight + itemMargin);

  return (
    <div
      ref={containerRef}
      style={{ height: containerHeight, overflow: 'auto' }}
      className="virtualized-list"
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => {
            const actualIndex = startIndex + index;
            return (
              <div
                key={keyExtractor(item, actualIndex)}
                style={{
                  height: itemHeight,
                  marginBottom: itemMargin,
                }}
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
      {onEndReached && (
        <div ref={sentinelRef} style={{ height: 20 }} />
      )}
    </div>
  );
}

// Hook for infinite scroll sentinel
export function useInfiniteScroll(
  callback: () => void,
  threshold: number = 0.8
) {
  const ref = useRef<HTMLDivElement>(null);
  const observer = useIntersection(ref as unknown as React.RefObject<Element>, {
    rootMargin: '100px',
    threshold,
  });

  useEffect(() => {
    if (observer?.isIntersecting) {
      callback();
    }
  }, [observer?.isIntersecting, callback]);

  return ref;
}