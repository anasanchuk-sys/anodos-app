// Reused from the existing Anodos parser; isolated from application UI.
let contractReviewPdfModulePromise=null;
const contractReviewFileExtension=name=>String(name||"").toLowerCase().match(/\.[a-z0-9]+$/)?.[0]||"";
function contractReviewDecodeEntities(value) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = String(value || "");
  return textarea.value;
}

function contractReviewXmlToText(xml) {
  return contractReviewDecodeEntities(String(xml || "")
    .replace(/<w:del\b[\s\S]*?<\/w:del>/g, "")
    .replace(/<w:moveFrom\b[\s\S]*?<\/w:moveFrom>/g, "")
    .replace(/<w:r\b[^>]*>(?:(?!<\/w:r>)[\s\S])*?<w:vanish\/>(?:(?!<\/w:r>)[\s\S])*?<\/w:r>/g, "")
    .replace(/<w:instrText\b[^>]*>[\s\S]*?<\/w:instrText>/g, "")
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:br\/>/g, "\n")
    .replace(/<\/w:tc>/g, " | ")
    .replace(/<\/w:tr>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim());
}

function contractReviewNormalizeText(text) {
  return String(text || "")
    .replace(/\u00a0/g, " ")
    .replace(/\u0007/g, "\n")
    .replace(/[\u000b\u000c]/g, "\n")
    .replace(/[\u0000-\u0006\u0008\u000e-\u001f]/g, "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function contractReviewAssetUrl(path) {
  return new URL(path, window.location.href).href;
}

async function contractReviewReadDocx(fileRecord) {
  if (!window.JSZip) {
    throw new Error("JSZip не завантажився.");
  }

  const zip = await window.JSZip.loadAsync(fileRecord.file);
  const xmlNames = Object.keys(zip.files)
    .filter((name) => /^word\/(?:document|footnotes|endnotes)\.xml$/i.test(name))
    .sort((left, right) => {
      if (/word\/document\.xml$/i.test(left)) return -1;
      if (/word\/document\.xml$/i.test(right)) return 1;
      return left.localeCompare(right);
    });
  const xmlParts = await Promise.all(xmlNames.map((name) => zip.files[name].async("string")));
  if (fileRecord.requireCompleteReading) {
    fileRecord.extractionWarnings = [];
    const warn = (message) => fileRecord.extractionWarnings.push(message);
    const attribute = (tag, name) => contractReviewDecodeEntities(tag.match(new RegExp('(?:^|\\s)' + name + '=["\x27]([^"\x27]*)["\x27]'))?.[1] || "");
    const mainXml = xmlParts[xmlNames.findIndex((name) => /^word\/document\.xml$/i.test(name))] || "";
    const references = [...mainXml.matchAll(/<w:(?:headerReference|footerReference)\b[^>]*>/g)];
    const relations = zip.file("word/_rels/document.xml.rels");
    const relationshipXml = relations ? await relations.async("string") : "";
    const relationshipTags = [...relationshipXml.matchAll(/<Relationship\b[^>]*>/g)].map((match) => match[0]);
    const added = new Set();
    for (const [reference] of references) {
      const id = attribute(reference, "r:id");
      const relation = relationshipTags.find((tag) => attribute(tag, "Id") === id);
      const target = relation && attribute(relation, "Target");
      const name = target && new URL(target, "https://local.invalid/word/").pathname.replace(/^\//, "");
      if (!id || !relation || attribute(relation, "TargetMode") === "External" || !/^word\/(?:header|footer)[^/]*\.xml$/i.test(name || "") || !zip.file(name)) {
        warn("Не вдалося прочитати підключений колонтитул Word. Звірте його з оригіналом або додайте PDF.");
        continue;
      }
      if (!added.has(name)) { xmlParts.push(await zip.file(name).async("string")); added.add(name); }
    }
    if (xmlParts.some((xml) => /<(?:w:(?:drawing|pict|object|altChunk)|a:blip)\b/i.test(xml)) || Object.keys(zip.files).some((name) => /^word\/embeddings\//i.test(name) && !zip.files[name].dir)) {
      warn("Word містить зображення або вбудовані об’єкти. Їхній вміст не прочитано; це можуть бути не лише логотипи, а й умови договору. Додайте PDF або окремі файли цих об’єктів.");
    }
  }
  const settingsName = Object.keys(zip.files).find((name) => /^word\/settings\.xml$/i.test(name));
  const settingsXml = settingsName ? await zip.files[settingsName].async("string") : "";
  fileRecord.hasUnresolvedRevisions = xmlParts.some((xml) => /<w:(?:ins|del|moveFrom|moveTo)\b/i.test(xml))
    || /<w:trackRevisions\b/i.test(settingsXml);
  fileRecord.hasComments = Object.keys(zip.files).some((name) => /^word\/comments(?:Extended)?\.xml$/i.test(name));
  return contractReviewNormalizeText(xmlParts.map(contractReviewXmlToText).filter(Boolean).join("\n\n"));
}

async function contractReviewPdfModule() {
  if (!contractReviewPdfModulePromise) {
    contractReviewPdfModulePromise = import(contractReviewAssetUrl("./assets/vendor/pdf.min.mjs")).then((module) => {
      module.GlobalWorkerOptions.workerSrc = contractReviewAssetUrl("./assets/vendor/pdf.worker.min.mjs");
      return module;
    });
  }
  return contractReviewPdfModulePromise;
}

function contractReviewPdfPageText(content) {
  const items = (content?.items || [])
    .map((item, index) => ({
      text: String(item.str || "").trim(),
      x: Number(item.transform?.[4]),
      y: Number(item.transform?.[5]),
      width: Number(item.width || 0),
      index
    }))
    .filter((item) => item.text);
  const positioned = items.filter((item) => Number.isFinite(item.x) && Number.isFinite(item.y));
  if (positioned.length < Math.max(3, items.length * 0.7)) {
    return items.map((item) => item.text).join(" ");
  }

  const rows = [];
  positioned
    .sort((left, right) => right.y - left.y || left.x - right.x || left.index - right.index)
    .forEach((item) => {
      let row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= 2.2);
      if (!row) {
        row = { y: item.y, items: [] };
        rows.push(row);
      }
      row.items.push(item);
    });

  return rows
    .sort((left, right) => right.y - left.y)
    .map((row) => {
      const cells = row.items.sort((left, right) => left.x - right.x);
      let line = "";
      let previousEnd = null;
      cells.forEach((cell) => {
        const gap = previousEnd === null ? 0 : cell.x - previousEnd;
        const separator = previousEnd === null ? "" : gap > 18 ? " | " : " ";
        line += `${separator}${cell.text}`;
        previousEnd = cell.x + Math.max(0, cell.width);
      });
      return line.trim();
    })
    .filter(Boolean)
    .join("\n");
}

function contractReviewPdfCanvasIsBlank(context, width, height) {
  const pixels = context.getImageData(0, 0, width, height).data;
  if (!pixels.length) return false;
  let minimum = 255;
  let maximum = 0;
  for (let offset = 0; offset < pixels.length; offset += 4) {
    const luminance = Math.round(0.2126 * pixels[offset] + 0.7152 * pixels[offset + 1] + 0.0722 * pixels[offset + 2]);
    minimum = Math.min(minimum, luminance);
    maximum = Math.max(maximum, luminance);
    // Only a nearly uniform light page can be skipped as blank. A drawing,
    // signature or unreadable scan is content, even when OCR returns no words.
    if (minimum < 235 || maximum - minimum > 6) return false;
  }
  return true;
}

async function contractReviewReadPdf(fileRecord) {
  if (window.location.protocol === "file:") {
    return "";
  }

  const pdfjs = await contractReviewPdfModule();
  const data = new Uint8Array(await fileRecord.file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data, disableWorker: true }).promise;
  const pageTexts = [];
  const ocrConfidences = [];
  fileRecord.pdfPageCount = pdf.numPages;
  fileRecord.pdfReadPages = [];
  fileRecord.pdfBlankPages = [];
  fileRecord.pdfUnreadablePages = [];
  fileRecord.pdfExtractionComplete = false;
  let ocrPages = 0;
  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      let canvas = null;
      try {
        const content = await page.getTextContent();
        let text = contractReviewPdfPageText(content);
        const visibleCharacters = (text.match(/[A-Za-zА-Яа-яІіЇїЄєҐґ0-9]/g) || []).length;
        let imageOcr = false;
        if (fileRecord.requireCompleteReading) {
          // A selectable heading does not prove that the rest of the page is
          // selectable. Even mixed text/scan pages must reach local OCR.
          const imageOps = new Set(Object.entries(pdfjs.OPS).filter(([name]) => /paint.*Image|paintXObject/.test(name)).map(([, value]) => value));
          const operators = await page.getOperatorList();
          imageOcr = operators.fnArray.some((operation) => imageOps.has(operation));
        }
        let blank = false;
        if (visibleCharacters < 32 || imageOcr) {
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = Math.max(1.6, Math.min(2.5, 2200 / Math.max(baseViewport.width, baseViewport.height)));
          const viewport = page.getViewport({ scale });
          canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.ceil(viewport.width));
          canvas.height = Math.max(1, Math.ceil(viewport.height));
          const context = canvas.getContext("2d", { alpha: false });
          if (!context) throw new Error("Не вдалося відобразити сторінку PDF для розпізнавання.");
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: context, viewport }).promise;
          blank = contractReviewPdfCanvasIsBlank(context, canvas.width, canvas.height);
          if (!blank && fileRecord.requireCompleteReading && !window.AnodosContractFileReader?.recognize) throw new Error("Локальний OCR недоступний.");
          if (!blank && window.AnodosContractFileReader?.recognize) {
            const recognized = await window.AnodosContractFileReader.recognize(canvas);
            if (fileRecord.requireCompleteReading) {
              if (!/[A-Za-zА-Яа-яІіЇїЄєҐґ0-9]/.test(recognized.text || "")) throw new Error("OCR не зміг прочитати вміст сторінки.");
              text = text.trim()
                ? `[Текстовий шар PDF]\n${text.trim()}\n[OCR тієї самої сторінки - звірити зі сканом]\n${recognized.text.trim()}`
                : recognized.text;
              ocrPages += 1;
              ocrConfidences.push(Number(recognized.confidence) || 0);
            } else if (recognized.text && recognized.text.length > text.trim().length) {
              text = recognized.text;
              ocrPages += 1;
              ocrConfidences.push(Number(recognized.confidence) || 0);
            }
          }
        }
        if (/[A-Za-zА-Яа-яІіЇїЄєҐґ0-9]/.test(text)) {
          pageTexts.push(`[Сторінка ${pageNumber}]\n${text.trim()}`);
          fileRecord.pdfReadPages.push(pageNumber);
        } else if (blank) {
          fileRecord.pdfBlankPages.push(pageNumber);
        } else {
          fileRecord.pdfUnreadablePages.push(pageNumber);
        }
      } catch {
        fileRecord.pdfUnreadablePages.push(pageNumber);
      } finally {
        if (canvas) {
          canvas.width = 1;
          canvas.height = 1;
        }
        page.cleanup?.();
      }
    }
  } finally {
    await pdf.destroy?.();
  }
  fileRecord.ocrPages = ocrPages;
  fileRecord.ocrConfidence = ocrConfidences.length
    ? ocrConfidences.reduce((sum, value) => sum + value, 0) / ocrConfidences.length
    : 0;
  if (fileRecord.pdfUnreadablePages.length) {
    const error = new Error(`У PDF «${fileRecord.name}» не вдалося прочитати вміст сторінок: ${fileRecord.pdfUnreadablePages.join(", ")}. Вони не порожні або їх не вдалося відобразити. Завантажте чіткіший PDF чи версію Word. Перевірку зупинено, щоб не пропустити умови договору.`);
    error.code = "incomplete_document_reading";
    throw error;
  }
  fileRecord.pdfExtractionComplete = true;
  return contractReviewNormalizeText(pageTexts.join("\n\n"));
}

