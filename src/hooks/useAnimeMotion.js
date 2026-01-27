import { useEffect, useRef } from "react";
import anime from "animejs";
import { shouldReduceMotion } from "../utils/shouldReduceMotion";

/**
 * Hook anime.js scoped par refs React.
 * - respecte prefers-reduced-motion et le flag user reduceAnimations
 * - nettoie les timelines au unmount et lors des re-render
 */
export function useAnimeMotion(state, refs, reduceAnimations) {
  const tlRef = useRef(null);

  useEffect(() => {
    if (shouldReduceMotion(reduceAnimations)) return;

    const targets = Object.values(refs || {})
      .map((r) => r?.current)
      .filter(Boolean);

    if (tlRef.current) {
      tlRef.current.pause();
      anime.remove(targets);
    }

    const tl = anime.timeline({ autoplay: true });
    const add = (target, opts, offset) =>
      tl.add({ targets: target, ...opts }, offset);

    if (state === "loading") {
      add(refs.card?.current, { opacity: [0, 1], duration: 220, easing: "easeOutQuad" });
    }

    if (state === "success") {
      add(refs.check?.current, { scale: [0.85, 1], opacity: [0, 1], duration: 260, easing: "easeOutBack" });
      add(refs.panel?.current, { translateY: [8, 0], opacity: [0, 1], duration: 240, easing: "easeOutQuad" }, "-=140");
    }

    if (state === "error") {
      add(refs.card?.current, { translateX: [-6, 6, -4, 4, 0], duration: 320, easing: "easeOutQuad" });
    }

    if (state === "grace") {
      add(refs.badge?.current, { opacity: [0.6, 1], scale: [0.96, 1], duration: 280, easing: "easeOutQuad" });
    }

    if (state === "expired") {
      add(refs.cta?.current, { scale: [0.95, 1], opacity: [0.7, 1], duration: 260, easing: "easeOutQuad" });
    }

    tlRef.current = tl;

    return () => {
      if (tlRef.current) {
        tlRef.current.pause();
      }
      anime.remove(targets);
    };
  }, [state, reduceAnimations, refs]);
}
