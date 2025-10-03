export type QuestionType =
  | "mcq" | "gap-fill" | "order" | "token-select" | "match"
  | "word-order" | "bank-fill" | "dropdown-fill"
  | "hotspot"; // NEW

// hotspot image + regions
export type HotspotImage = {
  src: string;
  width: number;  // natural pixel width of the image
  height: number; // natural pixel height
  alt?: string;
};

export type HotspotRegion =
  | { id: string; shape: "rect"; x: number; y: number; w: number; h: number; label?: string }
  | { id: string; shape: "circle"; cx: number; cy: number; r: number; label?: string };

// in QuizItem add:
export interface QuizItem {
  feedback: any;
  points: number;
  id: string;
  type: QuestionType;

  // NEW: image shown before or alongside the interaction
  stimulus?: Media[]; // you already have Media
  // NEW: hotspot-specific fields
  hotspotImage?: HotspotImage;
  regions?: HotspotRegion[];
  selectMode?: "single" | "multi"; // for hotspot too
}

// Media type should be declared at the top level, not inside an interface
export type Media =
  | { kind: "image" | "gif"; src: string; alt?: string; width?: number; height?: number }
  | { kind: "audio"; src: string; caption?: string }
  | { kind: "video"; src: string; poster?: string };

export interface ItemFeedback {
  correct?: string;
  incorrect?: string;
  explanation?: string;
  media?: Media[]; // shows after "Check" in the feedback panel
  perOption?: Record<string, { text?: string; media?: Media[] }>;
  perGap?: Record<number, { text?: string; media?: Media[] }>;
  premium?: boolean;
}

export interface Quiz {
  id: string;
  title: string;
  items: QuizItem[];
  scoring?: { partialCredit?: boolean };
}

export interface QuizItem {
  id: string;
  type: QuestionType;

  // Before-question media (optional)
  stimulus?: Media[]; // shows BEFORE the interactive UI if present

  // MCQ
  prompt?: string;
  options?: { id: string; text: string }[];

  // Gap-fill (typed)
  body?: string;
  gaps?: { index: number; accepted: string[] }[];

  // Order (sentences/paragraphs)
  segments?: { id: string; text: string }[];

  // Token-select
  text?: string;
  tokens?: { id: string; text: string }[];
  selectMode?: "single" | "multi";

  // Match (two-column)
  left?: { id: string; text: string }[];
  right?: { id: string; text: string }[];

  // NEW: Word order (reorder tokens to form a sentence)
  words?: { id: string; text: string }[]; // if omitted, we'll split `text`

  // NEW: Bank fill (drag words into blanks in body using ___)
  bank?: { id: string; text: string }[];

  // NEW: Dropdown fill (options per blank index)
  optionsByIndex?: Record<number, { id: string; text: string }[]>;

  // Answers for all types
  answer:
    | { type: "mcq"; correctOptionIds: string[] }
    | { type: "gap"; acceptedByIndex: Record<number, string[]> }
    | { type: "order"; correctOrder: string[] }
    | { type: "tokens"; correctTokenIds: string[] }
    | { type: "match"; pairs: [string, string][] }
    | { type: "word-order"; correctOrder: string[] }
    | { type: "bank"; correctTokenIdByIndex: Record<number, string[]> }
    | { type: "dropdown"; correctOptionIdByIndex: Record<number, string> }
    | { type: "hotspot"; correctRegionIds: string[] }; // NEW
}

