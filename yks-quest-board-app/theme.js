(() => {
  const palettes = {
    green: { name: 'Yeşil', light: '#267b5e', dark: '#80c4a2' },
    blue: { name: 'Mavi', light: '#216a9a', dark: '#86c7f4' },
    red: { name: 'Kırmızı', light: '#b33648', dark: '#ff9eae' },
    purple: { name: 'Mor', light: '#7852a0', dark: '#c3a5ef' },
    orange: { name: 'Turuncu', light: '#965400', dark: '#ffc17f' },
    pink: { name: 'Pembe', light: '#a63777', dark: '#f2a2cf' },
    yellow: { name: 'Sarı', light: '#796000', dark: '#edd773' },
    turquoise: { name: 'Turkuaz', light: '#166f72', dark: '#7cd4d4' },
    gray: { name: 'Beyaz / Gri', light: '#5b646c', dark: '#c5cbd0' },
    navy: { name: 'Lacivert', light: '#365077', dark: '#a7bbe8' },
    lime: { name: 'Lime', light: '#4c6d18', dark: '#c0df87' },
    copper: { name: 'Bakır', light: '#86513a', dark: '#e4b299' }
  };
  const keys = { choice: 'ders-theme', style: 'ders-appearance-style', accent: 'ders-appearance-accent', monochrome: 'ders-appearance-monochrome' };
  let choice, style, accent, monochrome;
  const media = matchMedia('(prefers-color-scheme: dark)');
  function read(key, fallback) { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }
  function load() {
    choice = read(keys.choice, 'system'); if (!['light','dark','system'].includes(choice)) choice = 'system';
    style = read(keys.style, 'classic'); if (!['classic','glass'].includes(style)) style = 'classic';
    accent = read(keys.accent, 'green'); if (!palettes[accent]) accent = 'green';
    monochrome = read(keys.monochrome, 'false') === 'true';
  }
  function apply() {
    const root = document.documentElement, theme = choice === 'system' ? (media.matches ? 'dark' : 'light') : choice;
    root.dataset.theme = theme; root.dataset.themeChoice = choice;
    root.dataset.appearance = style; root.dataset.accent = accent; root.dataset.monochrome = String(monochrome);
    root.style.setProperty('--accent', palettes[monochrome ? 'gray' : accent][theme]);
    root.style.setProperty('--accent-ink', theme === 'dark' ? '#141716' : '#ffffff');
    root.style.setProperty('--accent-soft', accent === 'green' && !monochrome ? (theme === 'dark' ? '#243c2f' : '#e5f2eb') : 'color-mix(in srgb, var(--accent) 12%, var(--panel))');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#141716' : '#f7f9f8';
    window.dispatchEvent(new Event('dersappearancechange'));
  }
  function save(key, value) { try { localStorage.setItem(keys[key], String(value)); } catch {} apply(); }
  window.DersTheme = {
    set(value) { if (!['light','dark','system'].includes(value)) return; choice = value; save('choice', value); },
    setStyle(value) { if (!['classic','glass'].includes(value)) return; style = value; save('style', value); },
    setAccent(value) { if (!palettes[value]) return; accent = value; save('accent', value); },
    setMonochrome(value) { monochrome = Boolean(value); save('monochrome', monochrome); },
    reset() { choice = 'system'; style = 'classic'; accent = 'green'; monochrome = false; for (const key of Object.values(keys)) { try { localStorage.removeItem(key); } catch {} } apply(); },
    get choice() { return choice; }, get style() { return style; }, get accent() { return accent; }, get monochrome() { return monochrome; }, palettes
  };
  media.addEventListener('change', apply);
  window.addEventListener('storage', event => { if (event.key === null || Object.values(keys).includes(event.key)) { load(); apply(); } });
  load(); apply();
})();