function contractReviewReadUInt16LE(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function contractReviewReadInt32LE(bytes, offset) {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) | 0;
}

function contractReviewReadUInt32LE(bytes, offset) {
  return contractReviewReadInt32LE(bytes, offset) >>> 0;
}

function contractReviewOleSectorOffset(sectorId, sectorSize) {
  return 512 + sectorId * sectorSize;
}

function contractReviewReadOleSectorChain(bytes, fat, startSector, sectorSize, sizeLimit = Infinity) {
  const sectors = [];
  const seen = new Set();
  let sectorId = startSector;
  let total = 0;

  while (sectorId >= 0 && sectorId !== -2 && !seen.has(sectorId) && total < sizeLimit) {
    seen.add(sectorId);
    const offset = contractReviewOleSectorOffset(sectorId, sectorSize);
    if (offset < 0 || offset >= bytes.length) {
      break;
    }
    const take = Math.min(sectorSize, sizeLimit - total, bytes.length - offset);
    sectors.push(bytes.slice(offset, offset + take));
    total += take;
    sectorId = fat[sectorId];
  }

  const result = new Uint8Array(sectors.reduce((sum, sector) => sum + sector.length, 0));
  let position = 0;
  sectors.forEach((sector) => {
    result.set(sector, position);
    position += sector.length;
  });
  return result;
}

