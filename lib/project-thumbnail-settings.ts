export type ProjectThumbnailOptimization = {
  enabled: boolean;
  quality: number;
  effort: number;
};

export const DEFAULT_PROJECT_THUMBNAIL_OPTIMIZATION: ProjectThumbnailOptimization = {
  enabled: true,
  quality: 82,
  effort: 4,
};

export function normalizeProjectThumbnailOptimization(value: unknown): ProjectThumbnailOptimization {
  if (!value || typeof value !== 'object') {
    return DEFAULT_PROJECT_THUMBNAIL_OPTIMIZATION;
  }

  const settings = value as Record<string, unknown>;
  const quality = Number(settings.quality);
  const effort = Number(settings.effort);

  return {
    enabled: settings.enabled !== false,
    quality: Number.isFinite(quality) ? Math.min(95, Math.max(50, Math.round(quality))) : DEFAULT_PROJECT_THUMBNAIL_OPTIMIZATION.quality,
    effort: Number.isFinite(effort) ? Math.min(6, Math.max(0, Math.round(effort))) : DEFAULT_PROJECT_THUMBNAIL_OPTIMIZATION.effort,
  };
}
