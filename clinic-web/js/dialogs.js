/* A single native dialog gives keyboard, focus and modal behavior consistently. */
function requestForm({
  title,
  description = '',
  fields = [],
  confirmLabel = 'Lưu',
  danger = false,
}) {
  const previous = document.activeElement;
  return new Promise(resolve => {
    const dialog = document.createElement('dialog');
    const titleId = `dialog-title-${Date.now()}`;
    dialog.className = 'form-dialog';
    dialog.setAttribute('aria-labelledby', titleId);
    dialog.innerHTML = `<form method="dialog"><header class="dialog-header"><div><h2 id="${titleId}">${escapeHtml(title)}</h2>${description ? `<p class="muted small">${escapeHtml(description)}</p>` : ''}</div><button type="button" class="icon-btn" aria-label="Đóng" data-dismiss>${icon('x')}</button></header><div class="dialog-body ${fields.length ? '' : 'dialog-confirm'}">${fields.map(renderDialogField).join('')}</div><footer class="dialog-actions"><button type="button" class="btn btn-secondary" data-dismiss>Hủy</button><button type="submit" class="btn ${danger ? 'btn-danger' : 'btn-primary'}">${icon(danger ? 'trash-2' : 'check')} ${escapeHtml(confirmLabel)}</button></footer></form>`;
    let result = null;
    dialog.querySelectorAll('input, textarea').forEach(input =>
      input.addEventListener('input', () => {
        input.dataset.edited = 'true';
      }),
    );
    fields
      .filter(field => field.options)
      .forEach(field => {
        const select = dialog.querySelector(`[name="${field.name}"]`);
        const detail = select.parentElement.querySelector('.selected-option-detail');
        const update = () => {
          detail.textContent = select.selectedOptions[0]?.textContent || '';
          field.onChange?.(select.value, dialog.querySelector('form'));
        };
        select.addEventListener('change', update);
        update();
      });
    dialog
      .querySelectorAll('[data-dismiss]')
      .forEach(el => el.addEventListener('click', () => dialog.close()));
    dialog.addEventListener('click', event => {
      if (event.target === dialog) {
        const r = dialog.getBoundingClientRect();
        if (
          event.clientX < r.left ||
          event.clientX > r.right ||
          event.clientY < r.top ||
          event.clientY > r.bottom
        )
          dialog.close();
      }
    });
    dialog.querySelector('form').addEventListener('submit', event => {
      event.preventDefault();
      if (!event.target.reportValidity()) return;
      result = Object.fromEntries(new FormData(event.target));
      dialog.close();
    });
    dialog.addEventListener(
      'close',
      () => {
        dialog.remove();
        if (previous?.isConnected) previous.focus({ preventScroll: true });
        resolve(result);
      },
      { once: true },
    );
    document.body.appendChild(dialog);
    lucide.createIcons({ root: dialog });
    dialog.showModal();
    (
      dialog.querySelector('input, select, textarea') || dialog.querySelector('[data-dismiss]')
    )?.focus();
  });
}

function renderDialogField(field) {
  const id = `dialog-${field.name}`;
  const attrs = `id="${id}" name="${escapeHtml(field.name)}" class="form-input" ${field.required ? 'required' : ''} ${field.min !== undefined ? `min="${field.min}"` : ''} ${field.step ? `step="${field.step}"` : ''}`;
  let control;
  if (field.options)
    control = `<select ${attrs}>${field.options.map(option => `<option value="${escapeHtml(option.value)}" ${String(option.value) === String(field.value) ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}</select><p class="selected-option-detail" aria-hidden="true"></p>`;
  else if (field.type === 'textarea')
    control = `<textarea ${attrs} rows="3">${escapeHtml(field.value)}</textarea>`;
  else
    control = `<input ${attrs} type="${field.type || 'text'}" value="${escapeHtml(field.value)}" ${field.placeholder ? `placeholder="${escapeHtml(field.placeholder)}"` : ''}>`;
  return /* HTML */ `<div class="field ${field.compact ? 'compact-field' : ''}">
    <label for="${id}">${escapeHtml(field.label)}</label>${control}
  </div>`;
}

function confirmAction(title, description, confirmLabel) {
  return requestForm({ title, description, confirmLabel, danger: true }).then(Boolean);
}
