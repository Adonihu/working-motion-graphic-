import React, { useState, useRef, useEffect } from 'react';
import { RENDER_MJS_SCRIPT, ACT_MARKERS } from '../data/sceneConstants';
import { RenderState, ExportResolution, ExportFormat, ExportSettings } from '../types';
import {
  Copy,
  Check,
  Download,
  Video,
  Terminal,
  Play,
  Loader2,
  Sparkles,
  ShieldCheck,
  Film,
  Archive,
  FileCheck,
  Camera,
  Sliders,
  Layers,
  Cpu,
  Tv,
} from 'lucide-react';

interface ExportPanelProps {
  renderState: RenderState;
  onRecordDeterministicExport: (
    settings: ExportSettings,
    onProgress: (pct: number, frame: number, estSecRemaining: number) => void,
    signal?: { cancelled: boolean }
  ) => Promise<Blob | null>;
  onExportZipSequence: (
    settings: ExportSettings,
    onProgress: (pct: number, frame: number, estSecRemaining: number) => void,
    signal?: { cancelled: boolean }
  ) => Promise<Blob | null>;
  onCaptureSnapshot: (resolution: ExportResolution, transparent?: boolean) => void;
}

interface CodecInfo {
  id: ExportFormat;
  label: string;
  container: string;
  alphaSupported: boolean;
  category: 'pro' | 'web' | 'lossless';
  description: string;
  ffmpegFlag: string;
}

const CODEC_OPTIONS: CodecInfo[] = [
  {
    id: 'mov-prores4444',
    label: 'Apple ProRes 4444 & 4444 XQ (.mov)',
    container: 'mov',
    alphaSupported: true,
    category: 'pro',
    description: 'Gold standard for After Effects, DaVinci Resolve & Premiere Pro. Up to 16-bit Alpha channel.',
    ffmpegFlag: '-c:v prores_ks -profile:v 4 -pix_fmt yuva444p10le',
  },
  {
    id: 'mov-qtrle',
    label: 'QuickTime Animation / qtrle (.mov)',
    container: 'mov',
    alphaSupported: true,
    category: 'pro',
    description: 'Lossless run-length encoded 8-bit Alpha animation. Universal NLE & Apple QuickTime playback.',
    ffmpegFlag: '-c:v qtrle -pix_fmt argb',
  },
  {
    id: 'mov-cineform',
    label: 'GoPro CineForm RGB + Alpha (.mov)',
    container: 'mov',
    alphaSupported: true,
    category: 'pro',
    description: '12-bit high dynamic range intermediate codec with alpha for Windows & Mac VFX pipelines.',
    ffmpegFlag: '-c:v cfhd -pix_fmt yuv444p10le',
  },
  {
    id: 'mov-dnxhr',
    label: 'Avid DNxHR HQX / 444 (.mov)',
    container: 'mov',
    alphaSupported: true,
    category: 'pro',
    description: 'High-bitrate Avid broadcast standard with precision alpha transparency support.',
    ffmpegFlag: '-c:v dnxhd -profile:v dnxhr_444 -pix_fmt yuv444p10le',
  },
  {
    id: 'webm-vp9-alpha',
    label: 'WebM VP9 Transparent Alpha (.webm)',
    container: 'webm',
    alphaSupported: true,
    category: 'web',
    description: 'Transparent video natively playable in browsers, OBS Studio, and video editors.',
    ffmpegFlag: '-c:v libvpx-vp9 -pix_fmt yuva420p -b:v 25M',
  },
  {
    id: 'webm-vp8-alpha',
    label: 'WebM VP8 Transparent Alpha (.webm)',
    container: 'webm',
    alphaSupported: true,
    category: 'web',
    description: 'Legacy transparent WebM format with wide hardware playback support.',
    ffmpegFlag: '-c:v libvpx -pix_fmt yuva420p -b:v 20M',
  },
  {
    id: 'avi-huffyuv',
    label: 'Lossless HuffYUV RGBA (.avi)',
    container: 'avi',
    alphaSupported: true,
    category: 'lossless',
    description: 'Blazing fast lossless RGBA compression in AVI container for archival & processing.',
    ffmpegFlag: '-c:v huffyuv -pix_fmt bgra',
  },
  {
    id: 'raw-rgba',
    label: 'Uncompressed 32-bit Raw RGBA (.mov)',
    container: 'mov',
    alphaSupported: true,
    category: 'lossless',
    description: 'Pure pixel-by-pixel uncompressed RGBA frames with direct alpha channel.',
    ffmpegFlag: '-c:v rawvideo -pix_fmt rgba',
  },
  {
    id: 'mp4-h264',
    label: 'Universal Standard MP4 (H.264)',
    container: 'mp4',
    alphaSupported: false,
    category: 'web',
    description: 'Universal compatibility for YouTube, Instagram, mobile devices, and standard web players.',
    ffmpegFlag: '-c:v libx264 -pix_fmt yuv420p -crf 16 -preset slow',
  },
  {
    id: 'png-sequence',
    label: 'Lossless 32-bit PNG Sequence (.zip)',
    container: 'zip',
    alphaSupported: true,
    category: 'lossless',
    description: 'Frame-by-frame 32-bit RGBA PNG image sequence. 100% lossless master archive.',
    ffmpegFlag: '-c:v png',
  },
];

