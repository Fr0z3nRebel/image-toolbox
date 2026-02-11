"use client";

import { CENTER_TEXT_FONTS } from "../../../fonts";
import { CENTER_TEXT_FONT_SIZE_MIN, CENTER_TEXT_FONT_SIZE_MAX } from "../../../types";
import { FONT_SIZE_PRESETS } from "../../../constants/fontSizePresets";

interface CenterTextControlsProps {
  titleText: string;
  subtitleText: string;
  titleFont: string;
  subtitleFont: string;
  titleBold: boolean;
  subtitleBold: boolean;
  titleFontSize: number;
  subtitleFontSize: number;
  titleFontSizeAuto: boolean;
  subtitleFontSizeAuto: boolean;
  titleColor: string;
  subtitleColor: string;
  wrapText: boolean;
  onTitleTextChange: (text: string) => void;
  onSubtitleTextChange: (text: string) => void;
  onTitleFontChange: (font: string) => void;
  onSubtitleFontChange: (font: string) => void;
  onTitleBoldChange: (bold: boolean) => void;
  onSubtitleBoldChange: (bold: boolean) => void;
  onTitleFontSizeChange: (size: number) => void;
  onSubtitleFontSizeChange: (size: number) => void;
  onTitleFontSizeAutoChange: (auto: boolean) => void;
  onSubtitleFontSizeAutoChange: (auto: boolean) => void;
  onTitleColorClick: () => void;
  onSubtitleColorClick: () => void;
  onWrapTextChange: (wrap: boolean) => void;
}

export default function CenterTextControls({
  titleText,
  subtitleText,
  titleFont,
  subtitleFont,
  titleBold,
  subtitleBold,
  titleFontSize,
  subtitleFontSize,
  titleFontSizeAuto,
  subtitleFontSizeAuto,
  titleColor,
  subtitleColor,
  wrapText,
  onTitleTextChange,
  onSubtitleTextChange,
  onTitleFontChange,
  onSubtitleFontChange,
  onTitleBoldChange,
  onSubtitleBoldChange,
  onTitleFontSizeChange,
  onSubtitleFontSizeChange,
  onTitleFontSizeAutoChange,
  onSubtitleFontSizeAutoChange,
  onTitleColorClick,
  onSubtitleColorClick,
  onWrapTextChange
}: CenterTextControlsProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-brand-white mb-2">Title</label>
        <input
          type="text"
          value={titleText}
          onChange={(e) => onTitleTextChange(e.target.value)}
          placeholder="Title"
          className="w-full px-3 py-2 border border-brand-grey rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent text-brand-white bg-brand-charcoal text-sm"
        />
        <div className="flex gap-2 mt-2">
          <select
            value={titleFont}
            onChange={(e) => onTitleFontChange(e.target.value)}
            className="flex-1 px-3 py-2 border border-brand-grey rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent text-brand-white bg-brand-charcoal text-sm accent-brand-orange"
          >
            {CENTER_TEXT_FONTS.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
          <div className="flex items-center gap-1.5 px-2 py-2 border border-gray-300 rounded-lg bg-brand-charcoal">
            <input
              id="bundle-builder-title-bold"
              type="checkbox"
              checked={titleBold}
              onChange={(e) => onTitleBoldChange(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="bundle-builder-title-bold" className="text-sm text-brand-white cursor-pointer">
              Bold
            </label>
          </div>
          <select
            value={titleFontSizeAuto ? "auto" : String(titleFontSize)}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "auto") {
                onTitleFontSizeAutoChange(true);
                return;
              }
              onTitleFontSizeAutoChange(false);
              const size = Number(v);
              if (!Number.isNaN(size)) {
                const clamped = Math.min(
                  CENTER_TEXT_FONT_SIZE_MAX,
                  Math.max(CENTER_TEXT_FONT_SIZE_MIN, size)
                );
                onTitleFontSizeChange(clamped);
              }
            }}
            className="w-28 px-2 py-2 border border-gray-300 rounded-lg text-sm text-brand-white bg-brand-charcoal focus:ring-2 focus:ring-brand-orange focus:border-transparent accent-brand-orange"
            aria-label="Title font size"
          >
            <option value="auto">Auto</option>
            {FONT_SIZE_PRESETS.map((size) => (
              <option key={size} value={size}>{size}px</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={onTitleColorClick}
          className="mt-1 flex items-center gap-2 text-sm text-brand-white/80 hover:text-brand-white"
        >
          <span className="inline-block h-4 w-4 rounded border border-gray-300" style={{ backgroundColor: titleColor }} aria-hidden />
          Title color
        </button>
      </div>
      <div>
        <label className="block text-sm font-bold text-brand-white mb-2">Subtitle</label>
        <input
          type="text"
          value={subtitleText}
          onChange={(e) => onSubtitleTextChange(e.target.value)}
          placeholder="Subtitle"
          className="w-full px-3 py-2 border border-brand-grey rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent text-brand-white bg-brand-charcoal text-sm"
        />
        <div className="flex gap-2 mt-2">
          <select
            value={subtitleFont}
            onChange={(e) => onSubtitleFontChange(e.target.value)}
            className="flex-1 px-3 py-2 border border-brand-grey rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent text-brand-white bg-brand-charcoal text-sm accent-brand-orange"
          >
            {CENTER_TEXT_FONTS.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
          <div className="flex items-center gap-1.5 px-2 py-2 border border-gray-300 rounded-lg bg-brand-charcoal">
            <input
              id="bundle-builder-subtitle-bold"
              type="checkbox"
              checked={subtitleBold}
              onChange={(e) => onSubtitleBoldChange(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="bundle-builder-subtitle-bold" className="text-sm text-brand-white cursor-pointer">
              Bold
            </label>
          </div>
          <select
            value={subtitleFontSizeAuto ? "auto" : String(subtitleFontSize)}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "auto") {
                onSubtitleFontSizeAutoChange(true);
                return;
              }
              onSubtitleFontSizeAutoChange(false);
              const size = Number(v);
              if (!Number.isNaN(size)) {
                const clamped = Math.min(
                  CENTER_TEXT_FONT_SIZE_MAX,
                  Math.max(CENTER_TEXT_FONT_SIZE_MIN, size)
                );
                onSubtitleFontSizeChange(clamped);
              }
            }}
            className="w-28 px-2 py-2 border border-gray-300 rounded-lg text-sm text-brand-white bg-brand-charcoal focus:ring-2 focus:ring-brand-orange focus:border-transparent accent-brand-orange"
            aria-label="Subtitle font size"
          >
            <option value="auto">Auto</option>
            {FONT_SIZE_PRESETS.map((size) => (
              <option key={size} value={size}>{size}px</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={onSubtitleColorClick}
          className="mt-1 flex items-center gap-2 text-sm text-brand-white/80 hover:text-brand-white"
        >
          <span className="inline-block h-4 w-4 rounded border border-gray-300" style={{ backgroundColor: subtitleColor }} aria-hidden />
          Subtitle color
        </button>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <input
          id="bundle-builder-wrap-text"
          type="checkbox"
          checked={wrapText}
          onChange={(e) => onWrapTextChange(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="bundle-builder-wrap-text" className="text-sm text-brand-white">
          Wrap text
        </label>
      </div>
    </div>
  );
}
