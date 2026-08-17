import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "simple-player": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        "aspect-ratio"?: string;
        "preload-margin"?: string;
        controls?: boolean;
        "disable-autoplay"?: boolean;
        "pause-on-overlay-click"?: boolean;
        "show-time"?: boolean;
      };
    }
  }
}