export const ExportPanel: React.FC<ExportPanelProps> = ({
  renderState,
  onRecordDeterministicExport,
  onExportZipSequence,
  onCaptureSnapshot,
}) => {
  const [resolution, setResolution] = useState<ExportResolution>('1920x1080');
  const [fps, setFps] = useState<24 | 30 | 60>(60);
  const [format, setFormat] = useState<ExportFormat>('mov-prores4444');
  const [transparentBackground, setTransparentBackground] = useState<boolean>(false);
  const [bitrateMbps, setBitrateMbps] = useState<number>(25);
  const [safeMode, setSafeMode] = useState<boolean>(true);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedFfmpeg, setCopiedFfmpeg] = useState(false);

  // Custom Start & End Frame Range
  const [startFrame, setStartFrame] = useState<number>(0);
  const [endFrame, setEndFrame] = useState<number>(renderState.totalFrames - 1);

  const [isRecording, setIsRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [currentRenderFrame, setCurrentRenderFrame] = useState(0);
  const [estSec, setEstSec] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadFileName, setDownloadFileName] = useState<string>('');
  const [downloadSize, setDownloadSize] = useState<string | null>(null);
  const cancelSignalRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  // Keep endFrame synchronized when totalFrames updates
  useEffect(() => {
    if (renderState.totalFrames > 0 && endFrame >= renderState.totalFrames) {
      setEndFrame(renderState.totalFrames - 1);
    }
  }, [renderState.totalFrames]);

  // Update bitrate recommendation based on resolution
  useEffect(() => {
    if (resolution === '3840x2160' || resolution === '2160x2160') {
      setBitrateMbps(fps === 60 ? 55 : 40);
    } else if (resolution === '2560x1440' || resolution === '1440x1440') {
      setBitrateMbps(fps === 60 ? 35 : 25);
    } else if (resolution === '1080x1080' || resolution === '1920x1080' || resolution === '1080x1920' || resolution === '1080x1350') {
      setBitrateMbps(fps === 60 ? 25 : 18);
    } else {
      setBitrateMbps(14);
    }
  }, [resolution, fps]);

  const selectedCodecInfo = CODEC_OPTIONS.find((c) => c.id === format) || CODEC_OPTIONS[0];

  const handleCopyScript = () => {
    navigator.clipboard.writeText(RENDER_MJS_SCRIPT);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const getFfmpegCommand = () => {
    const ext = selectedCodecInfo.container;
    const alphaTag = transparentBackground ? '_alpha' : '_studio';
    const outName = `output_${resolution}_${fps}fps${alphaTag}.${ext}`;
    return `ffmpeg -y -framerate ${fps} -i frame_%05d.png ${selectedCodecInfo.ffmpegFlag} ${outName}`;
  };

  const handleCopyFfmpeg = () => {
    navigator.clipboard.writeText(getFfmpegCommand());
    setCopiedFfmpeg(true);
    setTimeout(() => setCopiedFfmpeg(false), 2000);
  };

  const handleSetFullRange = () => {
    setStartFrame(0);
    setEndFrame(renderState.totalFrames - 1);
  };

  const handleSetActRange = (actIndex: number) => {
    const act = ACT_MARKERS[actIndex];
    if (!act) return;
    const nextAct = ACT_MARKERS[actIndex + 1];
    const s = act.frame;
    const e = nextAct ? nextAct.frame - 1 : renderState.totalFrames - 1;
    setStartFrame(s);
    setEndFrame(e);
  };

  const handleStartExport = async () => {
    if (isRecording) return;
    setIsRecording(true);
    setRecordProgress(0);
    setCurrentRenderFrame(0);
    setEstSec(0);
    setDownloadUrl(null);
    setDownloadSize(null);
    cancelSignalRef.current = { cancelled: false };

    const validStart = Math.max(0, Math.min(startFrame, renderState.totalFrames - 1));
    const validEnd = Math.max(validStart, Math.min(endFrame, renderState.totalFrames - 1));

    const settings: ExportSettings = {
      resolution,
      fps,
      format,
      bitrateMbps,
      transparentBackground,
      safeMode,
      startFrame: validStart,
      endFrame: validEnd,
    };

    try {
      let blob: Blob | null = null;

      if (format === 'png-sequence') {
        blob = await onExportZipSequence(
          settings,
          (pct, frame, remaining) => {
            setRecordProgress(pct);
            setCurrentRenderFrame(frame);
            setEstSec(remaining);
          },
          cancelSignalRef.current
        );
        if (blob && !cancelSignalRef.current.cancelled) {
          const url = URL.createObjectURL(blob);
          setDownloadUrl(url);
          const alphaLabel = transparentBackground ? '_transparent' : '';
          const fname = `motion_png_${resolution}_f${validStart}-f${validEnd}_${fps}fps${alphaLabel}.zip`;
          setDownloadFileName(fname);
          const sizeMb = (blob.size / (1024 * 1024)).toFixed(1);
          setDownloadSize(`${sizeMb} MB`);
        }
      } else {
        blob = await onRecordDeterministicExport(
          settings,
          (pct, frame, remaining) => {
            setRecordProgress(pct);
            setCurrentRenderFrame(frame);
            setEstSec(remaining);
          },
          cancelSignalRef.current
        );

        if (blob && !cancelSignalRef.current.cancelled) {
          const url = URL.createObjectURL(blob);
          setDownloadUrl(url);
          const ext = selectedCodecInfo.container;
          const alphaLabel = transparentBackground ? '_transparent' : '';
          const fname = `motion_master_${resolution}_f${validStart}-f${validEnd}_${fps}fps${alphaLabel}.${ext}`;
          setDownloadFileName(fname);
          const sizeMb = (blob.size / (1024 * 1024)).toFixed(1);
          setDownloadSize(`${sizeMb} MB`);
        }
      }
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsRecording(false);
    }
  };

  const handleCancel = () => {
    cancelSignalRef.current.cancelled = true;
    setIsRecording(false);
  };

  const totalFramesToExport = Math.max(1, endFrame - startFrame + 1);
  const durationSec = (totalFramesToExport / fps).toFixed(2);

  const primaryFormats: ExportFormat[] = [
    'mov-prores4444',
    'webm-vp9-alpha',
    'mp4-h264',
    'png-sequence',
  ];

  return (
    <div
      id="apple-export-studio"
      className="bg-white/[0.02] backdrop-blur-2xl border border-white/[0.06] rounded-2xl p-5 sm:p-6 shadow-[0_16px_40px_rgba(0,0,0,0.4)] space-y-6"
    >
      {/* Header */}
      <div id="export-header-row" className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.04] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Film className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-sm font-semibold text-white tracking-tight">
              Export Studio
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono">
              Alpha Transparent Ready
            </span>
          </div>
          <p className="text-xs text-white/40 mt-1">
            Frame-accurate video rendering with alpha transparency & master archive sequence.
          </p>
        </div>

        {/* Low-End PC Safe Mode & Memory Guard */}
        <button
          id="btn-toggle-safe-mode"
          onClick={() => setSafeMode(!safeMode)}
          className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer border ${
            safeMode
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white'
          }`}
          title="Safe Mode throttles CPU and frees RAM between frames"
        >
          <Cpu className="w-3 h-3" />
          <span>RAM Guard: {safeMode ? 'Active' : 'Off'}</span>
        </button>
      </div>

      {/* Format Selection: 4 Primary Apple-style Tabs + Advanced Selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider font-mono">
            Format & Codec
          </label>
          <span className="text-xs text-[#8AB4F8] font-mono">
            {selectedCodecInfo.container.toUpperCase()} · {selectedCodecInfo.alphaSupported ? 'Alpha Supported' : 'Standard'}
          </span>
        </div>

        {/* Primary Segmented Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {primaryFormats.map((fmtId) => {
            const codec = CODEC_OPTIONS.find((c) => c.id === fmtId)!;
            const isSelected = format === fmtId;
            return (
              <button
                key={fmtId}
                id={`btn-codec-${fmtId}`}
                onClick={() => setFormat(fmtId)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white/15 border-white/20 text-white shadow-sm'
                    : 'bg-white/[0.02] border-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-xs font-semibold">{codec.label.split('(')[0]}</span>
                  {codec.alphaSupported && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-mono">
                      Alpha
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-white/40 line-clamp-1">{codec.container.toUpperCase()} master</p>
              </button>
            );
          })}
        </div>

        {/* Advanced Codecs Dropdown */}
        <div className="flex items-center gap-2 pt-1 text-xs">
          <span className="text-white/40 text-[11px]">More Formats:</span>
          <select
            value={primaryFormats.includes(format) ? '' : format}
            onChange={(e) => {
              if (e.target.value) setFormat(e.target.value as ExportFormat);
            }}
            className="bg-white/[0.04] text-white/80 text-xs rounded-lg px-2.5 py-1 border border-white/[0.06] focus:outline-none cursor-pointer"
          >
            <option value="" disabled>
              Select intermediate / broadcast codec...
            </option>
            {CODEC_OPTIONS.filter((c) => !primaryFormats.includes(c.id)).map((c) => (
              <option key={c.id} value={c.id} className="bg-[#181920] text-white">
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Primary Configuration Grid */}
      <div id="export-settings-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Resolution Selector */}
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3.5 space-y-2">
          <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider block font-mono">
            Resolution
          </label>
          <select
            id="select-export-resolution"
            value={resolution}
            onChange={(e) => setResolution(e.target.value as ExportResolution)}
            className="w-full bg-white/[0.04] text-white text-xs font-medium rounded-lg px-2.5 py-1.5 border border-white/[0.06] focus:outline-none cursor-pointer"
          >
            <optgroup label="16:9 Widescreen (Native Video)" className="bg-[#181920] font-semibold text-emerald-400">
              <option value="3840x2160" className="bg-[#181920] text-white">3840 × 2160 (4K UHD · 16:9 Master)</option>
              <option value="2560x1440" className="bg-[#181920] text-white">2560 × 1440 (2K QHD · 16:9)</option>
              <option value="1920x1080" className="bg-[#181920] text-white">1920 × 1080 (1080p FHD · 16:9)</option>
              <option value="1280x720" className="bg-[#181920] text-white">1280 × 720 (720p HD · 16:9)</option>
            </optgroup>
            <optgroup label="1:1 Square (Social Feeds)" className="bg-[#181920] font-semibold text-blue-400">
              <option value="2160x2160" className="bg-[#181920] text-white">2160 × 2160 (4K Square · 1:1)</option>
              <option value="1440x1440" className="bg-[#181920] text-white">1440 × 1440 (2K Square · 1:1)</option>
              <option value="1080x1080" className="bg-[#181920] text-white">1080 × 1080 (1080p Square · 1:1)</option>
              <option value="720x720" className="bg-[#181920] text-white">720 × 720 (720p Square · 1:1)</option>
            </optgroup>
            <optgroup label="Vertical & Portrait" className="bg-[#181920] font-semibold text-purple-400">
              <option value="1080x1920" className="bg-[#181920] text-white">1080 × 1920 (9:16 Vertical Story)</option>
              <option value="1080x1350" className="bg-[#181920] text-white">1080 × 1350 (4:5 Social Portrait)</option>
            </optgroup>
          </select>
        </div>

        {/* 2. Framerate (FPS) */}
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3.5 space-y-2">
          <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider block font-mono">
            Framerate
          </label>
          <div className="flex bg-white/[0.04] rounded-lg p-0.5 border border-white/[0.06]">
            {[24, 30, 60].map((f) => (
              <button
                key={f}
                id={`btn-fps-${f}`}
                onClick={() => setFps(f as 24 | 30 | 60)}
                className={`flex-1 py-1 rounded-md text-xs font-mono transition-all cursor-pointer ${
                  fps === f
                    ? 'bg-white/20 text-white font-semibold shadow-xs'
                    : 'text-white/40 hover:text-white/80'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Alpha Transparency Toggle */}
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider block font-mono">
              Transparency
            </label>
            <span className="text-[10px] font-mono text-white/50">
              {transparentBackground ? 'Alpha' : 'Studio'}
            </span>
          </div>
          <button
            id="btn-toggle-transparency"
            onClick={() => setTransparentBackground(!transparentBackground)}
            className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
              transparentBackground
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-white/[0.04] border-white/[0.06] text-white/60 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{transparentBackground ? 'Transparent Alpha' : 'Studio Stage'}</span>
          </button>
        </div>

        {/* 4. Bitrate & Quality */}
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3.5 space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider block font-mono">
              Quality
            </label>
            <span className="text-xs font-mono text-white/70">
              {format === 'png-sequence' || format === 'avi-huffyuv' || format === 'raw-rgba'
                ? 'Lossless'
                : `${bitrateMbps} Mbps`}
            </span>
          </div>
          {format === 'png-sequence' || format === 'avi-huffyuv' || format === 'raw-rgba' ? (
            <div className="py-1 text-xs text-emerald-400 font-mono">
              32-bit RGBA Pure
            </div>
          ) : (
            <input
              type="range"
              min={6}
              max={60}
              step={2}
              value={bitrateMbps}
              onChange={(e) => setBitrateMbps(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-white/[0.1] rounded-full appearance-none cursor-pointer accent-[#1A73E8]"
            />
          )}
        </div>
      </div>

      {/* Frame Range Selector */}
      <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-white/40" />
            <span className="text-xs font-medium text-white/80">
              Frame Range: {startFrame} → {endFrame} ({totalFramesToExport} frames · ~{durationSec}s)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSetFullRange}
              className="px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-[11px] text-white/60 hover:text-white transition-all cursor-pointer"
            >
              Full (0–{renderState.totalFrames - 1})
            </button>
            <button
              onClick={() => setStartFrame(renderState.currentFrame)}
              className="px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-[11px] text-white/60 hover:text-white transition-all cursor-pointer"
            >
              Start = Current ({renderState.currentFrame})
            </button>
            <button
              onClick={() => setEndFrame(renderState.currentFrame)}
              className="px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-[11px] text-white/60 hover:text-white transition-all cursor-pointer"
            >
              End = Current ({renderState.currentFrame})
            </button>
          </div>
        </div>

        {/* Quick Act Markers */}
        <div className="flex flex-wrap items-center gap-1 pt-1">
          <span className="text-[10px] text-white/40 uppercase font-mono mr-1">Acts:</span>
          {ACT_MARKERS.map((act, idx) => (
            <button
              key={act.id}
              onClick={() => handleSetActRange(idx)}
              className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/[0.03] hover:bg-white/[0.08] text-white/60 hover:text-white transition-all cursor-pointer"
            >
              {act.name.split(':')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Master Export Action Box */}
      <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 sm:p-5 space-y-4">
        {/* Recording Progress / Controls */}
        {isRecording ? (
          <div className="space-y-3 bg-black/40 border border-white/[0.06] rounded-xl p-4">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-white/80 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                Rendering {selectedCodecInfo.label} · Frame {currentRenderFrame} of {endFrame}
              </span>
              <span className="text-white font-bold">{recordProgress}%</span>
            </div>

            <div className="w-full bg-white/[0.06] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#1A73E8] h-full rounded-full transition-all duration-150"
                style={{ width: `${recordProgress}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[11px] text-white/40 pt-1">
              <span>{estSec > 0 ? `~${estSec}s remaining` : 'Finalizing...'}</span>
              <button
                onClick={handleCancel}
                className="px-3 py-1 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : downloadUrl ? (
          <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <FileCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">
                  Export Complete
                </p>
                <p className="text-[11px] text-white/50">
                  {downloadFileName} ({downloadSize || 'Ready'})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                id="btn-download-master-file"
                href={downloadUrl}
                download={downloadFileName}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2 px-4 rounded-full flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </a>
              <button
                onClick={handleStartExport}
                className="bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-medium py-2 px-3 rounded-full transition-all cursor-pointer"
              >
                Render Again
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              id="btn-start-master-export"
              onClick={handleStartExport}
              className="w-full sm:flex-1 bg-[#1A73E8] hover:bg-[#1A73E8]/90 text-white text-xs font-semibold py-2.5 px-4 rounded-full flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/20 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>
                Export {selectedCodecInfo.label.split('(')[0]} ({resolution} · {fps} fps)
              </span>
            </button>

            <button
              id="btn-snapshot-res"
              onClick={() => onCaptureSnapshot(resolution, transparentBackground)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white border border-white/[0.06] text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              title="Download high-resolution single frame snapshot"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Snapshot ({resolution})</span>
            </button>
          </div>
        )}
      </div>

      {/* Compact FFmpeg Command */}
      <div className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-white/40" />
          <span className="font-mono text-[11px] text-white/60">FFmpeg CLI:</span>
          <code className="text-white/40 text-[11px] font-mono hidden md:inline truncate max-w-md">
            {getFfmpegCommand()}
          </code>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            id="btn-copy-ffmpeg-cmd"
            onClick={handleCopyFfmpeg}
            className="px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white text-[11px] font-mono transition-all cursor-pointer flex items-center gap-1"
          >
            {copiedFfmpeg ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copiedFfmpeg ? 'Copied' : 'Copy CLI'}</span>
          </button>
          <button
            id="btn-copy-cli-script"
            onClick={handleCopyScript}
            className="px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white text-[11px] font-mono transition-all cursor-pointer flex items-center gap-1"
          >
            {copiedScript ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copiedScript ? 'Copied' : 'Copy Node Script'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
