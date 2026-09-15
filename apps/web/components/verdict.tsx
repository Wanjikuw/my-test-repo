import type { AnalyzeResponse } from '@allergy-checker/shared';
import { TIER_LABEL, TIER_NOTE } from '../lib/annotate';

const TIER_STYLE: Record<AnalyzeResponse['tier'], string> = {
  Avoid: 'bg-avoid-wash text-avoid',
  Caution: 'bg-caution-wash text-caution',
  UnverifiedCaution: 'bg-unread-wash text-unread',
  Safe: 'bg-safe-wash text-safe',
};

/**
 * The verdict and how much of the label it is based on, side by side and the same size.
 *
 * Coverage is not a footnote here. The median real label carries ten names the corpus
 * cannot identify, so a tier shown on its own would overstate what was actually checked.
 */
export function Verdict({ result }: { result: AnalyzeResponse }) {
  const { coverage } = result;
  const unread = coverage.total - coverage.identified;

  return (
    <div className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
      <div className={`p-6 ${TIER_STYLE[result.tier]}`}>
        <p className="text-xs font-medium tracking-widest uppercase opacity-70">Verdict</p>
        <p className="mt-2 font-serif text-4xl leading-none">{TIER_LABEL[result.tier]}</p>
        <p className="mt-3 text-sm leading-relaxed opacity-90">{TIER_NOTE[result.tier]}</p>
      </div>

      <div className="bg-surface p-6">
        <p className="text-xs font-medium tracking-widest text-muted uppercase">Identified</p>
        <p className="mt-2 font-serif text-4xl leading-none">
          {coverage.identified}
          <span className="text-muted"> / {coverage.total}</span>
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {unread === 0
            ? 'Every name on this label is in the reference data.'
            : `${unread} ${unread === 1 ? 'name is' : 'names are'} not in the reference data and could not be checked.`}
        </p>
      </div>
    </div>
  );
}
