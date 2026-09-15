import type { AnnotatedName } from '../lib/annotate';

const MARKER: Record<AnnotatedName['annotation'], string> = {
  flagged: 'border-l-avoid',
  clean: 'border-l-safe',
  unread: 'border-l-line',
};

const STRATEGY_NOTE: Record<string, string> = {
  loose: 'matched after removing the bracketed common name',
  'common-name': 'matched on the common name inside the brackets',
};

/**
 * One printed name, with everything known about it.
 *
 * The citation sits in the row rather than behind a tooltip: the regulation reference is
 * part of the claim, not a detail about it.
 */
export function IngredientRow({ name }: { name: AnnotatedName }) {
  const strategyNote = name.strategy ? STRATEGY_NOTE[name.strategy] : undefined;

  return (
    <li className={`border-l-2 py-4 pl-4 ${MARKER[name.annotation]}`}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-medium">{name.printed}</span>
        {name.resolved && (
          <span className="text-xs tracking-wide text-muted">&rarr; {name.resolved}</span>
        )}
        {name.annotation === 'unread' && (
          <span className="text-xs tracking-wide text-unread uppercase">not in reference data</span>
        )}
      </div>

      {strategyNote && <p className="mt-1 text-xs text-muted">{strategyNote}</p>}

      {name.reasons.map((reason, i) => (
        <div key={i} className="mt-2">
          <p className="text-sm leading-relaxed">{reason.message}</p>
          {reason.sourceCitation && (
            <p className="mt-1 font-mono text-xs leading-relaxed text-muted">
              {reason.sourceCitation}
            </p>
          )}
        </div>
      ))}

      {name.suggestions.length > 0 && (
        <p className="mt-2 text-sm text-muted">
          Did you mean{' '}
          {name.suggestions.map((s, i) => (
            <span key={s.candidate}>
              {i > 0 && ', '}
              <span className="text-ink">{s.candidate}</span>
            </span>
          ))}
          ? Spelling suggestions only — these were not checked against any rule.
        </p>
      )}
    </li>
  );
}
