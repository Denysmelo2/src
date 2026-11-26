// Sanitize a chapter's HTML before it is shown (handover 26/11/2026,
// task 2). The chapters come from the owner's book project; they are
// still run through DOMPurify so a script, an event handler or a
// javascript: link can never reach the page.
//
// Kept: the book's classes (.sg*), headings with their ids (anchors),
// tables, SVG charts, <video> and the cdn.gamma.app images. Dropped: the
// <style> each chapter carries (the same in all 9; it is in
// src/styles/ebook.css, scoped to .chapter-content, so it cannot restyle
// the rest of the site).
// Added: each <table> is wrapped in <div class="sg4-twrap"> so it scrolls
// on its own on a phone; links to other sites open in a new tab.

import DOMPurify from 'dompurify';

let hooked = false;
function addLinkHook() {
  if (hooked) return;
  hooked = true;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      const href = (node.getAttribute('href') || '').trim();
      if (/^https?:\/\//i.test(href)) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    }
    if (node.tagName === 'IMG') {
      node.setAttribute('loading', 'lazy');
      node.setAttribute('decoding', 'async');
    }
    if (node.tagName === 'VIDEO') {
      node.setAttribute('preload', 'metadata');
      node.removeAttribute('autoplay');
    }
  });
}

/** The chapter HTML, safe to put in the page. */
export function sanitizeChapterHtml(html) {
  addLinkHook();
  const fragment = DOMPurify.sanitize(String(html || ''), {
    FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
    FORBID_ATTR: ['autoplay'],
    ADD_TAGS: ['video'],
    ADD_ATTR: ['target', 'controls', 'playsinline', 'loading', 'decoding', 'preload'],
    RETURN_DOM_FRAGMENT: true,
  });
  for (const table of fragment.querySelectorAll('table')) {
    if (table.parentElement?.classList.contains('sg4-twrap')) continue;
    const wrap = document.createElement('div');
    wrap.className = 'sg4-twrap';
    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(table);
  }
  const holder = document.createElement('div');
  holder.appendChild(fragment);
  return holder.innerHTML;
}
