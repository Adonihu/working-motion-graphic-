import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { AspectRatioType, RenderState, AlphaPreviewMode } from '../types';
import { Camera, RefreshCw, ExternalLink, Sparkles, Grid, Eye, EyeOff, Layers } from 'lucide-react';

interface ViewportHarnessProps {
  renderState: RenderState;
  onHarnessReady: (totalFrames: number) => void;
  onFrameRendered?: (frame: number) => void;
  onFrameUpdate?: (frame: number) => void;
  onTimelineComplete?: () => void;
  onSelectAspectRatio?: (ratio: AspectRatioType) => void;
  onSelectAlphaMode?: (mode: AlphaPreviewMode) => void;
  customHtml?: string | null;
  sceneSrc?: string;
  lowEndSafe?: boolean;
}

export interface ViewportHarnessRef {
  seekTo: (frame: number) => void;
  playNative: (speed?: number) => void;
  pauseNative: () => void;
  setLooping: (loop: boolean) => void;
  setTransparency: (enabled: boolean) => void;
  renderFrameToCanvas: (frame: number, targetCanvas: HTMLCanvasElement, w: number, h: number) => void;
  captureCanvasImage: (w?: number, h?: number) => string | null;
  getIframeElement: () => HTMLIFrameElement | null;
  getIframeWindow: () => any;
  reloadIframe: () => void;
}

