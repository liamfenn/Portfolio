export const CASE_STUDY_NAVIGATION_EVENT = "portfolio:case-study-navigation";
export const CASE_STUDY_IDENTITY_SWAP_DELAY = 480;

export type CaseStudyNavigationDirection = -1 | 1;

export interface CaseStudyNavigationProject {
  slug: string;
  period: string;
  title: string;
}

export interface CaseStudyNavigationDetail {
  direction: CaseStudyNavigationDirection;
  startedAt: number;
  source: CaseStudyNavigationProject;
  target: CaseStudyNavigationProject;
}

let latestCaseStudyNavigation: CaseStudyNavigationDetail | null = null;

export function announceCaseStudyNavigation(
  direction: CaseStudyNavigationDirection,
  source: CaseStudyNavigationProject,
  target: CaseStudyNavigationProject,
) {
  latestCaseStudyNavigation = {
    direction,
    startedAt: Date.now(),
    source,
    target,
  };

  window.dispatchEvent(
    new CustomEvent<CaseStudyNavigationDetail>(CASE_STUDY_NAVIGATION_EVENT, {
      detail: latestCaseStudyNavigation,
    }),
  );
}

export function getRecentCaseStudyNavigation(targetSlug: string) {
  if (
    latestCaseStudyNavigation?.target.slug !== targetSlug ||
    Date.now() - latestCaseStudyNavigation.startedAt > 1500
  ) {
    return null;
  }

  return latestCaseStudyNavigation;
}
