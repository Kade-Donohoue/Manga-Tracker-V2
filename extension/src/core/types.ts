export interface TrackerHandle {
  start(): void;
  stop(): void;
}

export interface SiteAdapter {
  matches(url: URL): boolean;
  getSourceId(): string;
  getSiteName(): string;
  getChapterId(): string;
  /**
   * Site-provided tracker factory. Content script expects sites to
   * implement this and return an object with `start()`/`stop()`.
   */
  createTracker(onComplete: (data: any) => void): TrackerHandle | Promise<TrackerHandle>;
}