function contractReviewReadOleStream(bytes, streamName) {
  const signature = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
  if (!signature.every((value, index) => bytes[index] === value)) {
    return null;
  }

  const sectorSize = 1 << contractReviewReadUInt16LE(bytes, 30);
  const fatSectorCount = contractReviewReadUInt32LE(bytes, 44);
  const directoryStart = contractReviewReadInt32LE(bytes, 48);
  const difatStart = contractReviewReadInt32LE(bytes, 68);
  const difatSectorCount = contractReviewReadUInt32LE(bytes, 72);
  const fatSectorIds = [];

  for (let offset = 76; offset < 512; offset += 4) {
    const sectorId = contractReviewReadInt32LE(bytes, offset);
    if (sectorId >= 0) {
      fatSectorIds.push(sectorId);
    }
  }

  let difatSector = difatStart;
  for (let difatIndex = 0; difatIndex < difatSectorCount && difatSector >= 0; difatIndex += 1) {
    const offset = contractReviewOleSectorOffset(difatSector, sectorSize);
    const sectorIdsPerDifat = sectorSize / 4 - 1;
    for (let index = 0; index < sectorIdsPerDifat; index += 1) {
      const sectorId = contractReviewReadInt32LE(bytes, offset + index * 4);
      if (sectorId >= 0) {
        fatSectorIds.push(sectorId);
      }
    }
    difatSector = contractReviewReadInt32LE(bytes, offset + sectorIdsPerDifat * 4);
  }

  const fat = [];
  fatSectorIds.slice(0, fatSectorCount).forEach((sectorId) => {
    const offset = contractReviewOleSectorOffset(sectorId, sectorSize);
    for (let position = 0; position < sectorSize; position += 4) {
      fat.push(contractReviewReadInt32LE(bytes, offset + position));
    }
  });

  const directoryBytes = contractReviewReadOleSectorChain(bytes, fat, directoryStart, sectorSize);
  for (let offset = 0; offset + 128 <= directoryBytes.length; offset += 128) {
    const nameLength = contractReviewReadUInt16LE(directoryBytes, offset + 64);
    if (nameLength < 2) {
      continue;
    }

    let name = "";
    for (let position = 0; position < nameLength - 2; position += 2) {
      const charCode = contractReviewReadUInt16LE(directoryBytes, offset + position);
      if (charCode) {
        name += String.fromCharCode(charCode);
      }
    }

    if (name !== streamName) {
      continue;
    }

    const startSector = contractReviewReadInt32LE(directoryBytes, offset + 116);
    const size = contractReviewReadUInt32LE(directoryBytes, offset + 120);
    return contractReviewReadOleSectorChain(bytes, fat, startSector, sectorSize, size);
  }

  return null;
}

