/*
 * prior-auth-lookup — interactive Prior Authorization lookup tool.
 *
 * Reconstructs the source Angular widget as a config-driven EDS block:
 *   - Market select (custom listbox — see createListbox)
 *   - Line of Business select (dependent on Market; custom listbox)
 *   - drug / CPT / HCPCS typeahead input
 *   - Search button with client-side validation
 *   - dynamically rendered results
 *
 * Authoring content model (key | value rows):
 *   | Data Source | /path/to/pa-codes.json |
 *     (published JSON: [{code, description, market, lob, paRequired}])
 *   | Markets     | North Carolina          |
 *   | <Market>    | Medicaid, CFSP          |   (LOB options for that market; one row per market)
 * All rows are optional — the block renders a usable shell without them and
 * fetches/searches the dataset client-side when a Data Source is configured.
 *
 * Structural/behavioral only — brand styling from body.north-carolina tokens.
 */

function readConfig(block) {
  const cfg = { dataSource: '', markets: [], lobByMarket: {} };
  const rows = [...block.children];
  rows.forEach((row) => {
    const cells = [...row.children];
    if (cells.length < 2) return;
    const key = (cells[0].textContent || '').trim();
    const valText = (cells[1].textContent || '').trim();
    const values = valText.split(',').map((v) => v.trim()).filter(Boolean);
    const keyLc = key.toLowerCase();
    if (keyLc === 'data source' || keyLc === 'datasource') {
      const link = cells[1].querySelector('a');
      cfg.dataSource = link ? link.getAttribute('href') : valText;
    } else if (keyLc === 'markets' || keyLc === 'market') {
      cfg.markets = values;
    } else {
      // treat the key as a market name → its LOB options
      cfg.lobByMarket[key] = values;
    }
  });
  if (!cfg.markets.length) cfg.markets = Object.keys(cfg.lobByMarket);
  return cfg;
}

function option(value, label) {
  const o = document.createElement('option');
  o.value = value;
  o.textContent = label ?? value;
  return o;
}

let listboxUid = 0;

/*
 * Custom accessible dropdown replacing native <select>, so the dropdown's
 * option styling (incl. focused/highlighted option) can be fully controlled
 * with CSS across all browsers — native <select> popups are OS-rendered and
 * can't be styled consistently. Follows the WAI-ARIA "select-only combobox"
 * pattern: a button trigger + role="listbox" popup, keyboard nav mirrors
 * native <select> (Up/Down/Home/End/Enter/Space/Escape).
 */
