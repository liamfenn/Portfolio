/** Shared glyph treatment for work filters and the design inspector. */
export const FILTER_SCRAMBLE = {
  speed: 0.68,
  tick: 1,
  step: 1,
  scramble: 2,
  seed: 1,
  chance: 1,
  range: Array.from("GridListSortFeaturedRecentRandom23456x–").map(glyph =>
    glyph.charCodeAt(0),
  ) as [number, number, ...number[]],
  overdrive: false,
  overflow: true,
  ignore: [" "],
};