function contractReviewUtf16Score(text) {
  const cyrillicMatches = text.match(/[А-Яа-яІіЇїЄєҐґ]/g) || [];
  return cyrillicMatches.length * 3 + text.length;
}

function contractReviewExtractUtf16Text(bytes, startOffset = 0) {
  const chunks = [];
  let chunk = "";

  for (let index = startOffset; index + 1 < bytes.length; index += 2) {
    const charCode = contractReviewReadUInt16LE(bytes, index);
    const isReadable =
      charCode === 9 ||
      charCode === 10 ||
      charCode === 13 ||
      charCode === 32 ||
      charCode === 0x00a0 ||
      (charCode >= 0x0021 && charCode <= 0x007e) ||
      (charCode >= 0x0400 && charCode <= 0x052f) ||
      (charCode >= 0x2010 && charCode <= 0x203a) ||
      charCode === 0x2116;

    if (isReadable && charCode !== 0) {
      chunk += String.fromCharCode(charCode);
      continue;
    }

    if (chunk.length >= 5) {
      chunks.push(chunk);
    }
    chunk = "";
  }

  if (chunk.length >= 5) {
    chunks.push(chunk);
  }

  return chunks.join("\n");
}

function contractReviewDocFindPieceTable(tableStream, offset, length) {
  if (!tableStream || offset < 0 || length < 5 || offset + length > tableStream.length) {
    return null;
  }

  let position = offset;
  const end = offset + length;
  while (position < end && tableStream[position] === 0x01) {
    if (position + 3 > end) {
      return null;
    }
    const propertyLength = contractReviewReadUInt16LE(tableStream, position + 1);
    position += 3 + propertyLength;
  }

  if (position + 5 > end || tableStream[position] !== 0x02) {
    return null;
  }

  const pieceTableLength = contractReviewReadUInt32LE(tableStream, position + 1);
  const pieceTableStart = position + 5;
  if (pieceTableLength < 4 || pieceTableStart + pieceTableLength > tableStream.length) {
    return null;
  }

  const pieceCount = (pieceTableLength - 4) / 12;
  if (!Number.isInteger(pieceCount) || pieceCount < 1) {
    return null;
  }

  const characterPositions = [];
  for (let index = 0; index <= pieceCount; index += 1) {
    characterPositions.push(contractReviewReadUInt32LE(tableStream, pieceTableStart + index * 4));
  }

  const pieces = [];
  const pieceDescriptorsStart = pieceTableStart + (pieceCount + 1) * 4;
  for (let index = 0; index < pieceCount; index += 1) {
    const descriptorOffset = pieceDescriptorsStart + index * 8;
    const compressedOffset = contractReviewReadUInt32LE(tableStream, descriptorOffset + 2);
    const compressed = Boolean(compressedOffset & 0x40000000);
    const storedOffset = compressedOffset & 0x3fffffff;
    pieces.push({
      cpStart: characterPositions[index],
      cpEnd: characterPositions[index + 1],
      fileOffset: compressed ? storedOffset >>> 1 : storedOffset,
      compressed
    });
  }

  return pieces;
}

