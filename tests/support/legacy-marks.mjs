// The score draws the marks of a group once, over the group (<span class="mk">), and widens a note that carries several marks (class mk2 / mk3).
// v1.1.0 drew every mark over every note. To compare a drawing with v1.1.0, the new markup is turned back into the old one; the rest must be identical.
// Runs inside the page (it uses the DOM); in the v1.1.0 page there is nothing to undo.
export function undoMarkCells(html) {
  const t = document.createElement('template');
  t.innerHTML = html;
  for (const mk of t.content.querySelectorAll('.mk')) {
    const marks = [...mk.querySelectorAll('i')].map(i => i.textContent).join('');
    const holder = mk.parentElement; mk.remove();
    for (const s of holder.querySelectorAll(':scope > .s')) { const ac = document.createElement('span'); ac.className = 'ac'; ac.textContent = marks; s.prepend(ac); }
  }
  for (const s of t.content.querySelectorAll('.s.mk2, .s.mk3')) s.classList.remove('mk2', 'mk3');
  return t.innerHTML;
}
