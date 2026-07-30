(function clientRecommendationModule() {
  "use strict";

  const OWNER_EMAIL = "onasanchuk@britmark.com";
  const DOCX_VENDOR_URL = "./assets/vendor/docx.iife.js?v=1";
  const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const CRITICAL_KEYS = new Set([
    "address",
    "beneficiary",
    "valuationBasis",
    "risks",
    "deductible",
    "sumInsured",
    "limits",
    "premium"
  ]);

  function isAllowedUser(user) {
    return String(user?.email || "").trim().toLowerCase() === OWNER_EMAIL;
  }

  function clean(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function sourceLabel(meta = {}) {
    const evidence = meta.evidence || {};
    return [
      clean(evidence.fileName),
      evidence.line ? `рядок ${evidence.line}` : ""
    ].filter(Boolean).join(", ");
  }

  function rowItem(row) {
    return {
      key: row.key,
      label: clean(row.label),
      previousValue: clean(row.previousValue) || "Не знайдено",
      renewalValue: clean(row.renewalValue) || "Не знайдено",
      control: clean(row.control),
      critical: CRITICAL_KEYS.has(row.key),
      previousSource: sourceLabel(row.previousMeta),
      renewalSource: sourceLabel(row.renewalMeta)
    };
  }

  function questionFor(item) {
    if (item.control === "Конфлікт у пакеті") {
      return `Підтвердити остаточне значення параметра «${item.label}»: у документах пакета виявлено суперечність.`;
    }
    if (item.control === "Не знайдено автоматично") {
      return `Надати або вказати в договорі параметр «${item.label}».`;
    }
    if (item.control === "Потрібна ручна перевірка") {
      return `Підтвердити параметр «${item.label}» та його застосування до всього заявленого ризику.`;
    }
    if (item.control === "Змінено" && item.critical) {
      return `Підтвердити зміну параметра «${item.label}» з «${item.previousValue}» на «${item.renewalValue}».`;
    }
    return "";
  }

  function prepare(comparison, options = {}) {
    if (!comparison?.rows?.length || !comparison.previous || !comparison.renewal) {
      throw new Error("Спочатку сформуйте порівняння договорів.");
    }

    const rows = comparison.rows.map(rowItem);
    const changed = rows.filter((row) => row.control === "Змінено");
    const attention = rows.filter((row) =>
      ["Потрібна ручна перевірка", "Конфлікт у пакеті", "Не знайдено автоматично"].includes(row.control)
    );
    const criticalChanges = changed.filter((row) => row.critical);
    const criticalAttention = attention.filter((row) => row.critical);
    const questions = [...criticalAttention, ...criticalChanges, ...attention.filter((row) => !row.critical)]
      .map(questionFor)
      .filter(Boolean)
      .filter((question, index, all) => all.indexOf(question) === index);
    const clientName = clean(
      rows.find((row) => row.key === "insured")?.renewalValue.replace(/^Не знайдено$/, "")
    ) || "Клієнт";
    const product = clean(
      rows.find((row) => row.key === "product")?.renewalValue.replace(/^Не знайдено$/, "")
    ) || "страхове покриття";
    const hasBlockingReview = criticalAttention.length > 0
      || comparison.periods?.relation === "gap"
      || Boolean(comparison.supportingAlerts?.length);
    const decision = hasBlockingReview || criticalChanges.length
      ? "Погоджувати після уточнення"
      : "Можна розглядати для поновлення";
    const rationale = hasBlockingReview
      ? "До підтвердження критичних параметрів не рекомендується подавати документ Клієнту як остаточно погоджений."
      : criticalChanges.length
        ? "Умови поновлення містять суттєві зміни, які потрібно окремо погодити з Клієнтом і страховиком."
        : "Критичних непідтверджених відмінностей за автоматично зіставленими параметрами не виявлено.";
    const brokerNote = clean(options.brokerNote);
    const preparedAt = new Date().toISOString();
    const emailSubject = `Поновлення страхування — ${clientName}`;
    const emailBody = [
      `Добрий день!`,
      "",
      `Ми проаналізували умови поновлення за напрямом «${product}».`,
      `Попередній висновок BritMark: ${decision.toLowerCase()}.`,
      rationale,
      questions.length
        ? `До остаточного погодження просимо підтвердити ${questions.length} ${questions.length === 1 ? "питання" : "питань"}, наведених у рекомендації.`
        : "Критичних питань до остаточного погодження не виявлено.",
      "",
      "Детальний брокерський висновок додається."
    ].join("\n");

    return {
      title: "Рекомендація Клієнту щодо поновлення страхування",
      preparedAt,
      clientName,
      product,
      previousName: clean(comparison.previous.name),
      renewalName: clean(comparison.renewal.name),
      decision,
      rationale,
      brokerNote,
      changed,
      attention,
      criticalChanges,
      criticalAttention,
      questions,
      supportingAlerts: (comparison.supportingAlerts || []).map((alert) => ({
        packageLabel: clean(alert.packageLabel),
        fieldLabel: clean(alert.fieldLabel),
        fileName: clean(alert.fileName),
        value: clean(alert.value)
      })),
      periodRelation: comparison.periods?.relation || "",
      emailSubject,
      emailBody
    };
  }

  let docxLibraryPromise = null;

  function ensureDocxLibrary() {
    if (window.docx?.Document && window.docx?.Packer) {
      return Promise.resolve(window.docx);
    }
    if (docxLibraryPromise) {
      return docxLibraryPromise;
    }
    docxLibraryPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = DOCX_VENDOR_URL;
      script.async = true;
      script.onload = () => {
        if (window.docx?.Document && window.docx?.Packer) {
          resolve(window.docx);
          return;
        }
        reject(new Error("Бібліотека DOCX завантажилася некоректно."));
      };
      script.onerror = () => reject(new Error("Не вдалося завантажити бібліотеку DOCX."));
      document.head.append(script);
    }).catch((error) => {
      docxLibraryPromise = null;
      throw error;
    });
    return docxLibraryPromise;
  }

  function safeFilenamePart(value) {
    return clean(value)
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/[^\p{L}\p{N}._ -]+/gu, "")
      .replace(/\s+/g, "_")
      .slice(0, 72) || "Клієнт";
  }

  function filenameFor(result) {
    const date = new Date(result.preparedAt || Date.now()).toISOString().slice(0, 10);
    return `Рекомендація_BritMark_${safeFilenamePart(result.clientName)}_${date}.docx`;
  }

  function run(docx, text, options = {}) {
    return new docx.TextRun({
      text: clean(text),
      bold: options.bold,
      italics: options.italics,
      color: options.color || "1F2937",
      size: options.size || 24,
      font: "Times New Roman"
    });
  }

  function paragraph(docx, text, options = {}) {
    return new docx.Paragraph({
      heading: options.heading,
      alignment: options.alignment,
      keepNext: options.keepNext,
      spacing: options.spacing || { after: 120, line: 300 },
      children: [run(docx, text, options)]
    });
  }

  function heading(docx, text) {
    return paragraph(docx, text, {
      heading: docx.HeadingLevel.HEADING_1,
      bold: true,
      color: "132961",
      size: 28,
      keepNext: true,
      spacing: { before: 260, after: 100 }
    });
  }

  function bullet(docx, text) {
    return new docx.Paragraph({
      bullet: { level: 0 },
      spacing: { after: 80, line: 300 },
      children: [run(docx, text)]
    });
  }

  function border(docx, color = "CBD5E1", size = 4) {
    return { style: docx.BorderStyle.SINGLE, color, size };
  }

  function comparisonTable(docx, rows) {
    if (!rows.length) {
      return paragraph(docx, "Суттєвих змін за зіставленими параметрами не виявлено.");
    }
    const cell = (text, bold = false) => new docx.TableCell({
      verticalAlign: docx.VerticalAlign.CENTER,
      children: [paragraph(docx, text, { bold, spacing: { after: 0, line: 260 } })]
    });
    return new docx.Table({
      width: { size: 100, type: docx.WidthType.PERCENTAGE },
      layout: docx.TableLayoutType.FIXED,
      borders: {
        top: border(docx),
        bottom: border(docx),
        left: border(docx),
        right: border(docx),
        insideHorizontal: border(docx),
        insideVertical: border(docx)
      },
      rows: [
        new docx.TableRow({
          tableHeader: true,
          children: [cell("Параметр", true), cell("Було", true), cell("Стало", true)]
        }),
        ...rows.map((item) => new docx.TableRow({
          cantSplit: true,
          children: [
            cell(item.label, true),
            cell(item.previousValue),
            cell(item.renewalValue)
          ]
        }))
      ]
    });
  }

  function buildDocument(docx, result) {
    const content = [
      paragraph(docx, result.title, {
        bold: true,
        color: "132961",
        size: 34,
        spacing: { after: 120 }
      }),
      paragraph(docx, "Робочий брокерський висновок BritMark", {
        italics: true,
        color: "5B6B7D",
        spacing: { after: 220 }
      }),
      paragraph(docx, `Клієнт: ${result.clientName}`, { bold: true }),
      paragraph(docx, `Продукт: ${result.product}`),
      paragraph(docx, `Попередній документ: ${result.previousName}`),
      paragraph(docx, `Документ поновлення: ${result.renewalName}`),
      heading(docx, "Попередній висновок"),
      paragraph(docx, result.decision, { bold: true, color: "337F6D", size: 28 }),
      paragraph(docx, result.rationale)
    ];

    if (result.brokerNote) {
      content.push(paragraph(docx, `Коментар брокера: ${result.brokerNote}`, { italics: true }));
    }

    content.push(
      heading(docx, "Критичні зміни"),
      comparisonTable(docx, result.criticalChanges)
    );

    content.push(heading(docx, "Питання до страховика"));
    if (result.questions.length) {
      result.questions.forEach((question) => content.push(bullet(docx, question)));
    } else {
      content.push(paragraph(docx, "Критичних питань за автоматично зіставленими параметрами не виявлено."));
    }

    if (result.supportingAlerts.length) {
      content.push(heading(docx, "Розбіжності у супровідних документах"));
      result.supportingAlerts.forEach((alert) => {
        content.push(bullet(
          docx,
          `${alert.packageLabel}: ${alert.fieldLabel} — ${alert.value} (${alert.fileName}).`
        ));
      });
    }

    content.push(
      heading(docx, "Чернетка листа Клієнту"),
      paragraph(docx, `Тема: ${result.emailSubject}`, { bold: true })
    );
    result.emailBody.split("\n").forEach((line) => {
      content.push(paragraph(docx, line || " ", { spacing: { after: line ? 90 : 40, line: 300 } }));
    });
    content.push(
      heading(docx, "Застереження"),
      paragraph(
        docx,
        "Документ є робочою чернеткою. Перед передачею Клієнту брокер має перевірити позначені параметри та підтвердити остаточну рекомендацію."
      )
    );

    return new docx.Document({
      creator: "BritMark / Anodos",
      lastModifiedBy: "BritMark / Anodos",
      title: result.title,
      subject: `Поновлення страхування: ${result.clientName}`,
      description: "Робочий брокерський висновок на основі порівняння договорів.",
      styles: {
        default: {
          document: {
            run: { font: "Times New Roman", size: 24, color: "1F2937", language: { value: "uk-UA" } },
            paragraph: { spacing: { after: 120, line: 300 }, widowControl: true }
          },
          heading1: {
            run: { font: "Times New Roman", size: 28, bold: true, color: "132961" },
            paragraph: { spacing: { before: 260, after: 100 }, keepNext: true }
          }
        },
        paragraphStyles: []
      },
      sections: [{
        properties: {
          page: {
            size: { orientation: docx.PageOrientation.PORTRAIT },
            margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 }
          }
        },
        children: content
      }]
    });
  }

  async function buildBlob(result) {
    if (!result?.clientName || !result?.decision) {
      throw new Error("Спочатку підготуйте рекомендацію.");
    }
    const docx = await ensureDocxLibrary();
    return docx.Packer.toBlob(buildDocument(docx, result));
  }

  async function download(result) {
    const blob = await buildBlob(result);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filenameFor(result);
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { filename: filenameFor(result), size: blob.size, type: blob.type || DOCX_MIME };
  }

  window.AnodosClientRecommendation = Object.freeze({
    ownerEmail: OWNER_EMAIL,
    isAllowedUser,
    prepare,
    filenameFor,
    buildBlob,
    download
  });
})();
