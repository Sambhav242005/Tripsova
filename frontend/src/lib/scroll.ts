// After a planner collapses its form into the compact bar, the freshly-rendered
// result would otherwise stay below the fold (the submit button sits low in the
// form). Lift the scroll container back to the top so the output is visible at
// once — no manual scrolling, which is exactly what the old flow required.
export function scrollPlannerToTop(): void {
  if (typeof window === "undefined") return;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  const behavior: ScrollBehavior = reduce ? "auto" : "smooth";
  requestAnimationFrame(() => {
    document.getElementById("tripova-scroll")?.scrollTo({ top: 0, behavior });
    window.scrollTo({ top: 0, behavior });
  });
}
