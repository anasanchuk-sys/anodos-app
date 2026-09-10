(function attachQuotationMailReader(globalScope) {
  "use strict";

  const EXTENSIONS = Object.freeze([".eml", ".pdf", ".docx", ".txt", ".html", ".htm", ".rtf", ".xlsx", ".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif", ".tif", ".tiff"]);
  const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif", ".tif", ".tiff"]);
  const MAX_FILE = 20 * 1024 * 1024;
  const MAX_TOTAL = 60 * 1024 * 1024;
  const MAX_TEXT = 180000;
  const MIME_EXTENSIONS = Object.freeze({ "application/pdf": ".pdf", "application/msword": ".doc", "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx", "application/rtf": ".rtf", "text/rtf": ".rtf", "text/plain": ".txt", "text/html": ".html", "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "image/gif": ".gif", "image/tiff": ".tiff", "image/bmp": ".bmp" });

  function failure(message, code = "quotation_file_unreadable") {
    const error = new Error(message);
    error.code = code;
    return error;
  }

  function extension(name) { return String(name || "").toLowerCase().match(/\.[a-z0-9]+$/)?.[0] || ""; }
  function accepts(name) { return EXTENSIONS.includes(extension(name)); }
  function safeName(name) { return String(name || "Без назви").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/[\\/]/g, "_").slice(0, 240); }
  function normalize(text) { return String(text || "").replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim(); }
  function boundedText(text) {
    if (text.length > MAX_TEXT) throw failure("Обсяг тексту перевищує 180 000 символів. Розділіть листи на кілька котирувань.", "quotation_text_limit");
    return text;
  }
  function readable(text, name) {
    const value = boundedText(normalize(text));
    if (!/[\p{L}\p{N}]/u.test(value) || value.includes("\ufffd")) throw failure(`Не вдалося повністю прочитати «${name}». Експортуйте його у PDF із текстом, DOCX або EML.`);
    return value;
  }
  function binary(bytes) {
    let result = "";
    for (let start = 0; start < bytes.length; start += 8192) result += String.fromCharCode(...bytes.subarray(start, start + 8192));
    return result;
  }
  function bytesOf(raw) { return Uint8Array.from(raw, (char) => char.charCodeAt(0) & 255); }
  function decode(bytes, charset) {
    let encoding = String(charset || "").trim().replace(/^['"]|['"]$/g, "").toLowerCase();
    if (!encoding && bytes[0] === 0xff && bytes[1] === 0xfe) encoding = "utf-16le";
    if (!encoding && bytes[0] === 0xfe && bytes[1] === 0xff) encoding = "utf-16be";
    if (encoding === "cp1251" || encoding === "win-1251") encoding = "windows-1251";
    try { return new TextDecoder(encoding || "utf-8", { fatal: true }).decode(bytes); }
    catch {
      if (!encoding) {
        try { return new TextDecoder("windows-1251", { fatal: true }).decode(bytes); } catch { /* Report below. */ }
      }
      throw failure(`Не вдалося прочитати кодування тексту${encoding ? ` (${encoding})` : ""}. Збережіть лист у форматі EML з кодуванням UTF-8.`);
    }
  }
  function transfer(raw, encoding) {
    const method = String(encoding || "").trim().toLowerCase();
    if (method === "base64") {
      const compact = raw.replace(/[\r\n\t ]/g, "");
      if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(compact)) throw failure("Пошкоджено Base64-вміст листа або вкладення. Експортуйте оригінал листа повторно.");
      try { return bytesOf(globalScope.atob(compact)); } catch { throw failure("Не вдалося декодувати вкладення листа."); }
    }
    if (method === "quoted-printable") {
      const joined = raw.replace(/=\r?\n/g, "");
      if (/=(?![0-9a-f]{2})/i.test(joined)) throw failure("Пошкоджено quoted-printable-вміст листа. Експортуйте оригінал листа повторно.");
      return bytesOf(joined.replace(/=([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16))));
    }
    if (!method || method === "7bit" || method === "8bit" || method === "binary") return bytesOf(raw);
    throw failure(`Кодування вкладення «${safeName(method)}» не підтримується. Експортуйте його окремо.`);
  }
  function headerText(raw) {
    return normalize(decode(bytesOf(String(raw || ""))).replace(/(\?=)[\r\n\t ]+(?==\?)/g, "$1").replace(/=\?([^?]+)\?([bq])\?([^?]*)\?=/gi, (_, charset, method, value) => decode(transfer(method.toLowerCase() === "q" ? value.replace(/_/g, " ") : value, method.toLowerCase() === "q" ? "quoted-printable" : "base64"), charset)));
  }
  function parameterHeader(raw) {
    const parts = String(raw || "").match(/(?:[^;"\\]|\\.|"(?:[^"\\]|\\.)*")+/g) || [];
    const type = (parts.shift() || "").trim().toLowerCase();
    const parameters = Object.create(null);
    for (const part of parts) {
      const equal = part.indexOf("=");
      if (equal < 0) continue;
      const key = part.slice(0, equal).trim().toLowerCase();
      const value = part.slice(equal + 1).trim().replace(/^"([\s\S]*)"$/, "$1").replace(/\\(["\\])/g, "$1");
      parameters[key] = value;
    }
    for (const key of ["filename", "name"]) {
      let encoded = parameters[`${key}*`];
      if (parameters[`${key}*0*`] !== undefined || parameters[`${key}*0`] !== undefined) {
        let value = "";
        let isEncoded = false;
        for (let index = 0; index < 32; index += 1) {
          const current = parameters[`${key}*${index}*`] ?? parameters[`${key}*${index}`];
          if (current === undefined) break;
          isEncoded ||= parameters[`${key}*${index}*`] !== undefined;
          value += current;
        }
        if (isEncoded) encoded = value; else parameters[key] = value;
      }
      if (encoded !== undefined) {
        const match = encoded.match(/^([^']*)'[^']*'([\s\S]*)$/);
        if (!match || /%(?![0-9a-f]{2})/i.test(match[2])) throw failure("Пошкоджено назву вкладення листа.");
        parameters[key] = decode(bytesOf(match[2].replace(/%([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))), match[1] || "utf-8");
      } else if (parameters[key]) parameters[key] = headerText(parameters[key]);
    }
    return { type, parameters };
  }
  function entity(raw, context, depth = 0) {
    if (depth > 12 || ++context.parts > 150) throw failure("Лист містить забагато вкладених частин. Експортуйте умови окремими файлами.", "quotation_mime_limit");
    const divider = /\r?\n\r?\n/.exec(raw);
    if (!divider || divider.index > 65536) throw failure("Структура EML пошкоджена або заголовки завеликі. Експортуйте оригінал листа повторно.");
    const headers = Object.create(null);
    for (const line of raw.slice(0, divider.index).replace(/\r?\n[\t ]+/g, " ").split(/\r?\n/)) {
      if (!line.trim()) continue;
      const match = line.match(/^([a-z0-9!#$%&'*+.^_`|~-]+):[\t ]*([\s\S]*)$/i);
      if (!match) throw failure("Некоректний заголовок EML. Експортуйте оригінал листа повторно.");
      const key = match[1].toLowerCase();
      if (headers[key] && /^(content-type|content-transfer-encoding|content-disposition)$/.test(key)) throw failure("Лист містить суперечливі MIME-заголовки.");
      headers[key] = headers[key] ? `${headers[key]}, ${match[2]}` : match[2];
    }
    const content = parameterHeader(headers["content-type"] || "text/plain");
    const disposition = parameterHeader(headers["content-disposition"]);
    const node = { headers, type: content.type, parameters: content.parameters, disposition: disposition.type, name: disposition.parameters.filename || content.parameters.name || "", body: raw.slice(divider.index + divider[0].length), children: [] };
    if (node.type.startsWith("multipart/")) {
      const boundary = content.parameters.boundary;
      if (!boundary || boundary.length > 200 || /[\r\n]/.test(boundary)) throw failure("Не знайдено коректної межі MIME-частин листа.");
      const expression = new RegExp(`(?:^|\\r?\\n)--${boundary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(--)?[\\t ]*(?:\\r?\\n|$)`, "g");
      let cursor = null;
      let closed = false;
      let match;
      while ((match = expression.exec(node.body))) {
        if (cursor !== null) node.children.push(entity(node.body.slice(cursor, match.index), context, depth + 1));
        if (match[1]) { closed = true; break; }
        cursor = expression.lastIndex;
      }
      if (!closed || !node.children.length) throw failure("EML обірвано: частина листа або вкладень відсутня. Експортуйте оригінал повторно.");
    }
    return node;
  }
  function htmlText(raw) {
    // Do not create a DOM: even inert browser documents can load remote images.
    const entities = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", laquo: "«", raquo: "»", bull: "•", euro: "€", copy: "©", reg: "®" };
    return normalize(String(raw).replace(/<!--[\s\S]*?(?:-->|$)/g, "").replace(/<(script|style|noscript|template|head)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi, "").replace(/<(?:br|hr)\b[^>]*\/?\s*>|<\/(?:p|div|tr|li|h[1-6]|blockquote|table|section)>/gi, "\n").replace(/<\/(?:td|th)>/gi, " | ").replace(/<[^>]*>/g, "").replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, entityName) => {
      if (entityName[0] !== "#") return entities[entityName.toLowerCase()] ?? whole;
      const point = entityName[1].toLowerCase() === "x" ? parseInt(entityName.slice(2), 16) : Number(entityName.slice(1));
      return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff) ? String.fromCodePoint(point) : "";
    }));
  }
  function checkZip(bytes, name) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let end = -1;
    for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset -= 1) {
      if (view.getUint32(offset, true) === 0x06054b50 && offset + 22 + view.getUint16(offset + 20, true) === bytes.length) { end = offset; break; }
    }
    if (end < 0) throw failure(`Архів усередині «${name}» пошкоджений.`);
    const count = view.getUint16(end + 10, true);
    let offset = view.getUint32(end + 16, true);
    const directoryEnd = offset + view.getUint32(end + 12, true);
    if (view.getUint16(end + 4, true) || view.getUint16(end + 6, true) || view.getUint16(end + 8, true) !== count || count > 1000 || directoryEnd > end) throw failure(`Структура архіву «${name}» не підтримується або перевищує межі читання.`);
    let expanded = 0;
    for (let index = 0; index < count; index += 1) {
      if (offset + 46 > directoryEnd || view.getUint32(offset, true) !== 0x02014b50) throw failure(`Пошкоджено структуру «${name}».`);
      const compressed = view.getUint32(offset + 20, true);
      const size = view.getUint32(offset + 24, true);
      const nameSize = view.getUint16(offset + 28, true);
      const next = offset + 46 + nameSize + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
      const path = binary(bytes.subarray(offset + 46, offset + 46 + nameSize));
      if (extension(name) === ".xlsx" && /^(?:xl\/(?:media|embeddings|drawings)\/|xl\/vbaProject\.bin$)/i.test(path) && !path.endsWith("/")) throw failure(`«${name}» містить зображення, вбудовані об’єкти або малюнки Excel. Їхній вміст не можна повністю прочитати. Експортуйте всі аркуші у PDF.`, "incomplete_document_reading");
      expanded += size;
      if (next > directoryEnd || view.getUint16(offset + 8, true) & 1 || ![0, 8].includes(view.getUint16(offset + 10, true)) || size > 30 * 1024 * 1024 || expanded > 80 * 1024 * 1024 || size > Math.max(1024 * 1024, compressed * 200) || /(?:^|[\\/])\.\.(?:[\\/]|$)|^[\\/]|^[a-z]:/i.test(path)) throw failure(`«${name}» зашифрований або має надмірно великий чи небезпечний вміст архіву. Експортуйте документ у PDF.`);
      offset = next;
    }
    if (offset !== directoryEnd) throw failure(`Пошкоджено каталог архіву «${name}».`);
  }
  async function documentText(bytes, name, context, charset) {
    const ext = extension(name);
    if (ext === ".msg") throw failure(`«${name}»: формат Outlook MSG наразі не підтримується. Експортуйте лист у EML або PDF та додайте вкладення окремо.`, "quotation_unsupported_format");
    if (ext === ".doc") throw failure(`«${name}»: старий формат Word DOC не підтримується для котирувань. Експортуйте документ у PDF або DOCX, щоб прочитати всі умови.`, "quotation_unsupported_format");
    if (!accepts(name)) throw failure(`«${name}»: формат не підтримується. Експортуйте вкладення у PDF, DOCX, XLSX або текстовий файл та додайте його окремо.`, "quotation_unsupported_format");
    if (bytes.length > MAX_FILE) throw failure(`«${name}» перевищує 20 МБ.`, "quotation_file_limit");
    if (ext === ".txt" || ext === ".html" || ext === ".htm") {
      const raw = decode(bytes, charset);
      if (/^[\s\S]{0,20}(?:%PDF-|PK\x03\x04)/.test(raw) || (raw.match(/\x00/g) || []).length > raw.length * 0.01) throw failure(`«${name}» містить двійкові дані замість тексту. Перевірте формат файлу.`);
      return readable(ext === ".txt" ? raw : htmlText(raw), name);
    }
    if (ext === ".docx" || ext === ".xlsx") checkZip(bytes, name);
    if (ext === ".rtf" && /\\(?:pict|object|objdata|shppict|nonshppict)\b/i.test(binary(bytes))) throw failure(`«${name}» містить зображення або вбудовані об’єкти RTF. Експортуйте документ у PDF для повного читання умов.`, "incomplete_document_reading");
    if (ext === ".pdf" && !binary(bytes.subarray(0, 1024)).includes("%PDF-")) throw failure(`«${name}» не є коректним PDF.`);
    if (typeof context.readDocument !== "function") throw failure(`Модуль читання «${name}» недоступний. Оновіть сторінку і спробуйте ще раз.`);
    const file = typeof globalScope.File === "function" ? new globalScope.File([bytes], name) : new Blob([bytes]);
    const record = { name, file, requireCompleteReading: true };
    const result = await context.readDocument(record);
    const metadata = result && typeof result === "object" ? result : {};
    const partialPages = [record, metadata].some((value) => Number(value.pdfPageCount) > 0 && Array.isArray(value.pdfReadPages) && value.pdfReadPages.length + (value.pdfBlankPages?.length || 0) !== Number(value.pdfPageCount));
    if (partialPages || record.pdfExtractionComplete === false || metadata.pdfExtractionComplete === false || record.pdfUnreadablePages?.length || metadata.pdfUnreadablePages?.length || record.extractionComplete === false || metadata.extractionComplete === false || record.incomplete || metadata.incomplete || metadata.partial || /(?:неповн|частков|не прочитан|не підтрим|partial|incomplete)/i.test(metadata.status || "")) throw failure(`«${name}» прочитано не повністю. Додайте читабельний PDF або повний текст усіх умов.`, "incomplete_document_reading");
    const warnings = [...(record.extractionWarnings || []), ...(metadata.extractionWarnings || [])];
    if (warnings.length) throw failure(`«${name}» прочитано не повністю: ${warnings.join(" ")}`, "incomplete_document_reading");
    if (record.hasUnresolvedRevisions || metadata.hasUnresolvedRevisions) context.warnings.push(`«${name}» містить правки Word. Використано поточний текст; звірте його з остаточними умовами страховика.`);
    if (IMAGE_EXTENSIONS.has(ext) || record.ocrPages || metadata.ocrPages) context.warnings.push(`«${name}»: текст розпізнано OCR. Перевірте суми, відсотки та дати за оригіналом.`);
    return readable(typeof result === "string" ? result : result?.text, name);
  }
  function containsPlain(node) { return node.type === "text/plain" && node.body.trim() && !node.name && node.disposition !== "attachment" || node.children.some(containsPlain); }
  async function readNode(node, context, depth = 0) {
    if (depth > 12) throw failure("Забагато вкладених листів.", "quotation_mime_limit");
    if (node.children.length) {
      const children = node.type === "multipart/alternative" ? [node.children.find(containsPlain) || node.children[node.children.length - 1]] : node.children;
      const texts = [];
      for (const child of children) {
        const text = await readNode(child, context, depth + 1);
        if (text) texts.push(text);
        boundedText(texts.join("\n\n"));
      }
      return texts.join("\n\n");
    }
    const bytes = transfer(node.body, node.headers["content-transfer-encoding"]);
    if (bytes.length > MAX_FILE) throw failure("Вкладення перевищує 20 МБ.", "quotation_file_limit");
    if ((context.decodedBytes += bytes.length) > MAX_TOTAL) throw failure("Сумарний обсяг розпакованих вкладень перевищує 60 МБ.", "quotation_file_limit");
    if (node.type === "message/rfc822" || extension(node.name) === ".eml") {
      const nested = entity(binary(bytes), context, depth + 1);
      return `[Вкладений лист: ${safeName(node.name || "EML")}]\n${mailHeaders(nested)}\n${await readNode(nested, context, depth + 1)}`;
    }
    const isAttachment = Boolean(node.name) || node.disposition === "attachment" || !["text/plain", "text/html"].includes(node.type);
    if (!isAttachment) {
      const text = node.type === "text/html" ? htmlText(decode(bytes, node.parameters.charset)) : decode(bytes, node.parameters.charset);
      return text.trim() ? readable(text, "текст листа") : "";
    }
    const name = safeName(node.name || `Вкладення-${++context.attachmentIndex}${MIME_EXTENSIONS[node.type] || ".bin"}`);
    if (node.type.startsWith("image/") && node.disposition !== "attachment" && node.headers["content-id"] && bytes.length <= 100 * 1024 && /(?:logo|signature|підпис|логотип)/i.test(name)) {
      context.warnings.push(`Пропущено зображення підпису «${name}».`);
      return "";
    }
    if (++context.attachments > 50) throw failure("Листи містять понад 50 вкладень. Розділіть їх на кілька котирувань.", "quotation_mime_limit");
    return `[Вкладення: ${name}]\n${await documentText(bytes, name, context, node.parameters.charset)}`;
  }
  function mailHeaders(node) {
    return [["Від", "from"], ["Кому", "to"], ["Тема", "subject"], ["Дата", "date"]].filter(([, key]) => node.headers[key]).map(([label, key]) => `${label}: ${headerText(node.headers[key])}`).join("\n");
  }
  async function readFiles(files, { readDocument, onProgress } = {}) {
    const inputs = Array.from(files || []);
    if (!inputs.length) throw failure("Додайте листи або файли з умовами страховиків.");
    if (inputs.length > 12) throw failure("Можна додати не більше 12 файлів за раз.", "quotation_file_limit");
    let declaredBytes = 0;
    for (const file of inputs) {
      if (!file || typeof file.arrayBuffer !== "function" || !Number.isFinite(file.size) || file.size < 0) throw failure("Не вдалося відкрити доданий файл.");
      if (file.size > MAX_FILE) throw failure(`«${safeName(file.name)}» перевищує 20 МБ.`, "quotation_file_limit");
      declaredBytes += file.size;
      if (extension(file.name) === ".msg" || !accepts(file.name)) await documentText(new Uint8Array(), safeName(file.name), {});
    }
    if (declaredBytes > MAX_TOTAL) throw failure("Загальний розмір файлів перевищує 60 МБ.", "quotation_file_limit");
    const context = { readDocument, warnings: [], parts: 0, attachments: 0, attachmentIndex: 0, decodedBytes: 0 };
    const documents = [];
    let actualBytes = 0;
    let textLength = 0;
    for (let index = 0; index < inputs.length; index += 1) {
      const file = inputs[index];
      const name = safeName(file.name);
      onProgress?.({ index, total: inputs.length, name, status: "reading" });
      const bytes = new Uint8Array(await file.arrayBuffer());
      actualBytes += bytes.length;
      if (bytes.length > MAX_FILE || actualBytes > MAX_TOTAL) throw failure("Обсяг файлів перевищує межі читання: 20 МБ на файл і 60 МБ разом.", "quotation_file_limit");
      let text;
      if (extension(name) === ".eml") {
        const mail = entity(binary(bytes), context);
        if (!["from", "subject", "date", "mime-version", "content-type"].some((header) => mail.headers[header])) throw failure(`«${name}» не містить заголовків електронного листа.`);
        const content = await readNode(mail, context);
        if (!content.trim()) throw failure(`«${name}» не містить читабельного тексту або умов у вкладеннях.`);
        text = [mailHeaders(mail), "[Повний текст листа та попереднє листування — контекст джерела]", content].filter(Boolean).join("\n\n");
      } else text = await documentText(bytes, name, context);
      text = readable(text, name);
      textLength += text.length;
      if (textLength > MAX_TEXT) throw failure("Обсяг тексту перевищує 180 000 символів. Розділіть листи на кілька котирувань.", "quotation_text_limit");
      documents.push({ id: `source-${index + 1}`, name, text });
      onProgress?.({ index: index + 1, total: inputs.length, name, status: "complete" });
    }
    return { documents, warnings: [...new Set(context.warnings)] };
  }

  globalScope.AnodosQuotationMailReader = Object.freeze({ readFiles, accepts, extensions: EXTENSIONS });
})(typeof window !== "undefined" ? window : globalThis);
