import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ProfileControls } from './profile-controls';
import { SkinTypeQuiz } from './skin-type-quiz';
import { ProfileSync } from './profile-sync';

describe('skin type quiz', () => {
  it('opens on the first question with every option as a radio button', () => {
    const html = renderToStaticMarkup(<SkinTypeQuiz onClose={() => {}} />);
    expect(html).toContain('Question 1 of 8');
    expect(html).toContain('type="radio"');
    expect(html).toContain('Tight or rough');
    expect(html).toContain('disabled');
    expect(html).toContain('Skip');
    expect(html).not.toContain('Back');
  });
});

describe('profile controls', () => {
  it('offers the quiz and says what an unset skin type costs', () => {
    const html = renderToStaticMarkup(<ProfileControls />);
    expect(html).toContain('Not sure? Find my skin type');
    expect(html).toContain('skin-specific warnings cannot be given');
  });

  it('does not ask what the skin reacts to before there is anything to say', () => {
    expect(renderToStaticMarkup(<ProfileControls />)).not.toContain('What your skin reacts to');
  });
});

describe('account sync panel', () => {
  it('draws nothing until a session is known, so a guest never sees it', () => {
    expect(renderToStaticMarkup(<ProfileSync />)).toBe('');
  });
});
