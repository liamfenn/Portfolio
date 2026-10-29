"use client";

import { useState } from "react";
import { InspectableText } from "@/components/design-inspector";

const TYPE_STYLES = [
  { style: "text-bodySans", name: "ABC Oracle", role: "bodySans" },
  { style: "text-bodySerif", name: "ABC Otto", role: "bodySerif" },
  { style: "text-captionSans", name: "Labels & details", role: "captionSans" },
  { style: "text-captionSerif", name: "Notes in the margin", role: "captionSerif" },
];

export function ProcessTypeStudy() {
  return <figure className="process-figure">
    <div className="process-type-study">
      {TYPE_STYLES.map(({ style, name, role }) => <div className="process-type-row" key={role}>
        <span className={`${style} text-secondary`}><InspectableText>{name}</InspectableText></span>
        <span className="text-captionSans text-muted"><InspectableText>{role}</InspectableText></span>
      </div>)}
    </div>
    <figcaption className="process-caption text-captionSans text-muted"><InspectableText>01 / Two typefaces, four styles. A small vocabulary for the whole site.</InspectableText></figcaption>
  </figure>;
}

export function ProcessInspectorStudy() {
  const [inspecting, setInspecting] = useState(false);
  return <figure className="process-figure">
    <div className="process-inspector-study">
      <div className="process-study-toolbar text-captionSans text-secondary">
        <span><InspectableText>Type & color</InspectableText></span>
        <button type="button" className="process-study-toggle text-captionSans text-primary" aria-pressed={inspecting}
          aria-controls="process-inspector-sample" onClick={() => setInspecting(value => !value)}>
          <InspectableText>{inspecting ? "Show text" : "Inspect"}</InspectableText>
        </button>
      </div>
      <div id="process-inspector-sample" className="process-inspector-sample" aria-live="polite">
        <p className="text-bodySerif text-secondary"><InspectableText>{inspecting ? "bodySerif / text-secondary" : "Small things carry more weight when there's less around them."}</InspectableText></p>
        <span className="text-captionSans text-muted"><InspectableText>{inspecting ? "captionSans / text-muted" : "A note from the working environment."}</InspectableText></span>
      </div>
    </div>
    <figcaption className="process-caption text-captionSans text-muted"><InspectableText>03 / A small demonstration of the site&apos;s design inspector. Switch between the text and its roles.</InspectableText></figcaption>
  </figure>;
}
