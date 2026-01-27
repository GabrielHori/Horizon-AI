export const shouldReduceMotion = (userPref) => {
  if (userPref === true) return true;
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};
