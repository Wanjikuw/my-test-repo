import { z } from 'zod';
import type { RiskCategory, SkinType } from './scoring';

/**
 * What exactly a person's sensitive skin reacts to. Kept apart from the skin type because one
 * reaction does not make skin "sensitive", yet it still decides which ingredients matter.
 */
export const SensitivityIssue = z.enum(['stinging', 'redness', 'fragrance_reaction', 'rash']);
export type SensitivityIssue = z.infer<typeof SensitivityIssue>;

export const SENSITIVITY_ISSUES: Record<
  SensitivityIssue,
  { label: string; description: string; categories: readonly RiskCategory[] }
> = {
  stinging: {
    label: 'Stinging or burning',
    description:
      'Products sting or burn when applied, which usually points to a weakened skin barrier or a reaction to acids and strong actives.',
    categories: ['common_irritant'],
  },
  redness: {
    label: 'Redness or flushing',
    description: 'Skin turns red or flushes easily, often in response to irritants.',
    categories: ['common_irritant'],
  },
  fragrance_reaction: {
    label: 'Reacts to fragrance',
    description:
      'Scented products cause itching, redness or a rash, so fragrance allergens matter most for you.',
    categories: ['fragrance_allergen'],
  },
  rash: {
    label: 'Itching or rash without a scent',
    description:
      'Reactions to unscented products point towards preservatives or other sensitisers.',
    categories: ['preservative_sensitizer'],
  },
};

const ISSUE_ORDER = SensitivityIssue.options;

export interface QuizOption {
  id: string;
  label: string;
  weights?: Partial<Record<SkinType, number>>;
  /** Choosing this option is the person reporting this reaction. */
  issue?: SensitivityIssue;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: readonly QuizOption[];
}

const yesNo = (issue: SensitivityIssue): QuizOption[] => [
  { id: 'often', label: 'Yes, often', weights: { sensitive: 2 }, issue },
  { id: 'rarely', label: 'Rarely or never' },
];

export const QUIZ: readonly QuizQuestion[] = [
  {
    id: 'after-wash',
    prompt: 'An hour after washing your face, with nothing applied, how does your skin feel?',
    options: [
      { id: 'tight', label: 'Tight or rough', weights: { dry: 2 } },
      { id: 'comfortable', label: 'Comfortable and smooth', weights: { normal: 2 } },
      {
        id: 'zone',
        label: 'Comfortable, but shiny on the forehead and nose',
        weights: { combination: 2 },
      },
      { id: 'shiny', label: 'Shiny across the whole face', weights: { oily: 2 } },
    ],
  },
  {
    id: 'midday',
    prompt: 'By the middle of the afternoon, how shiny is your skin?',
    options: [
      { id: 'none', label: 'Not shiny anywhere', weights: { dry: 1, normal: 1 } },
      { id: 'zone', label: 'Only the forehead, nose and chin', weights: { combination: 2 } },
      { id: 'all', label: 'Across most of my face', weights: { oily: 2 } },
    ],
  },
  {
    id: 'pores',
    prompt: 'How visible are your pores?',
    options: [
      { id: 'barely', label: 'Barely visible', weights: { dry: 1, normal: 1 } },
      { id: 'nose', label: 'Mostly on my nose', weights: { combination: 1, normal: 1 } },
      { id: 'wide', label: 'Across my cheeks as well', weights: { oily: 2 } },
    ],
  },
  {
    id: 'flaking',
    prompt: 'How often does your skin flake or feel dry in patches?',
    options: [
      { id: 'often', label: 'Often', weights: { dry: 2 } },
      { id: 'sometimes', label: 'Sometimes', weights: { dry: 1 } },
      { id: 'never', label: 'Rarely or never', weights: { normal: 1, oily: 1 } },
    ],
  },
  {
    id: 'sting',
    prompt: 'Do new products sting or burn when you put them on?',
    options: yesNo('stinging'),
  },
  {
    id: 'redness',
    prompt: 'Does your skin turn red or flush easily, for example with heat or a new product?',
    options: yesNo('redness'),
  },
  {
    id: 'fragrance',
    prompt: 'Do scented products make your skin itch, redden or break out in a rash?',
    options: yesNo('fragrance_reaction'),
  },
  {
    id: 'rash',
    prompt: 'Have unscented products ever given you an itchy rash?',
    options: yesNo('rash'),
  },
];

