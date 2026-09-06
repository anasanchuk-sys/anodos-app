(function attachPropertyReviewReport(globalScope) {
  "use strict";

  const COLORS = Object.freeze({
    navy: "#16324F", navySoft: "#EAF1F7", green: "#337F6D", greenSoft: "#EAF5F1",
    gold: "#D7A33E", ink: "#172534", muted: "#5C6B79", line: "#DCE5EC",
    paper: "#FFFFFF", canvas: "#F5F8FB", critical: "#B42318", criticalSoft: "#FDECEA",
    high: "#C35C1D", highSoft: "#FFF0E6", medium: "#9A6A16", mediumSoft: "#FFF6DC",
    info: "#2F6497", infoSoft: "#EAF3FB"
  });
  const SEVERITY = Object.freeze({
    critical: { label: "Критичний ризик", color: COLORS.critical, soft: COLORS.criticalSoft },
    high: { label: "Високий ризик", color: COLORS.high, soft: COLORS.highSoft },
    medium: { label: "Варто виправити", color: COLORS.medium, soft: COLORS.mediumSoft },
    info: { label: "Уточнення", color: COLORS.info, soft: COLORS.infoSoft }
  });
  const INTERNAL_DIAGNOSTIC = /висновок моделі|не пройшов дослівну|фрагмент не вдалося|не надала дослівного|без підтвердженої цитати|grounding|evidence_verified/i;

  function clean(value, fallback = "") {
    return String(value ?? "").replace(/[\u2010-\u2015\u2212]/g, "-").replace(/\s+/g, " ").trim() || fallback;
  }

  function shortQuote(value, limit = 260) {
    const text = clean(value);
    if (text.length <= limit) return text;
    const boundary = text.lastIndexOf(" ", limit);
    return `${text.slice(0, boundary > limit * 0.6 ? boundary : limit)}…`;
  }

  function safeFileName(value) {
    return clean(value, "договір").replace(/\.[^.]+$/, "")
      .replace(/[^A-Za-zА-Яа-яІіЇїЄєҐґ0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "").slice(0, 72) || "договір";
  }

  function sourceNames(result) {
    const names = result?.sourceFiles?.length ? result.sourceFiles : result?.documents?.map((item) => item?.name);
    return (names || []).map((name) => clean(name)).filter(Boolean);
  }

  function formatDate(value) {
    const date = new Date(value || Date.now());
    if (Number.isNaN(date.getTime())) return "дату не визначено";
    return new Intl.DateTimeFormat("uk-UA", { day: "2-digit", month: "long", year: "numeric" }).format(date);
  }

  function issueCountLabel(value) {
    const count = Math.abs(Number(value) || 0);
    if (count % 100 >= 11 && count % 100 <= 14) return "пунктів";
    if (count % 10 === 1) return "пункт";
    if (count % 10 >= 2 && count % 10 <= 4) return "пункти";
    return "пунктів";
  }

  function evidenceFragments(evidence) {
    if (!evidence || evidence.verified !== true) return [];
    const fragments = Array.isArray(evidence.fragments) && evidence.fragments.length
      ? evidence.fragments : [evidence];
    return fragments.filter((fragment) => clean(fragment?.snippet || fragment?.quote));
  }

  function confirmedIssues(result) {
    return (Array.isArray(result?.issues) ? result.issues : []).filter((issue) =>
      issue && evidenceFragments(issue.evidence).length > 0
      && !INTERNAL_DIAGNOSTIC.test([issue.title, issue.assessment, issue.risk, issue.recommendation].join(" "))
    );
  }

  function labelText(text, color = COLORS.navy) {
    return { text: clean(text).toUpperCase(), fontSize: 6.8, bold: true, color,
      characterSpacing: 0.65, margin: [0, 0, 0, 3] };
  }

  function evidenceText(evidence) {
    return evidenceFragments(evidence).map((fragment) => {
      const location = [
        clean(fragment.fileName || fragment.file_name || evidence.fileName),
        fragment.page ? `с. ${fragment.page}` : "",
        fragment.clause ? `п. ${clean(fragment.clause)}` : ""
      ].filter(Boolean).join(", ");
      return `${location ? `${location}: ` : ""}«${shortQuote(fragment.snippet || fragment.quote)}»`;
    }).join("\n");
  }

  function issueCard(issue, index) {
    const severity = SEVERITY[issue.severity] || SEVERITY.info;
    const assessment = clean(issue.assessment);
    const risk = clean(issue.risk);
    const stack = [
      { columns: [
        { text: `${index + 1}. ${clean(issue.title, "Умова для виправлення")}`, fontSize: 11.6, bold: true, color: COLORS.ink, width: "*" },
        { text: severity.label.toUpperCase(), fontSize: 6.5, bold: true, color: severity.color,
          width: 95, alignment: "right", margin: [0, 3, 0, 0] }
      ], columnGap: 10, margin: [0, 0, 0, 7] },
      ...(assessment ? [{ text: assessment, fontSize: 9, lineHeight: 1.12, margin: [0, 0, 0, 6] }] : []),
      ...(risk && risk !== assessment ? [labelText("Наслідок для вас", severity.color),
        { text: risk, fontSize: 9, lineHeight: 1.12, margin: [0, 0, 0, 7] }] : []),
      { table: { widths: ["*"], body: [[{
        stack: [labelText("Як виправити", COLORS.green),
          { text: clean(issue.recommendation, "Погодити зміну цієї умови зі страховиком."), fontSize: 9.2, bold: true, lineHeight: 1.13 }],
        fillColor: COLORS.greenSoft, margin: [8, 6, 8, 6]
      }]] }, layout: "noBorders", margin: [0, 0, 0, 7] },
      ...(clean(issue.proposedWording) ? [
        labelText("Редакція для погодження"),
        { text: clean(issue.proposedWording), fontSize: 8.5, lineHeight: 1.1, margin: [0, 0, 0, 7] }
      ] : []),
      { text: evidenceText(issue.evidence), fontSize: 7.3, lineHeight: 1.12, color: COLORS.muted, italics: true }
    ];
    return {
      id: `recommendation-${index}`,
      margin: [0, 0, 0, 10],
      table: { widths: [4, "*"], body: [[
        { text: "", fillColor: severity.color },
        { fillColor: COLORS.paper, margin: [11, 9, 11, 10], stack }
      ]] },
      layout: { hLineWidth: () => 0.6, vLineWidth: () => 0.6,
        hLineColor: () => COLORS.line, vLineColor: () => COLORS.line,
        paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 }
    };
  }

  function parametersBlock(result) {
    const parameters = (Array.isArray(result?.parameters) ? result.parameters : []).filter((parameter) =>
      parameter?.status === "found" && clean(parameter.value)
      && parameter?.evidence?.verified === true && evidenceFragments(parameter.evidence).length > 0
      && !/^(insurer|insured|beneficiary|contract_number|contract_date|document_version)$/.test(clean(parameter.id))
      && !/^(Страховик|Страхувальник|Вигодонабувач|Номер договору|Дата договору|Дата укладення|Версія документа)$/i.test(clean(parameter.label))
    );
    if (!parameters.length) return [];
    return [
      { text: "ОСНОВНІ УМОВИ ДОГОВОРУ", style: "sectionTitle", margin: [0, 0, 0, 6] },
      { table: { widths: [146, "*"], body: parameters.map((parameter) => [
        { text: clean(parameter.label, "Параметр"), style: "tableCell", color: COLORS.muted },
        { text: clean(parameter.value), style: "tableCell", bold: true }
      ]) }, layout: {
        fillColor: (rowIndex) => rowIndex % 2 === 0 ? COLORS.canvas : COLORS.paper,
        hLineWidth: () => 0, vLineWidth: () => 0,
        paddingLeft: () => 8, paddingRight: () => 8, paddingTop: () => 5, paddingBottom: () => 5
      }, margin: [0, 0, 0, 15] }
    ];
  }

  function introduction(result, issues, hasLogo) {
    const counts = [
      ["critical", "Критичні ризики"], ["high", "Високі ризики"], ["medium", "Середні ризики"]
    ].map(([severity, label]) => {
      const count = issues.filter((issue) => issue.severity === severity).length;
      return count ? { text: `${label}: ${count}  `, color: SEVERITY[severity].color, bold: true } : null;
    }).filter(Boolean);
    const overallAssessment = (Array.isArray(result.issues) ? result.issues.length : 0) === issues.length
      ? clean(result.overallAssessment) : "";
    return [
      { columns: [
        hasLogo ? { image: "britmarkLogo", width: 136, margin: [0, 0, 0, 0] }
          : { text: "BRITMARK", fontSize: 18, bold: true, color: COLORS.navy, characterSpacing: 1.5 },
        { stack: [
          { text: "АНАЛІЗ ДОГОВОРУ СЕРВІСОМ ANODOS", fontSize: 6.5, bold: true, color: COLORS.green, alignment: "right", characterSpacing: 0.4 },
          { text: formatDate(result.createdAt), fontSize: 7.5, color: COLORS.muted, alignment: "right", margin: [0, 4, 0, 0] }
        ] }
      ], margin: [0, 0, 0, 17] },
      { text: "Що виправити в договорі\nстрахування майна", fontSize: 22, bold: true, color: COLORS.navy, lineHeight: 1.06, margin: [0, 0, 0, 7] },
      { text: "Тестовий аналіз, не остаточний висновок", fontSize: 9, bold: true, color: COLORS.high, margin: [0, 0, 0, 7] },
      { text: sourceNames(result).join("; ") || "Договір страхування майна", fontSize: 8, color: COLORS.muted, margin: [0, 0, 0, 11] },
      ...(result.blocked ? [] : [
        { text: issues.length ? `${issues.length} ${issueCountLabel(issues.length)} для виправлення`
          : "Підтверджених слабких місць не виявлено", fontSize: 12, bold: true, color: issues.length ? COLORS.navy : COLORS.green, margin: [0, 0, 0, 4] },
        ...(counts.length ? [{ text: counts, fontSize: 8.1, margin: [0, 0, 0, 7] }] : []),
        ...(overallAssessment && !INTERNAL_DIAGNOSTIC.test(overallAssessment)
          ? [{ text: overallAssessment, fontSize: 9.2, lineHeight: 1.15, margin: [0, 0, 0, 13] }] : [])
      ])
    ];
  }

  function warningsBlock(result, issues) {
    const warnings = [...new Set((Array.isArray(result.reviewWarnings) ? result.reviewWarnings : [])
      .map((warning) => clean(typeof warning === "string" ? warning : warning?.message || warning?.title)).filter(Boolean))];
    const excludedCount = (Array.isArray(result.issues) ? result.issues.length : 0) - issues.length;
    if (!warnings.length && !excludedCount) return [];
    const readable = warnings.filter((warning) => !INTERNAL_DIAGNOSTIC.test(warning));
    const details = readable.length ? [readable.slice(0, 3).join(" "),
      readable.length > 3 ? `Ще ${readable.length - 3} ${issueCountLabel(readable.length - 3)} потребують звірення з оригіналом.` : ""
    ].filter(Boolean).join(" ") : "Частину умов не вдалося впевнено оцінити за прочитаним текстом. Звірте їх з оригіналом договору.";
    return [{
      stack: [labelText("Потребує уточнення", COLORS.muted),
        { text: details, fontSize: 8.1, lineHeight: 1.15, color: COLORS.muted },
        { text: "Це обмеження перевірки; воно не означає, що в договорі є помилка.", fontSize: 7.5, color: COLORS.muted, margin: [0, 4, 0, 0] }],
      margin: [0, 5, 0, 0]
    }];
  }

  function buildDefinition(result, options = {}) {
    if (!result || typeof result !== "object") throw new Error("Немає результату перевірки для формування PDF.");
    const logoDataUrl = clean(options.logoDataUrl);
    const issues = confirmedIssues(result);
    const content = introduction(result, issues, Boolean(logoDataUrl));
    if (result.blocked) {
      content.push({ stack: [
        { text: clean(result.diagnosticTitle, "Перевірку не завершено"), fontSize: 13, bold: true, color: COLORS.high, margin: [0, 0, 0, 6] },
        { text: clean(result.diagnosticExplanation, "Перевірте формат і зміст документа."), fontSize: 10, lineHeight: 1.2 }
      ], margin: [0, 9, 0, 0] });
    } else {
      content.push(...parametersBlock(result));
      if (issues.length) {
        content.push({ text: "РЕКОМЕНДОВАНІ ПРАВКИ", style: "sectionTitle", margin: [0, 0, 0, 7] });
        issues.forEach((issue, index) => content.push(issueCard(issue, index)));
      }
      content.push(...warningsBlock(result, issues));
    }
    content.push({ text: "Тестовий аналіз, не остаточний висновок. Можливі помилки й пропуски. Це не юридична або фінансова консультація. Звірте рекомендації з оригіналом договору та фахівцем перед погодженням змін зі страховиком.",
      fontSize: 7.2, lineHeight: 1.1, color: COLORS.muted, margin: [0, 13, 0, 0] });
    const definition = {
      pageSize: "A4", pageMargins: [40, 34, 40, 43],
      // Move a card to the next page only if it would split mid-page. A card
      // longer than a whole page may flow normally once it starts at the top.
      pageBreakBefore(node) {
        return /^recommendation-/.test(node.id || "") && node.pageNumbers?.length > 1 && node.startPosition?.top > 35;
      },
      info: { title: `BRITMARK - перевірка договору страхування майна - ${sourceNames(result)[0] || "договір"}`,
        author: "BRITMARK / Anodos", subject: "Слабкі місця договору страхування майна та рекомендовані правки", creator: "Anodos" },
      defaultStyle: { font: "Roboto", fontSize: 9, color: COLORS.ink },
      styles: { sectionTitle: { fontSize: 10, bold: true, color: COLORS.navy, characterSpacing: 0.5 },
        tableCell: { fontSize: 8.2, lineHeight: 1.1, color: COLORS.ink } },
      footer(currentPage, pageCount) {
        return { margin: [40, 12, 40, 0], columns: [
          { text: "BRITMARK / ANODOS", fontSize: 6.5, bold: true, color: COLORS.muted, characterSpacing: 0.65 },
          { text: `${currentPage} / ${pageCount}`, fontSize: 6.5, color: COLORS.muted, alignment: "right" }
        ] };
      },
      content
    };
    if (logoDataUrl) definition.images = { britmarkLogo: logoDataUrl };
    return definition;
  }

  function fileToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("Не вдалося прочитати логотип."));
      reader.readAsDataURL(blob);
    });
  }

  async function loadLogoDataUrl() {
    try {
      const response = await fetch("./assets/britmark-logo.png?v=1", { cache: "force-cache" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await fileToDataUrl(await response.blob());
    } catch {
      return "";
    }
  }

  function ensurePdfMake() {
    const pdfMake = globalScope.pdfMake;
    if (!pdfMake?.createPdf) throw new Error("Модуль PDF не завантажився. Оновіть сторінку і спробуйте ще раз.");
    if (typeof pdfMake.addVirtualFileSystem === "function" && globalScope.pdfMakeVfs) pdfMake.addVirtualFileSystem(globalScope.pdfMakeVfs);
    return pdfMake;
  }

  async function createBlob(result, options = {}) {
    const pdfMake = ensurePdfMake();
    const logoDataUrl = options.logoDataUrl === undefined ? await loadLogoDataUrl() : options.logoDataUrl;
    return pdfMake.createPdf(buildDefinition(result, { ...options, logoDataUrl })).getBlob();
  }

  async function download(result) {
    const blob = await createBlob(result);
    const filename = `BRITMARK_перевірка_${safeFileName(sourceNames(result)[0] || "договір")}.pdf`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    globalScope.setTimeout(() => URL.revokeObjectURL(url), 2000);
    return { filename, blob };
  }

  globalScope.AnodosPropertyReviewReport = Object.freeze({ buildDefinition, createBlob, download, safeFileName, colors: COLORS });
})(typeof window !== "undefined" ? window : globalThis);