function contractReviewDocPropertyEnabled(propertyBytes, sprmLowByte, sprmHighByte) {
  for (let index = 0; index + 2 < propertyBytes.length; index += 1) {
    if (
      propertyBytes[index] === sprmLowByte
      && propertyBytes[index + 1] === sprmHighByte
      && propertyBytes[index + 2] !== 0
    ) {
      return true;
    }
  }
  return false;
}

function contractReviewDocExcludedRanges(wordDocument, tableStream) {
  const tableOffset = contractReviewReadUInt32LE(wordDocument, 250);
  const tableLength = contractReviewReadUInt32LE(wordDocument, 254);
  if (!tableStream || tableLength < 12 || tableOffset + tableLength > tableStream.length) {
    return [];
  }

  const pageCount = (tableLength - 4) / 8;
  if (!Number.isInteger(pageCount) || pageCount < 1) {
    return [];
  }

  const pageNumbersOffset = tableOffset + (pageCount + 1) * 4;
  const ranges = [];
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const pageNumber = contractReviewReadUInt32LE(tableStream, pageNumbersOffset + pageIndex * 4) & 0x003fffff;
    const pageOffset = pageNumber * 512;
    if (pageOffset < 0 || pageOffset + 512 > wordDocument.length) {
      continue;
    }

    const runCount = wordDocument[pageOffset + 511];
    const runOffsetsStart = pageOffset;
    const propertyPointersStart = pageOffset + (runCount + 1) * 4;
    for (let runIndex = 0; runIndex < runCount; runIndex += 1) {
      const runStart = contractReviewReadUInt32LE(wordDocument, runOffsetsStart + runIndex * 4);
      const runEnd = contractReviewReadUInt32LE(wordDocument, runOffsetsStart + (runIndex + 1) * 4);
      const propertyPointer = wordDocument[propertyPointersStart + runIndex] * 2;
      if (!propertyPointer || propertyPointer >= 511 || runEnd <= runStart) {
        continue;
      }

      const propertyLength = wordDocument[pageOffset + propertyPointer];
      const propertyStart = pageOffset + propertyPointer + 1;
      const propertyEnd = Math.min(propertyStart + propertyLength, pageOffset + 511);
      const propertyBytes = wordDocument.slice(propertyStart, propertyEnd);
      const deletedByRevision = contractReviewDocPropertyEnabled(propertyBytes, 0x00, 0x08);
      const hiddenField = contractReviewDocPropertyEnabled(propertyBytes, 0x02, 0x08);
      const hiddenText = contractReviewDocPropertyEnabled(propertyBytes, 0x3c, 0x08);
      if (deletedByRevision || hiddenField || hiddenText) {
        ranges.push({ start: runStart, end: runEnd });
      }
    }
  }

  return ranges
    .sort((left, right) => left.start - right.start || left.end - right.end)
    .reduce((merged, current) => {
      const previous = merged[merged.length - 1];
      if (previous && current.start <= previous.end) {
        previous.end = Math.max(previous.end, current.end);
      } else {
        merged.push({ ...current });
      }
      return merged;
    }, []);
}

