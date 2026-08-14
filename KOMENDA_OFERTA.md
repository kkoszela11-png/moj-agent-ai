# Zadanie 2 — Własna komenda biznesowa: `/oferta`

## Cel komendy
`/oferta [temat]` przyjmuje dowolny temat i **zawsze** zwraca gotową, profesjonalną
**ofertę handlową** w jednolitym formacie — gotową do wysłania klientowi.
Branża: **handel / e-commerce**.

Technika: **few-shot prompting** — w system prompcie podane są **2 pełne przykłady** oferty,
dzięki czemu model uczy się wzorca i powtarza go dla każdego nowego tematu (spójny format,
ton i struktura), bez potrzeby fine-tuningu.

## Jak wywołać
W trybie **💼 Oferta** (strona `/oferta`) wpisz temat, np.:
```
/oferta pakiet fotografii produktowej dla sklepu z odzieżą
```
Komenda `/oferta` na początku jest opcjonalna — sam temat też zadziała.

## Format wyjścia (zawsze taki sam)
1. `## 💼 OFERTA: [nazwa]`
2. **Dla:** [segment klienta] · **Ważność oferty:** [X dni]
3. `### Co oferujemy` — 1–2 zdania
4. `### W pakiecie` — lista punktów
5. `### Korzyści dla Ciebie` — lista z ✅
6. `### Cennik` — tabela markdown (min. 3 wiersze)
7. `### Następny krok` — wezwanie do działania (CTA)

## Zasady (reguły w system prompcie)
- ZAWSZE zachowaj dokładnie powyższą strukturę.
- Ton: profesjonalny, konkretny, zorientowany na korzyść klienta; język polski.
- Ceny realistyczne w PLN netto + adnotacja, że to wycena przykładowa.
- Cennik zawsze jako tabela markdown.
- Zawsze zakończ sekcją „Następny krok" z jasnym CTA.
- Brak tematu → poproś krótko o temat oferty.

---

## Przykłady few-shot (użyte do „nauczenia" modelu)

### Przykład 1

**Wejście:**
```
/oferta pakiet startowy dla nowego sklepu internetowego
```

**Oczekiwane wyjście:**

## 💼 OFERTA: Pakiet startowy dla sklepu internetowego

**Dla:** Nowe sklepy e-commerce
**Ważność oferty:** 14 dni

### Co oferujemy
Kompletny pakiet startowy, który pozwoli Ci uruchomić sprzedaż online w 2 tygodnie — bez technicznych bólów głowy.

### W pakiecie
- Konfiguracja sklepu na platformie (Shopify / WooCommerce)
- Import do 100 produktów wraz ze zdjęciami i opisami
- Integracja płatności (Przelewy24 / BLIK) i kuriera (InPost)
- Szkolenie obsługi (2h online)

### Korzyści dla Ciebie
- ✅ Start sprzedaży w 14 dni zamiast kilku miesięcy
- ✅ Jeden partner zamiast czterech różnych wykonawców
- ✅ Gotowe integracje płatności i wysyłki — klient kupuje od razu

### Cennik
| Wariant | Zakres | Cena netto |
|---------|--------|-----------|
| Basic | Sklep + 30 produktów + płatności | 2 900 zł |
| Standard | Basic + 100 produktów + kurier | 4 500 zł |
| Premium | Standard + szkolenie + 30 dni wsparcia | 6 200 zł |

*Wycena przykładowa — finalna cena po krótkiej rozmowie o Twoich potrzebach.*

### Następny krok
Odpisz na tę wiadomość lub umów 15-minutową rozmowę — przygotujemy wersję dopasowaną do Twojego asortymentu. 📞

---

### Przykład 2

**Wejście:**
```
/oferta hurtowa współpraca B2B — akcesoria GSM
```

**Oczekiwane wyjście:**

## 💼 OFERTA: Hurtowa współpraca B2B — akcesoria GSM

**Dla:** Sklepy i punkty serwisowe GSM
**Ważność oferty:** 30 dni

### Co oferujemy
Stały dostęp do hurtowych cen akcesoriów GSM z dostawą 24h i wygodnym zamawianiem przez panel B2B.

### W pakiecie
- Katalog 2 000+ produktów (etui, szkła, kable, ładowarki)
- Ceny hurtowe zależne od miesięcznego obrotu
- Panel B2B z historią zamówień i fakturami
- Dedykowany opiekun handlowy

### Korzyści dla Ciebie
- ✅ Marża do 40% na najpopularniejszych kategoriach
- ✅ Dostawa 24h — mniej zamrożonego kapitału w magazynie
- ✅ Zwroty i reklamacje obsługiwane w 48h

### Cennik
| Próg obrotu / mies. | Rabat | Dostawa |
|--------------------|-------|---------|
| do 2 000 zł | 5% | płatna 15 zł |
| 2 000 – 10 000 zł | 12% | gratis |
| powyżej 10 000 zł | 20% | gratis + priorytet |

*Rabaty naliczane automatycznie w panelu B2B.*

### Następny krok
Załóż darmowe konto B2B i sprawdź ceny — aktywacja w 5 minut, bez zobowiązań. 🚀

---

## Gdzie jest wdrożone w bocie
Aplikacja `moj-agent` (Next.js + Vercel AI SDK + Google Gemini):

| Element | Plik |
|---------|------|
| Endpoint komendy (system prompt few-shot) | `app/api/oferta/route.ts` |
| Strona / interfejs trybu 💼 Oferta | `app/oferta/page.tsx` |
| Link w nawigacji | `app/components/Nav.tsx` |

## Jak przetestować
1. `npm install` → `npm run dev`
2. Wejdź na `http://localhost:3000/oferta`
3. Kliknij jedną z podpowiedzi lub wpisz własny temat, np.
   `/oferta abonament na obsługę social media sklepu`
4. Agent zwróci ofertę w **tym samym formacie** co przykłady powyżej.

## Test spójności (dowód, że few-shot działa)
Ten sam format zadziałał dla tematu spoza przykładów — `/oferta sesja zdjęciowa produktów do e-commerce`
zwróciło ofertę z identyczną strukturą (tytuł 💼 → Dla/Ważność → Co oferujemy → W pakiecie →
Korzyści ✅ → tabela cennika → CTA). To pokazuje, że model nauczył się wzorca z 2 przykładów.
