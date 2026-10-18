"use client";

import dynamic from "next/dynamic";

// Loaded only in development. A static import shipped the whole library to production even though it never rendered;
// with NODE_ENV inlined at build time, this branch and its import drop out of the production bundle.
const Agentation = process.env.NODE_ENV === "development"
  ? dynamic(() => import("agentation").then(module => module.Agentation), { ssr: false })
  : null;

export function AgentationProvider() {
  return Agentation ? <Agentation endpoint="http://localhost:4747" /> : null;
}
