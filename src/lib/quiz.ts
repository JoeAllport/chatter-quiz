// src/lib/quiz.ts

export type QuestionType =
  | "mcq"
  | "gap-fill"
  | "order"
  | "token-select"
  | "match"
  | "word-order"
  | "bank-fill"
  | "dropdown-fill"
  | "hotspot";

export type Media =
  | { kind: "image" | "gif"; src: string; alt?: string; width?: number; height?: number }
  | { kind: "audio"; src: string; caption?: string }
  | { kind: "video"; src: string; poster?: string };

export interface ItemFeedback {
  correct?: string;
  incorrect?: string;
  explanation?: string;
  media?: Media[];
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

/** Hotspot support */
export type HotspotImage = {
  src: string;
  width: number;
  height: number;
  alt?: string;
};

export type HotspotRegion =
  | { id: string; shape: "rect"; x: number; y: number; w: number; h: number; label?: string }
  | { id: string; shape: "circle"; cx: number; cy: number; r: number; label?: string };

export interface QuizItem {
  id: string;
  type: QuestionType;

  /** Optional stimulus media shown BEFORE the interaction */
  stimulus?: Media[];

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
  selectMode?: "single" | "multi"; // used for token-select and hotspot

  // Match (two-column)
  left?: { id: string; text: string }[];
  right?: { id: string; text: string }[];

  // Word order (reorder tokens to form a sentence)
  words?: { id: string; text: string }[];

  // Bank fill (drag words into blanks)
  bank?: { id: string; text: string }[];

  // Dropdown fill (options per blank index)
  optionsByIndex?: Record<number, { id: string; text: string }[]>;

  // Hotspot
  hotspotImage?: HotspotImage;
  regions?: HotspotRegion[];

  // Answers
  answer:
    | { type: "mcq"; correctOptionIds: string[] }
    | { type: "gap"; acceptedByIndex: Record<number, string[]> }
    | { type: "order"; correctOrder: string[] }
    | { type: "tokens"; correctTokenIds: string[] }
    | { type: "match"; pairs: [string, string][] }
    | { type: "word-order"; correctOrder: string[] }
    | { type: "bank"; correctTokenIdByIndex: Record<number, string[]> }
    | { type: "dropdown"; correctOptionIdByIndex: Record<number, string> }
    | { type: "hotspot"; correctRegionIds: string[] };

  points?: number;
  feedback?: ItemFeedback;
}
