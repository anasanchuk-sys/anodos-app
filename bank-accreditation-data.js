// Property collateral only. Sources and scope are kept per bank/insurer pair.
// Bank universe: licensed operating banks from the NBU register, not a list of accreditations.
(function () {
  "use strict";
  const registry = [
    {
      "id": "300119",
      "name": "АКЦІОНЕРНЕ ТОВАРИСТВО \"БАНК АЛЬЯНС\"",
      "website": "https://alb.ua",
      "aliases": [
        "АТ \"БАНК АЛЬЯНС\"",
        "JSC \"BANK ALLIANCE\""
      ],
      "brandName": "Банк Альянс",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "300335",
      "name": "Акціонерне товариство \"Райффайзен Банк\"",
      "website": "https://raiffeisen.ua",
      "aliases": [
        "АТ \"Райффайзен Банк\"",
        "Raiffeisen Bank JSC"
      ],
      "brandName": "Райффайзен Банк",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "300346",
      "name": "акціонерне товариство \"Сенс Банк\"",
      "website": "https://sensebank.ua",
      "aliases": [
        "АТ \"Сенс Банк\"",
        "JSC \"Sense Bank\"",
        "Sense Bank",
        "Альфа-Банк"
      ],
      "brandName": "Сенс Банк",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "300465",
      "name": "акціонерне товариство \"Державний ощадний банк України\"",
      "website": "https://www.oschadbank.ua",
      "aliases": [
        "АТ \"Ощадбанк\"",
        "JSC \"Oschadbank\"",
        "Ощадбанк"
      ],
      "brandName": "Державний ощадний банк України",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "300506",
      "name": "АКЦІОНЕРНЕ ТОВАРИСТВО \"ПЕРШИЙ ІНВЕСТИЦІЙНИЙ БАНК\"",
      "website": "https://www.pinbank.ua",
      "aliases": [
        "АТ \"ПЕРШИЙ ІНВЕСТИЦІЙНИЙ БАНК\"",
        "JSC \"FIRST INVESTMENT BANK\""
      ],
      "brandName": "Перший інвестиційний банк",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "300528",
      "name": "АКЦІОНЕРНЕ ТОВАРИСТВО \"ОТП БАНК\"",
      "website": "https://www.otpbank.com.ua",
      "aliases": [
        "АТ \"ОТП БАНК\"",
        "OTP BANK JSC",
        "OTP Bank"
      ],
      "brandName": "ОТП Банк",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "300539",
      "name": "Акціонерне товариство \"ІНГ Банк Україна\"",
      "website": "https://www.ingwb.com/ua/merezha/emea/ukrayina/",
      "aliases": [
        "АТ \"ІНГ Банк Україна\"",
        "JSC \"ING Bank Ukraine\""
      ],
      "brandName": "ІНГ Банк Україна",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "300584",
      "name": "АКЦІОНЕРНЕ ТОВАРИСТВО \"СІТІБАНК\"",
      "website": "https://www.citibank.com/icg/sa/emea/ukraine/",
      "aliases": [
        "АТ \"СІТІБАНК\"",
        "JSC \"CITIBANK\""
      ],
      "brandName": "Сітібанк",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "300614",
      "name": "АКЦІОНЕРНЕ ТОВАРИСТВО \"КРЕДІ АГРІКОЛЬ БАНК\"",
      "website": "https://credit-agricole.ua",
      "aliases": [
        "АТ \"КРЕДІ АГРІКОЛЬ БАНК\"",
        "JSC \"CREDIT AGRICOLE BANK\""
      ],
      "brandName": "Креді Агріколь Банк",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "300647",
      "name": "АКЦІОНЕРНЕ ТОВАРИСТВО \"БАНК КД\"",
      "website": "https://clhs.com.ua",
      "aliases": [
        "АТ \"БАНК КД\"",
        "JSC \"BANK KD\"",
        "Кліринговий Дім"
      ],
      "brandName": "Банк КД",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "300658",
      "name": "АКЦІОНЕРНЕ ТОВАРИСТВО \"ПІРЕУС БАНК МКБ\"",
      "website": "https://piraeusbank.ua",
      "aliases": [
        "АТ \"ПІРЕУС БАНК МКБ\"",
        "JSC \"PIRAEUS BANK ICB\""
      ],
      "brandName": "Піреус Банк МКБ",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "305299",
      "name": "акціонерне товариство комерційний банк \"ПриватБанк\"",
      "website": "https://privatbank.ua",
      "aliases": [
        "АТ КБ \"ПриватБанк\"",
        "JSC CB \"PrivatBank\""
      ],
      "brandName": "Комерційний банк «ПриватБанк»",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "305749",
      "name": "АКЦІОНЕРНЕ ТОВАРИСТВО \"БАНК КРЕДИТ ДНІПРО\"",
      "website": "https://creditdnepr.com.ua",
      "aliases": [
        "АТ \"БАНК КРЕДИТ ДНІПРО\"",
        "JSC \"BANK CREDIT DNIPRO\""
      ],
      "brandName": "Банк Кредит Дніпро",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "306500",
      "name": "АКЦІОНЕРНЕ ТОВАРИСТВО \"АКЦІОНЕРНИЙ БАНК \"РАДАБАНК\"",
      "website": "https://www.radabank.com.ua",
      "aliases": [
        "АТ \"АБ \"РАДАБАНК\"",
        "JOINT STOCK BANK \"RADABANK\""
      ],
      "brandName": "Акціонерний банк «Радабанк»",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "307123",
      "name": "АКЦІОНЕРНЕ ТОВАРИСТВО \"ВСТ БАНК\"",
      "website": "https://vstbank.ua",
      "aliases": [
        "АТ \"ВСТ БАНК\"",
        "JSC \"VST BANK\"",
        "Банк Восток",
        "Восток",
        "VST"
      ],
      "brandName": "ВСТ Банк",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "307770",
      "name": "АКЦІОНЕРНЕ ТОВАРИСТВО \"АКЦЕНТ - БАНК\"",
      "website": "https://a-bank.com.ua",
      "aliases": [
        "АТ \"А - БАНК\"",
        "JSC \"A - BANK\"",
        "А-Банк",
        "A-Bank"
      ],
      "brandName": "Акцент - Банк",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "313582",
      "name": "Акціонерне товариство \"МетаБанк\"",
      "website": "https://www.mbank.com.ua",
      "aliases": [
        "АТ \"МетаБанк\"",
        "\"MetaBank\""
      ],
      "brandName": "МетаБанк",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "313849",
      "name": "ПУБЛІЧНЕ АКЦІОНЕРНЕ ТОВАРИСТВО АКЦІОНЕРНИЙ  КОМЕРЦІЙНИЙ БАНК \"ІНДУСТРІАЛБАНК\"",
      "website": "https://industrialbank.ua",
      "aliases": [
        "АКБ \"ІНДУСТРІАЛБАНК\"",
        "JSCB \"INDUSTRIALBANK\""
      ],
      "brandName": "Акціонерний комерційний банк «Індустріалбанк»",
      "legalForm": "Публічне акціонерне товариство"
    },
    {
      "id": "320371",
      "name": "АКЦІОНЕРНЕ ТОВАРИСТВО \"БАНК \"УКРАЇНСЬКИЙ КАПІТАЛ\"",
      "website": "https://ukrcapital.com.ua",
      "aliases": [
        "АТ \"БАНК \"УКРАЇНСЬКИЙ КАПІТАЛ\"",
        "JSC \"BANK \"UKRAINIAN CAPITAL\""
      ],
      "brandName": "Банк «Український капітал»",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "320478",
      "name": "ПУБЛІЧНЕ АКЦІОНЕРНЕ ТОВАРИСТВО АКЦІОНЕРНИЙ БАНК \"УКРГАЗБАНК\"",
      "website": "https://www.ukrgasbank.com",
      "aliases": [
        "АБ \"УКРГАЗБАНК\"",
        "JSB \"UKRGASBANK\""
      ],
      "brandName": "Акціонерний банк «Укргазбанк»",
      "legalForm": "Публічне акціонерне товариство"
    },
    {
      "id": "320940",
      "name": "Акціонерне товариство \"АЛЬТБАНК\"",
      "website": "https://altbank.ua",
      "aliases": [
        "АТ \"АЛЬТБАНК\"",
        "JSC \"ALTBANK\""
      ],
      "brandName": "Альтбанк",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "320984",
      "name": "АКЦІОНЕРНЕ ТОВАРИСТВО \"ПРОКРЕДИТ БАНК\"",
      "website": "https://www.procreditbank.com.ua",
      "aliases": [
        "АТ \"ПРОКРЕДИТ БАНК\"",
        "JSC \"PROCREDIT BANK\""
      ],
      "brandName": "ПроКредит Банк",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "321723",
      "name": "АКЦІОНЕРНЕ ТОВАРИСТВО \"БТА БАНК\"",
      "website": "http://btabank.ua",
      "aliases": [
        "АТ \"БТА БАНК\"",
        "PJSC \"BTA BANK\""
      ],
      "brandName": "БТА Банк",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "322001",
      "name": "АКЦІОНЕРНЕ ТОВАРИСТВО \"УНІВЕРСАЛ БАНК\"",
      "website": "https://www.universalbank.com.ua",
      "aliases": [
        "АТ \"УНІВЕРСАЛ БАНК\"",
        "JSC \"UNIVERSAL BANK\"",
        "monobank",
        "Монобанк"
      ],
      "brandName": "Універсал Банк",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "322313",
      "name": "акціонерне товариство \"Державний експортно-імпортний банк України\"",
      "website": "https://www.eximb.com",
      "aliases": [
        "АТ \"Укрексімбанк\"",
        "JSC \"Ukreximbank\"",
        "Укрексімбанк"
      ],
      "brandName": "Державний експортно-імпортний банк України",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "322539",
      "name": "АКЦІОНЕРНЕ ТОВАРИСТВО \"ЮНЕКС БАНК\"",
      "website": "https://unexbank.ua",
      "aliases": [
        "АТ \"ЮНЕКС БАНК\"",
        "JSC \"UNEX BANK\""
      ],
      "brandName": "Юнекс Банк",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "322540",
      "name": "АКЦІОНЕРНЕ ТОВАРИСТВО \"КОМІНБАНК\"",
      "website": "https://cib.com.ua",
      "aliases": [
        "АТ \"КОМІНБАНК\"",
        "JSC \"COMINBANK\""
      ],
      "brandName": "Комінбанк",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "325268",
      "name": "Акціонерне товариство Акціонерно-комерційний банк \"Львів\"",
      "website": "http://www.banklviv.ua",
      "aliases": [
        "АТ АКБ \"Львів\"",
        "JSCB \"Lviv\""
      ],
      "brandName": "Акціонерно-комерційний банк «Львів»",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "325365",
      "name": "АКЦІОНЕРНЕ ТОВАРИСТВО \"КРЕДОБАНК\"",
      "website": "https://kredobank.com.ua",
      "aliases": [
        "АТ \"КРЕДОБАНК\"",
        "JSC \"KREDOBANK\""
      ],
      "brandName": "Кредобанк",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "325990",
      "name": "Акціонерне товариство \"ОКСІ БАНК\"",
      "website": "https://oxibank.ua",
      "aliases": [
        "АТ \"ОКСІ БАНК\"",
        "OKCI BANK, JSC"
      ],
      "brandName": "Оксі Банк",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "328168",
      "name": "ПУБЛІЧНЕ АКЦІОНЕРНЕ ТОВАРИСТВО \"МТБ БАНК\"",
      "website": "https://www.mtb.ua",
      "aliases": [
        "ПАТ \"МТБ БАНК\"",
        "PJSC \"MTB BANK\""
      ],
      "brandName": "МТБ Банк",
      "legalForm": "Публічне акціонерне товариство"
    },
    {
      "id": "328209",
      "name": "ПУБЛІЧНЕ АКЦІОНЕРНЕ ТОВАРИСТВО АКЦІОНЕРНИЙ БАНК \"ПІВДЕННИЙ\"",
      "website": "https://bank.com.ua",
      "aliases": [
        "Акціонерний банк \"Південний\"",
        "Pivdennyi Bank"
      ],
      "brandName": "Акціонерний банк «Південний»",
      "legalForm": "Публічне акціонерне товариство"
    },
    {
      "id": "331489",
      "name": "Акціонерне товариство \"Полтава-банк\"",
      "website": "https://poltavabank.com",
      "aliases": [
        "АТ \"Полтава-банк\"",
        "JSC \"Poltava-bank\""
      ],
      "brandName": "Полтава-банк",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "334840",
      "name": "ПРИВАТНЕ АКЦІОНЕРНЕ ТОВАРИСТВО \"БАНК ФАМІЛЬНИЙ\"",
      "website": "https://fbank.com.ua",
      "aliases": [
        "ПрАТ \"БАНК ФАМІЛЬНИЙ\"",
        "PJSC BANK FAMILNY"
      ],
      "brandName": "Банк Фамільний",
      "legalForm": "Приватне акціонерне товариство"
    },
    {
      "id": "334851",
      "name": "АКЦІОНЕРНЕ ТОВАРИСТВО \"ПЕРШИЙ УКРАЇНСЬКИЙ МІЖНАРОДНИЙ БАНК\"",
      "website": "https://www.pumb.ua",
      "aliases": [
        "АТ \"ПУМБ\"",
        "JSC \"FUIB\"",
        "ПУМБ",
        "PUMB"
      ],
      "brandName": "Перший український міжнародний банк",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "336310",
      "name": "Акціонерне товариство \"Ідея Банк\"",
      "website": "https://ideabank.ua/uk",
      "aliases": [
        "АТ \"Ідея Банк\"",
        "JSC \"Idea Bank\""
      ],
      "brandName": "Ідея Банк",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "339050",
      "name": "АКЦІОНЕРНЕ ТОВАРИСТВО \"КРИСТАЛБАНК\"",
      "website": "https://crystalbank.com.ua",
      "aliases": [
        "АТ \"КРИСТАЛБАНК\"",
        "JSC \"CRYSTALBANK\""
      ],
      "brandName": "Кристалбанк",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "339500",
      "name": "АКЦІОНЕРНЕ ТОВАРИСТВО \"ТАСКОМБАНК\"",
      "website": "https://tascombank.ua",
      "aliases": [
        "АТ \"ТАСКОМБАНК\"",
        "TASCOMBANK JSC"
      ],
      "brandName": "Таскомбанк",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "351005",
      "name": "АКЦІОНЕРНЕ ТОВАРИСТВО \"УКРСИББАНК\"",
      "website": "https://ukrsibbank.com",
      "aliases": [
        "АТ \"УКРСИББАНК\"",
        "JSС \"UKRSIBBANK\""
      ],
      "brandName": "Укрсиббанк",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "351254",
      "name": "АКЦІОНЕРНЕ ТОВАРИСТВО \"СКАЙ БАНК\"",
      "website": "https://www.sky.bank/uk",
      "aliases": [
        "АТ \"СКАЙ БАНК\"",
        "JSC \"SKY BANK\""
      ],
      "brandName": "Скай Банк",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "351607",
      "name": "АКЦІОНЕРНЕ ТОВАРИСТВО \"СХІДНО-УКРАЇНСЬКИЙ БАНК \"ГРАНТ\"",
      "website": "https://www.grant.ua",
      "aliases": [
        "АТ \"БАНК \"ГРАНТ\"",
        "JSC \"BANK \"GRANT\""
      ],
      "brandName": "Східно-український банк «Грант»",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "353100",
      "name": "Акціонерне товариство \"Полікомбанк\"",
      "website": "https://www.policombank.com",
      "aliases": [
        "Полікомбанк",
        "Policombank"
      ],
      "brandName": "Полікомбанк",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "353489",
      "name": "АКЦІОНЕРНЕ ТОВАРИСТВО \"АСВІО БАНК\"",
      "website": "https://www.asviobank.ua/ua",
      "aliases": [
        "АТ \"АСВІО БАНК\"",
        "JSC \"ASVIO BANK\""
      ],
      "brandName": "Асвіо Банк",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "370140",
      "name": "ПРИВАТНЕ АКЦІОНЕРНЕ ТОВАРИСТВО  “ПЕРЕХІДНИЙ БАНК “ЮТЕ БАНК”",
      "website": null,
      "aliases": [
        "ПрАТ “ПЕРЕХІДНИЙ БАНК “ЮТЕ БАНК”",
        "PRIVATE JOINT STOCK COMPANY “BRIDGE BANK “IUTE BANK”",
        "Iute Bank"
      ],
      "brandName": "Перехідний банк «Юте Банк»",
      "legalForm": "Приватне акціонерне товариство"
    },
    {
      "id": "377090",
      "name": "АКЦІОНЕРНЕ ТОВАРИСТВО \"ЄВРОПЕЙСЬКИЙ ПРОМИСЛОВИЙ БАНК\"",
      "website": "https://europrombank.ua",
      "aliases": [
        "АТ \"ЄПБ\"",
        "JSC \"EIB\""
      ],
      "brandName": "Європейський промисловий банк",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "380106",
      "name": "АКЦІОНЕРНЕ ТОВАРИСТВО \"БАНК ТРАСТ-КАПІТАЛ\"",
      "website": "https://tc-bank.com",
      "aliases": [
        "АТ \"БАНК ТРАСТ-КАПІТАЛ\"",
        "JSC \"BANK TRUST-CAPITAL\""
      ],
      "brandName": "Банк Траст-Капітал",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "380281",
      "name": "АКЦІОНЕРНЕ ТОВАРИСТВО \"БАНК ІНВЕСТИЦІЙ ТА ЗАОЩАДЖЕНЬ\"",
      "website": "https://www.bisbank.com.ua",
      "aliases": [
        "АТ \"БІЗБАНК\"",
        "JSC \"BISBANK\"",
        "БІЗБАНК"
      ],
      "brandName": "Банк інвестицій та заощаджень",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "380366",
      "name": "АКЦІОНЕРНЕ ТОВАРИСТВО \"НЕКСЕНТ БАНК\"",
      "website": "https://www.nexentbank.com.ua/",
      "aliases": [
        "АТ \"НЕКСЕНТ БАНК\"",
        "JSC \"NEXENT BANK\"",
        "Кредит Європа Банк"
      ],
      "brandName": "Нексент Банк",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "380441",
      "name": "АКЦІОНЕРНЕ ТОВАРИСТВО \"ВЕСТ ФАЙНЕНС ЕНД КРЕДИТ БАНК\"",
      "website": "https://www.creditwest.ua/uk",
      "aliases": [
        "АТ \"КРЕДИТВЕСТ БАНК\"",
        "JSC \"CREDITWEST BANK\"",
        "Кредитвест Банк",
        "Creditwest"
      ],
      "brandName": "Вест Файненс енд Кредит Банк",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "380526",
      "name": "АКЦІОНЕРНЕ ТОВАРИСТВО \"КОМЕРЦІЙНИЙ БАНК \"ГЛОБУС\"",
      "website": "https://globusbank.com.ua",
      "aliases": [
        "АТ \"КБ \"ГЛОБУС\"",
        "JSC \"CB \"GLOBUS\""
      ],
      "brandName": "Комерційний банк «Глобус»",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "380548",
      "name": "АКЦІОНЕРНЕ ТОВАРИСТВО \"АГРОПРОСПЕРІС БАНК\"",
      "website": "https://ap-bank.com",
      "aliases": [
        "АТ \"АГРОПРОСПЕРІС БАНК\"",
        "JSC \"AP BANK\"",
        "AP Bank"
      ],
      "brandName": "Агропросперіс Банк",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "380582",
      "name": "АКЦІОНЕРНЕ ТОВАРИСТВО \"МІЖНАРОДНИЙ ІНВЕСТИЦІЙНИЙ БАНК\"",
      "website": "https://ii-bank.com.ua",
      "aliases": [
        "АТ \"МІБ\"",
        "JSC MIB"
      ],
      "brandName": "Міжнародний інвестиційний банк",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "380634",
      "name": "ПУБЛІЧНЕ АКЦІОНЕРНЕ ТОВАРИСТВО \"КОМЕРЦІЙНИЙ БАНК \"АКОРДБАНК\"",
      "website": "https://accordbank.com.ua",
      "aliases": [
        "ПуАТ \"КБ \"АКОРДБАНК\"",
        "\"CB \"ACCORDBANK\" PuJSC"
      ],
      "brandName": "Комерційний банк «Акордбанк»",
      "legalForm": "Публічне акціонерне товариство"
    },
    {
      "id": "380645",
      "name": "АКЦІОНЕРНЕ ТОВАРИСТВО \"БАНК 3/4\"",
      "website": "https://bank34.ua",
      "aliases": [
        "АТ \"БАНК 3/4\"",
        "JSC \"BANK 3/4\""
      ],
      "brandName": "Банк 3/4",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "380731",
      "name": "Акціонерне товариство \"Дойче Банк ДБУ\"",
      "website": "https://country.db.com/ukraine",
      "aliases": [
        "АТ \"Дойче Банк ДБУ\"",
        "JSC Deutsche Bank DBU"
      ],
      "brandName": "Дойче Банк ДБУ",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "380797",
      "name": "АКЦІОНЕРНЕ ТОВАРИСТВО \"СЕБ КОРПОРАТИВНИЙ БАНК\"",
      "website": "https://sebgroup.com/about-us/our-locations/international-offices/seb-in-ukraine",
      "aliases": [
        "АТ \"СЕБ КОРПОРАТИВНИЙ БАНК\"",
        "JSC \"SEB CORPORATE BANK\" або S | E | B"
      ],
      "brandName": "СЕБ Корпоративний Банк",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "380838",
      "name": "Акціонерне товариство \"ПРАВЕКС БАНК\"",
      "website": "https://www.pravex.com.ua",
      "aliases": [
        "АТ \"ПРАВЕКС БАНК\"",
        "\"PRAVEX BANK\" JSC"
      ],
      "brandName": "Правекс Банк",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "380883",
      "name": "Акціонерне товариство \"Український банк реконструкції та розвитку\"",
      "website": "https://www.ubrr.com.ua",
      "aliases": [
        "АТ \"УБРР\"",
        "JSC \"UBRD\""
      ],
      "brandName": "Український банк реконструкції та розвитку",
      "legalForm": "Акціонерне товариство"
    },
    {
      "id": "380946",
      "name": "АКЦІОНЕРНЕ ТОВАРИСТВО \"БАНК АВАНГАРД\"",
      "website": "https://avgd.ua",
      "aliases": [
        "АТ \"БАНК АВАНГАРД\"",
        "JSC \"BANK AVANGARD\""
      ],
      "brandName": "Банк Авангард",
      "legalForm": "Акціонерне товариство"
    }
  ];
  const insurers = [
    {
      "id": "arx",
      "name": "Страхова компанія «АРКС»",
      "aliases": [
        "ARX",
        "AXA"
      ]
    },
    {
      "id": "ingo",
      "name": "Страхова компанія «ІНГО»",
      "aliases": [
        "INGO"
      ]
    },
    {
      "id": "uniqa",
      "name": "Страхова компанія «УНІКА»",
      "aliases": [
        "UNIQA"
      ]
    },
    {
      "id": "universalna",
      "name": "Страхова компанія «Універсальна»",
      "aliases": [
        "Universalna"
      ]
    },
    {
      "id": "pzu",
      "name": "Страхова компанія «ПЗУ Україна»",
      "aliases": [
        "PZU"
      ]
    },
    {
      "id": "vuso",
      "name": "Страхова компанія «ВУСО»",
      "aliases": [
        "VUSO"
      ]
    },
    {
      "id": "usg",
      "name": "Страхова компанія «Українська страхова група»",
      "aliases": [
        "УСГ",
        "USG"
      ]
    },
    {
      "id": "arsenal",
      "name": "Страхова компанія «Арсенал Страхування»",
      "aliases": [
        "Arsenal"
      ]
    },
    {
      "id": "bbs",
      "name": "Страхова компанія «ББС Іншуранс»",
      "aliases": [
        "BBS",
        "Брокбізнес"
      ]
    },
    {
      "id": "guardian",
      "name": "Страхова компанія «Гардіан»",
      "aliases": [
        "Guardian"
      ]
    },
    {
      "id": "grawe",
      "name": "Страхова компанія «Граве Україна»",
      "aliases": [
        "GRAWE"
      ]
    },
    {
      "id": "europealliance",
      "name": "Європейський страховий альянс",
      "aliases": [
        "ЄСА"
      ]
    },
    {
      "id": "euroins",
      "name": "Страхова компанія «Євроінс Україна»",
      "aliases": [
        "Euroins"
      ]
    },
    {
      "id": "express",
      "name": "Експрес Страхування",
      "aliases": [
        "Express"
      ]
    },
    {
      "id": "interpolis",
      "name": "Страхова компанія «Інтер-Поліс»",
      "aliases": [
        "Інтер Поліс"
      ]
    },
    {
      "id": "kniazha",
      "name": "Українська страхова компанія «Княжа Вієнна Іншуранс Груп»",
      "aliases": [
        "Княжа",
        "Kniazha"
      ]
    },
    {
      "id": "colonnade",
      "name": "Страхова компанія «Колоннейд Україна»",
      "aliases": [
        "Colonnade"
      ]
    },
    {
      "id": "krayina",
      "name": "Страхова компанія «Країна»",
      "aliases": [
        "Krayina"
      ]
    },
    {
      "id": "misto",
      "name": "Страхова компанія «Місто»",
      "aliases": [
        "Misto"
      ]
    },
    {
      "id": "oranta",
      "name": "Національна акціонерна страхова компанія «Оранта»",
      "aliases": [
        "Oranta",
        "НАСК"
      ]
    },
    {
      "id": "persha",
      "name": "Страхова компанія «Перша»",
      "aliases": [
        "Persha"
      ]
    },
    {
      "id": "respect",
      "name": "Страхова компанія «Респект»",
      "aliases": [
        "Respect"
      ]
    },
    {
      "id": "skarbnytsia",
      "name": "Акціонерна страхова компанія «Скарбниця»",
      "aliases": [
        "Skarbnytsia"
      ]
    },
    {
      "id": "tas",
      "name": "Страхова група «ТАС»",
      "aliases": [
        "TAS",
        "СГ ТАС"
      ]
    },
    {
      "id": "upsk",
      "name": "Українська пожежно-страхова компанія",
      "aliases": [
        "УПСК",
        "UPSK"
      ]
    }
  ];
  const evidenceGroups = [
    {
      "bankId": "300335",
      "ids": [
        "arx",
        "uniqa",
        "universalna"
      ],
      "url": "https://raiffeisen.ua/privatnim-osobam/strahuvannya/strakhuvannia-zastavnoho-maina-ta-pozychalnykiv",
      "source": "Райффайзен Банк - страховики, які відповідають вимогам банку",
      "coverage": "Нерухоме заставне майно",
      "note": "",
      "status": "public"
    },
    {
      "bankId": "300346",
      "ids": [
        "arx",
        "arsenal",
        "tas",
        "universalna",
        "upsk"
      ],
      "url": "https://sensebank.ua/strahuvanna-neruhomogo-zastavnogo-majna",
      "source": "Сенс Банк - страхування нерухомого заставного майна",
      "coverage": "Нерухоме заставне майно",
      "note": "",
      "status": "public"
    },
    {
      "bankId": "300465",
      "ids": [
        "arx",
        "arsenal",
        "pzu",
        "upsk",
        "usg",
        "uniqa",
        "universalna",
        "guardian",
        "vuso",
        "kniazha",
        "tas",
        "ingo",
        "colonnade",
        "oranta"
      ],
      "url": "https://www.oschadbank.ua/uploads/6/33055-perelik_akreditovanih_strahovih_kompanij.xlsx",
      "source": "Ощадбанк - офіційний перелік акредитованих страхових компаній",
      "coverage": "Майно",
      "note": "Розділ компаній зі страхування майна та відповідальності. Допуск конкретного об'єкта та умови відповідної кредитної програми погоджує банк.",
      "status": "public"
    },
    {
      "bankId": "300528",
      "ids": [
        "pzu",
        "upsk",
        "arx",
        "arsenal",
        "ingo",
        "universalna",
        "tas",
        "usg",
        "colonnade",
        "grawe",
        "vuso",
        "bbs",
        "uniqa"
      ],
      "url": "https://www.otpbank.com.ua/big-corporate/bancassurance/",
      "source": "ОТП Банк - страхування заставного майна корпоративних клієнтів",
      "coverage": "Нерухомість та інше заставне майно",
      "note": "",
      "status": "public"
    },
    {
      "bankId": "300614",
      "ids": [
        "arx",
        "pzu",
        "kniazha",
        "universalna",
        "usg",
        "uniqa",
        "arsenal"
      ],
      "url": "https://credit-agricole.ua/o-banke/partneri/strahovi-kompaniyi",
      "source": "Креді Агріколь Банк - страхові партнери та майнові продукти",
      "coverage": "Майно та іпотека",
      "note": "",
      "status": "public"
    },
    {
      "bankId": "305299",
      "ids": [
        "tas",
        "arx",
        "kniazha",
        "usg",
        "vuso",
        "universalna",
        "uniqa",
        "arsenal",
        "ingo"
      ],
      "url": "https://static.privatbank.ua/files/insurance-accreditation-corporate-short.pdf",
      "source": "ПриватБанк - акредитація для страхування застав корпоративних клієнтів",
      "coverage": "Заставне майно корпоративних клієнтів",
      "note": "",
      "status": "public"
    },
    {
      "bankId": "305749",
      "ids": [
        "arx",
        "kniazha",
        "ingo",
        "uniqa",
        "pzu",
        "oranta",
        "vuso"
      ],
      "url": "https://creditdnepr.com.ua/pryvatnym-osobam/strahuvannya/strahuvannya-neruhomogo-mayna-v-ipoteku-zastavu",
      "source": "Банк Кредит Дніпро - майно в іпотеці/заставі",
      "coverage": "Нерухоме заставне майно",
      "note": "Для АРКС, Княжої, ІНГО та ПЗУ на цій сторінці також наведені продукти для іншого майна.",
      "status": "public"
    },
    {
      "bankId": "320371",
      "ids": [
        "arsenal",
        "interpolis",
        "bbs"
      ],
      "url": "https://www.ukrcapital.com.ua/uk/akredytovani-partnery.html",
      "source": "Банк Український капітал - акредитовані страхові партнери",
      "coverage": "Майно в межах кредитної програми",
      "note": "Конкретну програму та об'єкт погоджує банк.",
      "status": "public"
    },
    {
      "bankId": "320478",
      "ids": [
        "arsenal",
        "arx",
        "vuso",
        "tas",
        "universalna",
        "upsk",
        "kniazha",
        "uniqa",
        "usg",
        "ingo",
        "bbs",
        "guardian"
      ],
      "url": "https://www.ukrgasbank.com/about/insur/",
      "source": "Укргазбанк - розділи «Майно» та «Майно, що є предметом іпотеки»",
      "coverage": "Майно юридичних осіб та іпотечне майно фізичних осіб",
      "note": "",
      "status": "public"
    },
    {
      "bankId": "320478",
      "ids": [
        "express"
      ],
      "url": "https://www.ukrgasbank.com/about/insur/",
      "source": "Укргазбанк - майнові продукти для юридичних осіб",
      "coverage": "Майно юридичних осіб та ФОП",
      "note": "Підтверджено в майновому переліку для бізнесу; не поширювати на іпотечні програми фізичних осіб.",
      "status": "limited"
    },
    {
      "bankId": "320478",
      "ids": [
        "misto"
      ],
      "url": "https://www.ukrgasbank.com/about/insur/",
      "source": "Укргазбанк - майно, що є предметом іпотеки",
      "coverage": "Іпотечне майно фізичних осіб",
      "note": "Підтверджено лише в переліку для фізичних осіб.",
      "status": "limited"
    },
    {
      "bankId": "320984",
      "ids": [
        "universalna",
        "usg",
        "pzu",
        "arx",
        "uniqa"
      ],
      "url": "https://procreditbank.com.ua/api/media/file/strakhovi-kompanii-1.pdf",
      "source": "ПроКредит Банк - рекомендовані страхові компанії",
      "coverage": "Заставне майно",
      "note": "Офіційний рекомендований перелік банку. Страхування об'єкта та умови договору погоджуються з банком.",
      "status": "public"
    },
    {
      "bankId": "322313",
      "ids": [
        "arx",
        "vuso",
        "pzu",
        "universalna",
        "uniqa",
        "usg",
        "kniazha",
        "tas"
      ],
      "url": "https://www.eximb.com/ua/bank/partners/insurance/",
      "source": "Укрексімбанк - акредитовані по системі банку страховики",
      "coverage": "Майно та іпотека",
      "note": "",
      "status": "public"
    },
    {
      "bankId": "322313",
      "ids": [
        "arsenal"
      ],
      "url": "https://www.eximb.com/ua/bank/partners/insurance/",
      "source": "Укрексімбанк - спеціальні умови співпраці",
      "coverage": "Продовження страхування чинних застав",
      "note": "Лише переукладення чинних договорів страхування заставного майна. Не підтверджує допуск до страхування нових застав.",
      "status": "limited"
    },
    {
      "bankId": "322539",
      "ids": [
        "arx",
        "vuso",
        "pzu",
        "arsenal"
      ],
      "url": "https://unexbank.ua/biznesu/strahovi-kompanii-partnery",
      "source": "Юнекс Банк - акредитовані страхові компанії",
      "coverage": "Рухоме та нерухоме заставне майно",
      "note": "",
      "status": "public"
    },
    {
      "bankId": "322540",
      "ids": [
        "vuso",
        "arsenal",
        "persha",
        "bbs",
        "upsk",
        "guardian",
        "usg",
        "universalna",
        "arx"
      ],
      "url": "https://cib.com.ua/uk/about/partneri/strahovi-kompaniji",
      "source": "Комінбанк - акредитовані страховики та їхні продукти",
      "coverage": "Майно та/або іпотека",
      "note": "Включено лише страховиків, для яких у таблиці банку прямо наведено майновий продукт.",
      "status": "public"
    },
    {
      "bankId": "325268",
      "ids": [
        "pzu",
        "persha",
        "upsk",
        "uniqa",
        "vuso",
        "skarbnytsia",
        "universalna",
        "euroins",
        "kniazha",
        "guardian"
      ],
      "url": "https://admin.banklviv.ua/sites/default/files/2026-04/%D0%9F%D0%B5%D1%80%D0%B5%D0%BB%D1%96%D0%BA%20%D0%B0%D0%BA%D1%80%D0%B5%D0%B4%D0%B8%D1%82%D0%BE%D0%B2%D0%B0%D0%BD%D0%B8%D1%85%20%D1%81%D1%82%D1%80%D0%B0%D1%85%D0%BE%D0%B2%D0%B8%D1%85%20%D0%BA%D0%BE%D0%BC%D0%BF%D0%B0%D0%BD%D1%96%D0%B9.pdf",
      "source": "Банк Львів - чинний перелік акредитованих страхових компаній",
      "coverage": "Майно за класами 8 та 9",
      "note": "Для кожного з цих страховиків банк зазначає майнові класи 8 та 9. Об'єкт і кредитну програму слід погодити окремо.",
      "status": "public"
    },
    {
      "bankId": "325365",
      "ids": [
        "pzu",
        "uniqa",
        "arx",
        "vuso",
        "arsenal",
        "usg",
        "skarbnytsia",
        "bbs",
        "kniazha",
        "universalna",
        "upsk",
        "tas"
      ],
      "url": "https://kredobank.com.ua/info/strakhovi-kompaniyi/dlya-yurydychnykh-osib-ta-fop",
      "source": "Кредобанк - акредитація для юридичних осіб та ФОП",
      "coverage": "Рухоме майно та нерухомість",
      "note": "Підтверджено в окремих майнових колонках банку.",
      "status": "public"
    },
    {
      "bankId": "328168",
      "ids": [
        "upsk",
        "uniqa",
        "respect",
        "persha",
        "universalna",
        "grawe"
      ],
      "url": "https://mtb.ua/AccreditedInsuranceCompanies",
      "source": "МТБ Банк - акредитовані страхові компанії",
      "coverage": "Заставне майно",
      "note": "Перелік для позичальників та страхування застав. Конкретний об'єкт і ліміт погоджує банк.",
      "status": "public"
    },
    {
      "bankId": "328209",
      "ids": [
        "arx",
        "arsenal",
        "vuso",
        "ingo",
        "kniazha",
        "pzu",
        "tas",
        "upsk",
        "universalna",
        "uniqa",
        "usg"
      ],
      "url": "https://bank.com.ua/insurance-partners-business",
      "source": "Банк Південний - партнери зі страхування майна для бізнесу",
      "coverage": "Заставне майно бізнесу, класи 8 та 9",
      "note": "",
      "status": "public"
    },
    {
      "bankId": "331489",
      "ids": [
        "upsk",
        "universalna"
      ],
      "url": "https://poltavabank.com/strahuvannya/",
      "source": "Полтава-банк - страхування та акредитовані партнери",
      "coverage": "Майно в заставі та іпотеці",
      "note": "",
      "status": "public"
    },
    {
      "bankId": "334851",
      "ids": [
        "ingo",
        "vuso",
        "arsenal",
        "pzu",
        "arx"
      ],
      "url": "https://www.pumb.ua/service/insurance/insurance_ipoteka",
      "source": "Перший український міжнародний банк - страхування іпотеки",
      "coverage": "Нерухоме заставне майно",
      "note": "",
      "status": "public"
    },
    {
      "bankId": "339050",
      "ids": [
        "arsenal",
        "upsk",
        "vuso"
      ],
      "url": "https://crystalbank.com.ua/upload/file/perelik-sk-partneriv.pdf",
      "source": "Кристалбанк - перелік акредитованих страховиків",
      "coverage": "Майно та/або предмет іпотеки",
      "note": "",
      "status": "public"
    },
    {
      "bankId": "339500",
      "ids": [
        "tas",
        "pzu",
        "universalna",
        "usg",
        "ingo",
        "kniazha",
        "upsk",
        "bbs",
        "oranta",
        "persha",
        "uniqa",
        "arsenal",
        "vuso"
      ],
      "url": "https://tascombank.ua/files/Perelik_akredytovanykh_iur.osoby_SK_11.03.2026__z__rozshyfrovkoiu.pdf",
      "source": "Таскомбанк - майнова акредитація для юридичних осіб",
      "coverage": "Заставне майно юридичних осіб",
      "note": "Діє за наявності вільного ліміту на страховика. Винятки для окремих об'єктів наведені в офіційному переліку.",
      "status": "limited"
    },
    {
      "bankId": "339500",
      "ids": [
        "universalna",
        "usg"
      ],
      "url": "https://tascombank.ua/files/Perelik_akredytovanykh_iur.osoby_SK_11.03.2026__z__rozshyfrovkoiu.pdf",
      "source": "Таскомбанк - майнова акредитація з обмеженнями",
      "coverage": "Заставне майно юридичних осіб",
      "note": "Потрібен вільний ліміт. Не приймаються незавершене будівництво, будівлі та споруди в реконструкції або ремонті; інші винятки - у переліку.",
      "status": "limited"
    },
    {
      "bankId": "339500",
      "ids": [
        "arx"
      ],
      "url": "https://tascombank.ua/files/Perelik_akredytovanykh_fiz.osoby_SK__10.02.2026__z_rozshyfrovkoiu.pdf",
      "source": "Таскомбанк - майнова акредитація для фізичних осіб",
      "coverage": "Майно фізичних осіб",
      "note": "Не застосовується до програми «Іпотека 7%». Потрібен вільний ліміт на страховика.",
      "status": "limited"
    },
    {
      "bankId": "351005",
      "ids": [
        "arx",
        "universalna",
        "usg",
        "kniazha"
      ],
      "url": "https://ukrsibbank.com/private-individuals/accredited-insurance-company/",
      "source": "Укрсиббанк - акредитовані страхові компанії",
      "coverage": "Заставне майно",
      "note": "До майнової матриці не включено компанії зі страхування життя.",
      "status": "public"
    },
    {
      "bankId": "351254",
      "ids": [
        "ingo",
        "vuso"
      ],
      "url": "https://www.sky.bank/uk/insurance",
      "source": "Скай Банк - страхування заставної нерухомості",
      "coverage": "Заставна нерухомість",
      "note": "Об'єкти, страхові суми та територіальні обмеження визначаються відповідною програмою.",
      "status": "public"
    },
    {
      "bankId": "380441",
      "ids": [
        "arx",
        "vuso",
        "guardian",
        "grawe",
        "kniazha",
        "oranta",
        "persha",
        "universalna",
        "upsk"
      ],
      "url": "https://www.creditwest.ua/strakhuvannia-mayna-1",
      "source": "Кредитвест Банк - страхування майна",
      "coverage": "Майно та/або іпотека",
      "note": "",
      "status": "public"
    },
    {
      "bankId": "380441",
      "ids": [
        "tas"
      ],
      "url": "https://www.creditwest.ua/strakhuvannia-mayna-1",
      "source": "Кредитвест Банк - майнові продукти ТАС",
      "coverage": "Майно в партнерських програмах",
      "note": "Виключно в межах партнерських програм із лізинговими компаніями.",
      "status": "limited"
    },
    {
      "bankId": "380526",
      "ids": [
        "guardian",
        "tas",
        "vuso"
      ],
      "url": "https://globusbank.com.ua/ua/akredytovani-strakhovi-kompaniyi-ta-yikhni-produkty.html",
      "source": "Глобус Банк - акредитовані страховики та майнові продукти",
      "coverage": "Майно, зокрема в житлових кредитних програмах",
      "note": "Також зазначені для програм «Житло в кредит», «Нерухомість в кредит» та «Доступна іпотека 7%».",
      "status": "public"
    },
    {
      "bankId": "380526",
      "ids": [
        "universalna",
        "arsenal",
        "ingo",
        "bbs",
        "euroins",
        "arx",
        "usg"
      ],
      "url": "https://globusbank.com.ua/ua/akredytovani-strakhovi-kompaniyi-ta-yikhni-produkty.html",
      "source": "Глобус Банк - акредитовані страховики та майнові продукти",
      "coverage": "Майно поза окремими житловими програмами",
      "note": "Не включені до окремого переліку для програм «Житло в кредит», «Нерухомість в кредит» та «Доступна іпотека 7%». Програму погоджує банк.",
      "status": "limited"
    },
    {
      "bankId": "380548",
      "ids": [
        "universalna",
        "arx",
        "uniqa",
        "vuso",
        "ingo"
      ],
      "url": "https://ap-bank.com/page/insurance_appraisal_companies",
      "source": "Агропросперіс Банк - акредитовані страхові компанії",
      "coverage": "Заставне майно",
      "note": "",
      "status": "public"
    },
    {
      "bankId": "380634",
      "ids": [
        "arsenal",
        "bbs",
        "vuso",
        "pzu",
        "universalna"
      ],
      "url": "https://accordbank.com.ua/about/related-info/partners/insurance-companies/",
      "source": "Акордбанк - акредитовані страховики",
      "coverage": "Рухоме та нерухоме заставне майно",
      "note": "",
      "status": "public"
    },
    {
      "bankId": "380645",
      "ids": [
        "usg",
        "europealliance",
        "uniqa",
        "arx",
        "bbs",
        "krayina",
        "universalna",
        "kniazha",
        "grawe",
        "arsenal",
        "tas",
        "vuso",
        "pzu"
      ],
      "url": "https://bank34.ua/partneri-banku/strahovi-kompanii.html",
      "source": "Банк 3/4 - перелік акредитованих страхових компаній",
      "coverage": "Заставне майно",
      "note": "Загальний акредитаційний перелік, на який банк посилається в умовах страхування застав. Конкретний об'єкт та договір потребують погодження.",
      "status": "public"
    }
  ];
  const banks = registry.map((bank) => ({ ...bank, insurers: {} }));
  const byId = new Map(banks.map((bank) => [bank.id, bank]));
  for (const { bankId, ids, ...record } of evidenceGroups) {
    for (const id of ids) {
      byId.get(bankId).insurers[id] = { ...record, scope: "property" };
    }
  }
  window.AnodosBankAccreditation = {
    schemaVersion: 2,
    researchedAt: "2026-09-11",
    sourcePolicy: "official-web-only",
    scope: "property",
    bankRegisterSource: "https://bank.gov.ua/NBU_BankInfo/get_data_branch_glbank?json",
    insurers,
    banks: banks.sort((a, b) => a.brandName.localeCompare(b.brandName, "uk"))
  };
})();