function createListbox(placeholder) {
  listboxUid += 1;
  const uid = listboxUid;

  const wrapper = document.createElement('div');
  wrapper.className = 'prior-auth-lookup-select';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'prior-auth-lookup-select-button';
  button.id = `prior-auth-lookup-combobox-${uid}`;
  button.setAttribute('role', 'combobox');
  button.setAttribute('aria-haspopup', 'listbox');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', `prior-auth-lookup-listbox-${uid}`);

  const valueEl = document.createElement('span');
  valueEl.className = 'prior-auth-lookup-select-value';
  valueEl.textContent = placeholder;
  button.append(valueEl);

  const listbox = document.createElement('ul');
  listbox.className = 'prior-auth-lookup-select-listbox';
  listbox.id = `prior-auth-lookup-listbox-${uid}`;
  listbox.setAttribute('role', 'listbox');
  listbox.hidden = true;

  wrapper.append(button, listbox);

  let items = []; // { value, label, el }
  let selectedIndex = -1;
  let activeIndex = -1;
  const changeListeners = [];

  function isOpen() {
    return !listbox.hidden;
  }

  function setActive(index) {
    if (index < 0 || index >= items.length) return;
    activeIndex = index;
    items.forEach((it) => it.el.classList.remove('is-active'));
    items[index].el.classList.add('is-active');
    items[index].el.scrollIntoView({ block: 'nearest' });
    button.setAttribute('aria-activedescendant', items[index].el.id);
  }

  function selectIndex(index, { silent } = {}) {
    if (index < 0 || index >= items.length) return;
    selectedIndex = index;
    items.forEach((it, i) => it.el.setAttribute('aria-selected', String(i === index)));
    valueEl.textContent = items[index].label;
    button.setAttribute('aria-activedescendant', items[index].el.id);
    if (!silent) changeListeners.forEach((cb) => cb());
  }

  function onOutsideClick(evt) {
    if (!wrapper.contains(evt.target)) close(); // eslint-disable-line no-use-before-define
  }

  function open() {
    if (button.disabled || items.length === 0 || isOpen()) return;
    listbox.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    setActive(selectedIndex >= 0 ? selectedIndex : 0);
    document.addEventListener('click', onOutsideClick);
  }

  function close({ focusButton } = {}) {
    if (!isOpen()) return;
    listbox.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', onOutsideClick);
    if (focusButton) button.focus();
  }

  function renderItems(list) {
    listbox.textContent = '';
    items = list.map((it, i) => {
      const li = document.createElement('li');
      li.id = `prior-auth-lookup-listbox-${uid}-opt-${i}`;
      li.className = 'prior-auth-lookup-select-option';
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');
      li.dataset.value = it.value;
      li.textContent = it.label;
      listbox.append(li);
      return { ...it, el: li };
    });
    selectedIndex = -1;
    activeIndex = -1;
    if (items.length) selectIndex(0, { silent: true });
  }

  button.addEventListener('click', () => {
    if (isOpen()) close({ focusButton: true });
    else open();
  });

  button.addEventListener('keydown', (evt) => {
    if (button.disabled) return;
    switch (evt.key) {
      case 'ArrowDown':
        evt.preventDefault();
        if (!isOpen()) open();
        else setActive(Math.min(activeIndex + 1, items.length - 1));
        break;
      case 'ArrowUp':
        evt.preventDefault();
        if (!isOpen()) open();
        else setActive(Math.max(activeIndex - 1, 0));
        break;
      case 'Home':
        if (isOpen()) { evt.preventDefault(); setActive(0); }
        break;
      case 'End':
        if (isOpen()) { evt.preventDefault(); setActive(items.length - 1); }
        break;
      case 'Enter':
      case ' ':
        evt.preventDefault();
        if (isOpen()) { selectIndex(activeIndex); close({ focusButton: true }); } else open();
        break;
      case 'Escape':
        if (isOpen()) { evt.preventDefault(); close({ focusButton: true }); }
        break;
      case 'Tab':
        close();
        break;
      default:
        break;
    }
  });

  listbox.addEventListener('mousemove', (evt) => {
    const li = evt.target.closest('[role="option"]');
    if (!li) return;
    const index = items.findIndex((it) => it.el === li);
    if (index >= 0) setActive(index);
  });

  listbox.addEventListener('click', (evt) => {
    const li = evt.target.closest('[role="option"]');
    if (!li) return;
    const index = items.findIndex((it) => it.el === li);
    if (index >= 0) { selectIndex(index); close({ focusButton: true }); }
  });

  return {
    el: wrapper,
    labelledBy(id) { button.setAttribute('aria-labelledby', `${id} ${button.id}`); },
    focus() { button.focus(); },
    setItems(list) { renderItems(list); },
    get value() { return selectedIndex >= 0 ? items[selectedIndex].value : ''; },
    set disabled(val) {
      button.disabled = val;
      button.setAttribute('aria-disabled', String(val));
      if (val) close();
    },
    get disabled() { return button.disabled; },
    onChange(cb) { changeListeners.push(cb); },
  };
}

