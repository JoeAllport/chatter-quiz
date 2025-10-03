export type QuestionType = "mcq" | "gap-fill";

export interface Quiz {
  id: string;
  title: string;
  items: QuizItem[];
  scoring?: { partialCredit?: boolean };
}

export interface QuizItem {
  id: string;
  type: QuestionType;
  prompt?: string;      // For MCQ
  body?: string;        // For Gap-fill, use "___" for blanks
  options?: { id: string; text: string }[];
  gaps?: { index: number; accepted: string[] }[];
  answer:
    | { type: "mcq"; correctOptionIds: string[] }
    | { type: "gap"; acceptedByIndex: Record<number, string[]> };
  points?: number;
}

export type Media =
  | { kind: "image" | "gif"; src: string; alt?: string; width?: number; height?: number }
  | { kind: "audio"; src: string; caption?: string }
  | { kind: "video"; src: string; poster?: string };

export interface ItemFeedback {
  // Short messages
  correct?: string;
  incorrect?: string;
  // Longer explanation (HTML/Markdown string you control)
  explanation?: string;
  // Optional rich media gallery
  media?: Media[];
  // Optional granular feedback
  perOption?: Record<string, { text?: string; media?: Media[] }>;  // for MCQ by optionId
  perGap?: Record<number, { text?: string; media?: Media[] }>;     // for gap-fill by gap index
  // If true, only show when premium is unlocked (you decide how)
  premium?: boolean;
}

export interface QuizItem {
  id: string;
  type: "mcq" | "gap-fill";
  prompt?: string;
  body?: string;
  options?: { id: string; text: string }[];
  gaps?: { index: number; accepted: string[] }[];
  answer:
    | { type: "mcq"; correctOptionIds: string[] }
    | { type: "gap"; acceptedByIndex: Record<number, string[]> };
  points?: number;
  // ⬇️ new
  feedback?: ItemFeedback;
}

