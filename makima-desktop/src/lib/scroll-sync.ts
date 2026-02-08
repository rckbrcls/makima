type Side = "left" | "right";

export class ScrollSyncController {
  private left: HTMLElement | null = null;
  private right: HTMLElement | null = null;
  private activeSide: Side = "left";
  private rafId = 0;
  private savedScrollLeft = 0;
  private disposed = false;

  private listeners: Array<{
    el: HTMLElement;
    event: string;
    handler: EventListener;
  }> = [];

  attach(leftEl: HTMLElement, rightEl: HTMLElement) {
    this.left = leftEl;
    this.right = rightEl;
    this.disposed = false;

    // Track which side the user is interacting with
    const setLeft = () => {
      this.activeSide = "left";
    };
    const setRight = () => {
      this.activeSide = "right";
    };

    this.on(leftEl, "pointerenter", setLeft, { passive: true });
    this.on(leftEl, "mousedown", setLeft, { passive: true });
    this.on(leftEl, "wheel", setLeft, { passive: true });

    this.on(rightEl, "pointerenter", setRight, { passive: true });
    this.on(rightEl, "mousedown", setRight, { passive: true });
    this.on(rightEl, "wheel", setRight, { passive: true });

    // Sync scroll from active to passive side
    this.on(leftEl, "scroll", () => this.handleScroll("left"));
    this.on(rightEl, "scroll", () => this.handleScroll("right"));
  }

  dispose() {
    this.disposed = true;
    for (const { el, event, handler } of this.listeners) {
      el.removeEventListener(event, handler);
    }
    this.listeners = [];
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    this.left = null;
    this.right = null;
  }

  restoreScrollLeft(value: number) {
    this.savedScrollLeft = value;
    if (this.left) this.left.scrollLeft = value;
    if (this.right) this.right.scrollLeft = value;
  }

  getScrollLeft(): number {
    return this.savedScrollLeft;
  }

  private handleScroll(source: Side) {
    // Only sync if this scroll event came from the active side
    if (source !== this.activeSide) return;
    if (this.disposed) return;

    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => {
        this.rafId = 0;
        if (this.disposed) return;

        const from = this.activeSide === "left" ? this.left : this.right;
        const to = this.activeSide === "left" ? this.right : this.left;

        if (!from || !to) return;

        const val = from.scrollLeft;
        if (val === this.savedScrollLeft) return;

        this.savedScrollLeft = val;
        to.scrollLeft = val;
      });
    }
  }

  private on(
    el: HTMLElement,
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions,
  ) {
    el.addEventListener(event, handler, options);
    this.listeners.push({ el, event, handler });
  }
}
