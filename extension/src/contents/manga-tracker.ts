import '../content/index';

export const config = {
  matches: [
    '*://*.mangafire.to/*',
    '*://*.manganato.gg/*',
    '*://*.asurascans.com/*',
    '*://*.mangadex.org/*',
    '*://*.comix.to/*',
  ],
  run_at: 'document_idle',
};
