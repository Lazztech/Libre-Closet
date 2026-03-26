function addOutfitRow(categoryValue) {
  if (!categoryValue) return;
  const dataEl = document.getElementById('outfit-category-data');
  if (!dataEl) return;
  const allRows = JSON.parse(dataEl.textContent);
  const v = categoryValue.trim();
  const rowData =
    allRows.find((r) => r.value === v) ||
    allRows.find((r) => r.value.toLowerCase() === v.toLowerCase()) ||
    allRows.find((r) => r.label.toLowerCase() === v.toLowerCase());
  if (!rowData) return;

  const { value, label, garments, garmentCount } = rowData;

  const garmentSlotsHtml = garments
    .map((g) => {
      const photoHtml = g.photo
        ? `<img src="/file/nobg/${esc(g.photo.fileName)}" alt="${esc(g.name)}" class="size-20 rounded-box object-cover shrink-0 cursor-pointer" _="on click js(me) const slot = me.closest('.outfit-slot'); const d = slot.dataset; document.getElementById('modal-garment-name').innerText = d.garmentName || ''; const img = document.getElementById('modal-photo-img'); const ph = document.getElementById('modal-photo-placeholder'); if (d.garmentPhoto) { img.src = d.garmentPhoto; img.classList.remove('hidden'); ph.classList.add('hidden') } else { img.classList.add('hidden'); ph.classList.remove('hidden') } const setField = (id, val) => { const el = document.getElementById(id); if (val) { el.innerText = val; el.classList.remove('hidden') } else { el.classList.add('hidden') } }; setField('modal-brand', d.garmentBrand); setField('modal-color', d.garmentColor); setField('modal-size', d.garmentSize); setField('modal-notes', d.garmentNotes); document.getElementById('modal-garment-link').href = '/wardrobe/' + d.garmentId; document.getElementById('garment-modal').showModal() end" />`
        : `<div class="size-20 rounded-box bg-base-200 flex items-center justify-center shrink-0"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6 text-base-content/30"><path stroke-linecap="round" stroke-linejoin="round" d="M9 3.75H6.912a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H15M2.25 13.5h3.86a2.251 2.251 0 0 1 2.012 1.244l.256.512a2.251 2.251 0 0 0 2.013 1.244h3.218a2.251 2.251 0 0 0 2.013-1.244l.256-.512a2.251 2.251 0 0 1 2.013-1.244h3.859M12 3v8.25m0 0-3-3m3 3 3-3" /></svg></div>`;
      return `<div class="outfit-slot flex items-center gap-2 hidden" data-garment-id="${g.id}" data-garment-name="${esc(g.name)}" data-garment-photo="${g.photo ? '/file/nobg/' + esc(g.photo.fileName) : ''}" data-garment-brand="${esc(g.brand || '')}" data-garment-color="${esc(g.color || '')}" data-garment-size="${esc(g.size || '')}" data-garment-notes="${esc(g.notes || '')}">${photoHtml}</div>`;
    })
    .join('');

  const prevScript =
    "on click set row to closest .outfit-row set idx to (row's @data-index as Int) set total to (row's @data-count as Int) set newIdx to idx - 1 if newIdx < 0 then set newIdx to total end set row's @data-index to newIdx set slots to row.querySelectorAll('.outfit-slot') for slot in slots add .hidden to slot end remove .hidden from slots[newIdx] set inp to row.querySelector('.row-input') if newIdx > 0 then set inp's value to the @data-garment-id of slots[newIdx] remove @disabled from inp else add @disabled to inp end";
  const nextScript =
    "on click set row to closest .outfit-row set idx to (row's @data-index as Int) set total to (row's @data-count as Int) set newIdx to idx + 1 if newIdx > total then set newIdx to 0 end set row's @data-index to newIdx set slots to row.querySelectorAll('.outfit-slot') for slot in slots add .hidden to slot end remove .hidden from slots[newIdx] set inp to row.querySelector('.row-input') if newIdx > 0 then set inp's value to the @data-garment-id of slots[newIdx] remove @disabled from inp else add @disabled to inp end";
  const touchScript =
    'on touchstart set my startX to event.touches[0].clientX set my startY to event.touches[0].clientY on touchmove if my startX is not null set dx to Math.abs(event.touches[0].clientX - my startX) set dy to Math.abs(event.touches[0].clientY - my startY) if dx > dy js(event) event.preventDefault() end end end on touchend if my startX is not null set dx to event.changedTouches[0].clientX - my startX set my startX to null set my startY to null if Math.abs(dx) >= 30 if dx < 0 send click to the first .btn-next in me else send click to the first .btn-prev in me end end end';

  const html = `<div class="outfit-row flex items-center gap-2 py-3 border-b border-base-300" data-category="${esc(value)}" data-index="0" data-count="${garmentCount}" _="${touchScript}">
  <span class="drag-handle cursor-grab active:cursor-grabbing text-base-content/30 shrink-0 touch-none flex items-center justify-center p-3 -m-3"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" /></svg></span>
  <span class="w-24 text-sm font-medium shrink-0 capitalize">${esc(label)}</span>
  <button type="button" class="btn btn-ghost btn-sm btn-circle shrink-0 btn-prev" _="${prevScript}">‹</button>
  <div class="flex-1 min-w-0 flex justify-center">
    <div class="outfit-slot flex items-center gap-2"><div class="size-20 rounded-box bg-base-200 flex items-center justify-center shrink-0"><span class="text-xs text-base-content/40">—</span></div></div>
    ${garmentSlotsHtml}
  </div>
  <button type="button" class="btn btn-ghost btn-sm btn-circle shrink-0 btn-next" _="${nextScript}">›</button>
  <input type="hidden" name="garmentIds" class="row-input" disabled />
  <button type="button" class="btn btn-ghost btn-sm btn-circle shrink-0 text-error" _="on click remove closest .outfit-row">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-4"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
  </button>
</div>`;

  const template = document.createElement('div');
  template.innerHTML = html.trim();
  const row = template.firstElementChild;
  document.getElementById('outfit-rows-list').appendChild(row);
  htmx.process(row);
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
