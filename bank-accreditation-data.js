(function () {
  const publicSource = (url, source, note = "") => ({
    status: "public",
    date: "2026-07-31",
    url,
    source,
    note
  });

  const sources = {
    pivdennyi: {
      url: "https://bank.com.ua/insurance-partners-business",
      source: "Банк Південний · Партнери зі страхування для бізнесу"
    },
    otp: {
      url: "https://www.otpbank.com.ua/about/partners/assurance/",
      source: "OTP Bank · Перелік страхових компаній для великих корпорацій"
    },
    pumb: {
      url: "https://www.pumb.ua/service/insurance/insurance_ipoteka",
      source: "ПУМБ · Акредитовані страхові компанії для заставного майна"
    },
    exim: {
      url: "https://www.eximb.com/ua/bank/partners/insurance/insurance-ended-events/akreditovani-z-06-07-2023-strahovi-kompaniji.html",
      source: "Укрексімбанк · Акредитовані по системі Банку"
    },
    procredit: {
      url: "https://procreditbank.com.ua/strakhuvannia-i-otsinka",
      source: "ПроКредит Банк · Страхування і оцінка заставного майна"
    },
    agricole: {
      url: "https://credit-agricole.ua/o-banke/partneri/strahovi-kompaniyi",
      source: "Credit Agricole · Партнери — страхові компанії"
    },
    creditDnipro: {
      url: "https://creditdnepr.com.ua/pro-bank/partneram/strahovi-kompaniyi-partnery",
      source: "Банк Кредит Дніпро · Страхові компанії-партнери"
    },
    bankLviv: {
      url: "https://www.banklviv.com/wp-content/uploads/2021/01/Perelik-akredytovanykh-SK-13.12.2023-1.pdf",
      source: "Банк Львів · Перелік акредитованих страхових компаній від 13.12.2023"
    }
  };

  const mark = (source, note = "") => publicSource(source.url, source.source, note);

  window.AnodosBankAccreditation = {
    researchedAt: "2026-07-31",
    sourcePolicy: "official-web-only",
    insurers: [
      { id: "arx", name: "ARX" },
      { id: "ingo", name: "ІНГО" },
      { id: "uniqa", name: "УНІКА" },
      { id: "universalna", name: "Універсальна" },
      { id: "pzu", name: "PZU Україна" },
      { id: "vuso", name: "ВУСО" },
      { id: "usg", name: "Українська страхова група", shortName: "УСГ" },
      { id: "arsenal", name: "Арсенал Страхування", shortName: "Арсенал" }
    ],
    banks: [
      {
        name: "Банк Львів",
        insurers: {
          arx: mark(sources.bankLviv, "Офіційний PDF банку датований 13.12.2023; перед укладенням договору варто перевірити актуальність у банку."),
          uniqa: mark(sources.bankLviv, "Офіційний PDF банку датований 13.12.2023; перед укладенням договору варто перевірити актуальність у банку."),
          universalna: mark(sources.bankLviv, "Офіційний PDF банку датований 13.12.2023; перед укладенням договору варто перевірити актуальність у банку."),
          pzu: mark(sources.bankLviv, "Офіційний PDF банку датований 13.12.2023; перед укладенням договору варто перевірити актуальність у банку."),
          vuso: mark(sources.bankLviv, "Офіційний PDF банку датований 13.12.2023; перед укладенням договору варто перевірити актуальність у банку.")
        }
      },
      {
        name: "Кредит Дніпро",
        insurers: {
          arx: mark(sources.creditDnipro),
          ingo: mark(sources.creditDnipro),
          uniqa: mark(sources.creditDnipro),
          pzu: mark(sources.creditDnipro)
        }
      },
      {
        name: "Креді Агріколь Банк",
        aliases: ["Credit Agricole"],
        insurers: {
          arx: mark(sources.agricole),
          uniqa: mark(sources.agricole),
          universalna: mark(sources.agricole),
          pzu: mark(sources.agricole),
          usg: mark(sources.agricole),
          arsenal: mark(sources.agricole)
        }
      },
      {
        name: "ОТП Банк",
        aliases: ["OTP Bank"],
        insurers: {
          arx: mark(sources.otp),
          ingo: mark(sources.otp),
          uniqa: mark(sources.otp),
          universalna: mark(sources.otp),
          pzu: mark(sources.otp),
          vuso: mark(sources.otp),
          usg: mark(sources.otp),
          arsenal: mark(sources.otp)
        }
      },
      {
        name: "ПУМБ",
        insurers: {
          arx: mark(sources.pumb),
          ingo: mark(sources.pumb),
          pzu: mark(sources.pumb),
          vuso: mark(sources.pumb),
          arsenal: mark(sources.pumb)
        }
      },
      {
        name: "Південний",
        insurers: {
          arx: mark(sources.pivdennyi),
          ingo: mark(sources.pivdennyi),
          uniqa: mark(sources.pivdennyi),
          universalna: mark(sources.pivdennyi),
          pzu: mark(sources.pivdennyi),
          vuso: mark(sources.pivdennyi),
          usg: mark(sources.pivdennyi),
          arsenal: mark(sources.pivdennyi)
        }
      },
      {
        name: "ПроКредит Банк",
        aliases: ["ProCredit Bank"],
        insurers: {
          arx: mark(sources.procredit),
          uniqa: mark(sources.procredit),
          universalna: mark(sources.procredit),
          pzu: mark(sources.procredit),
          usg: mark(sources.procredit)
        }
      },
      {
        name: "Укрексімбанк",
        insurers: {
          arx: mark(sources.exim, "Офіційна сторінка банку містить перелік акредитованих по системі Банку з 06.07.2023."),
          uniqa: mark(sources.exim, "Офіційна сторінка банку містить перелік акредитованих по системі Банку з 06.07.2023."),
          universalna: mark(sources.exim, "Офіційна сторінка банку містить перелік акредитованих по системі Банку з 06.07.2023."),
          pzu: mark(sources.exim, "Офіційна сторінка банку містить перелік акредитованих по системі Банку з 06.07.2023."),
          vuso: mark(sources.exim, "Офіційна сторінка банку містить перелік акредитованих по системі Банку з 06.07.2023."),
          usg: mark(sources.exim, "Офіційна сторінка банку містить перелік акредитованих по системі Банку з 06.07.2023."),
          arsenal: mark(sources.exim, "Офіційна сторінка банку містить перелік акредитованих по системі Банку з 06.07.2023.")
        }
      }
    ]
  };
})();
