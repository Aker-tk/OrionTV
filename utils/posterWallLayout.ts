export interface PosterWallLayoutOptions {
  containerWidth: number;
  horizontalPadding: number;
  gap: number;
  minCardWidth: number;
  aspectRatio: number;
  maxColumns?: number;
}

export interface PosterWallLayout {
  columns: number;
  cardWidth: number;
  cardHeight: number;
}

export const getPosterWallLayout = ({
  containerWidth,
  horizontalPadding,
  gap,
  minCardWidth,
  aspectRatio,
  maxColumns = Number.POSITIVE_INFINITY,
}: PosterWallLayoutOptions): PosterWallLayout => {
  const safeContainerWidth = Math.max(containerWidth, 0);
  const safeHorizontalPadding = Math.max(horizontalPadding, 0);
  const safeGap = Math.max(gap, 0);
  const safeMinCardWidth = Math.max(minCardWidth, 1);
  const safeAspectRatio = aspectRatio > 0 ? aspectRatio : 2 / 3;

  const availableWidth = Math.max(safeContainerWidth - safeHorizontalPadding * 2, safeMinCardWidth);
  const computedColumns = Math.floor((availableWidth + safeGap) / (safeMinCardWidth + safeGap));
  const columns = Math.max(1, Math.min(computedColumns, maxColumns));
  const totalGap = safeGap * Math.max(columns - 1, 0);
  const cardWidth = Math.max(1, Math.floor((availableWidth - totalGap) / columns));

  return {
    columns,
    cardWidth,
    cardHeight: Math.round(cardWidth / safeAspectRatio),
  };
};
