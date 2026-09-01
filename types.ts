export interface ActMarker {
  id: string;
  name: string;
  subtitle: string;
  timeSec: number;
  frame: number;
  color: string;
}

export interface BrandColor {
  name: string;
  hex: string;
  threeHex: string;
  tier: 'Tier 1 · Anchor' | 'Tier 2 · Voice' | 'Tier 3 · Bridge' | 'Tier 4 · Atmosphere';
  ire: string;
  role: string;
  description: string;
  bgClass: string;
}

export interface ColorTier {
  tierNumber: 1 | 2 | 3 | 4;
  badge: string;
  title: string;
  hexList: string[];
  ire: string;
  ratioPercent: number;
  description: string;
  borderClass: string;
  badgeBgClass: string;
  badgeTextClass: string;
}

export type AspectRatioType = '1:1' | '16:9' | '9:16' | '4:5' | 'free';

export type AlphaPreviewMode = 'studio' | 'checkerboard' | 'matte';

export interface RenderState {
  currentFrame: number;
  totalFrames: number;
  fps: number;
  isPlaying: boolean;
  playbackSpeed: number;
  isLooping: boolean;
  aspectRatio: AspectRatioType;
  alphaMode: AlphaPreviewMode;
  isReady: boolean;
}

export type ExportResolution =
  | '3840x2160' // 4K UHD (16:9)
  | '2560x1440' // 2K QHD (16:9)
  | '1920x1080' // 1080p FHD (16:9)
  | '1280x720'  // 720p HD (16:9)
  | '2160x2160' // 4K Square (1:1)
  | '1440x1440' // 2K Square (1:1)
  | '1080x1080' // 1080p Square (1:1)
  | '720x720'   // 720p Square (1:1)
  | '800x800'
  | '1080x1920' // 9:16 Vertical
  | '1080x1350'; // 4:5 Portrait

export type ExportFormat =
  | 'mov-prores4444' // Apple ProRes 4444 & 4444 XQ (.mov with Alpha)
  | 'mov-qtrle' // QuickTime Animation / qtrle (.mov with Alpha)
  | 'mov-cineform' // GoPro CineForm RGB + Alpha (.mov)
  | 'mov-dnxhr' // Avid DNxHR HQX 444 (.mov with Alpha)
  | 'webm-vp9-alpha' // WebM VP9 Transparent Video (Web / OBS / NLEs)
  | 'webm-vp8-alpha' // WebM VP8 Transparent Video
  | 'avi-huffyuv' // Lossless HuffYUV RGBA (.avi)
  | 'raw-rgba' // Uncompressed Raw 32-bit RGBA (.mov)
  | 'mp4-h264' // Standard H.264 MP4 (Universal)
  | 'png-sequence'; // Lossless 32-bit RGBA PNG Sequence (.zip)

export interface ExportSettings {
  resolution: ExportResolution;
  fps: 24 | 30 | 60;
  format: ExportFormat;
  bitrateMbps: number;
  transparentBackground: boolean; // True Alpha Channel Transparency
  safeMode: boolean; // Low-End PC Memory & CPU Crash Protection
  startFrame: number;
  endFrame: number;
}

