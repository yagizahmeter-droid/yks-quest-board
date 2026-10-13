(() => {
  let choice = 'system';
  try { choice = localStorage.getItem('ders-theme') || 'system'; } catch {}
  if (!['light', 'dark', 'system'].includes(choice)) choice = 'system';
  const media = matchMedia('(prefers-color-scheme: dark)');
  function apply(value) {
    choice = value;
    document.documentElement.dataset.theme = value === 'system' ? (media.matches ? 'dark' : 'light') : value;
    document.documentElement.dataset.themeChoice = value;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = document.documentElement.dataset.theme === 'dark' ? '#141716' : '#f7f9f8';
  }
  window.DersTheme = { set(value) { if (!['light', 'dark', 'system'].includes(value)) return; try { localStorage.setItem('ders-theme', value); } catch {} apply(value); }, get choice() { return choice; } };
  media.addEventListener('change', () => apply(choice));
  apply(choice);
})();
