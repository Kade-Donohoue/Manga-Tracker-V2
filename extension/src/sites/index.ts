import { SiteAdapter } from '../core/types';
import { asuraAdapter } from './asura';
import { comixAdapter } from './comix';
import { mangadexAdapter } from './mangadex';
import { mangafireAdapter } from './mangafire';
import { manganatoAdapter } from './manganato';

const adapters: SiteAdapter[] = [
  mangadexAdapter,
  mangafireAdapter,
  asuraAdapter,
  comixAdapter,
  manganatoAdapter,
];

export function getAdapter(): SiteAdapter | null {
  const url = new URL(location.href);
  return adapters.find((a) => a.matches(url)) ?? null;
}
