export const CASE_STUDY_NAVIGATION_EVENT = "portfolio:case-study-navigation";

export type CaseStudyNavigationDirection = -1 | 1;

export function announceCaseStudyNavigation(direction: CaseStudyNavigationDirection) {
  window.dispatchEvent(
    new CustomEvent<{ direction: CaseStudyNavigationDirection }>(CASE_STUDY_NAVIGATION_EVENT, {
      detail: { direction },
    }),
  );
}