export default function decorate(block) {
  const cfg = readConfig(block);
  block.textContent = '';

  const form = document.createElement('div');
  form.className = 'prior-auth-lookup-form';

  // Market select
  const marketField = document.createElement('div');
  marketField.className = 'prior-auth-lookup-field';
  const marketLabel = document.createElement('span');
  marketLabel.id = 'prior-auth-lookup-market-label';
  marketLabel.textContent = 'Market';
  const marketSel = createListbox('Select a market');
  marketSel.labelledBy(marketLabel.id);
  marketLabel.addEventListener('click', () => marketSel.focus());
  marketSel.setItems([{ value: '', label: 'Select a market' }, ...cfg.markets.map((m) => ({ value: m, label: m }))]);
  marketField.append(marketLabel, marketSel.el);

  // Line of Business select (dependent)
  const lobField = document.createElement('div');
  lobField.className = 'prior-auth-lookup-field';
  const lobLabel = document.createElement('span');
  lobLabel.id = 'prior-auth-lookup-lob-label';
  lobLabel.textContent = 'Line of Business';
  const lobSel = createListbox('Select a line of business');
  lobSel.labelledBy(lobLabel.id);
  lobLabel.addEventListener('click', () => lobSel.focus());
  lobSel.setItems([{ value: '', label: 'Select a line of business' }]);
  lobSel.disabled = true;
  lobField.append(lobLabel, lobSel.el);

  // Code / drug typeahead
  const codeField = document.createElement('label');
  codeField.className = 'prior-auth-lookup-field';
  codeField.textContent = 'Drug name, CPT or HCPCS code';
  const codeInput = document.createElement('input');
  codeInput.type = 'text';
  codeInput.className = 'prior-auth-lookup-code';
  codeInput.setAttribute('list', 'prior-auth-lookup-suggestions');
  codeInput.autocomplete = 'off';
  const datalist = document.createElement('datalist');
  datalist.id = 'prior-auth-lookup-suggestions';
  codeField.append(codeInput, datalist);

  const searchBtn = document.createElement('button');
  searchBtn.type = 'button';
  searchBtn.className = 'prior-auth-lookup-search';
  searchBtn.textContent = 'Search';
  searchBtn.disabled = true;

  const results = document.createElement('div');
  results.className = 'prior-auth-lookup-results';
  results.setAttribute('aria-live', 'polite');

  form.append(marketField, lobField, codeField, searchBtn);
  block.append(form, results);

  function validate() {
    searchBtn.disabled = !(marketSel.value && lobSel.value && codeInput.value.trim());
  }

  // Dependent LOB population
  marketSel.onChange(() => {
    const lobs = cfg.lobByMarket[marketSel.value] || [];
    lobSel.setItems([{ value: '', label: 'Select a line of business' }, ...lobs.map((l) => ({ value: l, label: l }))]);
    lobSel.disabled = lobs.length === 0;
    validate();
  });
  lobSel.onChange(validate);
  codeInput.addEventListener('input', validate);

  // Load dataset (optional) for typeahead + results
  let dataset = [];
  if (cfg.dataSource) {
    fetch(cfg.dataSource)
      .then((r) => (r.ok ? r.json() : []))
      .then((json) => {
        dataset = Array.isArray(json) ? json : (json.data || []);
        dataset.forEach((d) => {
          if (d.code) datalist.append(option(d.code, `${d.code} — ${d.description || ''}`));
        });
      })
      .catch(() => { /* leave dataset empty; block still renders */ });
  }

  searchBtn.addEventListener('click', () => {
    const q = codeInput.value.trim().toLowerCase();
    const matches = dataset.filter((d) => {
      const marketOk = !d.market || d.market === marketSel.value;
      const lobOk = !d.lob || d.lob === lobSel.value;
      const codeOk = (d.code || '').toLowerCase().includes(q)
        || (d.description || '').toLowerCase().includes(q);
      return marketOk && lobOk && codeOk;
    });

    results.textContent = '';
    if (!cfg.dataSource) {
      results.textContent = 'Lookup data source is not configured.';
      return;
    }
    if (!matches.length) {
      results.textContent = 'No results found for your search.';
      return;
    }
    const ul = document.createElement('ul');
    ul.className = 'prior-auth-lookup-result-list';
    matches.forEach((d) => {
      const li = document.createElement('li');
      const pa = d.paRequired ? 'Prior authorization required' : 'No prior authorization required';
      li.innerHTML = `<strong>${d.code || ''}</strong> ${d.description || ''} — ${pa}`;
      ul.append(li);
    });
    results.append(ul);
  });
}
