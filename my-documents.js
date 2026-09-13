/* Personal document copies remain on this browser; no server upload. */
(() => {
  'use strict';
  const databaseName = 'anodos-documents-v1';
  let database;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const en = () => document.documentElement.lang === 'en';
  const t = (uk, english) => en() ? english : uk;
  function open() {
    if (!database) database = new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.onupgradeneeded = () => request.result.createObjectStore('files', {keyPath:'id'});
      request.onsuccess = () => { const db = request.result; db.onversionchange = () => {db.close(); database = null;}; resolve(db); };
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Storage is unavailable'));
    }).catch(error => {database = null; throw error;});
    return database;
  }
  async function transaction(mode, action) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', mode);
      const request = action(tx.objectStore('files'));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = tx.onabort = () => reject(tx.error || request.error || new Error('Storage failed'));
    });
  }
  async function save(blob, name, source = '') {
    if (!(blob instanceof Blob) || !blob.size) throw new Error('Empty document');
    const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
    const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,'0')).join('');
    const file = {id:hash + ':' + name, name, blob, size:blob.size, type:blob.type, source, createdAt:Date.now()};
    await transaction('readwrite', store => store.put(file));
    document.dispatchEvent(new Event('anodos-documents-changed'));
    return file;
  }
  const list = async () => (await transaction('readonly', store => store.getAll())).sort((a,b) => b.createdAt-a.createdAt);
  const remove = async id => {await transaction('readwrite', store => store.delete(id)); document.dispatchEvent(new Event('anodos-documents-changed'));};
  const kind = name => (name.split('.').pop() || 'FILE').toUpperCase();
  const size = bytes => bytes < 1024*1024 ? `${Math.max(1,Math.round(bytes/1024))} KB` : `${(bytes/1024/1024).toFixed(1)} MB`;
  function download(file) {
    const url = URL.createObjectURL(file.blob), link = document.createElement('a');
    link.href = url; link.download = file.name; link.dataset.documentCopy = 'true';
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  function notifyFailure() {
    let notice = document.getElementById('documents-save-notice');
    if (!notice) {notice = document.createElement('div'); notice.id = 'documents-save-notice'; notice.className = 'documents-notice'; notice.setAttribute('role','status'); document.body.append(notice);}
    notice.textContent = t('Файл завантажено, але копію в «Мої документи» зберегти не вдалося. Перевірте вільне місце та доступ до сховища браузера.', 'The file was downloaded, but its copy could not be saved to My documents. Check browser storage and available space.');
    setTimeout(() => notice.remove(),15000);
  }
  // Capture only exports from insurance tools, leaving learning/admin exports alone.
  const routes = new Set(['contract-review','questionnaire-generator','questionnaire-fill','quotation-writing','client-recommendation']);
  const pages = new Set(['contract-quality.html','contacts.html','osint.html']);
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[download]');
    if (!link || link.hasAttribute('data-document-copy') || !link.href.startsWith('blob:')) return;
    if (!routes.has(document.body.dataset.route) && !pages.has(location.pathname.split('/').pop())) return;
    // Start reading immediately, before the exporting tool revokes the object URL.
    fetch(link.href).then(response => response.blob()).then(blob => save(blob,link.download,document.body.dataset.route || location.pathname.split('/').pop())).catch(notifyFailure);
  }, true);
  function mount(element) {
    let files = [], query = '', filter = '', pendingDelete = '', status = '', failed = false;
    element.innerHTML = `<section class="documents-page" translate="no"><header class="documents-heading"><div><p class="documents-eyebrow">${t('ВАШ РОБОЧИЙ АРХІВ','YOUR DOCUMENT LIBRARY')}</p><h1>${t('Мої документи','My documents')}</h1><p>${t('Опитувальники, котирування та висновки, які ви завантажуєте з інструментів Anodos.','Questionnaires, quotations and reports you download from Anodos tools.')}</p></div><label class="documents-add">${t('Додати файли','Add files')}<input data-documents-upload type="file" multiple aria-label="${t('Додати файли','Add files')}"></label></header><p class="documents-storage">${t('Файли зберігаються лише в цьому браузері. Очищення даних сайту видалить ці копії. Раніше завантажені файли можна додати вручну.','Files are stored only in this browser. Clearing site data removes these copies. You can add previously downloaded files manually.')}</p><div class="documents-toolbar"><input data-documents-search type="search" placeholder="${t('Знайти за назвою','Search by filename')}" aria-label="${t('Знайти документ','Find a document')}"><select data-documents-filter aria-label="${t('Формат документа','Document format')}"><option value="">${t('Усі формати','All formats')}</option><option>PDF</option><option>DOCX</option><option>XLSX</option><option>TXT</option><option value="other">${t('Інші','Other')}</option></select></div><p data-documents-status role="status" aria-live="polite">${t('Завантаження документів…','Loading documents…')}</p><div data-documents-list></div></section>`;
    const listElement = element.querySelector('[data-documents-list]');
    const statusElement = element.querySelector('[data-documents-status]');
    function paint() {
      if (!element.isConnected || !listElement.isConnected) return;
      statusElement.textContent = status;
      const shown = files.filter(file => file.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()) && (!filter || (filter === 'other' ? !['PDF','DOCX','XLSX','TXT'].includes(kind(file.name)) : kind(file.name) === filter)));
      if (failed) {listElement.innerHTML = `<div class="documents-empty"><h2>${t('Сховище недоступне','Storage unavailable')}</h2><p>${t('Дозвольте цьому сайту зберігати дані у браузері та спробуйте ще раз.','Allow this site to store browser data and try again.')}</p><button data-documents-retry>${t('Спробувати ще раз','Try again')}</button></div>`;return;}
      if (!shown.length) {listElement.innerHTML = `<div class="documents-empty"><span aria-hidden="true">▤</span><h2>${files.length ? t('Нічого не знайдено','No matching documents') : t('Тут будуть ваші документи','Your documents will appear here')}</h2><p>${files.length ? t('Спробуйте іншу назву або формат.','Try another filename or format.') : t('Завантажте результат з інструмента Anodos - копія з’явиться тут автоматично. Або додайте файл зі свого комп’ютера.','Download a result from an Anodos tool to save a copy here automatically, or add a file from your computer.')}</p>${!files.length?`<a href="./?section=tools" data-site-scroll="tools">${t('Перейти до інструментів →','Go to tools →')}</a>`:''}</div>`;return;}
      listElement.innerHTML = `<p class="documents-count">${t('Документів','Documents')}: ${shown.length}</p><ul class="documents-list">${shown.map(file => `<li><span class="documents-format">${escape(kind(file.name).slice(0,8))}</span><div class="documents-info"><h2>${escape(file.name)}</h2><p>${new Intl.DateTimeFormat(en()?'en-GB':'uk-UA',{dateStyle:'medium',timeStyle:'short'}).format(file.createdAt)} · ${size(file.size)}</p></div><div class="documents-actions"><button data-documents-download="${escape(file.id)}">${t('Завантажити','Download')}</button><button class="documents-delete" data-documents-delete="${escape(file.id)}">${pendingDelete===file.id?t('Підтвердити видалення','Confirm deletion'):t('Видалити','Delete')}</button>${pendingDelete===file.id?`<button data-documents-cancel>${t('Скасувати','Cancel')}</button>`:''}</div></li>`).join('')}</ul>`;
    }
    async function refresh() {try {files = await list(); failed = false; status = ''; paint();} catch (_) {failed = true; status = ''; paint();}}
    element.querySelector('[data-documents-search]').addEventListener('input',event => {query=event.target.value;paint();});
    element.querySelector('[data-documents-filter]').addEventListener('change',event => {filter=event.target.value;paint();});
    element.querySelector('[data-documents-upload]').addEventListener('change',async event => {
      const input=event.target, selected=Array.from(input.files || []); input.disabled=true;
      let saved=0;
      for (const file of selected) {try {await save(file,file.name,'import');saved++;} catch (_) { /* Report partial success without discarding earlier files. */ }}
      await refresh();
      status = saved===selected.length ? t(`Додано файлів: ${saved}.`,`Files added: ${saved}.`) : t(`Збережено ${saved} із ${selected.length}. Не вдалося зберегти решту файлів. Перевірте вільне місце у браузері.`,`Saved ${saved} of ${selected.length}. Other files could not be saved. Check available browser storage.`);
      input.value='';input.disabled=false;paint();
    });
    listElement.addEventListener('click',async event => {
      const get=event.target.closest('[data-documents-download]'), del=event.target.closest('[data-documents-delete]');
      if(get) {const file=files.find(item=>item.id===get.dataset.documentsDownload);if(file) download(file);}
      if(del) {const id=del.dataset.documentsDelete;if(pendingDelete!==id) {pendingDelete=id;paint();} else {try {await remove(id);pendingDelete='';await refresh();} catch (_) {status=t('Не вдалося видалити документ. Спробуйте ще раз.','Could not delete the document. Please try again.');paint();}}}
      if(event.target.closest('[data-documents-cancel]')) {pendingDelete='';paint();}
      if(event.target.closest('[data-documents-retry]')) await refresh();
    });
    void refresh();
  }
  window.AnodosDocuments = Object.freeze({save,list,remove,mount});
  // A language switch redraws only this tool; document names stay untouched.
  new MutationObserver(() => {if(document.body.dataset.route==='documents') {const screen=document.getElementById('screen'); if(screen) mount(screen);}}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
})();
