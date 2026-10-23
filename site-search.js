(() => {
  'use strict';
  const form = document.getElementById('site-search-form');
  const input = document.getElementById('site-search-input');
  const suggestions = document.getElementById('site-search-results');
  const pageResults = document.getElementById('search-page-results');
  const pageQuery = document.getElementById('search-page-query');
  const pageCount = document.getElementById('search-page-count');
  if (!form || !input) return;

  let pages = [];
  let indexPromise;
  const normalise = value => String(value || '').toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const escapeHtml = value => String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const termsFor = query => normalise(query).trim().split(/\s+/).filter(Boolean);

  function loadIndex() {
    if (!indexPromise) {
      indexPromise = fetch('/search-index.json', {cache:'no-cache'})
        .then(response => { if (!response.ok) throw new Error('Search index unavailable'); return response.json(); })
        .then(data => { pages = Array.isArray(data) ? data : []; return pages; })
        .catch(() => { indexPromise = null; throw new Error('Search is temporarily unavailable. Please try again shortly.'); });
    }
    return indexPromise;
  }

  function rankPages(query) {
    const terms = termsFor(query);
    if (!terms.length) return [];
    return pages.map(page => {
      const title = normalise(page.title);
      const path = normalise(page.path || page.url);
      const text = normalise(page.text);
      let score = 0;
      for (const term of terms) {
        if (title.includes(term)) score += title === term ? 16 : title.startsWith(term) ? 10 : 7;
        if (path.includes(term)) score += 5;
        if (text.includes(term)) score += 2;
        else if (!title.includes(term) && !path.includes(term)) return null;
      }
      if (terms.length > 1 && terms.every(term => title.includes(term))) score += 6;
      return {page, score};
    }).filter(Boolean).sort((a,b) => b.score-a.score || a.page.title.localeCompare(b.page.title));
  }

  function renderSuggestions(items, message) {
    if (!suggestions) return;
    if (message) {
      suggestions.innerHTML = '<div class="site-search-empty">' + escapeHtml(message) + '</div>';
    } else if (!items.length) {
      suggestions.innerHTML = '<div class="site-search-empty">No matching pages found.</div>';
    } else {
      suggestions.innerHTML = items.slice(0,7).map(({page}) =>
        '<a class="site-search-result" role="option" href="' + escapeHtml(page.url) + '"><strong>' + escapeHtml(page.title) + '</strong><small>' + escapeHtml(page.path || page.url) + '</small></a>'
      ).join('');
    }
    suggestions.hidden = false;
    input.setAttribute('aria-expanded','true');
  }

  function closeSuggestions() {
    if (suggestions) suggestions.hidden = true;
    input.setAttribute('aria-expanded','false');
  }

  async function updateSuggestions() {
    const query = input.value.trim();
    if (query.length < 2) { closeSuggestions(); return; }
    try {
      await loadIndex();
      renderSuggestions(rankPages(query));
    } catch (error) {
      renderSuggestions([], error.message);
    }
  }

  input.addEventListener('input', updateSuggestions);
  input.addEventListener('focus', () => { if (input.value.trim().length >= 2) updateSuggestions(); });
  document.addEventListener('click', event => {
    if (!event.target.closest('.site-search')) closeSuggestions();
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeSuggestions();
    if (event.key === 'ArrowDown' && suggestions && !suggestions.hidden) {
      const first = suggestions.querySelector('a');
      if (first) { event.preventDefault(); first.focus(); }
    }
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const query = input.value.trim();
    if (query.length < 2) { input.focus(); return; }
    window.location.href = '/search.html?q=' + encodeURIComponent(query);
  });

  if (pageResults) {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q') || '';
    input.value = query;
    if (pageQuery) pageQuery.textContent = query ? 'Results for “' + query + '”' : 'Search all Hamlet pages';
    (async () => {
      if (query.trim().length < 2) {
        if (pageCount) pageCount.textContent = 'Enter at least two characters to search.';
        pageResults.innerHTML = '';
        return;
      }
      try {
        await loadIndex();
        const results = rankPages(query);
        if (pageCount) pageCount.textContent = results.length + (results.length === 1 ? ' page found' : ' pages found');
        pageResults.innerHTML = results.length ? results.map(({page}) =>
          '<a class="search-page-result" href="' + escapeHtml(page.url) + '"><span class="search-page-result-title">' + escapeHtml(page.title) + '</span><span class="search-page-result-path">' + escapeHtml(page.path || page.url) + '</span><span class="search-page-result-excerpt">' + escapeHtml(makeExcerpt(page.text, termsFor(query))) + '</span></a>'
        ).join('') : '<p class="search-page-empty">No matching pages found. Try a different word or phrase.</p>';
      } catch (error) {
        if (pageCount) pageCount.textContent = error.message;
        pageResults.innerHTML = '';
      }
    })();
  }

  function makeExcerpt(text, terms) {
    const source = String(text || '').replace(/\s+/g,' ').trim();
    const lower = normalise(source);
    let position = -1;
    for (const term of terms) {
      const found = lower.indexOf(term);
      if (found >= 0 && (position < 0 || found < position)) position = found;
    }
    if (position < 0) return source.slice(0,190) + (source.length > 190 ? '…' : '');
    const start = Math.max(0, position - 70);
    const end = Math.min(source.length, position + 150);
    return (start ? '…' : '') + source.slice(start,end) + (end < source.length ? '…' : '');
  }
})();