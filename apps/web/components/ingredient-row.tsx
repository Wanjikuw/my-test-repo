import { CATEGORY_LABEL, STATUS_LABEL, type AnnotatedName } from '../lib/annotate';

const MARKER: Record<AnnotatedName['annotation'], string> = {
  flagged: 'border-l-avoid',
  noted: 'border-l-caution',
  clean: 'border-l-safe',
  unread: 'border-l-line',
};

const STRATEGY_NOTE: Record<string, string> = {
  loose: 'matched after removing the bracketed common name',
  'common-name': 'matched on the common name inside the brackets',
};

function Tag({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-xs ${
        strong ? 'border-avoid/30 bg-avoid-wash text-avoid' : 'border-line text-muted'
      }`}
    >
      {children}
    </span>
  );
}

/**
 * One printed name, with everything known about it.
 *
 * The record and the reasons are kept apart on purpose. The tags say what the regulation
 * holds on the ingredient; the sentences below say what it means for this profile. An
 * ingredient can carry a tag and trigger nothing — Linalool is a declarable allergen on
 * any skin, but only escalates on sensitive — and the row has to be able to say that
 * without implying a risk that was never established for this person.
 *
 * The citation sits in the row rather than behind a tooltip: the regulation reference is
 * part of the claim, not a detail about it.
 */
export function IngredientRow({ name }: { name: AnnotatedName }) {
  const strategyNote = name.strategy ? STRATEGY_NOTE[name.strategy] : undefined;
  const status = STATUS_LABEL[name.regulatoryStatus];
  const onRecord = name.riskCategories.length > 0 || status !== null;

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

      {onRecord && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {status && <Tag strong={name.regulatoryStatus === 'prohibited'}>{status}</Tag>}
          {name.riskCategories.map((category) => (
            <Tag key={category}>{CATEGORY_LABEL[category]}</Tag>
          ))}
        </div>
      )}

      {name.reasons.map((reason, i) => (
        <p key={i} className="mt-2 text-sm leading-relaxed">
          {reason.message}
        </p>
      ))}

      {/* Carrying a tag is not the same as triggering a rule, and the row must not let the
          first be read as the second. */}
      {onRecord && name.reasons.length === 0 && (
        <p className="mt-2 text-sm text-muted">
          On record, but nothing here applies to the profile you gave.
        </p>
      )}

      {name.annotation === 'clean' && (
        <p className="mt-2 text-sm text-muted">Identified, with no risk on record.</p>
      )}

      {name.citation && (
        <p className="mt-2 font-mono text-xs leading-relaxed text-muted">{name.citation}</p>
      )}

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
