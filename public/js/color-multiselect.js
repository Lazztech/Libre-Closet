
(function () {
  const KNOWN = window.KNOWN_COLORS

  function swatch(value) {
    const cls = KNOWN.has(value) ? 'ms-swatch ms-swatch--' + value : 'ms-swatch ms-swatch--other';
    return '<span class="' + cls + '"></span>';
  }

  function initMultiselect(det) {
    const pillsEl     = det.querySelector('.ms-pills');
    const searchEl    = det.querySelector('.ms-search-input');
    const optionsEl   = det.querySelector('.ms-options');
    const emptyEl     = det.querySelector('.ms-empty');
    const createRow   = det.querySelector('.ms-create');
    const createLabel = det.querySelector('.ms-create-label');
    const countEl     = det.querySelector('.ms-count');
    const clearBtn    = det.querySelector('.ms-clear');

    function renderPills() {
      const checked = [...optionsEl.querySelectorAll('input:checked')];
      pillsEl.innerHTML = '';
      if (!checked.length) {
        pillsEl.innerHTML = '<span class="ms-placeholder">' + (det.dataset.placeholder || 'Select…') + '</span>';
        countEl.textContent = '0 selected';
        return;
      }
      checked.forEach(function (cb) {
        const pill = document.createElement('span');
        pill.className = 'ms-pill badge badge-ghost';
        pill.innerHTML =
          swatch(cb.value) +
          '<span class="capitalize">' + cb.value + '</span>' +
          '<span class="ms-pill-remove badge badge-sm badge-neutral" data-val="' + cb.value + '">\u00d7</span>'
        pillsEl.appendChild(pill);
      });
      countEl.textContent = checked.length + ' selected';
    }

    function filterOptions(q) {
      var visible = 0;
      optionsEl.querySelectorAll('.ms-option').forEach(function (opt) {
        var val = opt.querySelector('input').value;
        var match = !q || val.includes(q.toLowerCase());
        opt.classList.toggle('hidden', !match);
        if (match) visible++;
      });
      emptyEl.style.display = visible === 0 ? 'block' : 'none';
      var exists = [...optionsEl.querySelectorAll('input')].some(function (c) {
        return c.value === q.toLowerCase().trim();
      });
      createLabel.textContent = q;
      createRow.style.display = (q && !exists) ? 'flex' : 'none';
    }

    function addCustom(value) {
      var row = document.createElement('label');
      row.className = 'ms-option';
      row.innerHTML =
        '<input type="checkbox" name="color" value="' + value + '" checked>' +
        swatch(value) +
        '<span class="capitalize">' + value + '</span>';
      row.querySelector('input').addEventListener('change', renderPills);
      optionsEl.appendChild(row);
      searchEl.value = '';
      filterOptions('');
      renderPills();
    }

    // Events
    optionsEl.addEventListener('change', renderPills);

    pillsEl.addEventListener('click', function (e) {
      var rm = e.target.closest('.ms-pill-remove');
      if (!rm) return;
      e.stopPropagation();
      var cb = optionsEl.querySelector('input[value="' + rm.dataset.val + '"]');
      if (cb) { cb.checked = false; renderPills(); }
    });

    searchEl.addEventListener('input', function () { filterOptions(searchEl.value); });

    searchEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var q = searchEl.value.trim();
        if (q && createRow.style.display !== 'none') addCustom(q);
      }
    });

    createRow.addEventListener('click', function () {
      var q = searchEl.value.trim();
      if (q) addCustom(q);
    });

    clearBtn.addEventListener('click', function () {
      optionsEl.querySelectorAll('input').forEach(function (c) { c.checked = false; });
      searchEl.value = '';
      filterOptions('');
      renderPills();
    });

    det.addEventListener('toggle', function () {
      if (det.open) {
        setTimeout(function () { searchEl.focus(); }, 10);
      } else {
        searchEl.value = '';
        filterOptions('');
      }
    });

    // Initial render
    renderPills();
  }

  function initAll(root) {
    (root || document).querySelectorAll('.color-ms').forEach(initMultiselect);
  }

  // Close on outside click
  document.addEventListener('click', function (e) {
    document.querySelectorAll('.color-ms[open]').forEach(function (det) {
      if (!det.contains(e.target)) det.open = false;
    });
  });

  // Init on load
  document.addEventListener('DOMContentLoaded', function () { initAll(); });

  // Re-init after HTMX swaps
  document.addEventListener('htmx:afterSwap', function (e) { initAll(e.detail.target); });
})();