import React, { useState } from 'react';
import { MANDATORY_BRAND_PALETTE, COLOR_TIERS, COLOR_CHEAT_SHEET } from '../data/sceneConstants';
import { Copy, Check, Sparkles, Sliders, Layers, Layout, Table as TableIcon, ArrowUpRight } from 'lucide-react';

export const BrandPaletteViewer: React.FC = () => {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'playground' | 'cheatsheet'>('hierarchy');

  const handleCopy = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 2000);
  };

  return (
    <div
      id="brand-palette-guide-root"
      className="bg-white/[0.02] backdrop-blur-2xl border border-white/[0.06] rounded-2xl p-5 sm:p-6 shadow-[0_16px_40px_rgba(0,0,0,0.4)] space-y-6 text-[#E8F0FE]"
    >
      {/* Brand Header */}
      <div id="brand-palette-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.04] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              Colorist Grade Palette
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                4-Tier System
              </span>
            </h2>
          </div>
          <p className="text-xs text-white/40 mt-1">
            Hierarchy · Contrast · Temperature Swing — Balanced with luminance zones (IRE 15–95) and the 60-30-10 rule.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center bg-white/[0.04] p-0.5 rounded-full border border-white/[0.06] text-xs self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('hierarchy')}
            className={`px-3 py-1 rounded-full font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'hierarchy'
                ? 'bg-white/20 text-white font-semibold shadow-xs'
                : 'text-white/40 hover:text-white/80'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            4 Tiers
          </button>
          <button
            onClick={() => setActiveTab('playground')}
            className={`px-3 py-1 rounded-full font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'playground'
                ? 'bg-white/20 text-white font-semibold shadow-xs'
                : 'text-white/40 hover:text-white/80'
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            Playground
          </button>
          <button
            onClick={() => setActiveTab('cheatsheet')}
            className={`px-3 py-1 rounded-full font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'cheatsheet'
                ? 'bg-white/20 text-white font-semibold shadow-xs'
                : 'text-white/40 hover:text-white/80'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            Specs
          </button>
        </div>
      </div>

      {/* Animated Flowing Gradient Bar */}
      <div className="relative rounded-xl overflow-hidden shadow-inner border border-white/[0.06]">
        <div
          className="h-8 w-full bg-[length:300%_100%] animate-[colorFlow_12s_ease-in-out_infinite_alternate]"
          style={{
            backgroundImage: `linear-gradient(90deg, #174EA6 0%, #1A73E8 20%, #4285F4 40%, #8AB4F8 55%, #D2E3FC 72%, #E8F0FE 88%, #174EA6 100%)`,
          }}
        />
        <div className="absolute inset-0 flex items-center justify-between px-3 text-[10px] text-white/90 font-medium tracking-wide pointer-events-none drop-shadow">
          <span>#174EA6 (Deep)</span>
          <span>#1A73E8 (Primary)</span>
          <span>#4285F4 (Secondary)</span>
          <span>#8AB4F8 (Soft)</span>
          <span>#D2E3FC (Pale)</span>
          <span>#E8F0FE (Surface)</span>
        </div>
      </div>

      {/* 60-30-10 Visual Law */}
      <div className="space-y-2 bg-white/[0.02] p-3.5 rounded-xl border border-white/[0.04]">
        <div className="flex items-center justify-between text-xs text-white/70">
          <span className="font-medium">60-30-10 Proportional Balance</span>
          <span className="text-[11px] text-white/40">
            Deep &amp; Primary reserved for key focal points
          </span>
        </div>
        <div className="flex h-7 rounded-lg overflow-hidden font-mono text-[11px] font-semibold border border-white/10">
          <div className="w-[60%] bg-[#E8F0FE] text-[#174EA6] flex items-center justify-center px-2">
            <span>60% Surface & Pale</span>
          </div>
          <div className="w-[30%] bg-[#4285F4] text-white flex items-center justify-center px-2">
            <span>30% Secondary</span>
          </div>
          <div className="w-[10%] bg-[#174EA6] text-white flex items-center justify-center px-1 text-center">
            <span>10% Deep</span>
          </div>
        </div>
      </div>

      {/* TAB 1: 4-TIER COLOR HIERARCHY */}
      {activeTab === 'hierarchy' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {COLOR_TIERS.map((tier) => (
              <div
                key={tier.badge}
                className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 transition-all duration-200 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${tier.badgeBgClass} ${tier.badgeTextClass}`}>
                      {tier.badge}
                    </span>
                    <span className="text-[10px] font-mono text-white/40 bg-white/[0.04] px-1.5 py-0.5 rounded">
                      {tier.ire}
                    </span>
                  </div>

                  <h3 className="font-semibold text-xs text-white mt-2.5">
                    {tier.title}
                  </h3>

                  {/* Swatches */}
                  <div className="flex gap-1.5 my-2.5">
                    {tier.hexList.map((hex) => {
                      const isCopied = copiedHex === hex;
                      return (
                        <button
                          key={hex}
                          onClick={() => handleCopy(hex)}
                          className="flex-1 h-9 rounded-lg border border-white/10 relative overflow-hidden transition-transform active:scale-95 group/btn cursor-pointer"
                          style={{ backgroundColor: hex }}
                          title={`Click to copy ${hex}`}
                        >
                          <div className="absolute inset-0 bg-black/0 hover:bg-black/25 flex items-center justify-center transition-colors">
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400 drop-shadow" />
                            ) : (
                              <span className="opacity-0 group-hover/btn:opacity-100 text-[10px] font-mono font-bold text-white bg-black/70 px-1 py-0.5 rounded">
                                {hex}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap gap-1 mb-2">
                    {tier.hexList.map((hex) => (
                      <span key={hex} className="text-[10px] font-mono bg-white/[0.04] text-white/70 px-1.5 py-0.5 rounded">
                        {hex}
                      </span>
                    ))}
                  </div>

                  <p className="text-[11px] text-white/50 leading-relaxed">
                    {tier.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Swatches Grid of all 6 colors */}
          <div className="bg-white/[0.02] p-4 rounded-xl border border-white/[0.04] space-y-3">
            <div className="flex items-center justify-between text-xs font-medium text-white/70">
              <span>Full Color Palette Spectrum</span>
              <span className="text-[11px] text-white/30 font-mono">Click to copy HEX</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {MANDATORY_BRAND_PALETTE.map((c) => {
                const isCopied = copiedHex === c.hex;
                return (
                  <button
                    key={c.name}
                    onClick={() => handleCopy(c.hex)}
                    className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] hover:border-white/[0.1] transition-all text-left group cursor-pointer"
                  >
                    <div
                      className="w-6 h-6 rounded-md border border-white/10 flex-shrink-0 relative overflow-hidden flex items-center justify-center"
                      style={{ backgroundColor: c.hex }}
                    >
                      {isCopied && <Check className="w-3 h-3 text-emerald-400 drop-shadow" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-white truncate">{c.name}</div>
                      <div className="text-[10px] font-mono text-white/40 truncate">{c.hex}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: UI COMPONENT PLAYGROUND */}
      {activeTab === 'playground' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-200">
          {/* Primary CTA */}
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 space-y-3">
            <span className="text-[11px] font-medium text-white/60 uppercase tracking-wider block border-b border-white/[0.04] pb-1">
              Primary Action
            </span>
            <div className="space-y-2">
              <button className="w-full py-1.5 px-3 rounded-full bg-[#1A73E8] hover:bg-[#4285F4] active:bg-[#174EA6] text-white font-medium text-xs transition-all shadow-sm cursor-pointer">
                Get Started
              </button>
              <button disabled className="w-full py-1.5 px-3 rounded-full bg-white/[0.04] text-white/30 font-medium text-xs cursor-not-allowed">
                Disabled
              </button>
            </div>
          </div>

          {/* Secondary CTA */}
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 space-y-3">
            <span className="text-[11px] font-medium text-white/60 uppercase tracking-wider block border-b border-white/[0.04] pb-1">
              Secondary Action
            </span>
            <div className="space-y-2">
              <button className="w-full py-1.5 px-3 rounded-full bg-[#D2E3FC] hover:bg-[#8AB4F8] text-[#174EA6] font-medium text-xs transition-all cursor-pointer">
                Learn More
              </button>
              <span className="inline-block bg-[#8AB4F8]/20 text-[#8AB4F8] text-[10px] font-semibold px-2 py-0.5 rounded-full">
                New Feature
              </span>
            </div>
          </div>

          {/* Input & Form */}
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 space-y-3">
            <span className="text-[11px] font-medium text-white/60 uppercase tracking-wider block border-b border-white/[0.04] pb-1">
              Input Field
            </span>
            <input
              type="text"
              defaultValue="Motion graphics engine"
              className="w-full bg-white/[0.06] text-white text-xs px-3 py-1.5 rounded-full border border-white/[0.1] focus:outline-none focus:border-[#4285F4]"
            />
          </div>

          {/* Body Text & Contrast */}
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 space-y-3">
            <span className="text-[11px] font-medium text-white/60 uppercase tracking-wider block border-b border-white/[0.04] pb-1">
              WCAG AA Contrast
            </span>
            <div className="bg-[#E8F0FE] p-2.5 rounded-lg text-[11px] text-[#174EA6] leading-relaxed">
              <strong>Deep (#174EA6)</strong> text on Surface.
              <div className="text-[10px] text-[#4285F4] font-medium mt-0.5">
                15.8:1 contrast ratio
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CHEAT SHEET TABLE */}
      {activeTab === 'cheatsheet' && (
        <div className="overflow-x-auto rounded-xl border border-white/[0.04] bg-white/[0.01] animate-in fade-in duration-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-white/[0.03] text-white/60 border-b border-white/[0.04]">
                <th className="py-2.5 px-4 font-medium uppercase text-[10px] tracking-wider">Usage Case</th>
                <th className="py-2.5 px-4 font-medium uppercase text-[10px] tracking-wider">Background</th>
                <th className="py-2.5 px-4 font-medium uppercase text-[10px] tracking-wider">Text / Icon</th>
                <th className="py-2.5 px-4 font-medium uppercase text-[10px] tracking-wider">Border / Accent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02] text-white/70">
              {COLOR_CHEAT_SHEET.map((row) => (
                <tr key={row.usage} className="hover:bg-white/[0.01]">
                  <td className="py-2 px-4 font-medium text-white">{row.usage}</td>
                  <td className="py-2 px-4 font-mono text-[11px]">{row.bgHex}</td>
                  <td className="py-2 px-4 font-mono text-[11px] text-[#8AB4F8]">{row.textHex}</td>
                  <td className="py-2 px-4 font-mono text-[11px] text-white/40">{row.borderHex}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
