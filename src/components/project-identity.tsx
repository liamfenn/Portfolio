"use client";

import Image from "next/image";
import Link from "next/link";
import { useSmoothCorners } from "@lisse/react";
import { useEffect, useRef, useState } from "react";

interface ProjectIdentityProps {
  company: string;
  companyLogo: string;
  companyLogoBackground: string;
}

export function ProjectIdentity({ company, companyLogo, companyLogoBackground }: ProjectIdentityProps) {
  const [isCompact, setIsCompact] = useState(false);
  const avatarSurfaceRef = useRef<HTMLSpanElement>(null);
  const companySurfaceRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateCompactState = () => setIsCompact(mediaQuery.matches);

    updateCompactState();
    mediaQuery.addEventListener("change", updateCompactState);
    return () => mediaQuery.removeEventListener("change", updateCompactState);
  }, []);

  useSmoothCorners(
    avatarSurfaceRef,
    { radius: 999, smoothing: 0.6 },
    {
      autoEffects: false,
      effects: {
        middleBorder: { width: isCompact ? 2.25 : 3.071, color: "#fff", opacity: 1 },
      },
    },
  );

  useSmoothCorners(
    companySurfaceRef,
    { radius: 999, smoothing: 0.6 },
    {
      autoEffects: false,
      effects: {
        middleBorder: { width: isCompact ? 0.75 : 1, color: "#fff", opacity: 1 },
      },
    },
  );

  return (
    <div className="project-identity">
      <Link className="project-identity-artwork" href="/" aria-label="Back to Home">
        <span className="project-identity-card project-identity-avatar-card" aria-hidden="true">
          <span ref={avatarSurfaceRef} className="project-identity-avatar">
            <Image src="/images/profile-v2.png" alt="" width={1536} height={1920} priority />
          </span>
        </span>
        <span className="project-identity-card project-identity-company-card" aria-hidden="true">
          <span
            ref={companySurfaceRef}
            className="project-identity-company"
            style={{ backgroundColor: companyLogoBackground }}
          >
            <Image src={companyLogo} alt="" fill sizes="44px" />
          </span>
        </span>
      </Link>

      <nav className="project-breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{company}</span>
      </nav>
    </div>
  );
}
