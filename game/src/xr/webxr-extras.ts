/**
 * Minimal structural types for the WebXR modules the DOM/three typings may not declare
 * (plane-detection, mesh-detection, anchors, frame-rate control). We cast to these instead of
 * augmenting the global types so we never conflict with whatever @types/webxr ships.
 */

export interface XRPlaneLike {
  planeSpace: XRSpace;
  polygon: ReadonlyArray<{ x: number; y: number; z: number }>;
  orientation: 'horizontal' | 'vertical';
  semanticLabel?: string;
  lastChangedTime: number;
}

export interface XRMeshLike {
  meshSpace: XRSpace;
  vertices: Float32Array;
  indices: Uint32Array;
  semanticLabel?: string;
  lastChangedTime: number;
}

export interface XRFrameWithScene {
  detectedPlanes?: ReadonlySet<XRPlaneLike>;
  detectedMeshes?: ReadonlySet<XRMeshLike>;
}

export interface XRSessionExtras {
  enabledFeatures?: ReadonlyArray<string>;
  frameRate?: number;
  supportedFrameRates?: Float32Array;
  updateTargetFrameRate?: (rate: number) => Promise<void>;
  initiateRoomCapture?: () => Promise<void>;
  environmentBlendMode?: string;
}

export function sceneFrame(frame: XRFrame): XRFrameWithScene {
  return frame as unknown as XRFrameWithScene;
}

export function sessionExtras(session: XRSession): XRSessionExtras {
  return session as unknown as XRSessionExtras;
}

/** Normalise a runtime semantic label to the vocabulary the game uses. */
export function normaliseLabel(label: string | undefined): string {
  if (!label) return 'other';
  const l = label.toLowerCase().replace(/_/g, ' ').trim();
  if (l === 'door frame' || l === 'doorframe') return 'door';
  if (l === 'window frame') return 'window';
  if (l === 'wall face' || l === 'invisible wall face') return 'wall';
  if (l === 'desk') return 'table';
  if (l === 'global mesh') return 'global mesh';
  return l;
}
