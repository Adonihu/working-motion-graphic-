import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Repeat,
  Sparkles,
} from 'lucide-react';
import { ACT_MARKERS } from '../data/sceneConstants';
import { RenderState } from '../types';

interface TimelineControlsProps {
  renderState: RenderState;
  onSeekFrame: (frame: number) => void;
  onTogglePlay: () => void;
  onToggleLoop: () => void;
  onChangeSpeed: (speed: number) => void;
  onReset: () => void;
}

export const TimelineControls: React.FC<TimelineControlsProps> = ({
  renderState,
  onSeekFrame,
  onTogglePlay,
  onToggleLoop,
  onChangeSpeed,
  onReset,
}) => {
  const { currentFrame, totalFrames, fps, isPlaying, isLooping, playbackSpeed } = renderState;

  const currentTimeSec = (currentFrame / fps).toFixed(2);
  const totalTimeSec = (totalFrames / fps).toFixed(2);

  // Timecode calculation HH:MM:SS:FF
  const totalSeconds = Math.floor(currentFrame / fps);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  const frames = String(currentFrame % fps).padStart(2, '0');
  const timecode = `${minutes}:${seconds}:${frames}`;

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const frame = parseInt(e.target.value, 10);
    onSeekFrame(frame);
  };

  const stepFrame = (delta: number) => {
    const next = Math.max(0, Math.min(totalFrames - 1, currentFrame + delta));
    onSeekFrame(next);
  };

  return (
    <div
      id="apple-timeline-panel"
      className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.06] rounded-2xl p-4 sm:p-5 shadow-[0_16px_40px_rgba(0,0,0,0.4)] space-y-4"
    >
      {/* Top row: Act Storyboard Markers */}
      <div id="cuepoints-header-row" className="flex items-center justify-between gap-2 border-b border-white/[0.04] pb-3">
        <span className="text-[11px] font-medium text-white/40 font-mono tracking-wider uppercase">
          Keyframes
        </span>
        <div id="act-cue-button-group" className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
          {ACT_MARKERS.map((act) => {
            const isCurrent =
              currentFrame >= act.frame &&
              (act.id === 'act10' || currentFrame < (ACT_MARKERS[ACT_MARKERS.indexOf(act) + 1]?.frame ?? totalFrames));
            return (
              <button
                key={act.id}
                id={`cue-btn-${act.id}`}
                onClick={() => onSeekFrame(act.frame)}
                className={`text-[11px] px-2.5 py-1 rounded-full transition-all font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  isCurrent
                    ? 'bg-white/20 text-white font-semibold shadow-xs'
                    : 'text-white/40 hover:text-white/80 hover:bg-white/[0.04]'
                }`}
                title={`${act.subtitle} (${act.timeSec}s / Frame ${act.frame})`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: act.color }}
                />
                <span>{act.name.split(':')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Scrubber Track with Frame Counter */}
      <div id="timeline-scrubber-container" className="relative space-y-2">
        <div className="flex justify-between items-center text-xs font-mono select-none">
          <div className="flex items-center gap-2">
            <span className="text-white/90 font-semibold tracking-tight text-xs">
              {timecode}
            </span>
            <span className="text-white/30 text-[11px]">
              · {currentTimeSec}s / {totalTimeSec}s
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-white/60 text-xs">
            <span>Frame</span>
            <strong className="text-white font-semibold">{currentFrame}</strong>
            <span className="text-white/30">/ {totalFrames - 1}</span>
          </div>
        </div>

        {/* Apple Style Precision Scrubber Track */}
        <div className="relative flex items-center group py-1">
          <input
            id="timeline-frame-scrubber"
            type="range"
            min={0}
            max={totalFrames - 1}
            value={currentFrame}
            onChange={handleScrub}
            className="w-full h-1.5 bg-white/[0.08] rounded-full appearance-none cursor-pointer focus:outline-none transition-all accent-[#1A73E8]"
          />
        </div>

        {/* Act Indicator Dots below scrubber */}
        <div className="relative w-full h-1">
          {ACT_MARKERS.map((act) => {
            const pct = (act.frame / (totalFrames - 1)) * 100;
            return (
              <div
                key={act.id}
                onClick={() => onSeekFrame(act.frame)}
                className="absolute top-0 w-1.5 h-1.5 -ml-0.75 rounded-full hover:scale-150 transition-transform cursor-pointer opacity-40 hover:opacity-100"
                style={{
                  left: `${pct}%`,
                  backgroundColor: act.color,
                }}
                title={`${act.name} (${act.timeSec}s)`}
              />
            );
          })}
        </div>
      </div>

      {/* Playback Controls & Transport Bar */}
      <div id="transport-controls-bar" className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Left: Transport Step & Play Controls */}
        <div className="flex items-center gap-1">
          <button
            id="btn-transport-reset"
            onClick={onReset}
            className="p-2 rounded-full bg-white/[0.03] hover:bg-white/[0.08] text-white/60 hover:text-white transition-all cursor-pointer"
            title="Return to Frame 0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            id="btn-transport-step-back-10"
            onClick={() => stepFrame(-10)}
            className="p-2 rounded-full bg-white/[0.03] hover:bg-white/[0.08] text-white/60 hover:text-white transition-all cursor-pointer"
            title="Step Back 10 Frames"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            id="btn-transport-step-back-1"
            onClick={() => stepFrame(-1)}
            className="p-2 rounded-full bg-white/[0.03] hover:bg-white/[0.08] text-white/60 hover:text-white transition-all cursor-pointer"
            title="Step Back 1 Frame"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* Primary Play/Pause Button */}
          <button
            id="btn-transport-play-pause"
            onClick={onTogglePlay}
            className={`mx-1 px-4 py-1.5 rounded-full font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              isPlaying
                ? 'bg-white text-black shadow-sm font-semibold'
                : 'bg-[#1A73E8] hover:bg-[#1A73E8]/90 text-white shadow-md shadow-blue-600/20 font-semibold'
            }`}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play</span>
              </>
            )}
          </button>

          <button
            id="btn-transport-step-forward-1"
            onClick={() => stepFrame(1)}
            className="p-2 rounded-full bg-white/[0.03] hover:bg-white/[0.08] text-white/60 hover:text-white transition-all cursor-pointer"
            title="Step Forward 1 Frame"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            id="btn-transport-step-forward-10"
            onClick={() => stepFrame(10)}
            className="p-2 rounded-full bg-white/[0.03] hover:bg-white/[0.08] text-white/60 hover:text-white transition-all cursor-pointer"
            title="Step Forward 10 Frames"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Loop & Playback Speed Segmented Pill */}
        <div className="flex items-center gap-2">
          {/* Loop Button */}
          <button
            id="btn-toggle-loop"
            onClick={onToggleLoop}
            className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              isLooping
                ? 'bg-white/15 text-white font-medium'
                : 'bg-white/[0.03] text-white/40 hover:text-white/70'
            }`}
            title="Toggle Continuous Loop"
          >
            <Repeat className="w-3 h-3" />
            <span>Loop</span>
          </button>

          {/* Speed Selector Segment */}
          <div className="flex items-center bg-white/[0.04] border border-white/[0.06] rounded-full p-0.5 text-[11px] font-mono">
            {[0.25, 0.5, 1.0, 2.0].map((spd) => (
              <button
                key={spd}
                id={`speed-btn-${spd}x`}
                onClick={() => onChangeSpeed(spd)}
                className={`px-2.5 py-0.5 rounded-full transition-all cursor-pointer ${
                  playbackSpeed === spd
                    ? 'bg-white/20 text-white font-semibold shadow-xs'
                    : 'text-white/40 hover:text-white/80'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
