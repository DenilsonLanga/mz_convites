// The reference is 992 × 1586. Preserve its aspect ratio instead of stretching it to A5.
export const REFERENCE_PRINT = {
  width: 419.53,
  height: (419.53 * 1586) / 992,
  background: "/print/petrol-gold-background.png",
  original: "/print/petrol-gold-original.png",
  sourceWidth: 992,
  sourceHeight: 1586,
} as const;
