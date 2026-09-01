(function attachContractFileReader(globalScope) {
  "use strict";

  const TEXT_EXTENSIONS = new Set([".txt", ".md", ".csv", ".tsv", ".json", ".xml"]);
  const HTML_EXTENSIONS = new Set([".html", ".htm"]);
  const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif", ".tif", ".tiff"]);
  const SPREADSHEET_EXTENSIONS = new Set([".xls", ".xlsx", ".xlsb", ".ods", ".numbers"]);
  const PRESENTATION_EXTENSIONS = new Set([".pptx"]);
  const EXTRA_EXTENSIONS = new Set([
    ...TEXT_EXTENSIONS,
    ...HTML_EXTENSIONS,
    ...IMAGE_EXTENSIONS,
    ...SPREADSHEET_EXTENSIONS,
    ...PRESENTATION_EXTENSIONS,
    ".odt",
    ".rtf"
  ]);

  let ocrWorkerPromise = null;
  let ocrQueue = Promise.resolve();
  let ocrProgress = { status: "", progress: 0 };

  function extension(name) {
    const match = String(name || "").toLowerCase().match(/\.[a-z0-9]+$/);
    return match ? match[0] : "";
  }

  function normalize(text) {
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

  function decodeEntities(text) {
    if (typeof DOMParser !== "undefined") {
      const document = new DOMParser().parseFromString(`<body>${String(text || "")}</body>`, "text/html");
      return document.body?.textContent || "";
    }
    return String(text || "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'");
  }

  function xmlToText(xml) {
    return normalize(decodeEntities(String(xml || "")
      .replace(/<(?:text:tab|w:tab)\b[^>]*\/?\s*>/gi, "\t")
      .replace(/<(?:text:line-break|w:br)\b[^>]*\/?\s*>/gi, "\n")
      .replace(/<\/(?:text:p|text:h|w:p|a:p)>/gi, "\n")
      .replace(/<\/(?:table:table-cell|w:tc)>/gi, " | ")
      .replace(/<\/(?:table:table-row|w:tr)>/gi, "\n")
      .replace(/<[^>]+>/g, "")));
  }

  function decodeTextBytes(bytes) {
    if (bytes[0] === 0xff && bytes[1] === 0xfe) {
      return new TextDecoder("utf-16le").decode(bytes.subarray(2));
    }
    if (bytes[0] === 0xfe && bytes[1] === 0xff) {
      return new TextDecoder("utf-16be").decode(bytes.subarray(2));
    }
    const utf8 = new TextDecoder("utf-8").decode(bytes);
    const replacementCount = (utf8.match(/\ufffd/g) || []).length;
    if (replacementCount > Math.max(2, utf8.length * 0.004)) {
      return new TextDecoder("windows-1251").decode(bytes);
    }
    return utf8;
  }

  async function readTextFile(file) {
    return normalize(decodeTextBytes(new Uint8Array(await file.arrayBuffer())));
  }

  function stripRtf(rtf) {
    const cp1251 = new TextDecoder("windows-1251");
    return normalize(String(rtf || "")
      .replace(/\\u(-?\d+)\??/g, (_, rawCode) => {
        const code = Number(rawCode);
        return String.fromCharCode(code < 0 ? code + 65536 : code);
      })
      .replace(/\\'([0-9a-f]{2})/gi, (_, hex) => cp1251.decode(Uint8Array.of(Number.parseInt(hex, 16))))
      .replace(/\\(?:par|line)\b\s?/gi, "\n")
      .replace(/\\tab\b\s?/gi, "\t")
      .replace(/\{\\\*[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, "")
      .replace(/\\[a-z]+-?\d*\s?/gi, "")
      .replace(/\\[^a-z0-9]/gi, "")
      .replace(/[{}]/g, ""));
  }

  async function readRtf(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    return stripRtf(new TextDecoder("windows-1251").decode(bytes));
  }

  async function readHtml(file) {
    const raw = decodeTextBytes(new Uint8Array(await file.arrayBuffer()));
    if (typeof DOMParser === "undefined") {
      return xmlToText(raw.replace(/<script\b[\s\S]*?<\/script>/gi, "").replace(/<style\b[\s\S]*?<\/style>/gi, ""));
    }
    const document = new DOMParser().parseFromString(raw, "text/html");
    document.querySelectorAll("script, style, noscript, template").forEach((node) => node.remove());
    return normalize(document.body?.innerText || document.body?.textContent || "");
  }

  async function readOdt(file) {
    if (!globalScope.JSZip) {
      throw new Error("Модуль читання ODT не завантажився.");
    }
    const zip = await globalScope.JSZip.loadAsync(file);
    const content = zip.file("content.xml");
    if (!content) {
      return "";
    }
    return xmlToText(await content.async("string"));
  }

  function naturalNumber(value) {
    const match = String(value || "").match(/(\d+)/);
    return match ? Number(match[1]) : 0;
  }

  async function readPptx(file) {
    if (!globalScope.JSZip) {
      throw new Error("Модуль читання PPTX не завантажився.");
    }
    const zip = await globalScope.JSZip.loadAsync(file);
    const slideNames = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
      .sort((left, right) => naturalNumber(left) - naturalNumber(right));
    const slides = await Promise.all(slideNames.map(async (name, index) => {
      const text = xmlToText(await zip.files[name].async("string"));
      return text ? `[Слайд ${index + 1}]\n${text}` : "";
    }));
    return normalize(slides.filter(Boolean).join("\n\n"));
  }

  async function readSpreadsheet(file) {
    if (!globalScope.XLSX?.read || !globalScope.XLSX?.utils?.sheet_to_csv) {
      throw new Error("Модуль читання електронних таблиць не завантажився.");
    }
    const workbook = globalScope.XLSX.read(await file.arrayBuffer(), {
      type: "array",
      cellDates: false,
      cellText: true,
      dense: true
    });
    const sheets = workbook.SheetNames.map((name) => {
      const text = globalScope.XLSX.utils.sheet_to_csv(workbook.Sheets[name], {
        FS: " | ",
        RS: "\n",
        blankrows: false,
        strip: true
      });
      return text.trim() ? `[Аркуш: ${name}]\n${text}` : "";
    });
    return normalize(sheets.filter(Boolean).join("\n\n"));
  }

  function assetUrl(path) {
    return new URL(path, globalScope.location?.href || "https://anodos.com.ua/").href;
  }

  function ocrWorker() {
    if (!ocrWorkerPromise) {
      if (!globalScope.Tesseract?.createWorker) {
        return Promise.reject(new Error("OCR-модуль не завантажився. Оновіть сторінку і спробуйте ще раз."));
      }
      ocrWorkerPromise = globalScope.Tesseract.createWorker(["ukr", "eng"], 1, {
        workerPath: assetUrl("./assets/vendor/tesseract/worker.min.js?v=1"),
        langPath: assetUrl("./assets/vendor/tesseract/lang").replace(/\/$/, ""),
        corePath: assetUrl("./assets/vendor/tesseract/core/tesseract-core-lstm.wasm.js?v=1"),
        logger(message) {
          ocrProgress = {
            status: String(message?.status || ""),
            progress: Number(message?.progress || 0)
          };
        }
      }).then(async (worker) => {
        await worker.setParameters({ preserve_interword_spaces: "1" });
        return worker;
      }).catch((error) => {
        ocrWorkerPromise = null;
        throw error;
      });
    }
    return ocrWorkerPromise;
  }

  async function recognize(source) {
    const job = ocrQueue.then(async () => {
      const worker = await ocrWorker();
      const result = await worker.recognize(source);
      return {
        text: normalize(result?.data?.text || ""),
        confidence: Number(result?.data?.confidence || 0)
      };
    });
    ocrQueue = job.catch(() => undefined);
    return job;
  }

  function canRead(name) {
    return EXTRA_EXTENSIONS.has(extension(name));
  }

  function initialStatus(name) {
    const ext = extension(name);
    if (IMAGE_EXTENSIONS.has(ext)) {
      return "готовий до розпізнавання OCR";
    }
    if (SPREADSHEET_EXTENSIONS.has(ext)) {
      return "готовий до читання таблиць";
    }
    if (ext === ".odt" || ext === ".rtf" || PRESENTATION_EXTENSIONS.has(ext) || TEXT_EXTENSIONS.has(ext) || HTML_EXTENSIONS.has(ext)) {
      return "готовий до аналізу";
    }
    return "формат потребує перевірки";
  }

  async function read(fileRecord) {
    const ext = extension(fileRecord?.name);
    if (TEXT_EXTENSIONS.has(ext)) {
      const text = await readTextFile(fileRecord.file);
      return { text, status: `${ext.slice(1).toUpperCase()} прочитано` };
    }
    if (HTML_EXTENSIONS.has(ext)) {
      return { text: await readHtml(fileRecord.file), status: "HTML прочитано" };
    }
    if (ext === ".rtf") {
      return { text: await readRtf(fileRecord.file), status: "RTF прочитано" };
    }
    if (ext === ".odt") {
      return { text: await readOdt(fileRecord.file), status: "ODT прочитано" };
    }
    if (PRESENTATION_EXTENSIONS.has(ext)) {
      return { text: await readPptx(fileRecord.file), status: "PPTX прочитано" };
    }
    if (SPREADSHEET_EXTENSIONS.has(ext)) {
      const text = await readSpreadsheet(fileRecord.file);
      return { text, status: `${ext.slice(1).toUpperCase()} прочитано` };
    }
    if (IMAGE_EXTENSIONS.has(ext)) {
      const recognized = await recognize(fileRecord.file);
      return {
        text: recognized.text,
        status: recognized.text
          ? `Зображення розпізнано OCR, впевненість ${Math.round(recognized.confidence)}%`
          : "OCR не знайшов читабельного тексту на зображенні",
        ocrConfidence: recognized.confidence,
        ocrPages: recognized.text ? 1 : 0
      };
    }
    return { text: "", status: "Формат не підтримується" };
  }

  globalScope.AnodosContractFileReader = Object.freeze({
    extensions: Object.freeze([...EXTRA_EXTENSIONS]),
    imageExtensions: Object.freeze([...IMAGE_EXTENSIONS]),
    canRead,
    initialStatus,
    read,
    recognize,
    normalize,
    stripRtf,
    xmlToText,
    progress: () => ({ ...ocrProgress })
  });
})(typeof window !== "undefined" ? window : globalThis);
