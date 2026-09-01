(function attachPropertyReviewSemantic(globalScope) {
  "use strict";

  const STATUS_LABELS = Object.freeze({
    acceptable: "Умова прийнятна",
    needs_change: "Потрібна правка",
    missing: "Умову не знайдено",
    unclear: "Потрібно уточнити"
  });
  const SEVERITY_LABELS = Object.freeze({
    critical: "Критичний",
    high: "Високий",
    medium: "Середній",
    info: "Інформаційний"
  });
  const ISSUE_STATUSES = new Set(["needs_change", "missing", "unclear"]);
  const QUOTE_REQUIRED_STATUSES = new Set(["acceptable", "needs_change"]);

  class SemanticReviewError extends Error {
    constructor(message, code = "semantic_review_failed", options = {}) {
      super(message);
      this.name = "SemanticReviewError";
      this.code = code;
      this.retryable = Boolean(options.retryable);
      this.status = Number(options.status) || 0;
    }
  }

  function clean(value, maxLength = Infinity) {
    const normalized = String(value ?? "")
      .replace(/\u00a0/g, " ")
      .replace(/\r/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return normalized.length > maxLength
      ? `${normalized.slice(0, Math.max(0, maxLength - 1)).trim()}…`
      : normalized;
  }

  function comparable(value) {
    return clean(value)
      .replace(/[«»“”„‟'’`]/g, '"')
      .replace(/\s+/g, " ")
      .toLocaleLowerCase("uk-UA");
  }

  function quoteExists(documents, quote, preferredFileName = "") {
    const needle = comparable(quote);
    if (!needle) return false;
    const preferred = documents.filter((document) => document.name === preferredFileName);
    const candidates = preferred.length ? [...preferred, ...documents.filter((document) => document.name !== preferredFileName)] : documents;
    return candidates.some((document) => comparable(document.text).includes(needle));
  }

  function structureEvidenceExists(documents, preferredFileName = "") {
    const preferred = documents.filter((document) => document.name === preferredFileName);
    const candidates = preferred.length ? preferred : documents;
    return candidates.some((document) => document.hasUnresolvedRevisions || document.hasComments);
  }

  function prepareDocuments(documents) {
    const prepared = Array.from(documents || [])
      .map((document) => ({
        name: clean(document?.name, 240) || "Договір",
        text: clean(document?.text),
        hasUnresolvedRevisions: Boolean(document?.hasUnresolvedRevisions),
        hasComments: Boolean(document?.hasComments),
        ocrPages: Math.max(0, Number(document?.ocrPages) || 0),
        ocrConfidence: Math.max(0, Math.min(100, Number(document?.ocrConfidence) || 0))
      }))
      .filter((document) => document.text);
    if (!prepared.length) {
      throw new SemanticReviewError(
        "Anodos не отримав читабельного тексту договору. Перевір файл або якість скану.",
        "no_readable_text"
      );
    }
    return prepared;
  }

  function prepareChecklist(checklist) {
    const prepared = Array.from(checklist || [])
      .map((check) => ({ id: clean(check?.id, 16), title: clean(check?.title, 240) }))
      .filter((check) => check.id && check.title);
    if (!prepared.length) {
      throw new SemanticReviewError("Чекліст майнового договору не завантажився.", "missing_checklist");
    }
    return prepared;
  }

  function normalizeEvidence(evidence, documents, status) {
    const sourceType = ["document_text", "file_structure", "none"].includes(evidence?.source_type)
      ? evidence.source_type
      : "document_text";
    const quote = clean(evidence?.quote || evidence?.snippet, 1600);
    const fileName = clean(evidence?.file_name || evidence?.fileName, 240);
    const pageValue = evidence?.page;
    const page = Number.isFinite(Number(pageValue)) && Number(pageValue) > 0 ? Number(pageValue) : null;
    const clause = clean(evidence?.clause, 80);
    const verified = sourceType === "file_structure"
      ? structureEvidenceExists(documents, fileName)
      : quote
        ? quoteExists(documents, quote, fileName)
        : false;
    return {
      sourceType,
      fileName,
      page,
      clause,
      snippet: quote,
      verified,
      required: QUOTE_REQUIRED_STATUSES.has(status)
    };
  }

  function normalizeCheck(rawCheck, expected, documents) {
    const allowedStatuses = new Set(Object.keys(STATUS_LABELS));
    const allowedSeverities = new Set(Object.keys(SEVERITY_LABELS));
    let status = allowedStatuses.has(rawCheck?.status) ? rawCheck.status : "unclear";
    let severity = allowedSeverities.has(rawCheck?.severity) ? rawCheck.severity : "medium";
    let assessment = clean(rawCheck?.assessment, 1600);
    let risk = clean(rawCheck?.risk, 1600);
    let recommendation = clean(rawCheck?.recommendation, 1800);
    let proposedWording = clean(rawCheck?.proposed_wording || rawCheck?.proposedWording, 2400);
    let evidence = normalizeEvidence(rawCheck?.evidence, documents, status);

    if (evidence.required && !evidence.verified) {
      status = "unclear";
      severity = severity === "info" ? "medium" : severity;
      assessment = evidence.snippet
        ? "Наведений моделлю фрагмент не вдалося дослівно підтвердити у прочитаному тексті договору."
        : "Для цього висновку модель не надала дослівного фрагмента договору.";
      risk = "Висновок без підтвердженої цитати не можна використовувати як підставу для погодження або правки договору.";
      recommendation = "Знайти відповідну умову в оригіналі та повторити аналіз після перевірки якості розпізнавання.";
      proposedWording = "";
      evidence = { ...evidence, verified: false };
    }

    return {
      id: expected.id,
      title: expected.title,
      status,
      statusLabel: STATUS_LABELS[status],
      severity,
      severityLabel: SEVERITY_LABELS[severity],
      assessment: assessment || "Оцінку не сформовано.",
      risk: risk || assessment || "Ризик потребує уточнення.",
      recommendation: recommendation || "Уточнити умову за текстом договору.",
      proposedWording,
      evidence: evidence.snippet || evidence.fileName || evidence.page || evidence.clause ? evidence : null
    };
  }

  function normalizeParameter(parameter, documents) {
    const status = ["found", "missing", "unclear"].includes(parameter?.status) ? parameter.status : "unclear";
    const evidence = normalizeEvidence(parameter?.evidence, documents, status === "found" ? "acceptable" : status);
    const verified = status !== "found" || evidence.verified;
    return {
      id: clean(parameter?.id, 80),
      label: clean(parameter?.label, 180),
      value: verified ? clean(parameter?.value, 900) : "",
      status: verified ? status : "unclear",
      explanation: verified
        ? clean(parameter?.explanation, 900)
        : "Значення не підтверджене дослівною цитатою з прочитаного тексту.",
      evidence: evidence.snippet || evidence.fileName || evidence.page || evidence.clause ? evidence : null
    };
  }

  function normalizeAnalysis(payload, documents, checklist) {
    const raw = payload?.analysis || payload?.result || payload;
    if (!raw || typeof raw !== "object" || !Array.isArray(raw.checks)) {
      throw new SemanticReviewError("Сервер повернув неповний результат аналізу.", "invalid_response");
    }

    const returned = new Map();
    raw.checks.forEach((check) => {
      const id = clean(check?.id, 16);
      if (id && !returned.has(id)) returned.set(id, check);
    });
    const missingIds = checklist.filter((check) => !returned.has(check.id)).map((check) => check.id);
    if (missingIds.length) {
      throw new SemanticReviewError(
        `Сервер не оцінив усі пункти чекліста: ${missingIds.join(", ")}.`,
        "incomplete_checklist",
        { retryable: true }
      );
    }

    const checks = checklist.map((expected) => normalizeCheck(returned.get(expected.id), expected, documents));
    const issues = checks.filter((check) => ISSUE_STATUSES.has(check.status));
    const parameters = Array.isArray(raw.parameters)
      ? raw.parameters.map((parameter) => normalizeParameter(parameter, documents)).filter((parameter) => parameter.id && parameter.label)
      : [];
    const summary = {
      critical: issues.filter((issue) => issue.severity === "critical").length,
      high: issues.filter((issue) => issue.severity === "high").length,
      medium: issues.filter((issue) => issue.severity === "medium").length,
      info: issues.filter((issue) => issue.severity === "info").length,
      acceptable: checks.filter((check) => check.status === "acceptable").length,
      missing: checks.filter((check) => check.status === "missing").length,
      unclear: checks.filter((check) => check.status === "unclear").length,
      reviewed: checks.length,
      total: checklist.length,
      manual: 0,
      automated: checks.length
    };

    const isPropertyContract = Boolean(raw?.classification?.is_property_contract);
    return {
      version: clean(raw.checklist_version, 100) || "Майно - семантична перевірка",
      analysisMode: "semantic",
      blocked: !isPropertyContract,
      diagnosticTitle: !isPropertyContract ? "Документ не визначено як договір страхування майна" : "",
      diagnosticExplanation: !isPropertyContract
        ? clean(raw?.classification?.explanation, 1000) || "Для цього чекліста потрібен договір страхування майна."
        : "",
      classification: {
        isPropertyContract,
        confidence: clean(raw?.classification?.confidence, 40),
        explanation: clean(raw?.classification?.explanation, 1000)
      },
      overallAssessment: clean(raw?.overall_assessment, 2200),
      documents: documents.map((document) => ({ name: document.name })),
      sourceFiles: documents.map((document) => document.name),
      parameters,
      checks,
      issues,
      summary,
      createdAt: new Date().toISOString(),
      provider: clean(payload?.meta?.provider, 80) || "Anodos",
      model: clean(payload?.meta?.model, 100)
    };
  }

  async function parseResponse(response) {
    const contentType = response.headers?.get?.("content-type") || "";
    if (!contentType.includes("application/json")) {
      const endpointMissing = response.status === 404 || response.status === 405;
      throw new SemanticReviewError(
        endpointMissing
          ? "Сервер семантичної перевірки ще не підключено. Завантаження документа працює, але аналіз неможливий до розгортання API."
          : "Сервер повернув відповідь у невідомому форматі.",
        endpointMissing ? "endpoint_not_configured" : "invalid_response",
        { status: response.status, retryable: response.status >= 500 }
      );
    }
    const payload = await response.json();
    if (!response.ok) {
      throw new SemanticReviewError(
        clean(payload?.error?.message || payload?.message, 600) || `Помилка сервера (${response.status}).`,
        clean(payload?.error?.code || payload?.code, 80) || "server_error",
        { status: response.status, retryable: response.status === 429 || response.status >= 500 }
      );
    }
    return payload;
  }

  async function analyze(input = {}, options = {}) {
    const documents = prepareDocuments(input.documents);
    const checklist = prepareChecklist(input.checklist);
    const config = globalScope.ANODOS_CONTRACT_REVIEW_CONFIG || {};
    const endpoint = clean(options.endpoint || config.endpoint, 500);
    if (!endpoint) {
      throw new SemanticReviewError("Не налаштовано адресу сервера семантичної перевірки.", "endpoint_not_configured");
    }
    const fetchImpl = options.fetchImpl || globalScope.fetch?.bind(globalScope);
    if (!fetchImpl) {
      throw new SemanticReviewError("Браузер не підтримує захищене з'єднання із сервером перевірки.", "fetch_unavailable");
    }
    const timeoutMs = Math.max(1000, Number(options.timeoutMs || config.timeoutMs) || 180000);
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          checklist_version: input.version || "Майно v1.0",
          checklist,
          documents
        }),
        signal: controller?.signal
      });
      const payload = await parseResponse(response);
      return normalizeAnalysis(payload, documents, checklist);
    } catch (error) {
      if (error instanceof SemanticReviewError) throw error;
      if (error?.name === "AbortError") {
        throw new SemanticReviewError("Семантична перевірка триває надто довго. Спробуй ще раз.", "timeout", { retryable: true });
      }
      throw new SemanticReviewError(
        "Не вдалося з'єднатися із сервером семантичної перевірки Anodos.",
        "network_error",
        { retryable: true }
      );
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  globalScope.AnodosPropertyReviewSemantic = Object.freeze({
    analyze,
    normalizeAnalysis,
    quoteExists,
    SemanticReviewError,
    statusLabels: STATUS_LABELS,
    severityLabels: SEVERITY_LABELS
  });
})(typeof window !== "undefined" ? window : globalThis);
