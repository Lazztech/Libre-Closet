/**
 * Initializes SortableJS drag-and-drop reordering on the outfit category rows.
 * Called once the outfit form is in the DOM (invoked from form.hbs).
 */
function initOutfitSort() {
  const list = document.getElementById('outfit-rows-list');
  if (!list) return;

  Sortable.create(list, {
    handle: '.drag-handle',
    animation: 150,
    ghostClass: 'opacity-40',
  });
}
