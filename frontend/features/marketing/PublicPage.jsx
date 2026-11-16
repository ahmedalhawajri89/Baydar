'use client';

import { PublicFooter } from './PublicFooter';
import { PublicHeader } from './PublicHeader';

/**
 * The frame every public page after the front one shares (ADR-043): the navy
 * band with the header, the page's title and its one-sentence answer, then
 * the body on the light ground.
 *
 * The answer sits in the band, under the title, because on these pages the
 * visitor came with a question (what does it cost, is it ZATCA compliant)
 * and the first thing they read should be the answer to it.
 */
export function PublicPage({ title, answer, band, children }) {
  return (
    <>
      <div className="bg-(--color-brand-panel) text-(--color-on-brand)">
        <PublicHeader />
      </div>
      <main id="main">
        <div className="bg-(--color-brand-panel) text-(--color-on-brand)">
          <div className="mx-auto max-w-6xl px-6 pt-8 pb-16 md:px-10 md:pt-14 md:pb-20">
            <h1 className="max-w-4xl text-4xl font-bold">{title}</h1>
            {answer ? (
              <p className="measure mt-5 text-lead text-(--color-on-brand-2)">{answer}</p>
            ) : null}
            {band}
          </div>
        </div>
        {children}
      </main>
      <PublicFooter />
    </>
  );
}