function contractReviewDocOffsetIsExcluded(offset, excludedRanges) {
  let low = 0;
  let high = excludedRanges.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const range = excludedRanges[middle];
    if (offset < range.start) {
      high = middle - 1;
    } else if (offset >= range.end) {
      low = middle + 1;
    } else {
      return true;
    }
  }
  return false;
}

function contractReviewDocDecodePieces(wordDocument, pieces, excludedRanges, characterLimit) {
  const windowsDecoder = new TextDecoder("windows-1251");
  const unicodeDecoder = new TextDecoder("utf-16le");
  const fragments = [];

  for (const piece of pieces) {
    const cpStart = Math.max(0, piece.cpStart);
    const cpEnd = Math.min(piece.cpEnd, characterLimit);
    const characterCount = cpEnd - cpStart;
    if (characterCount <= 0) {
      continue;
    }

    const bytesPerCharacter = piece.compressed ? 1 : 2;
    const byteLength = characterCount * bytesPerCharacter;
    if (piece.fileOffset < 0 || piece.fileOffset + byteLength > wordDocument.length) {
      continue;
    }

    const pieceBytes = wordDocument.slice(piece.fileOffset, piece.fileOffset + byteLength);
    const decoded = piece.compressed ? windowsDecoder.decode(pieceBytes) : unicodeDecoder.decode(pieceBytes);
    let visible = "";
    for (let index = 0; index < decoded.length; index += 1) {
      const fileOffset = piece.fileOffset + index * bytesPerCharacter;
      if (!contractReviewDocOffsetIsExcluded(fileOffset, excludedRanges)) {
        visible += decoded[index];
      }
    }
    fragments.push(visible);
  }

  return fragments.join("");
}

async function contractReviewReadDoc(fileRecord) {
  const bytes = new Uint8Array(await fileRecord.file.arrayBuffer());
  const wordDocument = contractReviewReadOleStream(bytes, "WordDocument");
  if (!wordDocument || wordDocument.length < 426) {
    return "";
  }

  const tableStreamName = contractReviewReadUInt16LE(wordDocument, 10) & 0x0200 ? "1Table" : "0Table";
  const tableStream = contractReviewReadOleStream(bytes, tableStreamName);
  const pieceTableOffset = contractReviewReadUInt32LE(wordDocument, 418);
  const pieceTableLength = contractReviewReadUInt32LE(wordDocument, 422);
  const characterLimit = contractReviewReadUInt32LE(wordDocument, 76);
  const pieces = contractReviewDocFindPieceTable(tableStream, pieceTableOffset, pieceTableLength);
  if (!tableStream || !pieces || !characterLimit) {
    return "";
  }

  const excludedRanges = contractReviewDocExcludedRanges(wordDocument, tableStream);
  const text = contractReviewNormalizeText(
    contractReviewDocDecodePieces(wordDocument, pieces, excludedRanges, characterLimit)
  );
  return contractReviewUtf16Score(text) >= 120 ? text : "";
}

