"use client";

import Image from "next/image";
import Link from "next/link";
import { useSmoothCorners } from "@lisse/react";
import { animate, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

const STACK_SPRING = {
  type: "spring",
  stiffness: 320,
  damping: 30,
  mass: 0.7,
} as const;

const STROKE_TRANSITION = {
  duration: 0.16,
  ease: [0.16, 1, 0.3, 1],
} as const;

interface ProjectIdentityProps {
  company: string;
  companyLogo: string;
  companyLogoBackground: string;
}

export function ProjectIdentity({ company, companyLogo, companyLogoBackground }: ProjectIdentityProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isHovered, setIsHovered] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const avatarSurfaceRef = useRef<HTMLSpanElement>(null);
  const companySurfaceRef = useRef<HTMLSpanElement>(null);
  const avatarStrokeValue = useRef(3.071);
  const companyStrokeValue = useRef(1);
  const [avatarStrokeWidth, setAvatarStrokeWidth] = useState(3.071);
  const [companyStrokeWidth, setCompanyStrokeWidth] = useState(1);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateCompactState = () => setIsCompact(mediaQuery.matches);

    updateCompactState();
    mediaQuery.addEventListener("change", updateCompactState);
    return () => mediaQuery.removeEventListener("change", updateCompactState);
  }, []);

  const isAvatarFront = !isHovered;
  const stackOffset = isCompact ? 8 : 9.45;
  const smallScale = isCompact ? 24 / 36 : 28.364 / 42.545;
  const frontStroke = isCompact ? 2.25 : 2.66;
  const backStroke = isCompact ? 0.75 : 1;
  const layerTransition = prefersReducedMotion ? { duration: 0 } : STACK_SPRING;
  const getLayerTarget = (isFront: boolean) => ({
    x: isFront ? 0 : stackOffset,
    y: isFront ? 0 : stackOffset,
    scale: isFront ? smallScale : 1,
  });

  useEffect(() => {
    const animationOptions = {
      duration: prefersReducedMotion ? 0 : STROKE_TRANSITION.duration,
      ease: STROKE_TRANSITION.ease,
    } as const;
    const animations = [
      animate(avatarStrokeValue.current, isAvatarFront ? frontStroke : backStroke, {
        ...animationOptions,
        onUpdate: (value) => {
          avatarStrokeValue.current = value;
          setAvatarStrokeWidth(value);
        },
      }),
      animate(companyStrokeValue.current, isAvatarFront ? backStroke : frontStroke, {
        ...animationOptions,
        onUpdate: (value) => {
          companyStrokeValue.current = value;
          setCompanyStrokeWidth(value);
        },
      }),
    ];

    return () => animations.forEach((animation) => animation.stop());
  }, [backStroke, frontStroke, isAvatarFront, prefersReducedMotion]);

  useSmoothCorners(
    avatarSurfaceRef,
    { radius: 999, smoothing: 0.6 },
    {
      autoEffects: false,
      effects: {
        middleBorder: { width: avatarStrokeWidth, color: "#fff", opacity: 1 },
      },
    },
  );

  useSmoothCorners(
    companySurfaceRef,
    { radius: 999, smoothing: 0.6 },
    {
      autoEffects: false,
      effects: {
        middleBorder: { width: companyStrokeWidth, color: "#fff", opacity: 1 },
      },
    },
  );

  const handlePointerEnter = () => {
    if (window.matchMedia("(hover: hover)").matches) {
      setIsHovered(true);
    }
  };

  const handlePointerLeave = () => {
    if (window.matchMedia("(hover: hover)").matches) {
      setIsHovered(false);
    }
  };

  return (
    <Link
      className={`project-identity${isHovered ? " is-hovered" : ""}`}
      href="/"
      aria-label="Back to Index"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <span className="project-identity-artwork">
        <motion.span
          className="project-identity-card project-identity-avatar-card"
          initial={false}
          animate={getLayerTarget(isAvatarFront)}
          transition={layerTransition}
          style={{ zIndex: isAvatarFront ? 2 : 1 }}
          aria-hidden="true"
        >
          <motion.span ref={avatarSurfaceRef} className="project-identity-avatar">
            <Image src="/images/profile-v2.png" alt="" width={1536} height={1920} priority />
          </motion.span>
        </motion.span>
        <motion.span
          className="project-identity-card project-identity-company-card"
          initial={false}
          animate={getLayerTarget(!isAvatarFront)}
          transition={layerTransition}
          style={{ zIndex: isAvatarFront ? 1 : 2 }}
          aria-hidden="true"
        >
          <motion.span
            ref={companySurfaceRef}
            className="project-identity-company"
            style={{ backgroundColor: companyLogoBackground }}
          >
            <Image src={companyLogo} alt="" fill sizes="44px" />
          </motion.span>
        </motion.span>
      </span>

      <span className="project-identity-details" aria-hidden={!isHovered}>
        <span className="project-identity-details-content">
          <span className="project-identity-company-name">{company}</span>
          <span className="project-identity-index-label">Back to Index</span>
        </span>
      </span>
    </Link>
  );
}