/** Looked up once, so scoring an answer never searches the questions. */
const OPTIONS = new Map<string, Map<string, QuizOption>>(
  QUIZ.map((question) => [question.id, new Map(question.options.map((o) => [o.id, o]))]),
);

type BaseSkinType = Exclude<SkinType, 'sensitive'>;
/** Also the tie-break order. A tie is reported as a close result, never hidden. */
const BASE_TYPES: readonly BaseSkinType[] = ['dry', 'oily', 'combination', 'normal'];

/** Two reactions together are what makes skin "sensitive"; one is reported but does not decide. */
export const SENSITIVE_ISSUE_THRESHOLD = 2;
/** A lead smaller than this is a close call the person is asked to confirm. */
export const CLEAR_MARGIN = 2;

export interface QuizResult {
  /** Null when nothing answered pointed anywhere. */
  skinType: SkinType | null;
  /** The type underneath, when the result is sensitive. */
  baseType: BaseSkinType | null;
  issues: SensitivityIssue[];
  scores: Record<SkinType, number>;
  confidence: 'clear' | 'close' | 'none';
  /** Offered alongside `skinType` when the call is close. */
  runnerUp: BaseSkinType | null;
  answered: number;
}

/**
 * Scores the answers in one pass over them, then ranks four totals. Unknown questions and
 * options are ignored, so a stale or tampered answer set cannot throw or score.
 */
export function inferSkinType(answers: Readonly<Record<string, string>>): QuizResult {
  const scores: Record<SkinType, number> = {
    dry: 0,
    oily: 0,
    combination: 0,
    sensitive: 0,
    normal: 0,
  };
  const reported = new Set<SensitivityIssue>();
  let answered = 0;

  for (const [questionId, optionId] of Object.entries(answers)) {
    const option = OPTIONS.get(questionId)?.get(optionId);
    if (!option) continue;
    answered += 1;
    if (option.issue) reported.add(option.issue);
    if (option.weights) {
      for (const [type, weight] of Object.entries(option.weights)) {
        scores[type as SkinType] += weight;
      }
    }
  }

  const issues = ISSUE_ORDER.filter((issue) => reported.has(issue));
  const ranked = [...BASE_TYPES].sort((a, b) => scores[b] - scores[a]);
  const [first, second] = ranked as [BaseSkinType, BaseSkinType];
  const baseType = scores[first] > 0 ? first : null;

  if (issues.length >= SENSITIVE_ISSUE_THRESHOLD) {
    return {
      skinType: 'sensitive',
      baseType,
      issues,
      scores,
      confidence: 'clear',
      runnerUp: null,
      answered,
    };
  }
  if (baseType === null) {
    return {
      skinType: null,
      baseType: null,
      issues,
      scores,
      confidence: 'none',
      runnerUp: null,
      answered,
    };
  }
  const close = scores[first] - scores[second] < CLEAR_MARGIN;
  return {
    skinType: first,
    baseType,
    issues,
    scores,
    confidence: close ? 'close' : 'clear',
    runnerUp: close ? second : null,
    answered,
  };
}

export interface IssueNote {
  issue: SensitivityIssue;
  /** INCI names on the label that fall in a category this reaction is about, in printed order. */
  ingredients: string[];
}

/**
 * Which ingredients on a label bear on the reactions a person reported. One pass over the
 * matched ingredients; the categories and issues involved are a handful, so it stays linear.
 */
export function issueNotes(
  matched: readonly { inciName: string; riskCategories: readonly RiskCategory[] }[],
  issues: readonly SensitivityIssue[],
): IssueNote[] {
  const wanted = new Set(issues);
  const byCategory = new Map<RiskCategory, SensitivityIssue[]>();
  for (const issue of ISSUE_ORDER) {
    if (!wanted.has(issue)) continue;
    for (const category of SENSITIVITY_ISSUES[issue].categories) {
      byCategory.set(category, [...(byCategory.get(category) ?? []), issue]);
    }
  }

  const found = new Map<SensitivityIssue, Set<string>>();
  for (const ingredient of matched) {
    for (const category of ingredient.riskCategories) {
      for (const issue of byCategory.get(category) ?? []) {
        const names = found.get(issue) ?? new Set<string>();
        names.add(ingredient.inciName);
        found.set(issue, names);
      }
    }
  }

  return ISSUE_ORDER.flatMap((issue) => {
    const names = found.get(issue);
    return names ? [{ issue, ingredients: [...names] }] : [];
  });
}