async function contractReviewReadText(fileRecord) {
  const extension = contractReviewFileExtension(fileRecord.name);
  if (extension === ".docx") {
    return {
      text: await contractReviewReadDocx(fileRecord),
      status: "DOCX прочитано"
    };
  }

  if (extension === ".pdf") {
    const text = await contractReviewReadPdf(fileRecord);
    return {
      text,
      status: text
        ? fileRecord.ocrPages
          ? `PDF прочитано; OCR: ${fileRecord.ocrPages} стор., впевненість ${Math.round(fileRecord.ocrConfidence || 0)}%`
          : "PDF прочитано з текстового шару"
        : window.location.protocol === "file:"
          ? "PDF у локальному file-режимі не читається. Для аналізу збережи як DOC/DOCX або відкрий HTTPS-версію"
          : "PDF не містить текстового шару, а OCR не знайшов читабельного тексту"
    };
  }

  if (extension === ".doc") {
    const text = await contractReviewReadDoc(fileRecord);
    return {
      text,
      status: text ? "DOC прочитано" : "DOC не вдалося прочитати. Збережи файл у Word як DOCX"
    };
  }

  if (extension === ".txt") {
    return {
      text: contractReviewNormalizeText(await fileRecord.file.text()),
      status: "TXT прочитано"
    };
  }

  if (window.AnodosContractFileReader?.canRead(fileRecord.name)) {
    return window.AnodosContractFileReader.read(fileRecord);
  }

  return {
    text: "",
    status: `${extension.toUpperCase().replace(".", "") || "Файл"} додано, але цей формат не вдалося прочитати`
  };
}


export async function readQualityFile(file){const record={name:file.name,file,requireCompleteReading:true};const result=await contractReviewReadText(record);if(!result.text?.trim())throw new Error(result.status||"Документ не прочитано");const warnings=[...(record.extractionWarnings||[])];if(/\.doc$/i.test(file.name))warnings.push("Старий DOC прочитано як текст; повноту колонтитулів, вбудованих об’єктів і правок потрібно перевірити за DOCX або PDF.");if(record.hasUnresolvedRevisions)warnings.push("Word містить непогоджені правки: перевірено поточну редакцію; остаточну версію потрібно підтвердити.");if(record.hasComments)warnings.push("Word містить коментарі; вони не є погодженими умовами.");if(record.ocrPages)warnings.push("Частину тексту розпізнано OCR; звірте цифри й формулювання зі сканом.");return {name:file.name,text:result.text,warnings};}
// Research helper: potential removals are not proof of accepted changes.
export function inspectLegacyContract(bytes){
 const word=contractReviewReadOleStream(bytes,'WordDocument');if(!word||word.length<426)throw new Error('Invalid legacy Word');
 const table=contractReviewReadOleStream(bytes,contractReviewReadUInt16LE(word,10)&0x0200?'1Table':'0Table');
 const pieces=contractReviewDocFindPieceTable(table,contractReviewReadUInt32LE(word,418),contractReviewReadUInt32LE(word,422));if(!pieces)throw new Error('Missing Word text pieces');
 const n=contractReviewReadUInt32LE(word,76),ranges=contractReviewDocExcludedRanges(word,table);
 return {current:contractReviewNormalizeText(contractReviewDocDecodePieces(word,pieces,ranges,n)),allStored:contractReviewNormalizeText(contractReviewDocDecodePieces(word,pieces,[],n)),removedOrHiddenRanges:ranges.length,status:'legacy_body_read_hidden_and_removed_text_is_candidate_only'};
}
