"use client";

import Image from "next/image";
import { animate, motion, useReducedMotion } from "motion/react";
import { useSmoothCorners } from "@lisse/react";
import { useEffect, useRef, useState } from "react";

const STACK_SPRING = {
  type: "spring",
  stiffness: 320,
  damping: 30,
  mass: 0.7,
} as const;

const SURFACE_TRANSITION = {
  duration: 0.16,
  ease: [0.16, 1, 0.3, 1],
} as const;

interface ProjectIdentityProps {
  company: string;
  companyLogo: string;
  companyLogoBackground: string;
  period: string;
  role: string;
}

export function ProjectIdentity({
  company,
  companyLogo,
  companyLogoBackground,
  period,
  role,
}: ProjectIdentityProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isTapped, setIsTapped] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const hoverExitTimer = useRef<number | null>(null);
  const exitCollapseTimer = useRef<number | null>(null);
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

  useEffect(() => {
    return () => {
      if (hoverExitTimer.current !== null) {
        window.clearTimeout(hoverExitTimer.current);
      }
      if (exitCollapseTimer.current !== null) {
        window.clearTimeout(exitCollapseTimer.current);
      }
    };
  }, []);

  const isActive = isTapped || isHovered;
  const isAvatarFront = !isActive;
  const stackOffset = isCompact ? 8 : 9;
  const smallScale = isCompact ? 24 / 36 : 28 / 43;
  const frontStroke = isCompact ? 2.25 : 3.071;
  const backStroke = isCompact ? 0.75 : 1;
  const layerTransition = prefersReducedMotion ? { duration: 0 } : STACK_SPRING;
  const getLayerTarget = (isFront: boolean) => ({
    x: isFront ? 0 : stackOffset,
    y: isFront ? 0 : stackOffset,
    scale: isFront ? smallScale : 1,
  });

  useEffect(() => {
    const animationOptions = {
      duration: prefersReducedMotion ? 0 : SURFACE_TRANSITION.duration,
      ease: SURFACE_TRANSITION.ease,
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
    if (!window.matchMedia("(hover: hover)").matches) {
      return;
    }

    if (hoverExitTimer.current !== null) {
      window.clearTimeout(hoverExitTimer.current);
      hoverExitTimer.current = null;
    }
    if (exitCollapseTimer.current !== null) {
      window.clearTimeout(exitCollapseTimer.current);
      exitCollapseTimer.current = null;
    }
    setIsExiting(false);
    setIsHovered(true);
  };

  const handlePointerLeave = () => {
    if (!window.matchMedia("(hover: hover)").matches) {
      return;
    }

    if (hoverExitTimer.current !== null) {
      window.clearTimeout(hoverExitTimer.current);
    }
    hoverExitTimer.current = window.setTimeout(() => {
      setIsExiting(true);
      setIsHovered(false);
      exitCollapseTimer.current = window.setTimeout(() => {
        setIsExiting(false);
        exitCollapseTimer.current = null;
      }, 180);
      hoverExitTimer.current = null;
    }, 120);
  };

  const toggleMobileState = () => {
    if (window.matchMedia("(hover: none)").matches) {
      setIsTapped((current) => !current);
    }
  };

  return (
    <div
      className={`project-identity${isTapped ? " is-tapped" : ""}${isHovered ? " is-hovered" : ""}${
        isExiting ? " is-exiting" : ""
      }`}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <div className="project-identity-artwork">
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
        <button
          type="button"
          className="project-identity-toggle"
          aria-label={isTapped ? `Hide ${company} project details` : `Show ${company} project details`}
          aria-expanded={isTapped}
          onClick={toggleMobileState}
        />
      </div>

      <div className="project-identity-details" aria-hidden={!isActive}>
        <span className="project-identity-period">{period}</span>
        <span className="project-identity-role-line">
          <span>{company}</span>
          <span className="project-identity-separator" aria-hidden="true">•</span>
          <span className="project-identity-role">{role}</span>
        </span>
      </div>
    </div>
  );
}
