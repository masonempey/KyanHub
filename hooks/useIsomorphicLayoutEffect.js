import { useLayoutEffect, useEffect } from "react";

// Use useEffect during SSR, and useLayoutEffect in the browser
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default useIsomorphicLayoutEffect;
