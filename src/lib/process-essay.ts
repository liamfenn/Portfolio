import type { PortfolioMediaAsset } from "@/lib/media-assets";

export type ProcessMediaFrame = { caption: string; asset?: PortfolioMediaAsset };
export type ProcessMediaSequence = { id: string; label: string; frames: ProcessMediaFrame[]; href?: string };

// Add assets to these frames as recordings and references are ready.
export const PROCESS_OPENING_MEDIA: ProcessMediaSequence = {
  id: "opening", label: "The homepage on mobile", frames: [
    { caption: "The homepage, on mobile.", asset: {
      id: "process-clipped-mobile", kind: "image", src: "/images/process/clipped-mobile.png",
      width: 2880, height: 2880,
      alt: "The portfolio homepage inside an iPhone, showing the introduction and Shop rewards card on a white background.",
    } },
  ],
};

export const PROCESS_SECTIONS = [
  {
    id: "in-the-margins",
    title: "In the margins",
    paragraphs: [
      "I've always been drawn to the margins. The space between design and engineering, the edges of a printed page, and the small decisions that shape how something feels. I like work where those things meet, where making an interface and deciding what it should be happen together.",
      "This site gives me somewhere to explore that at a personal scale. The work needs room to speak, but the surface around it can have a character of its own. I'm interested in how much that character can come from typography, spacing, and behavior, before adding anything else.",
    ],
  },
  {
    id: "two-languages",
    title: "Two languages",
    paragraphs: [
      "The starting point is a juxtaposition between editorial, print design, and the terminal. I love the way a printed page organizes attention: the relationship between text and image, a caption tucked beneath a photograph, the rhythm of columns and margins. The composition gives you a way into the material without explaining itself.",
      "I spend a lot of my day in a terminal, and find a different kind of beauty there. Sharp edges and character grids create a precise, repeatable structure. Color, hierarchy, and the rhythm of text arriving do a lot of work with very little surrounding UI. The constraints create their own possibilities for expression.",
      "Both influences are present here. Serif text, modular layouts, and whitespace come from the editorial side. Compact controls, streaming labels, and brief color changes bring the behavior of a working interface into that composition. I like the tension between a page that feels typeset and a screen that keeps responding.",
    ],
    media: {
      id: "inspiration", label: "Inspiration", href: "https://www.cosmos.so/notliam/portfolio", frames: [
        { caption: "Editorial layouts and printed matter." },
        { caption: "Terminal interfaces, grids, and color themes." },
        { caption: "References collected on my Cosmos board." },
      ],
    },
  },
  {
    id: "letters-set-loose",
    title: "Letters, set loose",
    paragraphs: [
      "The glyph globe is where those two languages get to play together. Characters turn in a small sphere, with short flashes of color passing through them. Tap it and letters leave their places across the page. What was a composed piece of typography becomes something you can move through and disturb.",
      "I like that the interaction uses the material already there. The letters carry information, then briefly become shapes with weight and movement. Their empty spaces are still visible in the page, so the connection to where they came from is never quite lost.",
      "The return matters as much as the release. Each character finds its way back to its own place, and the page becomes readable again. That balance took a lot of adjustment: enough disorder to feel playful, enough continuity that the whole thing still feels connected to the interface you started with.",
    ],
    media: {
      id: "glyphs", label: "Glyph globe interaction", frames: [
        { caption: "The globe: type, motion, and color." },
        { caption: "Letters released from the page." },
        { caption: "Finding their way home." },
      ],
    },
  },
  {
    id: "thinking-through-making",
    title: "Thinking through making",
    paragraphs: [
      "A working prototype is often how I understand an idea. A transition can look convincing in a mockup and feel distracting in use. The project views here went through inline expansion, a focused view, and details over the card. Each changes how it feels to move between browsing and looking closely.",
      "I also tried a shader that swept across the cards before returning to a simpler blur and fade. Seeing the more elaborate version running made the quieter option easier to judge. The useful part of an experiment is sometimes finding out what to leave behind.",
      "Along the way, I built a type and spacing inspector, a palette lab, and a workflow for importing video. They make it easier to check a decision in context. Code-first exploration and AI-assisted work have made the movement between design and implementation more fluid for me, but the value still comes from looking at what actually happened and deciding what to change.",
    ],
    media: {
      id: "iterations", label: "Project view iterations", frames: [
        { caption: "Project views: inline expansion." },
        { caption: "Project views: focused layout." },
        { caption: "Project views: card overlay." },
      ],
    },
    extraMedia: {
      id: "tools", label: "Tools behind the site", frames: [
        { caption: "The design inspector." },
        { caption: "The palette lab." },
        { caption: "Preparing media for the site." },
      ],
    },
  },
  {
    id: "what-stays-the-same",
    title: "What stays the same",
    paragraphs: [
      "The tools and the ways we work will keep changing. I enjoy having somewhere to try them, without needing every experiment to become part of the finished site.",
      "What stays with me is the need to look carefully: at the way a paragraph sits, how an interaction responds, or whether an idea needs to be there at all. I'm trying to get closer to the experience I had in mind, through whatever combination of drawing, writing, and building helps me understand it.",
    ],
  },
] satisfies {
  id: string; title: string; paragraphs: string[];
  media?: ProcessMediaSequence; extraMedia?: ProcessMediaSequence;
}[];