export const ViewportHarness = forwardRef<ViewportHarnessRef, ViewportHarnessProps>(
  ({ renderState, onHarnessReady, onFrameRendered, onFrameUpdate, onTimelineComplete, onSelectAspectRatio, onSelectAlphaMode, customHtml, sceneSrc = '/canvas.html', lowEndSafe = false }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [harnessStatus, setHarnessStatus] = useState<string>('Initializing Engine...');

    const getAspectClass = (ratio: AspectRatioType) => {
      switch (ratio) {
        case '16:9':
          return 'aspect-video w-full max-w-5xl max-h-[580px]';
        case '1:1':
          return 'aspect-square max-w-[560px] md:max-w-[640px] lg:max-w-[720px] max-h-[720px]';
        case '9:16':
          return 'aspect-[9/16] max-w-[360px] max-h-[640px]';
        case '4:5':
          return 'aspect-[4/5] max-w-[460px] max-h-[580px]';
        case 'free':
        default:
          return 'w-full h-[620px]';
      }
    };

    // Keep iframe transparent mode synced with renderState.alphaMode
    useEffect(() => {
      try {
        const win = iframeRef.current?.contentWindow as any;
        if (win && typeof win.setTransparencyMode === 'function') {
          win.setTransparencyMode(renderState.alphaMode !== 'studio');
        }
      } catch(e) {}
    }, [renderState.alphaMode, isLoaded]);

    const attachHarnessListener = () => {
      const iframe = iframeRef.current;
      if (!iframe || !iframe.contentWindow) return;

      const checkReady = () => {
        try {
          const win = iframe.contentWindow as any;
          if (win && win.READY && typeof win.seekFrame === 'function') {
            const total = win.TOTAL_FRAMES || 840;
            setIsLoaded(true);
            setHarnessStatus('720p Native • 60 FPS');
            onHarnessReady(total);
            win.seekFrame(renderState.currentFrame);
            if (typeof win.setLooping === 'function') {
              win.setLooping(renderState.isLooping);
            }
            if (typeof win.setTransparencyMode === 'function') {
              win.setTransparencyMode(renderState.alphaMode !== 'studio');
            }

            // Register native timeline update callback
            if (typeof win.onTimelineUpdate === 'function') {
              win.onTimelineUpdate((frame: number) => {
                if (onFrameUpdate) onFrameUpdate(frame);
              });
            }

            // Register native timeline complete callback
            if (typeof win.onTimelineComplete === 'function') {
              win.onTimelineComplete(() => {
                if (onTimelineComplete) onTimelineComplete();
              });
            }
            return true;
          }
        } catch (err) {
          // ignore cross-origin while loading
        }
        return false;
      };

      if (!checkReady()) {
        const interval = setInterval(() => {
          if (checkReady()) {
            clearInterval(interval);
          }
        }, 60);
        setTimeout(() => clearInterval(interval), 8000);
      }
    };

    useEffect(() => {
      const iframe = iframeRef.current;
      if (!iframe) return;

      const handleLoad = () => {
        attachHarnessListener();
      };

      iframe.addEventListener('load', handleLoad);
      return () => iframe.removeEventListener('load', handleLoad);
    }, [customHtml]);

    useImperativeHandle(ref, () => ({
      seekTo: (frame: number) => {
        try {
          const iframe = iframeRef.current;
          if (iframe && iframe.contentWindow) {
            const win = iframe.contentWindow as any;
            if (win && typeof win.seekFrame === 'function') {
              win.seekFrame(frame);
              if (onFrameRendered) onFrameRendered(frame);
            }
          }
        } catch (e) {
          // Ignore harmless seek warnings during transitions
        }
      },
      playNative: (speed = 1.0) => {
        try {
          const win = iframeRef.current?.contentWindow as any;
          if (win) {
            if (typeof win.playNative === 'function') {
              win.playNative(speed);
            } else if (typeof win.playTimeline === 'function') {
              win.playTimeline(speed);
            } else if (win.tl && typeof win.tl.play === 'function') {
              win.tl.timeScale(speed);
              if (win.tl.progress() >= 0.999) win.tl.restart();
              else win.tl.play();
            }
          }
        } catch (e) {}
      },
      pauseNative: () => {
        try {
          const win = iframeRef.current?.contentWindow as any;
          if (win) {
            if (typeof win.pauseNative === 'function') {
              win.pauseNative();
            } else if (typeof win.pauseTimeline === 'function') {
              win.pauseTimeline();
            } else if (win.tl && typeof win.tl.pause === 'function') {
              win.tl.pause();
            }
          }
        } catch (e) {}
      },
      setLooping: (loop: boolean) => {
        try {
          const win = iframeRef.current?.contentWindow as any;
          if (win && typeof win.setLooping === 'function') {
            win.setLooping(loop);
          }
        } catch (e) {}
      },
      setTransparency: (enabled: boolean) => {
        try {
          const win = iframeRef.current?.contentWindow as any;
          if (win && typeof win.setTransparencyMode === 'function') {
            win.setTransparencyMode(enabled);
          }
        } catch (e) {}
      },
      renderFrameToCanvas: (frame: number, targetCanvas: HTMLCanvasElement, w: number, h: number) => {
        try {
          const win = iframeRef.current?.contentWindow as any;
          if (win && typeof win.renderFrameToCanvas === 'function') {
            win.renderFrameToCanvas(frame, targetCanvas, w, h);
          }
        } catch (e) {
          console.error('Error in renderFrameToCanvas:', e);
        }
      },
      captureCanvasImage: (w = 1280, h = 720) => {
        try {
          const win = iframeRef.current?.contentWindow as any;
          if (win && typeof win.getFramePNGDataUrl === 'function') {
            return win.getFramePNGDataUrl(renderState.currentFrame, w, h);
          }
        } catch (e) {
          console.warn('Canvas capture error:', e);
        }
        return null;
      },
      getIframeElement: () => iframeRef.current,
      getIframeWindow: () => iframeRef.current?.contentWindow || null,
      reloadIframe: () => {
        if (iframeRef.current) {
          setIsLoaded(false);
          setHarnessStatus('Reloading Canvas Engine...');
          if (customHtml) {
            iframeRef.current.srcdoc = customHtml;
          } else {
            iframeRef.current.src = sceneSrc;
          }
        }
      },
    }));

    const handleSnapshot = async () => {
      try {
        const win = iframeRef.current?.contentWindow as any;
        if (win) {
          const snapCanvas = document.createElement('canvas');
          snapCanvas.width = 1280;
          snapCanvas.height = 720;
          if (typeof win.renderDOMFrameToCanvas === 'function') {
            await win.renderDOMFrameToCanvas(renderState.currentFrame, snapCanvas, 1280, 720);
          } else if (typeof win.renderFrameToCanvas === 'function') {
            win.renderFrameToCanvas(renderState.currentFrame, snapCanvas, 1280, 720);
          }
          const dataUrl = snapCanvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = `frame_${String(renderState.currentFrame).padStart(4, '0')}_16x9.png`;
          link.href = dataUrl;
          link.click();
        } else {
          window.open(sceneSrc, '_blank');
        }
      } catch (err) {
        window.open(sceneSrc, '_blank');
      }
    };

    const aspectOptions: { label: string; ratio: AspectRatioType; desc: string }[] = [
      { label: '16:9', ratio: '16:9', desc: 'Widescreen 16:9 (Master 1280×720 / 1920×1080)' },
      { label: '1:1', ratio: '1:1', desc: 'Square 1:1' },
      { label: '9:16', ratio: '9:16', desc: 'Vertical 9:16 (Reels/Shorts)' },
      { label: '4:5', ratio: '4:5', desc: 'Social 4:5 (Feed)' },
      { label: 'Free', ratio: 'free', desc: 'Fluid Responsive' },
    ];

    const isCheckerboard = renderState.alphaMode === 'checkerboard';
    const isMatte = renderState.alphaMode === 'matte';

    return (
      <div id="apple-viewport-stage" className="flex flex-col items-center justify-center w-full space-y-3">
        {/* Top Minimal Apple Toolbar */}
        <div className="w-full flex flex-wrap items-center justify-between gap-3 text-xs select-none">
          {/* Left: Aspect & Alpha Pill Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Aspect Ratio Switcher */}
            <div
              id="preview-aspect-switcher"
              className="flex items-center bg-white/[0.04] border border-white/[0.06] rounded-full p-0.5"
            >
              {aspectOptions.map((opt) => (
                <button
                  key={opt.ratio}
                  id={`btn-aspect-${opt.ratio.replace(':', '-')}`}
                  onClick={() => onSelectAspectRatio && onSelectAspectRatio(opt.ratio)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    renderState.aspectRatio === opt.ratio
                      ? 'bg-white/20 text-white font-semibold shadow-xs'
                      : 'text-white/40 hover:text-white/80'
                  }`}
                  title={opt.desc}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Backdrop Mode Switcher */}
            <div
              id="preview-alpha-switcher"
              className="flex items-center bg-white/[0.04] border border-white/[0.06] rounded-full p-0.5"
            >
              <button
                id="btn-alpha-studio"
                onClick={() => onSelectAlphaMode && onSelectAlphaMode('studio')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  renderState.alphaMode === 'studio'
                    ? 'bg-white/20 text-white font-semibold shadow-xs'
                    : 'text-white/40 hover:text-white/80'
                }`}
                title="Studio Atmosphere (Deep Blue Stage)"
              >
                Studio
              </button>
              <button
                id="btn-alpha-checkerboard"
                onClick={() => onSelectAlphaMode && onSelectAlphaMode('checkerboard')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
                  renderState.alphaMode === 'checkerboard'
                    ? 'bg-emerald-500/20 text-emerald-300 font-semibold shadow-xs'
                    : 'text-white/40 hover:text-white/80'
                }`}
                title="Alpha Checkerboard"
              >
                <Grid className="w-3 h-3" />
                <span>Alpha</span>
              </button>
              <button
                id="btn-alpha-matte"
                onClick={() => onSelectAlphaMode && onSelectAlphaMode('matte')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
                  renderState.alphaMode === 'matte'
                    ? 'bg-purple-500/20 text-purple-300 font-semibold shadow-xs'
                    : 'text-white/40 hover:text-white/80'
                }`}
                title="Matte Mask"
              >
                <Layers className="w-3 h-3" />
                <span>Matte</span>
              </button>
            </div>
          </div>

          {/* Right: Quick Action Icon Buttons */}
          <div className="flex items-center gap-1">
            <button
              id="btn-snapshot-frame"
              onClick={handleSnapshot}
              className="px-3 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white border border-white/[0.06] text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
              title="Save PNG snapshot of current frame"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Snapshot</span>
            </button>
            <button
              id="btn-reload-canvas"
              onClick={() => {
                if (iframeRef.current) {
                  iframeRef.current.src = sceneSrc;
                }
              }}
              className="p-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white border border-white/[0.06] transition-all cursor-pointer"
              title="Reload Frame Engine"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <a
              id="btn-popout-preview"
              href={sceneSrc}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white border border-white/[0.06] transition-all"
              title="Open canvas in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Viewport Frame with Apple Studio Glass Bezel & Dynamic Checkerboard */}
        <div
          id="viewport-frame-box"
          className={`w-full ${getAspectClass(
            renderState.aspectRatio
          )} relative rounded-2xl overflow-hidden border border-white/[0.08] shadow-[0_24px_64px_-16px_rgba(0,0,0,0.85)] transition-all duration-300 flex items-center justify-center ${
            isCheckerboard
              ? 'bg-[#121215]'
              : 'bg-[#090A0E]'
          }`}
          style={
            isCheckerboard
              ? {
                  backgroundImage: `
                    linear-gradient(45deg, rgba(255,255,255,0.07) 25%, transparent 25%),
                    linear-gradient(-45deg, rgba(255,255,255,0.07) 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.07) 75%),
                    linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.07) 75%)
                  `,
                  backgroundSize: '24px 24px',
                  backgroundPosition: '0 0, 0 12px, 12px -12px, -12px 0px',
                }
              : undefined
          }
        >
          {/* Subtle Ambient Backlight Glow behind canvas (Only in studio mode) */}
          {!isCheckerboard && !isMatte && (
            <div className="absolute inset-0 bg-radial from-[#1A73E8]/10 via-transparent to-transparent pointer-events-none" />
          )}

          {/* Active Alpha Channel Status Badge */}
          {renderState.alphaMode !== 'studio' && (
            <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md border border-emerald-500/30 text-[10px] font-mono text-emerald-300 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34D399]" />
              <span>ALPHA TRANSPARENCY: ACTIVE (32-BIT RGBA)</span>
            </div>
          )}

          {/* Core Master Iframe */}
          <iframe
            ref={iframeRef}
            id="harness-iframe"
            src={customHtml ? undefined : sceneSrc}
            srcDoc={customHtml || undefined}
            title="Motion Canvas Animation"
            className={`w-full h-full border-0 relative z-10 select-none transition-all ${
              isMatte ? 'invert contrast-200 brightness-150 grayscale' : ''
            }`}
            style={{
              backgroundColor: renderState.alphaMode !== 'studio' ? 'transparent' : '#080c14',
              contain: lowEndSafe ? 'strict' : 'content',
            }}
            loading="eager"
          />
        </div>
      </div>
    );
  }
);

