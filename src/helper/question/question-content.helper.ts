import sanitizeHtml from 'sanitize-html';
import { QuestionImageReference } from '../../interfaces/question/question-image-reference.interface';
import { QuestionImageField } from '../../interfaces/question/question-image-field.type';

const QUESTION_HTML_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'div',
    'span',
    'strong',
    'em',
    'u',
    's',
    'ul',
    'ol',
    'li',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'img',
  ],
  allowedAttributes: {
    img: ['src', 'alt', 'width', 'height', 'data-question-image-key'],
    '*': ['style'],
  },
  allowedStyles: {
    '*': {
      'text-align': [/^left|right|center|justify$/],
      'max-width': [/^100%$/],
      height: [/^auto$/],
    },
  },
  allowedSchemes: ['http', 'https', 'data', 'blob'],
};

const PUBLIC_QUESTION_HTML_OPTIONS: sanitizeHtml.IOptions = {
  ...QUESTION_HTML_OPTIONS,
  allowedSchemes: ['http', 'https'],
};

export function sanitizeQuestionContent(content: string): string {
  return sanitizeHtml(content, QUESTION_HTML_OPTIONS);
}

export function sanitizePublicQuestionContent(content: string): string {
  return sanitizeHtml(content, PUBLIC_QUESTION_HTML_OPTIONS);
}

export function hasQuestionContent(content: string): boolean {
  const text = sanitizeHtml(content, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;|&#160;/gi, '')
    .trim();
  return Boolean(text) || /<img\b[^>]*>/i.test(content);
}

export function applyQuestionImageReferences(
  content: string,
  images: QuestionImageReference[],
  field: QuestionImageField,
): string {
  let html = sanitizeQuestionContent(content);
  for (const image of images.filter((reference) => reference.field === field)) {
    const escapedKey = image.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    html = html.replace(
      new RegExp(
        `<img\\b[^>]*data-question-image-key="${escapedKey}"[^>]*>`,
        'gi',
      ),
      (tag) =>
        /\bsrc="/i.test(tag)
          ? tag.replace(/\bsrc="[^"]*"/i, `src="${image.url}"`)
          : tag.replace(/>$/, ` src="${image.url}">`),
    );
  }
  return html;
}

export function resolveQuestionImageUrls(
  content: string,
  getPublicUrl: (path: string) => string,
): string {
  return content.replace(
    /src="\/uploads\/([^"]+)"/gi,
    (_match, path: string) => `src="${getPublicUrl(path)}"`,
  );
}
