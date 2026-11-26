(() => {
  const paths = {
    pagoda:'<path d="M3 21h18M5 19h14M7 17h10M8 14h8M9 11h6M10 8h4M12 2v3m-2 2 2-2 2 2M9 10l3-2 3 2m-7 3 4-2 4 2m-9 3 5-2 5 2m-6 1v2m2-2v2"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
    moon:'<path d="M20.2 14.4A8.7 8.7 0 019.6 3.8a8.7 8.7 0 1010.6 10.6Z"/>',
    help:'<circle cx="12" cy="12" r="9"/><path d="M9.2 9a2.8 2.8 0 115.3 1.2c-.8 1.2-2.5 1.4-2.5 3M12 16.7h.01"/>',
    expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
    signal:'<path d="M4 19v-3m5 3v-7m5 7V8m5 11V4" stroke-width="2.7"/>',
    sliders:'<path d="M3 7h7m4 0h7M3 17h11m4 0h3"/><circle cx="12" cy="7" r="2"/><circle cx="16" cy="17" r="2"/>',
    down:'<path d="m5 9 7 7 7-7"/>',pin:'<path d="M19.5 10c0 5-7.5 11-7.5 11S4.5 15 4.5 10a7.5 7.5 0 1115 0Z"/><circle cx="12" cy="10" r="2.3"/>',
    map:'<path d="m2 6 6-3 8 3 6-3v15l-6 3-8-3-6 3zm6-3v15m8-12v15"/>',out:'<path d="M6 18 18 6M8 6h10v10"/>',
    walk:'<circle cx="13.5" cy="4.3" r="1.8"/><path d="m7 21 4-7 2 1 3 6m-6-7 2-6 3.2 3.7 3.3.8M6 12l2.8-2.6L12 8"/>',
    bike:'<circle cx="5.2" cy="16.3" r="3.5"/><circle cx="18.8" cy="16.3" r="3.5"/><path d="m5.2 16.3 4-7 3.1 7H5.2l9.3-5.8m.4-5.7h2.5l2.3 11.5M7.7 8.8H11"/>',
    play:'<path d="m6 4 14 8-14 8z" fill="currentColor" stroke-width="0"/>',stop:'<rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" stroke-width="0"/>',
    mouse:'<rect x="5.6" y="2" width="12.8" height="20" rx="6.3"/><path d="M12 5v4"/>',
    layers:'<path d="m3 8 9-5 9 5-9 5zM3 12l9 5 9-5M3 16l9 5 9-5"/>',arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',
    close:'<path d="m5 5 14 14m0-14L5 19"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
    check:'<circle cx="12" cy="12" r="8.7"/><path d="m8 12 2.7 2.7 5.4-5.5"/>'
  };
  window.icon = name => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||'')+'</svg>';
  document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon));
})();
