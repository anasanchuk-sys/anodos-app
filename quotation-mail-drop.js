(function (scope) {
  'use strict';
  const MAIL_TYPES = new Set(['message/rfc822', 'message/global', 'application/eml', 'application/x-eml']);
  const MAX_FILE = 20 * 1024 ** 2, MAX_TOTAL = 60 * 1024 ** 2;
  const FALLBACK = 'Браузер не передав вміст листа з Outlook. Збережіть лист як EML або перетягніть його спочатку на робочий стіл, а створений файл - сюди. Вкладення мають бути в листі або додані окремо.';
  const fail = (message = FALLBACK, code = 'quotation_drop_incomplete') => Object.assign(new Error(message), { code });
  const mime = value => String(value || '').toLowerCase().split(';')[0].trim();
  const safeName = value => String(value || 'Лист Outlook').replace(/[\u0000-\u001f\u007f/\\]/g, '_').slice(0, 220);
  function bounded(promise) {
    return new Promise(resolve => {
      const timer = setTimeout(() => resolve(null), 10000);
      Promise.resolve(promise).then(value => { clearTimeout(timer); resolve(value); }, () => { clearTimeout(timer); resolve(null); });
    });
  }
  function captureItem(item) {
    let file = null, entry = null;
    try { file = item.getAsFile?.(); } catch { /* Another representation may still be available. */ }
    try { entry = item.webkitGetAsEntry?.(); } catch { /* Optional browser API. */ }
    if (entry?.isDirectory) return Promise.resolve({ directory: true });
    if (file) return Promise.resolve({ file });
    if (entry?.isFile) {
      // Start reading the entry during drop, before the data store is protected.
      return bounded(new Promise(resolve => {
        try { entry.file(value => resolve({ file: value }), () => resolve(null)); } catch { resolve(null); }
      }));
    }
    try {
      // The handle must be requested synchronously; its file can resolve later.
      if (item.getAsFileSystemHandle) return bounded(item.getAsFileSystemHandle().then(async handle =>
        handle?.kind === 'directory' ? { directory: true } : handle?.kind === 'file' ? { file: await handle.getFile() } : null));
    } catch { /* An inaccessible promise is reported, never silently skipped. */ }
    return Promise.resolve(null);
  }
  function capture(dataTransfer) {
    // Never retain DataTransfer itself or access it after returning from drop.
    const files = Array.from(dataTransfer?.files || []);
    const items = Array.from(dataTransfer?.items || []);
    if (files.length > 12 || items.filter(item => item.kind === 'file').length > 12 || items.length > 48) throw fail('Додайте до 12 листів або файлів за раз.', 'quotation_file_limit');
    const fileItems = items.filter(item => item.kind === 'file').map(captureItem);
    const raw = [];
    for (const type of Array.from(dataTransfer?.types || [])) {
      if (!MAIL_TYPES.has(mime(type))) continue;
      try {
        const value = dataTransfer.getData(type);
        if (value) raw.push(Promise.resolve(value));
      } catch { /* getAsString may be the representation exposed by this host. */ }
    }
    if (!raw.length) {
      for (const item of items) {
        if (item.kind !== 'string' || !MAIL_TYPES.has(mime(item.type))) continue;
        raw.push(bounded(new Promise(resolve => {
          try { item.getAsString(value => resolve(value)); } catch { resolve(null); }
        })));
      }
    }
    return { files, fileItems, raw };
  }
  async function resolve(snapshot) {
    const resolved = await Promise.all(snapshot.fileItems);
    if (resolved.some(item => item?.directory)) throw fail('Перетягніть самі листи або файли, а не папку.');
    let files;
    if (snapshot.files.length && snapshot.files.length >= resolved.length) files = snapshot.files;
    else if (resolved.length) {
      if (resolved.some(item => !item?.file)) {
        if (resolved.length === 1 && !snapshot.files.length && snapshot.raw.length) files = [];
        else throw fail('Не всі листи передано з Outlook. ' + FALLBACK);
      } else files = resolved.map(item => item.file);
    } else files = [];
    const warnings = [];
    if (!files.length && snapshot.raw.length) {
      const raw = await Promise.all(snapshot.raw);
      if (raw.some(value => typeof value !== 'string' || !value.trim())) throw fail();
      // Multiple MIME types are alternative representations, not extra emails.
      const unique = [...new Set(raw)];
      if (unique.length !== 1) throw fail('Outlook передав неоднозначний вміст листа. ' + FALLBACK);
      const content = unique[0];
      if (content.length > MAX_FILE || !/^(?:[!-9;-~]+:[^\r\n]*(?:\r?\n[ \t][^\r\n]*)*\r?\n)+\r?\n/.test(content)) throw fail('Не вдалося отримати повний електронний лист. ' + FALLBACK);
      files = [new scope.File([content], `Лист Outlook-${scope.crypto.randomUUID()}.eml`, { type: 'message/rfc822' })];
      warnings.push('Outlook передав лист у текстовому форматі MIME. Перед створенням PDF перевірте, що всі вкладення з умовами включено.');
    }
    if (!files.length) throw fail();
    let total = 0;
    const normalized = files.map(file => {
      if (!file || typeof file.arrayBuffer !== 'function' || !Number.isFinite(file.size) || file.size <= 0) throw fail('Один із листів порожній або ще не завантажений в Outlook. ' + FALLBACK);
      total += file.size;
      if (file.size > MAX_FILE || total > MAX_TOTAL) throw fail('Додайте до 12 файлів: 20 МБ кожен і 60 МБ загалом.', 'quotation_file_limit');
      if (MAIL_TYPES.has(mime(file.type)) && !/\.eml$/i.test(file.name || '')) {
        const name = safeName(file.name || `Лист Outlook-${scope.crypto.randomUUID()}`) + '.eml';
        return new scope.File([file], name, { type: 'message/rfc822', lastModified: file.lastModified });
      }
      return file;
    });
    return { files: normalized, warnings };
  }
  scope.AnodosQuotationDrop = Object.freeze({ capture, resolve });
})(globalThis);
