import Image from 'next/image';
import type { CSSProperties } from 'react';

/**
 * A photograph toned into the palette and faded into the band behind it.
 *
 * Outside the tier colours this system has no saturated hue, so an untreated product
 * photograph arrives as the loudest colour on the site — and often a cool one, which
 * collides with `safe` green, the only green here that carries a meaning.
 *
 * `saturate` is per frame because one value does not serve both. Measured over the right
 * two-fifths of the hero: the shore frame still leaves 10% of its pixels cooler than
 * neutral at 0.55 and none at all at 0.3, while the marble frame is warm to begin with and
 * holds 0% cool even at 0.55, so pulling it that far only drains it. Treated, both land
 * near a chroma of 7–12, between `shell` at 8 and `line` at 20.
 *
 * The scrim is a legibility device, not decoration; its opacities are in the stylesheet
 * with the measurement that set them.
 */
export function Photograph({
  src,
  tone,
  saturate,
  objectPosition = '50% 50%',
  priority = false,
}: {
  src: string;
  /** The band colour underneath, so the fade resolves into the page rather than onto grey. */
  tone: 'surface' | 'shell';
  saturate: number;
  /** Both subjects sit off-centre; this holds them in frame as the viewport narrows. */
  objectPosition?: string;
  priority?: boolean;
}) {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
      style={
        { '--photo-base': tone === 'surface' ? '255 255 255' : '250 247 242' } as CSSProperties
      }
    >
      <Image
        src={src}
        alt=""
        fill
        priority={priority}
        sizes="100vw"
        quality={82}
        className="object-cover"
        style={{
          objectPosition,
          filter: `saturate(${saturate}) sepia(0.18) brightness(1.05) contrast(0.93)`,
        }}
      />
      <div className="photo-scrim absolute inset-0" />
    </div>
  );
}
