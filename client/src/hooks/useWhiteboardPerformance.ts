import { useCallback, useRef, useMemo } from 'react';

type Tool = 'brush' | 'pen' | 'marker' | 'text' | 'line' | 'circle' | 'rectangle' | 'triangle' | 'arrow' | 'polygon' | 'eraser' | 'image' | 'select' | 'freeform' | 'connector' | 'stamp' | 'highlighter';

interface DrawObject {
  id: string;
  tool: Tool;
  strokeColor: string;
  fillColor?: string;
  lineWidth: number;
  opacity: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  points?: Array<{ x: number; y: number }>;
  text?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  imageData?: string;
  rotation?: number;
  locked?: boolean;
  layer?: number;
  visible?: boolean;
}

interface PerformanceOptions {
  enableLazyLoading?: boolean;
  enableObjectCaching?: boolean;
  enableViewportCulling?: boolean;
  maxObjectsPerFrame?: number;
  debounceMs?: number;
}

export const useWhiteboardPerformance = (
  objects: DrawObject[],
  options: PerformanceOptions = {}
) => {
  const {
    enableLazyLoading = true,
    enableObjectCaching = true,
    enableViewportCulling = true,
    maxObjectsPerFrame = 50,
    debounceMs = 16
  } = options;

  const objectCacheRef = useRef<Map<string, ImageData>>(new Map());
  const lastRenderTimeRef = useRef<number>(0);
  const pendingObjectsRef = useRef<DrawObject[]>([]);

  // Memoized object filtering for viewport culling
  const visibleObjects = useMemo(() => {
    if (!enableViewportCulling) return objects;
    
    // Simple viewport culling - in a real implementation, you'd use actual viewport bounds
    return objects.slice(-maxObjectsPerFrame);
  }, [objects, enableViewportCulling, maxObjectsPerFrame]);

  // Debounced object processing
  const processObjects = useCallback((newObjects: DrawObject[]) => {
    const now = Date.now();
    if (now - lastRenderTimeRef.current < debounceMs) {
      pendingObjectsRef.current = newObjects;
      return;
    }

    lastRenderTimeRef.current = now;
    pendingObjectsRef.current = [];
    
    return newObjects;
  }, [debounceMs]);

  // Object caching for complex shapes
  const getCachedObject = useCallback((obj: DrawObject): ImageData | null => {
    if (!enableObjectCaching) return null;
    
    const cacheKey = `${obj.id}-${obj.tool}-${obj.strokeColor}-${obj.lineWidth}-${obj.opacity}`;
    return objectCacheRef.current.get(cacheKey) || null;
  }, [enableObjectCaching]);

  const setCachedObject = useCallback((obj: DrawObject, imageData: ImageData) => {
    if (!enableObjectCaching) return;
    
    const cacheKey = `${obj.id}-${obj.tool}-${obj.strokeColor}-${obj.lineWidth}-${obj.opacity}`;
    objectCacheRef.current.set(cacheKey, imageData);
  }, [enableObjectCaching]);

  // Lazy loading for large object sets
  const getLazyObjects = useCallback((startIndex: number = 0, count: number = maxObjectsPerFrame) => {
    if (!enableLazyLoading) return visibleObjects;
    
    return visibleObjects.slice(startIndex, startIndex + count);
  }, [visibleObjects, enableLazyLoading, maxObjectsPerFrame]);

  // Clear cache when objects change significantly
  const clearCache = useCallback(() => {
    objectCacheRef.current.clear();
  }, []);

  // Performance metrics
  const getPerformanceMetrics = useCallback(() => {
    return {
      totalObjects: objects.length,
      visibleObjects: visibleObjects.length,
      cachedObjects: objectCacheRef.current.size,
      memoryUsage: objectCacheRef.current.size * 1024, // Rough estimate
      lastRenderTime: lastRenderTimeRef.current
    };
  }, [objects.length, visibleObjects.length]);

  return {
    visibleObjects,
    processObjects,
    getCachedObject,
    setCachedObject,
    getLazyObjects,
    clearCache,
    getPerformanceMetrics
  };
};

export default useWhiteboardPerformance;
