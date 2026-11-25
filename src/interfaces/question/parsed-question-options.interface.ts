export interface ParsedQuestionOption {
  label?: unknown;
  text?: unknown;
}

export interface QuestionOptionResponse {
  label: string;
  text: string;
}

export interface ParsedQuestionOptions {
  A: string;
  B: string;
  C: string;
  D: string;
  E: string | null;
}
