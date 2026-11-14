/*
 * Minimal runtime for the feedback dashboard.
 * Provides the `dash` object the page scripts use: data sources, calculations,
 * drawings, filters (params) and deep links. Data comes from window.OS_DATA (assets/data.js).
 */
(function () {
  const sources = {};
  const calcs = {};
  const draws = {};
  const listeners = [];
  const DEFAULT_PARAMS = { program: '', course: '', teacher: '' };
  let params = { ...DEFAULT_PARAMS };
  let version = 0;
  const cache = {};

  const raw = window.OS_DATA || {};
  Object.keys(raw).forEach((id) => { sources[id] = raw[id]; });

  function compute(id) {
    if (cache[id] && cache[id].v === version) return cache[id].res;
    let res;
    if (sources[id]) {
      res = { status: 'ok', data: sources[id], columns: Object.keys(sources[id][0] || {}), refreshing: false, truncated: false };
    } else if (calcs[id]) {
      try {
        const inputs = calcs[id].inputs.map((i) => {
          const d = compute(i);
          return d.status === 'ok' ? d.data : [];
        });
        const data = calcs[id].fn(...inputs);
        res = { status: 'ok', data, refreshing: false, truncated: false };
      } catch (e) {
        console.error('calc ' + id, e);
        res = { status: 'error', data: null, message: String(e) };
      }
    } else {
      res = { status: 'missing', data: [], message: 'Нет источника ' + id };
    }
    cache[id] = { v: version, res };
    return res;
  }

  function runDraw(name) {
    const spec = draws[name];
    if (!spec) return;
    document.querySelectorAll('[data-draw="' + name + '"]').forEach((el) => {
      if (el.closest('[hidden]')) return;
      try {
        if (typeof spec === 'function') spec(el);
        else {
          if (!el.__osMade) { el.replaceChildren(); el.__osMade = { v: spec.mount ? spec.mount(el) : null }; }
          if (spec.update) spec.update(el, el.__osMade.v);
        }
      } catch (e) { console.error('draw ' + name, e); }
    });
  }

  function redraw() {
    listeners.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
    Object.keys(draws).forEach(runDraw);
  }

  function changed() { version++; redraw(); }

  window.dash = {
    colors: ['var(--os-blue)', 'var(--os-cyan)', 'var(--os-violet)', 'var(--color-warn)', 'var(--color-ok)'],
    data: (id) => compute(id),
    calc: (id, spec) => { calcs[id] = spec; },
    loader: () => {},
    onData: (fn) => { listeners.push(fn); },
    draw: (name, spec) => {
      if (spec === undefined) { runDraw(name); return; }
      draws[name] = spec;
    },
    params: () => ({ ...params }),
    setParams: (p) => {
      params = { ...params, ...p };
      Object.keys(params).forEach((k) => { if (params[k] == null) params[k] = ''; });
      changed();
    },
    resetParams: () => { params = { ...DEFAULT_PARAMS }; changed(); },
    setLink: (name) => {
      try { history.replaceState(null, '', '#' + name); } catch (e) { /* file:// may refuse */ }
      requestAnimationFrame(redraw);
    },
  };

  let resizeTimer = null;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(redraw, 150); });
  document.addEventListener('DOMContentLoaded', redraw);
})();
