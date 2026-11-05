"use client";

import { useEffect } from "react";
import { installLinkHoverGlitch } from "@/lib/link-hover-glitch";

export function LinkHoverGlitch() {
  useEffect(installLinkHoverGlitch, []);
  return null;
}
