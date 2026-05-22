export class ReadingCompletionTracker {
  private startTime = Date.now();
  private triggered = false;
  private observer?: IntersectionObserver;

  constructor(
    private target: Element,
    private onComplete: (data: { timeSpent: number }) => void
  ) {}

  start() {
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (this.triggered) return;

          if (entry.isIntersecting) {
            this.triggered = true;

            this.onComplete({
              timeSpent: Date.now() - this.startTime,
            });

            this.observer?.disconnect();
          }
        }
      },
      {
        threshold: 0.6, // requires most of element visible
      }
    );

    this.observer.observe(this.target);
  }

  stop() {
    this.observer?.disconnect();
  }
}
