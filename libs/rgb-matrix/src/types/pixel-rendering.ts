import { RGB } from "./render-widget.dto";

/**
 * An attempt at a format that takes into account size as a payload
 */
export type SetPixelGrid = {
  /**
   * Clear the screen first
   *
   * > default: `true`
   */
  clear?: boolean;

  /**
   * Text added to debug logs for auditing / debugging, no other functional purpose planned
   */
  debug?: string;

  /**
   * Grid of palette color references
   */
  grid: string[][];

  /**
   * Use single character indexes for palette
   */
  palette: Record<string, RGB>;
};
