(() => {
  const theme = window.DersTheme, dialog = document.getElementById('appearanceDialog');
  const trigger = document.getElementById('appearanceButton'), palette = document.getElementById('accentPalette');
  for (const [value, colors] of Object.entries(theme.palettes)) {
    const label = document.createElement('label'); label.className = 'accent-swatch'; label.title = colors.name;
    const input = document.createElement('input'); input.type = 'radio'; input.name = 'appearanceAccent'; input.value = value; input.setAttribute('aria-label', colors.name);
    const swatch = document.createElement('span'); swatch.setAttribute('aria-hidden', 'true'); swatch.style.setProperty('--swatch-light', colors.light); swatch.style.setProperty('--swatch-dark', colors.dark);
    const text = document.createElement('small'); text.textContent = colors.name;
    label.append(input, swatch, text); palette.append(label);
  }
  function refresh() {
    for (const [name, value] of [['appearanceStyle', theme.style], ['appearanceTheme', theme.choice], ['appearanceAccent', theme.accent]])
      dialog.querySelectorAll(`input[name="${name}"]`).forEach(input => input.checked = input.value === value);
    document.getElementById('monochromeToggle').checked = theme.monochrome;
    palette.querySelectorAll('input').forEach(input => input.disabled = theme.monochrome);
  }
  function close() {
    if (!dialog.open) return;
    dialog.close(); window.DersUI.modalClosed('appearance'); trigger.focus({preventScroll:true});
  }
  trigger.addEventListener('click', () => { refresh(); dialog.showModal(); window.DersUI.openModal('appearance', dialog, close); });
  document.getElementById('closeAppearance').addEventListener('click', close);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
  });
  dialog.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'appearanceStyle') theme.setStyle(input.value);
    if (input.name === 'appearanceTheme') theme.set(input.value);
    if (input.name === 'appearanceAccent') theme.setAccent(input.value);
    if (input.id === 'monochromeToggle') theme.setMonochrome(input.checked);
  });
  document.getElementById('resetAppearance').addEventListener('click', () => theme.reset());
  window.addEventListener('dersappearancechange', refresh); refresh();
})();
