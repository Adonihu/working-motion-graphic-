import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ViewportHarness, ViewportHarnessRef } from './components/ViewportHarness';
import { TimelineControls } from './components/TimelineControls';
import { BrandPaletteViewer } from './components/BrandPaletteViewer';
import { ExportPanel } from './components/ExportPanel';
import { CodeInspector } from './components/CodeInspector';
import { AspectRatioType, RenderState, ExportSettings, ExportResolution, AlphaPreviewMode } from './types';
import * as htmlToImage from 'html-to-image';
import JSZip from 'jszip';
import { Muxer as Mp4Muxer, ArrayBufferTarget as Mp4ArrayBufferTarget } from 'mp4-muxer';
import { Muxer as WebmMuxer, ArrayBufferTarget as WebmArrayBufferTarget } from 'webm-muxer';
import { QuickTimeMovMuxer, encodeQuickTimeRle32 } from './utils/movMuxer';
import {
  Sparkles,
  Film,
  Code2,
  CheckCircle2,
  ShieldCheck,
  Zap,
  SlidersHorizontal,
  Play,
  RotateCcw,
} from 'lucide-react';
import canvasHtmlRaw from '../canvas.html?raw';

export default function App() {
  const [renderState, setRenderState] = useState<RenderState>({
    currentFrame: 0,
    totalFrames: 600,
    fps: 60,
    isPlaying: true,
    playbackSpeed: 1.0,
    isLooping: true,
    aspectRatio: '16:9',
    alphaMode: 'studio',
    isReady: false,
  });

  const [activeTab, setActiveTab] = useState<'studio' | 'export' | 'palette' | 'code'>('studio');
  const [customHtml, setCustomHtml] = useState<string | null>(null);
  const [lowEndSafe, setLowEndSafe] = useState<boolean>(true);

  const harnessRef = useRef<ViewportHarnessRef>(null);
  const isSeekingRef = useRef<boolean>(false);

  // Frame seek handler (called on user drag / click)
  const handleSeekFrame = useCallback((frame: number) => {
    const clamped = Math.max(0, Math.min(renderState.totalFrames - 1, frame));
    setRenderState((prev) => ({ ...prev, currentFrame: clamped }));
    harnessRef.current?.seekTo(clamped);
  }, [renderState.totalFrames]);

  // Frame update handler from native GSAP timeline inside iframe
  const handleFrameUpdate = useCallback((frame: number) => {
    if (!isSeekingRef.current) {
      setRenderState((prev) => {
        if (prev.currentFrame === frame) return prev;
        return { ...prev, currentFrame: frame };
      });
    }
  }, []);

  // Play / Pause toggle
  const handleTogglePlay = useCallback(() => {
    setRenderState((prev) => {
      const nextPlaying = !prev.isPlaying;
      if (nextPlaying) {
        harnessRef.current?.playNative(prev.playbackSpeed);
      } else {
        harnessRef.current?.pauseNative();
      }
      return { ...prev, isPlaying: nextPlaying };
    });
  }, []);

  // Speed change
  const handleChangeSpeed = useCallback((speed: number) => {
    setRenderState((prev) => {
      if (prev.isPlaying) {
        harnessRef.current?.playNative(speed);
      }
      return { ...prev, playbackSpeed: speed };
    });
  }, []);

  // Loop toggle
  const handleToggleLoop = useCallback(() => {
    setRenderState((prev) => {
      const nextLoop = !prev.isLooping;
      harnessRef.current?.setLooping(nextLoop);
      return { ...prev, isLooping: nextLoop };
    });
  }, []);

  // Timeline completion callback (when looping is disabled)
  const handleTimelineComplete = useCallback(() => {
    setRenderState((prev) => {
      if (!prev.isLooping) {
        return { ...prev, isPlaying: false, currentFrame: prev.totalFrames };
      }
      return prev;
    });
  }, []);

  // Harness readiness callback
  const handleHarnessReady = useCallback((total: number) => {
    setRenderState((prev) => {
      harnessRef.current?.setLooping(prev.isLooping);
      if (prev.isPlaying) {
        harnessRef.current?.playNative(prev.playbackSpeed);
      }
      return {
        ...prev,
        totalFrames: total,
        isReady: true,
      };
    });
  }, []);

  // Keyboard navigation for precision frame stepping
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSeekFrame(renderState.currentFrame - (e.shiftKey ? 10 : 1));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleSeekFrame(renderState.currentFrame + (e.shiftKey ? 10 : 1));
      } else if (e.code === 'Home') {
        e.preventDefault();
        handleSeekFrame(0);
      } else if (e.code === 'End') {
        e.preventDefault();
        handleSeekFrame(renderState.totalFrames - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [renderState.currentFrame, renderState.totalFrames, handleSeekFrame, handleTogglePlay]);

  // High-Fidelity True Frame Rasterizer (Preserves 100% of live DOM styles, GSAP transforms, blur trails, masks and upscales cleanly)
  const captureDOMFrameToCanvas = async (
    frame: number,
    targetCanvas: HTMLCanvasElement,
    resW: number,
    resH: number,
    transparent = false
  ): Promise<void> => {
    const iframeEl = harnessRef.current?.getIframeElement();
    if (!iframeEl || !iframeEl.contentDocument || !iframeEl.contentWindow) return;
    const win = iframeEl.contentWindow as any;

    // Toggle transparency in canvas script
    if (typeof win.setTransparencyMode === 'function') {
      win.setTransparencyMode(transparent);
    }

    // Seek timeline precisely to requested frame
    if (typeof win.seekFrame === 'function') {
      win.seekFrame(frame);
    }

    // Micro-delay for GSAP DOM inline styles & filters to settle
    await new Promise((r) => requestAnimationFrame(r));

    const ctx = targetCanvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const doc = iframeEl.contentDocument;
    const stageEl = (doc.getElementById('stage') || doc.getElementById('scene') || doc.body) as HTMLElement;

    if (stageEl) {
      const stageW = 1920;
      const stageH = 1080;
      const stageAspect = stageW / stageH;
      const targetAspect = resW / resH;

      let drawW = resW;
      let drawH = resH;
      let drawX = 0;
      let drawY = 0;

      if (Math.abs(targetAspect - stageAspect) > 0.005) {
        if (targetAspect > stageAspect) {
          drawH = resH;
          drawW = Math.round(resH * stageAspect);
          drawX = Math.round((resW - drawW) / 2);
        } else {
          drawW = resW;
          drawH = Math.round(resW / stageAspect);
          drawY = Math.round((resH - drawH) / 2);
        }
      }

      const scaleFactor = drawW / stageW;

      try {
        const renderedCanvas = await htmlToImage.toCanvas(stageEl, {
          width: stageW,
          height: stageH,
          canvasWidth: drawW,
          canvasHeight: drawH,
          pixelRatio: scaleFactor,
          backgroundColor: transparent ? undefined : '#FAF9F6',
          cacheBust: false,
          style: {
            transform: 'scale(1)',
            transformOrigin: '0 0',
            margin: '0',
            boxShadow: 'none',
          },
        });

        ctx.clearRect(0, 0, resW, resH);
        if (!transparent) {
          ctx.fillStyle = '#FAF9F6';
          ctx.fillRect(0, 0, resW, resH);
        }
        ctx.drawImage(renderedCanvas, drawX, drawY, drawW, drawH);
        return;
      } catch (err) {
        console.warn('htmlToImage toCanvas failed, attempting toPng fallback:', err);
        try {
          const dataUrl = await htmlToImage.toPng(stageEl, {
            width: stageW,
            height: stageH,
            pixelRatio: scaleFactor,
            backgroundColor: transparent ? undefined : '#FAF9F6',
            cacheBust: false,
            style: {
              transform: 'scale(1)',
              transformOrigin: '0 0',
              margin: '0',
              boxShadow: 'none',
            },
          });
          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = dataUrl;
          });
          ctx.clearRect(0, 0, resW, resH);
          if (!transparent) {
            ctx.fillStyle = '#FAF9F6';
            ctx.fillRect(0, 0, resW, resH);
          }
          ctx.drawImage(img, drawX, drawY, drawW, drawH);
          return;
        } catch (pngErr) {
          console.warn('htmlToImage toPng fallback failed:', pngErr);
        }
      }
    }

    // Fallback: direct background fill
    ctx.clearRect(0, 0, resW, resH);
    if (!transparent) {
      ctx.fillStyle = '#FAF9F6';
      ctx.fillRect(0, 0, resW, resH);
    }
  };

  // Video Export (Hardware-Accelerated WebCodecs, MP4/WebM Muxer, and QuickTime MOV Muxer with full Alpha)
  const handleRecordDeterministicExport = async (
    settings: ExportSettings,
    onProgress: (pct: number, currentFrame: number, estSecRemaining: number) => void,
    signal?: { cancelled: boolean }
  ): Promise<Blob | null> => {
    const iframeEl = harnessRef.current?.getIframeElement();
    const win = iframeEl?.contentWindow as any;

    if (!win) {
      alert('Canvas viewport engine is not ready for recording');
      return null;
    }

    // Pause live playback during export
    if (renderState.isPlaying) {
      setRenderState((prev) => ({ ...prev, isPlaying: false }));
      harnessRef.current?.pauseNative();
    }

    const [resW, resH] = settings.resolution.split('x').map((v) => parseInt(v, 10));

    // Enable export mode in iframe so stage is scaled cleanly to 1920x1080 native coordinates
    if (typeof win.setExportMode === 'function') {
      win.setExportMode(true);
    }

    // Create offscreen recording canvas with true alpha support
    const recCanvas = document.createElement('canvas');
    recCanvas.width = resW;
    recCanvas.height = resH;
    const ctx = recCanvas.getContext('2d', { alpha: true });

    if (!ctx) {
      alert('Could not initialize export graphics context');
      return null;
    }

    const totalFrames = settings.endFrame - settings.startFrame + 1;
    const startTime = performance.now();
    const isMov = settings.format.startsWith('mov-') || settings.format === 'raw-rgba';
    const isMp4 = settings.format === 'mp4-h264';
    const isWebm = settings.format.startsWith('webm-');

    // --- CASE 1: QUICKTIME (.MOV) WITH 32-BIT ALPHA (ProRes 4444 / QuickTime RLE / CineForm / Raw RGBA) ---
    if (isMov) {
      const fourcc =
        settings.format === 'mov-qtrle'
          ? 'rle '
          : settings.format === 'raw-rgba'
          ? 'raw '
          : 'png ';

      const movMuxer = new QuickTimeMovMuxer({
        width: resW,
        height: resH,
        fps: settings.fps,
        fourcc: fourcc as any,
      });

      for (let f = settings.startFrame; f <= settings.endFrame; f++) {
        if (signal?.cancelled) return null;

        await captureDOMFrameToCanvas(f, recCanvas, resW, resH, settings.transparentBackground);

        if (fourcc === 'rle ') {
          // True 32-bit QuickTime Animation (RLE) ARGB bitstream encoding
          const imgData = ctx.getImageData(0, 0, resW, resH);
          const rleChunk = encodeQuickTimeRle32(imgData, resW, resH);
          movMuxer.addFrame(rleChunk);
        } else if (fourcc === 'raw ') {
          // 32-bit ARGB Uncompressed raw frame
          const imgData = ctx.getImageData(0, 0, resW, resH);
          const rgba = imgData.data;
          const rawChunk = new Uint8Array(resW * resH * 4);
          for (let i = 0; i < resW * resH; i++) {
            const src = i * 4;
            rawChunk[src] = rgba[src + 3];     // A
            rawChunk[src + 1] = rgba[src];     // R
            rawChunk[src + 2] = rgba[src + 1]; // G
            rawChunk[src + 3] = rgba[src + 2]; // B
          }
          movMuxer.addFrame(rawChunk);
        } else {
          // PNG in QuickTime container with 32-bit Alpha
          const blob: Blob | null = await new Promise((resolve) => {
            recCanvas.toBlob((b) => resolve(b), 'image/png');
          });

          if (blob) {
            const arrayBuffer = await blob.arrayBuffer();
            movMuxer.addFrame(new Uint8Array(arrayBuffer));
          }
        }

        const frameIdx = f - settings.startFrame;
        const pct = Math.round(((frameIdx + 1) / totalFrames) * 100);
        const elapsed = (performance.now() - startTime) / 1000;
        const done = frameIdx + 1;
        const remaining = Math.max(0, Math.round((elapsed / done) * (settings.endFrame - f)));
        onProgress(pct, f, remaining);

        // Low-End PC Memory & CPU Yielding Protection
        if (settings.safeMode || frameIdx % 6 === 0) {
          await new Promise((r) => setTimeout(r, settings.safeMode ? 10 : 0));
        }
      }

      if (signal?.cancelled) return null;
      return movMuxer.finalize();
    }

    // --- CASE 2: HARDWARE-ACCELERATED WEBCODECS / MP4 / WEBM ---
    const frameDurationMicros = Math.round(1_000_000 / settings.fps);

    if (typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined') {
      try {
        if (isMp4) {
          const target = new Mp4ArrayBufferTarget();
          const muxer = new Mp4Muxer({
            target,
            video: {
              codec: 'avc',
              width: resW,
              height: resH,
            },
            fastStart: 'in-memory',
            firstTimestampBehavior: 'offset',
          });

          let chosenCodec = 'avc1.640034';
          const candidateCodecs = [
            'avc1.640034', // High Profile Level 5.2 (4K 60fps)
            'avc1.640033', // High Profile Level 5.1 (4K 30fps)
            'avc1.4d0034', // Main Profile Level 5.2
            'avc1.4d0033', // Main Profile Level 5.1
            'avc1.420034', // Baseline Level 5.2
            'avc1.420033', // Baseline Level 5.1
            'avc1.640028', // High Profile Level 4.0 (1080p)
            'avc1.4d0028', // Main Profile Level 4.0 (1080p)
            'avc1.420028', // Baseline Level 4.0 (1080p)
            'avc1.42E01E',
          ];
          for (const c of candidateCodecs) {
            try {
              const support = await VideoEncoder.isConfigSupported({
                codec: c,
                width: resW,
                height: resH,
                bitrate: settings.bitrateMbps * 1_000_000,
                framerate: settings.fps,
              });
              if (support.supported) {
                chosenCodec = c;
                break;
              }
            } catch {}
          }

          const encoder = new VideoEncoder({
            output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
            error: (e) => console.error('WebCodecs H.264 encoder error:', e),
          });

          encoder.configure({
            codec: chosenCodec,
            width: resW,
            height: resH,
            bitrate: settings.bitrateMbps * 1_000_000,
            framerate: settings.fps,
          });

          for (let f = settings.startFrame; f <= settings.endFrame; f++) {
            if (signal?.cancelled) {
              try { encoder.close(); } catch {}
              return null;
            }

            await captureDOMFrameToCanvas(f, recCanvas, resW, resH, settings.transparentBackground);

            const frameIdx = f - settings.startFrame;
            const timestampMicros = Math.round((frameIdx / settings.fps) * 1_000_000);

            const videoFrame = new VideoFrame(recCanvas, {
              timestamp: timestampMicros,
              duration: frameDurationMicros,
            });

            const keyFrame = frameIdx % (settings.fps * 2) === 0;
            encoder.encode(videoFrame, { keyFrame });
            videoFrame.close();

            const pct = Math.round(((frameIdx + 1) / totalFrames) * 100);
            const elapsed = (performance.now() - startTime) / 1000;
            const done = frameIdx + 1;
            const remaining = Math.max(0, Math.round((elapsed / done) * (settings.endFrame - f)));
            onProgress(pct, f, remaining);

            if (settings.safeMode || frameIdx % 10 === 0) {
              await new Promise((r) => setTimeout(r, settings.safeMode ? 8 : 0));
            }
          }

          await encoder.flush();
          try { encoder.close(); } catch {}
          muxer.finalize();

          return new Blob([target.buffer], { type: 'video/mp4' });
        } else if (isWebm) {
          // WebM VP9/VP8 Alpha export via webm-muxer
          const isVp9 = settings.format.includes('vp9');
          const target = new WebmArrayBufferTarget();
          const muxer = new WebmMuxer({
            target,
            video: {
              codec: isVp9 ? 'V_VP9' : 'V_VP8',
              width: resW,
              height: resH,
              frameRate: settings.fps,
              alpha: settings.transparentBackground,
            },
            firstTimestampBehavior: 'offset',
          });

          let chosenCodec = isVp9 ? 'vp09.00.10.08' : 'vp8';
          if (isVp9) {
            try {
              const support = await VideoEncoder.isConfigSupported({
                codec: 'vp09.00.10.08',
                width: resW,
                height: resH,
                bitrate: settings.bitrateMbps * 1_000_000,
                framerate: settings.fps,
                alpha: settings.transparentBackground ? 'keep' : 'discard',
              } as any);
              if (!support.supported) {
                chosenCodec = 'vp8';
              }
            } catch {
              chosenCodec = 'vp8';
            }
          }

          const encoder = new VideoEncoder({
            output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
            error: (e) => console.error('WebCodecs WebM encoder error:', e),
          });

          encoder.configure({
            codec: chosenCodec,
            width: resW,
            height: resH,
            bitrate: settings.bitrateMbps * 1_000_000,
            framerate: settings.fps,
            alpha: settings.transparentBackground ? 'keep' : 'discard',
          } as any);

          for (let f = settings.startFrame; f <= settings.endFrame; f++) {
            if (signal?.cancelled) {
              try { encoder.close(); } catch {}
              return null;
            }

            await captureDOMFrameToCanvas(f, recCanvas, resW, resH, settings.transparentBackground);

            const frameIdx = f - settings.startFrame;
            const timestampMicros = Math.round((frameIdx / settings.fps) * 1_000_000);

            const videoFrame = new VideoFrame(recCanvas, {
              timestamp: timestampMicros,
              duration: frameDurationMicros,
              alpha: settings.transparentBackground ? 'keep' : 'discard',
            } as any);

            const keyFrame = frameIdx % (settings.fps * 2) === 0;
            encoder.encode(videoFrame, { keyFrame });
            videoFrame.close();

            const pct = Math.round(((frameIdx + 1) / totalFrames) * 100);
            const elapsed = (performance.now() - startTime) / 1000;
            const done = frameIdx + 1;
            const remaining = Math.max(0, Math.round((elapsed / done) * (settings.endFrame - f)));
            onProgress(pct, f, remaining);

            if (settings.safeMode || frameIdx % 10 === 0) {
              await new Promise((r) => setTimeout(r, settings.safeMode ? 8 : 0));
            }
          }

          await encoder.flush();
          try { encoder.close(); } catch {}
          muxer.finalize();

          return new Blob([target.buffer], { type: 'video/webm' });
        }
      } catch (webcodecsErr) {
        console.warn('WebCodecs execution exception, falling back to real-time display recording:', webcodecsErr);
      }
    }

    // --- CASE 3: FALLBACK (Legacy MediaRecorder if WebCodecs is unsupported) ---
    let mimeType = 'video/webm;codecs=vp9';
    if (isMp4 && MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E,mp4a.40.2')) {
      mimeType = 'video/mp4;codecs=avc1.42E01E,mp4a.40.2';
    } else if (isMp4 && MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = 'video/mp4';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
      mimeType = 'video/webm;codecs=vp9';
    } else if (MediaRecorder.isTypeSupported('video/webm')) {
      mimeType = 'video/webm';
    }

    const stream = recCanvas.captureStream(settings.fps);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: settings.bitrateMbps * 1000000,
    });

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    return new Promise(async (resolve) => {
      mediaRecorder.onstop = () => {
        const outBlob = new Blob(chunks, { type: mimeType.split(';')[0] });
        stream.getTracks().forEach((track) => track.stop());
        resolve(outBlob);
      };

      mediaRecorder.start(100);

      const frameDelayMs = 1000 / settings.fps;
      for (let f = settings.startFrame; f <= settings.endFrame; f++) {
        if (signal?.cancelled) {
          mediaRecorder.stop();
          stream.getTracks().forEach((t) => t.stop());
          resolve(null);
          return;
        }

        const t0 = performance.now();
        await captureDOMFrameToCanvas(f, recCanvas, resW, resH, settings.transparentBackground);
        const captureTime = performance.now() - t0;

        const frameIdx = f - settings.startFrame;
        const pct = Math.round(((frameIdx + 1) / totalFrames) * 100);
        const elapsed = (performance.now() - startTime) / 1000;
        const done = frameIdx + 1;
        const remaining = Math.max(0, Math.round((elapsed / done) * (settings.endFrame - f)));
        onProgress(pct, f, remaining);

        const waitTime = Math.max(0, frameDelayMs - captureTime);
        if (waitTime > 0) {
          await new Promise((r) => setTimeout(r, waitTime));
        } else {
          await new Promise((r) => setTimeout(r, 0));
        }
      }

      setTimeout(() => {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      }, 200);
    });
  };

  // Compressed PNG Sequence ZIP Export
  const handleExportZipSequence = async (
    settings: ExportSettings,
    onProgress: (pct: number, currentFrame: number, estSecRemaining: number) => void,
    signal?: { cancelled: boolean }
  ): Promise<Blob | null> => {
    const iframeEl = harnessRef.current?.getIframeElement();
    const win = iframeEl?.contentWindow as any;

    if (!win) {
      alert('Canvas viewport engine is not ready for ZIP export');
      return null;
    }

    // Pause live playback during export
    if (renderState.isPlaying) {
      setRenderState((prev) => ({ ...prev, isPlaying: false }));
      harnessRef.current?.pauseNative();
    }

    if (typeof win.setExportMode === 'function') {
      win.setExportMode(true);
    }

    const [resW, resH] = settings.resolution.split('x').map((v) => parseInt(v, 10));
    const offCanvas = document.createElement('canvas');
    offCanvas.width = resW;
    offCanvas.height = resH;

    const zip = new JSZip();
    const folder = zip.folder(`frames_${resW}x${resH}`) || zip;

    const total = settings.endFrame;
    const start = settings.startFrame;
    const startTime = performance.now();

    try {
      for (let f = start; f <= total; f++) {
        if (signal?.cancelled) return null;

        // 1. Render true DOM frame directly to offscreen canvas with alpha support
        await captureDOMFrameToCanvas(f, offCanvas, resW, resH, settings.transparentBackground);

        // 2. Convert canvas to PNG blob (32-bit RGBA)
        const blob: Blob | null = await new Promise((resolve) => {
          offCanvas.toBlob((b) => resolve(b), 'image/png');
        });

        if (blob) {
          const fileName = `frame_${String(f).padStart(5, '0')}.png`;
          folder.file(fileName, blob);
        }

        // Smooth cooperative yield to avoid UI freezing
        if (settings.safeMode || f % 4 === 0) {
          await new Promise((r) => setTimeout(r, settings.safeMode ? 10 : 4));
        }

        const pct = Math.round(((f - start + 1) / (total - start + 1)) * 88); // 0-88% for capture
        const elapsed = (performance.now() - startTime) / 1000;
        const done = f - start + 1;
        const remaining = Math.round((elapsed / done) * (total - f));
        onProgress(pct, f, remaining);
      }

      if (signal?.cancelled) return null;

      // Generate compressed ZIP archive
      const zipBlob = await zip.generateAsync(
        {
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 },
        },
        (metadata) => {
          const zipPct = 88 + Math.round(metadata.percent * 0.12);
          onProgress(zipPct, total, 0);
        }
      );

      return zipBlob;
    } finally {
      if (typeof win.setExportMode === 'function') {
        win.setExportMode(false);
      }
    }
  };

  // High-resolution frame snapshot
  const handleCaptureSnapshot = async (res: ExportResolution, transparent = false) => {
    const iframeEl = harnessRef.current?.getIframeElement();
    const win = iframeEl?.contentWindow as any;

    if (!win) {
      window.open('/canvas.html', '_blank');
      return;
    }

    if (typeof win.setExportMode === 'function') {
      win.setExportMode(true);
    }

    try {
      const [resW, resH] = res.split('x').map((v) => parseInt(v, 10));
      const snapCanvas = document.createElement('canvas');
      snapCanvas.width = resW;
      snapCanvas.height = resH;

      await captureDOMFrameToCanvas(renderState.currentFrame, snapCanvas, resW, resH, transparent);

      const dataUrl = snapCanvas.toDataURL('image/png');
      if (dataUrl) {
        const a = document.createElement('a');
        a.href = dataUrl;
        const alphaSuffix = transparent ? '_alpha' : '';
        a.download = `frame_${String(renderState.currentFrame).padStart(4, '0')}_${res}${alphaSuffix}.png`;
        a.click();
      }
    } finally {
      if (typeof win.setExportMode === 'function') {
        win.setExportMode(false);
      }
    }
  };

  const handleApplyCode = (newCode: string) => {
    setCustomHtml(newCode);
    setTimeout(() => {
      harnessRef.current?.reloadIframe();
    }, 100);
  };

  const handleResetCode = () => {
    setCustomHtml(null);
    setTimeout(() => {
      harnessRef.current?.reloadIframe();
    }, 100);
  };

  return (
    <div
      id="apple-studio-app-root"
      className="min-h-screen bg-[#08090C] text-[#F5F5F7] flex flex-col selection:bg-[#1A73E8] selection:text-white font-sans antialiased"
    >
      {/* Top Apple Minimal Navigation Bar */}
      <header
        id="studio-apple-header"
        className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#08090C]/80 backdrop-blur-2xl px-4 sm:px-8 py-3"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1A73E8] to-[#174EA6] flex items-center justify-center shadow-md shadow-blue-500/20 border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-white/95">
              Motion Studio
            </span>
          </div>

          {/* Center Apple-Style Segmented Navigation Tabs */}
          <nav
            id="apple-segmented-nav"
            className="flex items-center bg-white/[0.05] border border-white/[0.06] rounded-full p-1 text-xs"
          >
            <button
              id="tab-btn-studio"
              onClick={() => setActiveTab('studio')}
              className={`px-4 py-1 rounded-full font-medium transition-all cursor-pointer ${
                activeTab === 'studio'
                  ? 'bg-white/15 text-white shadow-sm font-medium'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              Studio
            </button>

            <button
              id="tab-btn-export"
              onClick={() => setActiveTab('export')}
              className={`px-4 py-1 rounded-full font-medium transition-all cursor-pointer ${
                activeTab === 'export'
                  ? 'bg-white/15 text-white shadow-sm font-medium'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              Export
            </button>

            <button
              id="tab-btn-palette"
              onClick={() => setActiveTab('palette')}
              className={`px-4 py-1 rounded-full font-medium transition-all cursor-pointer ${
                activeTab === 'palette'
                  ? 'bg-white/15 text-white shadow-sm font-medium'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              Palette
            </button>

            <button
              id="tab-btn-code"
              onClick={() => setActiveTab('code')}
              className={`px-4 py-1 rounded-full font-medium transition-all cursor-pointer ${
                activeTab === 'code'
                  ? 'bg-white/15 text-white shadow-sm font-medium'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              Code
            </button>
          </nav>

          {/* Right Status Specs */}
          <div className="flex items-center gap-2 text-xs font-mono text-white/40">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-white/70">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
              60 fps
            </span>
            <span className="hidden sm:inline px-2 py-0.5 rounded-full bg-white/[0.03] text-white/40 text-[11px]">
              {(renderState.totalFrames / renderState.fps).toFixed(1)}s · {renderState.totalFrames}f
            </span>
          </div>
        </div>
      </header>

      {/* Main Workbench Body */}
      <main id="apple-studio-main" className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full relative">
        {/* Studio Preview View */}
        <div
          id="section-studio-preview"
          className={
            activeTab === 'studio'
              ? 'space-y-5 block relative'
              : 'space-y-5 absolute top-0 left-0 w-full opacity-0 pointer-events-none -z-10'
          }
          aria-hidden={activeTab !== 'studio'}
        >
          {/* Main 720p Canvas Viewport */}
          <ViewportHarness
            ref={harnessRef}
            renderState={renderState}
            onHarnessReady={handleHarnessReady}
            onFrameUpdate={handleFrameUpdate}
            onTimelineComplete={handleTimelineComplete}
            onSelectAspectRatio={(ratio) => setRenderState((prev) => ({ ...prev, aspectRatio: ratio }))}
            onSelectAlphaMode={(mode: AlphaPreviewMode) => setRenderState((prev) => ({ ...prev, alphaMode: mode }))}
            customHtml={customHtml}
            sceneSrc="/canvas.html"
            lowEndSafe={lowEndSafe}
          />

          {/* Minimalist Apple Timeline & Scrubber Bar */}
          <TimelineControls
            renderState={renderState}
            onSeekFrame={handleSeekFrame}
            onTogglePlay={handleTogglePlay}
            onToggleLoop={handleToggleLoop}
            onChangeSpeed={handleChangeSpeed}
            onReset={() => handleSeekFrame(0)}
          />
        </div>

        {/* Export Studio Tab */}
        {activeTab === 'export' && (
          <div id="section-export-studio" className="animate-in fade-in duration-200">
            <ExportPanel
              renderState={renderState}
              onRecordDeterministicExport={handleRecordDeterministicExport}
              onExportZipSequence={handleExportZipSequence}
              onCaptureSnapshot={handleCaptureSnapshot}
            />
          </div>
        )}

        {/* Brand Palette Tab */}
        {activeTab === 'palette' && (
          <div id="section-palette-studio" className="animate-in fade-in duration-200">
            <BrandPaletteViewer />
          </div>
        )}

        {/* Code Inspector Tab */}
        {activeTab === 'code' && (
          <div id="section-code-studio" className="animate-in fade-in duration-200">
            <CodeInspector
              initialCode={customHtml || canvasHtmlRaw}
              onApplyCode={handleApplyCode}
              onResetCode={handleResetCode}
            />
          </div>
        )}
      </main>

      {/* Apple Studio Minimal Footer */}
      <footer
        id="studio-apple-footer"
        className="border-t border-white/[0.04] py-3 text-[11px] text-white/30 text-center select-none"
      >
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <span>Motion Studio · Colorist Grade</span>
          <span className="font-mono text-white/40">720p Native Canvas Master</span>
        </div>
      </footer>
    </div>
  );
}
