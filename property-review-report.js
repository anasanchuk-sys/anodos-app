(function attachPropertyReviewReport(globalScope) {
  "use strict";

  const COLORS = Object.freeze({
    navy: "#16324F",
    navySoft: "#EAF1F7",
    green: "#337F6D",
    greenSoft: "#EAF5F1",
    gold: "#D7A33E",
    ink: "#172534",
    muted: "#5C6B79",
    line: "#DCE5EC",
    paper: "#FFFFFF",
    canvas: "#F5F8FB",
    critical: "#B42318",
    criticalSoft: "#FDECEA",
    high: "#C35C1D",
    highSoft: "#FFF0E6",
    medium: "#9A6A16",
    mediumSoft: "#FFF6DC",
    info: "#2F6497",
    infoSoft: "#EAF3FB"
  });

  const SEVERITY = Object.freeze({
    critical: { label: "Критичний", color: COLORS.critical, soft: COLORS.criticalSoft },
    high: { label: "Високий", color: COLORS.high, soft: COLORS.highSoft },
    medium: { label: "Середній", color: COLORS.medium, soft: COLORS.mediumSoft },
    info: { label: "Інформаційний", color: COLORS.info, soft: COLORS.infoSoft }
  });

  function clean(value, fallback = "") {
    const text = String(value ?? "")
      .replace(/\s+/g, " ")
      .trim();
    return text || fallback;
  }

  function safeFileName(value) {
    return clean(value, "договір")
      .replace(/\.[^.]+$/, "")
      .replace(/[^A-Za-zА-Яа-яІіЇїЄєҐґ0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 72) || "договір";
  }

  function sourceNames(result) {
    const names = result?.sourceFiles?.length
      ? result.sourceFiles
      : result?.documents?.map((item) => item?.name);
    return (names || []).map((name) => clean(name)).filter(Boolean);
  }

  function formatDate(value) {
    const date = new Date(value || Date.now());
    if (Number.isNaN(date.getTime())) {
      return "дату не визначено";
    }
    return new Intl.DateTimeFormat("uk-UA", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function countIssues(result, severity) {
    const summaryValue = Number(result?.summary?.[severity]);
    if (Number.isFinite(summaryValue)) {
      return summaryValue;
    }
    return (result?.issues || []).filter((issue) => issue?.severity === severity).length;
  }

  function issueCountLabel(value) {
    const count = Math.abs(Number(value) || 0);
    const lastTwo = count % 100;
    const last = count % 10;
    if (lastTwo >= 11 && lastTwo <= 14) {
      return "пунктів";
    }
    if (last === 1) {
      return "пункт";
    }
    if (last >= 2 && last <= 4) {
      return "пункти";
    }
    return "пунктів";
  }

  function summaryCard(value, label, color, soft) {
    return {
      margin: [0, 0, 8, 0],
      table: {
        widths: ["*"],
        body: [[{
          stack: [
            { text: String(value), fontSize: 24, bold: true, color, margin: [0, 0, 0, 1] },
            { text: label, fontSize: 8.5, bold: true, color: COLORS.ink, characterSpacing: 0.35 }
          ],
          fillColor: soft,
          margin: [11, 9, 9, 9]
        }]]
      },
      layout: "noBorders"
    };
  }

  function labelText(text, color = COLORS.navy) {
    return {
      text: clean(text).toUpperCase(),
      fontSize: 7.5,
      bold: true,
      color,
      characterSpacing: 0.8,
      margin: [0, 0, 0, 4]
    };
  }

  function evidenceText(evidence, status = "") {
    if (!evidence) {
      return status === "missing"
        ? "Anodos перевірив увесь прочитаний текст і не знайшов цієї умови."
        : "Дослівного доказового фрагмента не підтверджено.";
    }
    const location = [
      clean(evidence.fileName),
      evidence.page ? `сторінка ${evidence.page}` : "",
      evidence.clause ? `пункт ${clean(evidence.clause)}` : ""
    ].filter(Boolean).join(" - ");
    const snippet = clean(evidence.snippet);
    if (location && snippet) {
      return `${location}\n«${snippet}»`;
    }
    return location || snippet || "Фрагмент визначено за структурою файла.";
  }

  function issueCard(issue, index) {
    const severity = SEVERITY[issue?.severity] || SEVERITY.info;
    const title = clean(issue?.title, `Пункт ${index + 1}`);
    return {
      margin: [0, 0, 0, 13],
      unbreakable: true,
      table: {
        widths: [5, "*"],
        body: [[
          { text: "", fillColor: severity.color },
          {
            fillColor: COLORS.paper,
            margin: [14, 11, 14, 12],
            stack: [
              {
                columns: [
                  { text: `${index + 1}. ${title}`, fontSize: 13, bold: true, color: COLORS.ink, width: "*" },
                  {
                    text: severity.label.toUpperCase(),
                    fontSize: 7.3,
                    bold: true,
                    color: severity.color,
                    background: severity.soft,
                    alignment: "center",
                    width: 74,
                    margin: [5, 4, 5, 4]
                  }
                ],
                columnGap: 10,
                margin: [0, 0, 0, 10]
              },
              labelText("Чому це ризик", severity.color),
              { text: clean(issue?.risk, "Ризик потребує уточнення фахівцем."), fontSize: 9.4, lineHeight: 1.3, color: COLORS.ink, margin: [0, 0, 0, 10] },
              {
                table: {
                  widths: ["*"],
                  body: [[{
                    stack: [
                      labelText("Що виправити", COLORS.green),
                      { text: clean(issue?.recommendation, "Сформулювати та погодити необхідну правку."), fontSize: 9.6, bold: true, lineHeight: 1.28, color: COLORS.ink }
                    ],
                    fillColor: COLORS.greenSoft,
                    margin: [10, 8, 10, 9]
                  }]]
                },
                layout: "noBorders",
                margin: [0, 0, 0, 10]
              },
              ...(clean(issue?.proposedWording) ? [
                labelText("Запропонована редакція", COLORS.navy),
                { text: clean(issue.proposedWording), fontSize: 9.2, lineHeight: 1.3, color: COLORS.ink, margin: [0, 0, 0, 10] }
              ] : []),
              labelText("Де перевірити", COLORS.muted),
              { text: evidenceText(issue?.evidence, issue?.status), fontSize: 8.2, italics: true, lineHeight: 1.25, color: COLORS.muted }
            ]
          }
        ]]
      },
      layout: {
        hLineWidth: () => 0.7,
        vLineWidth: () => 0.7,
        hLineColor: () => COLORS.line,
        vLineColor: () => COLORS.line,
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0
      }
    };
  }

  function manualChecksBlock(result) {
    const manual = (result?.checks || []).filter((check) => check?.status === "manual");
    if (!manual.length) {
      return [];
    }
    return [
      { text: "ЩО ЩЕ ПЕРЕВІРИТИ ФАХІВЦЮ", style: "sectionTitle", margin: [0, 10, 0, 5] },
      {
        text: "Ці пункти не можна надійно оцінити лише автоматичним пошуком тексту. Їх варто пройти перед погодженням фінальної редакції.",
        style: "sectionLead",
        margin: [0, 0, 0, 14]
      },
      {
        table: {
          headerRows: 1,
          widths: [28, "*"],
          body: [
            [
              { text: "№", style: "tableHeader" },
              { text: "Пункт ручної перевірки", style: "tableHeader" }
            ],
            ...manual.map((check, index) => [
              { text: String(index + 1), style: "tableNumber" },
              { text: clean(check?.title, "Пункт потребує ручної перевірки"), style: "tableCell" }
            ])
          ]
        },
        layout: {
          fillColor: (rowIndex) => rowIndex === 0 ? COLORS.navy : rowIndex % 2 ? COLORS.canvas : COLORS.paper,
          hLineWidth: () => 0.6,
          vLineWidth: () => 0,
          hLineColor: () => COLORS.line,
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 6,
          paddingBottom: () => 6
        }
      }
    ];
  }

  function parametersBlock(result) {
    const parameters = result?.parameters || [];
    if (!parameters.length) return [];
    return [
      { text: "ПАРАМЕТРИ, ЗНАЙДЕНІ В ДОГОВОРІ", style: "sectionTitle", margin: [0, 0, 0, 5] },
      {
        text: "Значення наведені лише тоді, коли Anodos підтвердив їх дослівним фрагментом прочитаного тексту.",
        style: "sectionLead",
        margin: [0, 0, 0, 14]
      },
      {
        table: {
          headerRows: 1,
          widths: [145, "*"],
          body: [
            [
              { text: "ПАРАМЕТР", style: "tableHeader" },
              { text: "ЗНАЧЕННЯ", style: "tableHeader" }
            ],
            ...parameters.map((parameter) => [
              { text: clean(parameter?.label, "Параметр"), style: "tableCell", bold: true },
              {
                text: clean(
                  parameter?.value,
                  parameter?.status === "missing" ? "Не знайдено" : "Потрібно уточнити"
                ),
                style: "tableCell",
                color: parameter?.status === "found" ? COLORS.ink : COLORS.medium
              }
            ])
          ]
        },
        layout: {
          fillColor: (rowIndex) => rowIndex === 0 ? COLORS.navy : rowIndex % 2 ? COLORS.canvas : COLORS.paper,
          hLineWidth: () => 0.6,
          vLineWidth: () => 0,
          hLineColor: () => COLORS.line,
          paddingLeft: () => 9,
          paddingRight: () => 9,
          paddingTop: () => 7,
          paddingBottom: () => 7
        }
      }
    ];
  }

  function coverBlock(result, hasLogo) {
    const names = sourceNames(result);
    const issues = result?.issues || [];
    const totalAttention = issues.length;
    const semantic = result?.analysisMode === "semantic";
    const fourthValue = semantic
      ? Number(result?.summary?.acceptable) || 0
      : Number(result?.summary?.manual) || (result?.checks || []).filter((check) => check?.status === "manual").length;
    const intro = result?.blocked
      ? "Перевірку не завершено. Нижче наведено причину та подальші дії."
      : totalAttention
        ? `Виявлено ${totalAttention} ${issueCountLabel(totalAttention)}, які потребують уваги перед погодженням договору.`
        : semantic
          ? "Увесь прочитаний текст проаналізовано, а кожен критерій оцінено з перевіркою доказових цитат."
          : "Автоматичні перевірки не виявили пунктів для виправлення. Ручну перевірку все одно потрібно завершити.";

    return [
      {
        columns: [
          hasLogo
            ? { image: "britmarkLogo", width: 156, margin: [0, 3, 0, 0] }
            : { text: "BRITMARK", fontSize: 18, bold: true, color: COLORS.navy, characterSpacing: 1.5 },
          {
            stack: [
              { text: "ПІДГОТОВЛЕНО СЕРВІСОМ", fontSize: 6.8, bold: true, color: COLORS.muted, alignment: "right", characterSpacing: 0.8 },
              { text: "ANODOS", fontSize: 10.5, bold: true, color: COLORS.green, alignment: "right", characterSpacing: 1 }
            ]
          }
        ],
        margin: [0, 0, 0, 28]
      },
      {
        table: {
          widths: ["*"],
          body: [[{
            fillColor: COLORS.navy,
            margin: [22, 22, 22, 23],
            stack: [
              { text: "АНАЛІТИЧНИЙ ЗВІТ", fontSize: 8, bold: true, color: "#BFD9E7", characterSpacing: 1.2, margin: [0, 0, 0, 8] },
              { text: "Перевірка договору\nстрахування майна", fontSize: 25, bold: true, lineHeight: 1.08, color: "#FFFFFF", margin: [0, 0, 0, 12] },
              { text: intro, fontSize: 10.5, lineHeight: 1.35, color: "#EAF3F8" }
            ]
          }]]
        },
        layout: "noBorders",
        margin: [0, 0, 0, 22]
      },
      {
        columns: [
          summaryCard(countIssues(result, "critical"), "КРИТИЧНІ", COLORS.critical, COLORS.criticalSoft),
          summaryCard(countIssues(result, "high"), "ВИСОКІ", COLORS.high, COLORS.highSoft),
          summaryCard(countIssues(result, "medium"), "СЕРЕДНІ", COLORS.medium, COLORS.mediumSoft),
          summaryCard(fourthValue, semantic ? "ПРИЙНЯТНІ" : "РУЧНІ", semantic ? COLORS.green : COLORS.info, semantic ? COLORS.greenSoft : COLORS.infoSoft)
        ],
        columnGap: 2,
        margin: [0, 0, 0, 22]
      },
      {
        table: {
          widths: [112, "*"],
          body: [
            [{ text: "ДОКУМЕНТ", style: "metaLabel" }, { text: names.length ? names.join("; ") : "Назву файла не визначено", style: "metaValue" }],
            [{ text: "ЧЕКЛІСТ", style: "metaLabel" }, { text: clean(result?.version, "Майно"), style: "metaValue" }],
            [{ text: "ДАТА ЗВІТУ", style: "metaLabel" }, { text: formatDate(result?.createdAt), style: "metaValue" }]
          ]
        },
        layout: {
          hLineWidth: (index) => index === 0 ? 0 : 0.7,
          vLineWidth: () => 0,
          hLineColor: () => COLORS.line,
          paddingLeft: () => 0,
          paddingRight: () => 8,
          paddingTop: () => 8,
          paddingBottom: () => 8
        },
        margin: [0, 0, 0, 14]
      },
      {
        table: {
          widths: [5, "*"],
          body: [[
            { text: "", fillColor: COLORS.gold },
            {
              stack: [
                { text: "ЯК ЧИТАТИ ЗВІТ", fontSize: 7.5, bold: true, color: COLORS.navy, characterSpacing: 0.7, margin: [0, 0, 0, 4] },
                { text: semantic
                  ? "Спочатку опрацюйте критичні та високі ризики. Для кожного знайденого пункту звірте дослівну цитату та погодьте запропоновану редакцію."
                  : "Спочатку опрацюйте критичні та високі ризики. Для кожного пункту звірте джерело, погодьте запропоновану правку і лише після цього переходьте до ручних перевірок.", fontSize: 9, lineHeight: 1.3, color: COLORS.ink }
              ],
              fillColor: "#FFF9ED",
              margin: [12, 9, 12, 10]
            }
          ]]
        },
        layout: "noBorders"
      }
    ];
  }

  function blockedBlock(result) {
    if (!result?.blocked) {
      return [];
    }
    return [
      { text: "РЕЗУЛЬТАТ ДІАГНОСТИКИ", style: "sectionTitle", pageBreak: "before" },
      {
        table: {
          widths: [5, "*"],
          body: [[
            { text: "", fillColor: COLORS.high },
            {
              stack: [
                { text: clean(result?.diagnosticTitle, "Перевірку не завершено"), fontSize: 14, bold: true, color: COLORS.ink, margin: [0, 0, 0, 7] },
                { text: clean(result?.diagnosticExplanation, "Перевірте формат і зміст документа."), fontSize: 10, lineHeight: 1.35, color: COLORS.ink }
              ],
              fillColor: COLORS.highSoft,
              margin: [14, 12, 14, 13]
            }
          ]]
        },
        layout: "noBorders"
      }
    ];
  }

  function buildDefinition(result, options = {}) {
    if (!result || typeof result !== "object") {
      throw new Error("Немає результату перевірки для формування PDF.");
    }
    const logoDataUrl = clean(options.logoDataUrl);
    const issues = result.issues || [];
    const content = [
      ...coverBlock(result, Boolean(logoDataUrl)),
      ...blockedBlock(result)
    ];

    if (!result.blocked) {
      if (result?.parameters?.length) {
        content.push({ text: "", pageBreak: "before" });
      }
      content.push(...parametersBlock(result));
      content.push(
        { text: "", pageBreak: "before" },
        { text: "ПУНКТИ, ЯКІ ПОТРІБНО ВИПРАВИТИ", style: "sectionTitle", margin: [0, 0, 0, 5] },
        {
          text: issues.length
            ? "Пункти розташовані від найвищої до нижчої критичності. Формулювання рекомендацій можна використовувати як основу для переговорів зі страховиком."
            : "Семантичний аналіз не виявив правок, однак це не замінює повну фахову перевірку договору.",
          style: "sectionLead",
          margin: [0, 0, 0, 14]
        }
      );
      if (issues.length) {
        issues.forEach((issue, index) => {
          if (index > 0 && index % 2 === 0) {
            content.push({ text: "", pageBreak: "before", margin: [0, 0, 0, 0] });
          }
          content.push(issueCard(issue, index));
        });
      } else {
        content.push({
          table: {
            widths: [5, "*"],
            body: [[
              { text: "", fillColor: COLORS.green },
              { text: "Усі критерії прочитані й оцінені без зауважень.", fillColor: COLORS.greenSoft, bold: true, color: COLORS.ink, margin: [14, 12, 14, 13] }
            ]]
          },
          layout: "noBorders"
        });
      }
      content.push(...manualChecksBlock(result));
    }

    content.push({
      text: "Цей звіт є інструментом попередньої семантичної перевірки, а не юридичним висновком. Остаточне рішення щодо редакції договору має приймати фахівець після перевірки повного комплекту документів.",
      fontSize: 7.6,
      lineHeight: 1.25,
      color: COLORS.muted,
      margin: [0, 18, 0, 0]
    });

    const definition = {
      pageSize: "A4",
      pageMargins: [42, 42, 42, 50],
      info: {
        title: `BRITMARK - перевірка договору страхування майна - ${sourceNames(result)[0] || "договір"}`,
        author: "BRITMARK / Anodos",
        subject: "Попередня перевірка договору страхування майна",
        creator: "Anodos"
      },
      defaultStyle: {
        font: "Roboto",
        fontSize: 9.5,
        color: COLORS.ink
      },
      styles: {
        sectionTitle: { fontSize: 16, bold: true, color: COLORS.navy, characterSpacing: 0.3 },
        sectionLead: { fontSize: 9.5, lineHeight: 1.3, color: COLORS.muted },
        metaLabel: { fontSize: 7.4, bold: true, color: COLORS.muted, characterSpacing: 0.55 },
        metaValue: { fontSize: 9.2, bold: true, color: COLORS.ink },
        tableHeader: { fontSize: 8, bold: true, color: "#FFFFFF" },
        tableNumber: { fontSize: 8.5, bold: true, color: COLORS.navy, alignment: "center" },
        tableCell: { fontSize: 8.8, lineHeight: 1.2, color: COLORS.ink }
      },
      footer(currentPage, pageCount) {
        return {
          margin: [42, 13, 42, 0],
          columns: [
            { text: "BRITMARK / ANODOS", fontSize: 6.5, bold: true, color: COLORS.muted, characterSpacing: 0.65 },
            { text: `СТОРІНКА ${currentPage} З ${pageCount}`, fontSize: 6.5, bold: true, color: COLORS.muted, alignment: "right", characterSpacing: 0.45 }
          ]
        };
      },
      content
    };
    if (logoDataUrl) {
      definition.images = { britmarkLogo: logoDataUrl };
    }
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
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await fileToDataUrl(await response.blob());
    } catch {
      return "";
    }
  }

  function ensurePdfMake() {
    const pdfMake = globalScope.pdfMake;
    if (!pdfMake?.createPdf) {
      throw new Error("Модуль PDF не завантажився. Оновіть сторінку і спробуйте ще раз.");
    }
    if (typeof pdfMake.addVirtualFileSystem === "function" && globalScope.pdfMakeVfs) {
      pdfMake.addVirtualFileSystem(globalScope.pdfMakeVfs);
    }
    return pdfMake;
  }

  async function createBlob(result, options = {}) {
    const pdfMake = ensurePdfMake();
    const logoDataUrl = options.logoDataUrl === undefined ? await loadLogoDataUrl() : options.logoDataUrl;
    return pdfMake.createPdf(buildDefinition(result, { ...options, logoDataUrl })).getBlob();
  }

  async function download(result) {
    const blob = await createBlob(result);
    const primaryName = sourceNames(result)[0] || "договір";
    const filename = `BRITMARK_перевірка_${safeFileName(primaryName)}.pdf`;
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

  globalScope.AnodosPropertyReviewReport = Object.freeze({
    buildDefinition,
    createBlob,
    download,
    safeFileName,
    colors: COLORS
  });
})(typeof window !== "undefined" ? window : globalThis);
