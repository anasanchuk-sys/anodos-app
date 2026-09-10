(function attachQuotationReport(globalScope) {
  "use strict";

  const COLORS = Object.freeze({ navy: "#16324F", green: "#337F6D", ink: "#172534", muted: "#5C6B79", line: "#DCE5EC", canvas: "#F5F8FB", paper: "#FFFFFF" });
  const FIELD_DEFINITIONS = Object.freeze([
    ["insurer", "Страхова компанія"], ["insured", "Страхувальник"],
    ["product", "Вид страхування"], ["object", "Об’єкт страхування"],
    ["territory", "Територія страхування"], ["period", "Період страхування"],
    ["sumInsured", "Страхова сума"], ["coverage", "Страхове покриття"],
    ["exclusions", "Виключення"], ["deductible", "Франшиза"],
    ["premium", "Страхова премія"], ["rate", "Страховий тариф"],
    ["limits", "Ліміти та субліміти"], ["paymentTerms", "Порядок сплати"],
    ["validity", "Строк дії пропозиції"], ["subjectivities", "Умови надання покриття"]
  ].map(([key, label]) => Object.freeze({ key, label })));
  const LONG_FIELDS = new Set(["coverage", "exclusions", "subjectivities"]);
  const EMAIL_HEADER = /^(?:from|to|cc|bcc|reply-to|sent|subject|date|від|кому|копія|прихована\s+копія|відповісти|надіслано|тема|дата)\s*:/iu;
  const REMUNERATION_START = /^(?:[-*•]\s*)?(?:(?:внутрішня|внутрішнє|наша|ваша|агентська|агентское|брокерська|брокерское|our|your|internal)\s+)?(?:коміс(?:ія|ії|ійна\s+винагорода)|комисс(?:ия|ии|ионное\s+вознаграждение)|(?:агентська|брокерська)\s+винагорода|(?:агентское|брокерское)\s+вознаграждение|винагорода\s+(?:брокер(?:а|у)|агент(?:а|у))|КВ|АКВ|commission|brokerage|(?:agent|broker)(?:’s|'s)?\s+(?:commission|remuneration|fee))(?:\s+(?:брокера|агента))?\s*(?::|=|[-–—]|(?:становить|складає|не|відсутня)(?=\s|$)|is\b|\d)/iu;
  const REMUNERATION_ANYWHERE = /коміс(?:ія|ії|ійна\s+винагорода)|комисс(?:ия|ии|ионное\s+вознаграждение)|(?:агентська|брокерська)\s+винагорода|(?:агентское|брокерское)\s+вознаграждение|винагорода\s+(?:брокер(?:а|у)|агент(?:а|у))|(?:^|\s)(?:КВ|АКВ)\s*[:=]|\bcommission\b|\bbrokerage\b|\b(?:agent|broker)(?:’s|'s)?\s+(?:commission|remuneration|fee)\b/iu;
  // A line mentioning commission together with insurance conditions must be
  // reviewed, not discarded: otherwise a premium or coverage may disappear.
  const SUBSTANTIVE_CONDITION = /страхов(?:а\s+премія|ий\s+тариф|а\s+сума|е\s+покриття)|франшиз|виключен|субліміт|\bpremium\b|\bdeductible\b|\bcoverage\b|\bsum\s+insured\b/iu;

  function normalize(value) {
    return String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
      .replace(/\r\n?/g, "\n").replace(/[\u2010-\u2015\u2212]/g, "-")
      .split("\n").map((line) => line.replace(/[\t ]+/g, " ").trim()).join("\n").trim();
  }

  function insurerHeaderText(value, label) {
    const normalized = normalize(value);
    const lines = normalized.split("\n").filter(Boolean);
    if (!lines.some((line) => EMAIL_HEADER.test(line))) return normalized;
    const match = lines.length === 1 && lines[0].match(/^(?:from|від)\s*:\s*(.+)$/iu);
    const company = match ? match[1]
      .replace(/<\s*[^<>\s]+@[^<>\s]+\s*>/gu, "")
      .replace(/\(?\s*[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}\s*\)?/giu, "")
      .trim().replace(/^["']|["']$/gu, "").trim() : "";
    const clearCompany = /^(?:ПрАТ|ПАТ|АТ|ТОВ|ТДВ|СК|страхова\s+компанія|insurance\s+company)\s+/iu.test(company);
    const privateOrAmbiguous = /[<>@;,|]|\d{4,}|менеджер|директор|з\s+повагою|телефон|\b(?:manager|director|regards|phone)\b/iu.test(company);
    if (!clearCompany || privateOrAmbiguous || company.length > 180) {
      throw new Error(`Поле «${label}» містить заголовок листа. Зазначте лише назву страхової компанії без адреси електронної пошти та особистого підпису перед створенням PDF.`);
    }
    return company;
  }

  function clientText(value, label, fallback = "Не зазначено", fieldKey = "") {
    const text = fieldKey === "insurer" ? insurerHeaderText(value, label) : normalize(value);
    const safe = text.split("\n").filter((line) => !EMAIL_HEADER.test(line)).map((line) =>
      line.split(/;\s*/u).filter((part) => !(REMUNERATION_START.test(part) && !SUBSTANTIVE_CONDITION.test(part))).join("; ")
    ).filter(Boolean).join("\n");
    if (REMUNERATION_ANYWHERE.test(safe)) {
      throw new Error(`Поле «${label}» містить внутрішню винагороду разом з іншими умовами. Відокремте її від умов для клієнта перед створенням PDF.`);
    }
    return safe || fallback;
  }

  function dateLabel(value) {
    const date = new Date(value || Date.now());
    return Number.isNaN(date.getTime()) ? "Дату не зазначено"
      : new Intl.DateTimeFormat("uk-UA", { day: "2-digit", month: "long", year: "numeric", timeZone: "Europe/Kyiv" }).format(date);
  }

  function safeName(value) {
    return normalize(value).replace(/[^A-Za-zА-Яа-яІіЇїЄєҐґ0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "котирування";
  }

  function filenameFor(report) {
    return `BRITMARK_котирування_${safeName(report?.clientName || report?.title || "пропозиція")}.pdf`;
  }

  const TABLE_LAYOUT = {
    hLineWidth: () => 0, vLineWidth: () => 0,
    paddingLeft: () => 8, paddingRight: () => 8, paddingTop: () => 5, paddingBottom: () => 5,
    fillColor: (row) => row % 2 === 0 ? COLORS.canvas : COLORS.paper
  };

  function introduction(report) {
    return [
      { columns: [
        { text: "BRITMARK", fontSize: 19, bold: true, color: COLORS.navy, characterSpacing: 1.5, width: "*" },
        { stack: [
          { text: "СТРАХОВЕ КОТИРУВАННЯ", fontSize: 7, bold: true, color: COLORS.green, alignment: "right", characterSpacing: 0.5 },
          { text: dateLabel(report.createdAt), fontSize: 8, color: COLORS.muted, alignment: "right", margin: [0, 5, 0, 0] }
        ], width: "*" }
      ], margin: [0, 0, 0, 20] },
      { text: clientText(report.title, "Назва котирування", "Котирування страхування"), fontSize: 23, bold: true, color: COLORS.navy, lineHeight: 1.04, margin: [0, 0, 0, 8] },
      { text: [{ text: "Клієнт: ", color: COLORS.muted }, { text: clientText(report.clientName, "Клієнт"), bold: true }], fontSize: 10, margin: [0, 0, 0, 13] },
      { text: "Пропозиція умов страхування для погодження. Надання цього котирування не підтверджує укладення договору або початок страхового покриття.", fontSize: 8.2, lineHeight: 1.15, color: COLORS.muted, margin: [0, 0, 0, 18] }
    ];
  }

  function comparisons(offers) {
    if (offers.length < 2) return [];
    const content = [{ id: "quotation-summary", text: "ПОРІВНЯННЯ ПРОПОЗИЦІЙ", style: "sectionTitle", margin: [0, 0, 0, 8] }];
    // Three offers per table keep Cyrillic insurer names and figures readable
    // on A4; additional tables retain source order without ranking prices.
    for (let offset = 0; offset < offers.length; offset += 3) {
      const group = offers.slice(offset, offset + 3);
      const summaryFields = ["insurer", "sumInsured", "premium", "rate", "deductible", "period"];
      content.push({ table: {
        widths: [104, ...group.map(() => "*")], headerRows: 1, dontBreakRows: false,
        body: [
          [{ text: "Умова", style: "comparisonHeader" }, ...group.map((_, index) => ({ text: `Пропозиція ${offset + index + 1}`, style: "comparisonHeader" }))],
          ...summaryFields.map((key) => [
            { text: FIELD_DEFINITIONS.find((field) => field.key === key).label, color: COLORS.muted, fontSize: 8.1 },
            ...group.map((offer) => ({ text: offer[key], fontSize: 8.5, bold: key === "insurer" || key === "premium", lineHeight: 1.12 }))
          ])
        ]
      }, layout: { ...TABLE_LAYOUT, fillColor: (row) => row === 0 ? COLORS.navy : row % 2 ? COLORS.canvas : COLORS.paper }, margin: [0, 0, 0, 12] });
    }
    return content;
  }

  function offerDetails(offer, index, separatePage) {
    const content = [
      { id: `quotation-offer-${index}`, text: `ПРОПОЗИЦІЯ ${index + 1}`, style: "sectionTitle", ...(separatePage ? { pageBreak: "before" } : {}), margin: [0, 0, 0, 7] },
      { text: offer.insurer, fontSize: 17, bold: true, color: COLORS.navy, margin: [0, 0, 0, 13] },
      { table: {
        widths: [139, "*"], dontBreakRows: false,
        body: FIELD_DEFINITIONS.filter((field) => !LONG_FIELDS.has(field.key)).map((field) => [
          { text: field.label, fontSize: 8.1, color: COLORS.muted, lineHeight: 1.12 },
          { text: offer[field.key], fontSize: 9, lineHeight: 1.14, bold: ["sumInsured", "premium"].includes(field.key) }
        ])
      }, layout: TABLE_LAYOUT, margin: [0, 0, 0, 14] }
    ];
    for (const field of FIELD_DEFINITIONS.filter((item) => LONG_FIELDS.has(item.key))) {
      content.push(
        { id: `quotation-field-${index}-${field.key}`, text: field.label.toUpperCase(), style: "fieldTitle", margin: [0, 0, 0, 5] },
        { text: offer[field.key], fontSize: 9, lineHeight: 1.18, margin: [0, 0, 0, 13] }
      );
    }
    return content;
  }

  function buildDefinition(report) {
    if (!report || typeof report !== "object" || !Array.isArray(report.offers) || !report.offers.length) {
      throw new Error("Додайте хоча б одну пропозицію страхової компанії для створення PDF.");
    }
    const offers = report.offers.map((offer, index) => {
      if (!offer || typeof offer.fields !== "object" || !offer.fields) throw new Error(`Пропозиція ${index + 1} не містить умов страхування.`);
      return Object.fromEntries(FIELD_DEFINITIONS.map(({ key, label }) => [key, clientText(offer.fields[key], `${label}, пропозиція ${index + 1}`, "Не зазначено", key)]));
    });
    const content = [...introduction(report), ...comparisons(offers)];
    offers.forEach((offer, index) => content.push(...offerDetails(offer, index, offers.length > 1 || index > 0)));
    content.push({ text: "Позначка «Не зазначено» означає, що умову потрібно уточнити у страхової компанії. Остаточні умови та початок покриття визначаються погодженим договором страхування.", fontSize: 7.5, color: COLORS.muted, lineHeight: 1.15, margin: [0, 2, 0, 0] });
    return {
      pageSize: "A4", pageMargins: [40, 36, 40, 44],
      info: { title: `BRITMARK - ${clientText(report.title, "Назва котирування", "Котирування страхування")}`, author: "BRITMARK", subject: "Пропозиція умов страхування", creator: "Anodos" },
      defaultStyle: { font: "Roboto", fontSize: 9, color: COLORS.ink },
      styles: {
        sectionTitle: { fontSize: 10, bold: true, color: COLORS.green, characterSpacing: 0.6 },
        fieldTitle: { fontSize: 8, bold: true, color: COLORS.navy, characterSpacing: 0.4 },
        comparisonHeader: { fontSize: 8.2, bold: true, color: COLORS.paper }
      },
      pageBreakBefore(node, nodeContainer) {
        const following = Array.isArray(nodeContainer) ? nodeContainer : nodeContainer?.getFollowingNodesOnPage?.();
        return /^quotation-(?:field-|summary$)/.test(node.id || "") && Array.isArray(following) && following.length === 0;
      },
      footer(currentPage, pageCount) {
        return { margin: [40, 13, 40, 0], columns: [
          { text: "BRITMARK  /  СТРАХОВЕ КОТИРУВАННЯ", fontSize: 6.5, color: COLORS.muted, characterSpacing: 0.4 },
          { text: `${currentPage} / ${pageCount}`, fontSize: 7, color: COLORS.muted, alignment: "right", width: 60 }
        ] };
      },
      content
    };
  }

  async function createBlob(report) {
    const pdfMake = globalScope.pdfMake;
    if (!pdfMake?.createPdf) throw new Error("Модуль PDF не завантажився. Оновіть сторінку і спробуйте ще раз.");
    if (typeof pdfMake.addVirtualFileSystem === "function" && globalScope.pdfMakeVfs) pdfMake.addVirtualFileSystem(globalScope.pdfMakeVfs);
    return pdfMake.createPdf(buildDefinition(report)).getBlob();
  }

  async function download(report) {
    const blob = await createBlob(report);
    const filename = filenameFor(report);
    const url = globalScope.URL.createObjectURL(blob);
    const link = globalScope.document.createElement("a");
    try {
      link.href = url;
      link.download = filename;
      globalScope.document.body.append(link);
      link.click();
    } finally {
      link.remove();
      globalScope.setTimeout(() => globalScope.URL.revokeObjectURL(url), 2000);
    }
    return { filename, blob };
  }

  globalScope.AnodosQuotationReport = Object.freeze({ buildDefinition, createBlob, download, filenameFor, fieldDefinitions: FIELD_DEFINITIONS });
})(typeof window !== "undefined" ? window : globalThis);
