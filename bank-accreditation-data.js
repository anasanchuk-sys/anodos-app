(function () {
  const publicSource = (url, source, note = "") => ({
    status: "public",
    date: "2026-08-03",
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
    },
    ukrgasbank: {
      url: "https://www.ukrgasbank.com/about/insur/",
      source: "Укргазбанк · Страхування заставного майна — партнери для юридичних осіб"
    },
    bankVostokIngo: {
      url: "https://ingo.ua/cms/image/uploads/Perelik_strakhovykh_poserednykiv_INGO_f5cee059a2.pdf?v=1743763832306",
      source: "ІНГО · Перелік агентів, з якими співпрацює страховик"
    }
  };

  const mark = (source, note = "") => publicSource(source.url, source.source, note);

  window.AnodosBankAccreditation = {
    researchedAt: "2026-08-03",
    sourcePolicy: "official-web-only",
    insurers: [
      { id: "arx", name: "Страхова компанія «АРКС»" },
      { id: "ingo", name: "Страхова компанія «ІНГО»" },
      { id: "uniqa", name: "Страхова компанія «УНІКА»" },
      { id: "universalna", name: "Страхова компанія «Універсальна»" },
      { id: "pzu", name: "Страхова компанія «ПЗУ Україна»" },
      { id: "vuso", name: "Страхова компанія «ВУСО»" },
      { id: "usg", name: "Українська страхова група" },
      { id: "arsenal", name: "Страхова компанія «Арсенал Страхування»" }
    ],
    banks: [
      {
        name: "Публічне акціонерне товариство «Банк Восток»",
        legalForm: "Публічне акціонерне товариство",
        brandName: "Банк Восток",
        aliases: ["Банк Восток"],
        insurers: {
          ingo: mark(sources.bankVostokIngo, "Офіційний перелік ІНГО підтверджує співпрацю з Банком Восток. Обсяг акредитації для конкретного заставного договору потрібно погодити з банком.")
        }
      },
      {
        name: "Акціонерне товариство Акціонерно-комерційний банк «Львів»",
        legalForm: "Акціонерне товариство",
        brandName: "Акціонерно-комерційний банк «Львів»",
        aliases: ["Банк Львів"],
        insurers: {
          arx: mark(sources.bankLviv, "Офіційний PDF банку датований 13.12.2023; перед укладенням договору варто перевірити актуальність у банку."),
          uniqa: mark(sources.bankLviv, "Офіційний PDF банку датований 13.12.2023; перед укладенням договору варто перевірити актуальність у банку."),
          universalna: mark(sources.bankLviv, "Офіційний PDF банку датований 13.12.2023; перед укладенням договору варто перевірити актуальність у банку."),
          pzu: mark(sources.bankLviv, "Офіційний PDF банку датований 13.12.2023; перед укладенням договору варто перевірити актуальність у банку."),
          vuso: mark(sources.bankLviv, "Офіційний PDF банку датований 13.12.2023; перед укладенням договору варто перевірити актуальність у банку.")
        }
      },
      {
        name: "Акціонерне товариство «Банк Кредит Дніпро»",
        legalForm: "Акціонерне товариство",
        brandName: "Банк Кредит Дніпро",
        aliases: ["Банк Кредит Дніпро", "Кредит Дніпро"],
        insurers: {
          arx: mark(sources.creditDnipro),
          ingo: mark(sources.creditDnipro),
          uniqa: mark(sources.creditDnipro),
          pzu: mark(sources.creditDnipro)
        }
      },
      {
        name: "Акціонерне товариство «Креді Агріколь Банк»",
        legalForm: "Акціонерне товариство",
        brandName: "Креді Агріколь Банк",
        aliases: ["Креді Агріколь Банк", "Credit Agricole"],
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
        name: "Акціонерне товариство «ОТП Банк»",
        legalForm: "Акціонерне товариство",
        brandName: "OTP Bank",
        aliases: ["ОТП Банк", "OTP Bank"],
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
        name: "Акціонерне товариство «Перший Український Міжнародний Банк»",
        legalForm: "Акціонерне товариство",
        brandName: "Перший Український Міжнародний Банк",
        aliases: ["ПУМБ"],
        insurers: {
          arx: mark(sources.pumb),
          ingo: mark(sources.pumb),
          pzu: mark(sources.pumb),
          vuso: mark(sources.pumb),
          arsenal: mark(sources.pumb)
        }
      },
      {
        name: "Публічне акціонерне товариство Акціонерний банк «Південний»",
        legalForm: "Публічне акціонерне товариство",
        brandName: "Акціонерний банк «Південний»",
        aliases: ["Південний", "Банк Південний"],
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
        name: "Акціонерне товариство «ПроКредит Банк»",
        legalForm: "Акціонерне товариство",
        brandName: "ПроКредит Банк",
        aliases: ["ПроКредит Банк", "ProCredit Bank"],
        insurers: {
          arx: mark(sources.procredit),
          uniqa: mark(sources.procredit),
          universalna: mark(sources.procredit),
          pzu: mark(sources.procredit),
          usg: mark(sources.procredit)
        }
      },
      {
        name: "Публічне акціонерне товариство Акціонерний банк «Укргазбанк»",
        legalForm: "Публічне акціонерне товариство",
        brandName: "Акціонерний банк «Укргазбанк»",
        aliases: ["Укргазбанк", "UGB", "УГБ"],
        insurers: {
          arx: mark(sources.ukrgasbank),
          ingo: mark(sources.ukrgasbank),
          uniqa: mark(sources.ukrgasbank),
          universalna: mark(sources.ukrgasbank),
          vuso: mark(sources.ukrgasbank),
          usg: mark(sources.ukrgasbank),
          arsenal: mark(sources.ukrgasbank)
        }
      },
      {
        name: "Акціонерне товариство «Державний експортно-імпортний банк України»",
        legalForm: "Акціонерне товариство",
        brandName: "Державний експортно-імпортний банк України",
        aliases: ["Укрексімбанк"],
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
