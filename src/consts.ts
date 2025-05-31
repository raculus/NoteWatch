export const kGamesFeatures = new Map<number, string[]>([
  // Overwatch
  [10844, ["roster", "game_info", "match_info", "match_start"]],
]);

export const kGameClassIds = Array.from(kGamesFeatures.keys());

export const kWindowNames = {
  inGame: "in_game",
  desktop: "desktop",
  second: "second",
};

export const kHotkeys = {
  toggle: "sample_app_ts_showhide",
  custom: "sample_app_second_screen",
};
