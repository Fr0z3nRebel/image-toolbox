import type { AspectRatio, LayoutStyle, CenterMode, CenterShapeId } from "../types";

export interface BundleBuilderPreset {
  name: string;
  aspectRatio: AspectRatio;
  layoutStyle: LayoutStyle;
  backgroundMode: "transparent" | "backgroundImage" | "color";
  backgroundColor: string;
  textSafeAreaPercent: number;
  imagesPerRow: number | undefined;
  imageSpacingPercent?: number;
  centerMode?: CenterMode;
  centerShape?: CenterShapeId;
  centerScale: number;
  centerHeightScale?: number;
  centerScaleLocked?: boolean;
  centerRotation: number;
  centerXOffset: number;
  centerYOffset: number;
  titleText?: string;
  subtitleText?: string;
  titleFont?: string;
  subtitleFont?: string;
  titleBold?: boolean;
  subtitleBold?: boolean;
  titleFontSize?: number;
  subtitleFontSize?: number;
  titleFontSizeAuto?: boolean;
  subtitleFontSizeAuto?: boolean;
  shapeColor?: string;
  titleColor?: string;
  subtitleColor?: string;
  wrapText?: boolean;
}
