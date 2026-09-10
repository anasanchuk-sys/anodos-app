(() => {
  "use strict";

  function normalizeAddress(value) {
    return String(value ?? "").normalize("NFC")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/[\r\n]+/g, ", ").replace(/\s+/g, " ")
      .replace(/\s*,(?:\s*,)*\s*/g, ", ").replace(/^[,\s]+|[,\s]+$/g, "");
  }

  function parseResults(data) {
    if (!data || data.type !== "FeatureCollection" || !Array.isArray(data.features)) {
      throw new Error("Сервіс повернув некоректну відповідь. Спробуйте пізніше.");
    }
    const results = [], seen = new Set();
    for (const feature of data.features) {
      const point = feature?.geometry;
      const p = feature?.properties;
      if (point?.type !== "Point" || !Array.isArray(point.coordinates) || !p) continue;
      // GeoJSON is longitude, latitude; people copy GPS as latitude, longitude.
      const [longitude, latitude] = point.coordinates;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) continue;
      const clean = key => typeof p[key] === "string" ? p[key].trim().slice(0,500) : "";
      const houseNumber = clean("housenumber"), street = clean("street");
      const title = [street, houseNumber].filter(Boolean).join(", ") || clean("name");
      if (!title) continue;
      const name = clean("name");
      const detail = [...new Set([name !== title && name !== street ? name : "", clean("city"), clean("district"), clean("county"), clean("state"), clean("postcode"), clean("country")].filter(Boolean))].join(", ");
      const coordinates = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      const key = `${coordinates}|${title}|${detail}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({title, detail, latitude, longitude, coordinates, houseNumber, type: clean("type")});
    }
    if (data.features.length && !results.length) throw new Error("У відповіді немає придатних координат. Уточніть адресу або спробуйте пізніше.");
    return results;
  }

  function createSearch(config, {fetcher = globalThis.fetch.bind(globalThis), now = Date.now} = {}) {
    const cache = new Map(), requests = [];
    let blockedUntil = 0;
    return async (address, {signal} = {}) => {
      const query = normalizeAddress(address);
      if (query.length < 3) throw new Error("Вставте адресу з назвою міста та вулиці.");
      if (query.length > 500) throw new Error("Залиште лише адресу, до 500 символів.");
      signal?.throwIfAborted();
      const key = query.toLocaleLowerCase("uk");
      if (cache.has(key)) return cache.get(key);
      const time = now();
      if (time < blockedUntil) throw new Error("Забагато запитів. Зачекайте хвилину та спробуйте ще раз.");
      while (requests.length && time - requests[0] >= 60000) requests.shift();
      if (requests.length >= config.maxRequestsPerMinute) throw new Error("Забагато запитів. Зачекайте хвилину та спробуйте ще раз.");
      if (requests.length && time - requests[requests.length - 1] < config.minimumIntervalMs) throw new Error("Зачекайте кілька секунд перед наступним пошуком.");
      const url = new URL(config.endpoint);
      url.searchParams.set("q", query);
      url.searchParams.set("limit", String(config.limit));
      // Prefer Ukrainian with the header's fallback to local names. Do not use
      // lang=uk: that query parameter is unsupported on some Photon instances.
      requests.push(time);
      const response = await fetcher(url, {signal, cache: "no-store", credentials: "omit", referrerPolicy: "origin", headers: {Accept: "application/json", "Accept-Language": "uk"}});
      if (response.status === 429) {
        blockedUntil = now() + 60000;
        throw new Error("Сервіс тимчасово обмежив пошук. Зачекайте хвилину та спробуйте ще раз.");
      }
      if (!response.ok) throw new Error("Сервіс пошуку тимчасово недоступний. Спробуйте пізніше.");
      let data;
      try { data = await response.json(); }
      catch (error) {
        if (signal?.aborted) throw error;
        throw new Error("Сервіс повернув некоректну відповідь. Спробуйте пізніше.");
      }
      signal?.throwIfAborted();
      const result = parseResults(data).slice(0, config.limit);
      if (cache.size >= 20) cache.delete(cache.keys().next().value);
      cache.set(key, result);
      return result;
    };
  }

  function mount(document, config) {
    const $ = id => document.getElementById(id);
    const form = $("geocode-form"), address = $("address"), button = $("search");
    const status = $("status"), error = $("error"), results = $("results"), candidates = $("candidates");
    const search = createSearch(config);
    let controller = null, revision = 0;
    const node = (tag, text, className) => {
      const element = document.createElement(tag);
      if (text) element.textContent = text;
      if (className) element.className = className;
      return element;
    };
    const message = (element, value) => { element.textContent = value; element.hidden = !value; };
    const busy = value => { button.disabled = value; button.textContent = value ? "Шукаю..." : "Знайти координати"; form.setAttribute("aria-busy", String(value)); };

    function render(items) {
      candidates.replaceChildren();
      results.hidden = !items.length;
      $("results-title").textContent = items.length === 1 ? "Знайдене місце" : "Знайдені місця";
      $("results-hint").textContent = items.length === 1
        ? "Звірте населений пункт, вулицю та номер будинку зі своєю адресою."
        : "Є кілька можливих збігів. Оберіть місце, яке відповідає вашому населеному пункту, вулиці та номеру будинку.";
      items.forEach((item, index) => {
        const card = node("article", "", "candidate");
        card.append(node("span", item.houseNumber ? "Адреса з номером будинку" : "Приблизне розташування", `accuracy${item.houseNumber ? "" : " approximate"}`));
        card.append(node("h3", item.title), node("p", item.detail, "detail"));
        if (!item.houseNumber) card.append(node("p", "Номер будинку не визначено. Це точка вулиці, населеного пункту або об'єкта, а не підтверджене місце потрібного будинку.", "accuracy-note"));
        const label = node("label", "GPS: широта, довгота", "coordinates-label");
        const value = node("input", "", "coordinates");
        value.id = `coordinates-${index}`; value.type = "text"; value.readOnly = true; value.value = item.coordinates;
        label.htmlFor = value.id;
        value.addEventListener("click", () => value.select());
        const actions = node("div", "", "actions"), copy = node("button", "Скопіювати координати");
        copy.type = "button";
        const feedback = node("p", "", "copy-feedback");
        feedback.setAttribute("role", "status"); feedback.hidden = true;
        copy.addEventListener("click", async () => {
          try {
            if (!globalThis.navigator?.clipboard?.writeText) throw new Error("Clipboard unavailable");
            await globalThis.navigator.clipboard.writeText(item.coordinates);
            message(feedback, "Координати скопійовано.");
          } catch {
            value.focus(); value.select();
            message(feedback, "Координати виділено. Оберіть «Копіювати» або натисніть Ctrl+C / ⌘C.");
          }
        });
        const map = node("a", "Відкрити на карті", "map-link");
        map.href = `https://www.openstreetmap.org/?mlat=${item.latitude}&mlon=${item.longitude}#map=${item.houseNumber ? 18 : 14}/${item.latitude}/${item.longitude}`;
        map.target = "_blank"; map.rel = "noopener noreferrer";
        actions.append(copy, map); card.append(label, value, actions, feedback); candidates.append(card);
      });
    }

    address.addEventListener("input", () => {
      revision++; controller?.abort(); controller = null;
      busy(false); results.hidden = true; candidates.replaceChildren();
      message(status, ""); message(error, "");
    });

    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (controller) return;
      message(error, ""); results.hidden = true; candidates.replaceChildren();
      const query = normalizeAddress(address.value);
      if (query.length < 3 || query.length > 500) {
        message(status, ""); message(error, "Вставте адресу довжиною від 3 до 500 символів."); address.focus(); return;
      }
      if (globalThis.navigator?.onLine === false) {
        message(status, ""); message(error, "Немає інтернету. Підключіться до мережі та повторіть пошук."); return;
      }
      const current = ++revision, task = new AbortController();
      controller = task; busy(true); message(status, "Шукаю адресу на карті...");
      let timedOut = false;
      const timer = setTimeout(() => { timedOut = true; task.abort(); }, config.timeoutMs);
      try {
        const items = await search(query, {signal: task.signal});
        if (current !== revision) return;
        render(items);
        message(status, items.length ? `Пошук завершено. Знайдено місць: ${items.length}.` : "Адресу не знайдено. Перевірте написання, додайте область або країну. Спробуйте прибрати поштовий індекс чи номер квартири.");
      } catch (failure) {
        if (current !== revision) return;
        message(status, "");
        message(error, timedOut ? "Пошук триває надто довго. Спробуйте ще раз." : failure instanceof TypeError ? "Не вдалося з'єднатися із сервісом пошуку. Перевірте інтернет або спробуйте пізніше." : failure.message);
      } finally {
        clearTimeout(timer);
        if (current === revision) { controller = null; busy(false); }
      }
    });
    if (globalThis.navigator?.serviceWorker && globalThis.location?.protocol === "https:") {
      globalThis.navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
  }

  globalThis.AnodosGeocode = Object.freeze({normalizeAddress, parseResults, createSearch, mount});
  if (globalThis.document?.getElementById("geocode-form")) mount(globalThis.document, globalThis.ANODOS_GEOCODE_CONFIG);
})();
