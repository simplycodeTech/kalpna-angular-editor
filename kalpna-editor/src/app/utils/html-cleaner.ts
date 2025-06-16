export function sanitizePastedHtml(rawHtml: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');

  doc.querySelectorAll('o\:p, w\:sdt, w\:sdtpr, w\:listitem, xml').forEach(el => el.remove());

  doc.querySelectorAll('*').forEach(el => {
    if (el instanceof HTMLElement) {
      el.removeAttribute('class');
      el.removeAttribute('lang');

      if (el.hasAttribute('style')) {
        const style = el.getAttribute('style') || '';
        const cleanedStyle = style
          .split(';')
          .filter(rule => {
            const trimmed = rule.trim().toLowerCase();
            return (
              trimmed &&
              !trimmed.includes('font-family') &&
              !trimmed.includes('text-align') &&
              !trimmed.includes('mso-') &&
              !trimmed.includes('tab-stops') &&
              !trimmed.includes('margin') &&
              !trimmed.includes('text-indent')
            );
          })
          .join(';');

        if (cleanedStyle.trim()) {
          el.setAttribute('style', cleanedStyle);
        } else {
          el.removeAttribute('style');
        }
      }

      const inner = el.innerHTML.trim();
      if (
        !inner ||
        inner === '<br>' ||
        inner === '&nbsp;' ||
        inner === '<b></b>' ||
        inner === '<i></i>' ||
        inner.match(/^<br\s*\/?>\s*$/)
      ) {
        el.remove();
      }
    }
  });

  return doc.body.innerHTML;
}
