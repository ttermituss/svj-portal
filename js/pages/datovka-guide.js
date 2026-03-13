/* ===== PRŮVODCE DATOVOU SCHRÁNKOU ===== */

function renderDatovkaPruvodce(el) {
  var card = document.createElement('div');
  card.className = 'card';
  var body = document.createElement('div');
  body.className = 'card-body';
  card.appendChild(body);
  el.appendChild(card);

  var intro = document.createElement('div');
  intro.className = 'info-box';
  intro.style.cssText = 'background:var(--bg-hover);border:1px solid var(--border);border-radius:8px;padding:14px 18px;margin-bottom:20px;font-size:0.9rem;';
  intro.textContent = 'Datová schránka (ISDS) je povinná pro SVJ. Slouží k právně závazné komunikaci s \xfa\u0159ady (OSSZ, FÚ, soudy, katastr\u2026). Zprávy jsou považovány za doručené okamžikem přihlášení. Každou zprávu lze stáhnout jako soubor .zfo a uložit do archivu zde v portálu.';
  body.appendChild(intro);

  var steps = [
    {
      num: '1',
      title: 'Přihlaste se na mojedatovaschranka.cz',
      desc: 'Adresa portálu: mojedatovaschranka.cz — přihlásit se lze přes: bankovní identitu, NIA (eOP/eID), jméno+heslo, nebo SMS kód.',
      icon: '\uD83D\uDD10',
      tip: 'Tip: Přihlášení přes bankovní identitu (Česká spořitelna, ČSOB, KB\u2026) je nejjednodušší — nepotřebujete speciální hardware.',
    },
    {
      num: '2',
      title: 'Otevřete přijaté nebo odeslané zprávy',
      desc: 'V levém menu klikněte na "PŘIJATÉ ZPRÁVY" nebo "ODESLANÉ ZPRÁVY". Uvidíte seznam všech zpráv s předmětem, odesílatelem a datem.',
      icon: '\uD83D\uDCCB',
      tip: 'Pozor: Zprávy, které nikdo neotevřel po 10 dnech, jsou automaticky považovány za doručené (tzv. fikce doručení)!',
    },
    {
      num: '3',
      title: 'Otevřete detail zprávy',
      desc: 'Klikněte na předmět zprávy. Uvidíte odesílatele, předmět, datum doručení a seznam příloh (HTML, PDF, XML\u2026).',
      icon: '\uD83D\uDCEC',
      tip: 'Hlavní zpráva je vždy soubor "zprava.html" nebo PDF. Ostatní soubory jsou přílohy.',
    },
    {
      num: '4',
      title: 'Stáhněte zprávu jako .zfo',
      desc: 'V dolní části stránky klikněte na tlačítko "STÁHNOUT ZPRÁVU (ZFO)". Stáhne se soubor zprava_XXXXXXXX_prijata.zfo — to je podepsaná kopie celé zprávy včetně všech příloh.',
      icon: '\uD83D\uDCBE',
      tip: '.zfo soubor má právní sílu — obsahuje kvalifikovaný elektronický podpis (PostSignum). Uchovejte ho jako dokument.',
    },
    {
      num: '5',
      title: 'Nahrajte .zfo do tohoto archivu',
      desc: 'Přepněte se na záložku "Zprávy" a přetáhněte .zfo soubor do rámečku, nebo klikněte na "Nahrát .zfo zprávu". Portál automaticky rozpozná odesílatele, předmět, datum a přílohy.',
      icon: '\uD83D\uDCC2',
      tip: 'Všechny přílohy (PDF, HTML) se dají zobrazit přímo v prohlížeči tlačítkem "Náhled".',
    },
  ];

  steps.forEach(function(s) {
    var step = document.createElement('div');
    step.style.cssText = 'display:flex;gap:16px;margin-bottom:20px;align-items:flex-start;';

    var num = document.createElement('div');
    num.style.cssText = 'width:36px;height:36px;border-radius:50%;background:var(--primary);' +
      'color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;' +
      'font-size:1rem;flex-shrink:0;';
    num.textContent = s.num;

    var right = document.createElement('div');
    right.style.cssText = 'flex:1;padding-top:4px;';

    var hd = document.createElement('div');
    hd.style.cssText = 'font-weight:600;font-size:0.95rem;margin-bottom:4px;display:flex;align-items:center;gap:8px;';
    var ic = document.createElement('span');
    ic.textContent = s.icon;
    var tt = document.createElement('span');
    tt.textContent = s.title;
    hd.appendChild(ic);
    hd.appendChild(tt);

    var desc = document.createElement('p');
    desc.style.cssText = 'margin:0 0 8px;font-size:0.88rem;color:var(--text-secondary,var(--text-light));line-height:1.5;';
    desc.textContent = s.desc;

    var tip = document.createElement('div');
    tip.style.cssText = 'background:var(--bg-hover);border-left:3px solid var(--primary);' +
      'padding:8px 12px;border-radius:0 4px 4px 0;font-size:0.82rem;color:var(--text-light);';
    tip.textContent = s.tip;

    right.appendChild(hd);
    right.appendChild(desc);
    right.appendChild(tip);
    step.appendChild(num);
    step.appendChild(right);
    body.appendChild(step);
  });

  // FAQ sekce
  var faqTitle = document.createElement('div');
  faqTitle.style.cssText = 'font-weight:600;font-size:1rem;margin:24px 0 12px;padding-top:20px;border-top:2px solid var(--border);';
  faqTitle.textContent = '\u2753 Časté otázky';
  body.appendChild(faqTitle);

  var faqs = [
    {
      q: 'Zpráva v datovce zmizí po určité době?',
      a: 'Ano! Zprávy starší 90 dní se automaticky mažou z portálu mojedatovaschranka.cz. Proto je důležité je stahovat a archivovat jako .zfo co nejdříve.',
    },
    {
      q: 'Co je to "fikce doručení"?',
      a: 'Pokud zprávu nikdo neotevře do 10 dnů od doručení, zákon ji považuje za doručenou i bez otevření. Nelze se vymlouvat na neznalosť. Doporučujeme přihlašovat se alespoň jednou týdně.',
    },
    {
      q: 'Kdo má přístup k datové schránce SVJ?',
      a: 'SVJ má jednu datovou schránku. Přihlásit se může statutární zástupce (předseda výboru) nebo pověřené osoby (oprávnění se nastavují na portálu ISDS). Heslo nikdy nesdílejte.',
    },
    {
      q: 'Jak napsat zprávu přes datovku?',
      a: 'Na portálu mojedatovaschranka.cz klikněte na "NAPSAT ZPRÁVU". Zadejte ID schránky příjemce (nebo vyhledejte název), předmět, zprávu a přílohy. Každá odeslaná zpráva má právní sílu doporučeného dopisu.',
    },
    {
      q: 'Jak zjistím ID datové schránky SVJ?',
      a: 'ID schránky (7 alfanumerických znaků, např. grsq6ie) je vidět v záhlaví portálu po přihlášení. Uložte ho v Nastavení portálu → Datová schránka (ISDS).',
    },
  ];

  faqs.forEach(function(f) {
    var faq = document.createElement('div');
    faq.style.cssText = 'border:1px solid var(--border);border-radius:8px;margin-bottom:8px;overflow:hidden;';

    var qEl = document.createElement('div');
    qEl.style.cssText = 'padding:12px 16px;font-weight:600;font-size:0.88rem;cursor:pointer;' +
      'display:flex;align-items:center;gap:8px;user-select:none;background:var(--bg-hover);';
    var arrow = document.createElement('span');
    arrow.textContent = '\u25b6';
    arrow.style.cssText = 'font-size:0.82rem;transition:transform .2s;flex-shrink:0;';
    var qt = document.createElement('span');
    qt.textContent = f.q;
    qEl.appendChild(arrow);
    qEl.appendChild(qt);

    var aEl = document.createElement('div');
    aEl.style.cssText = 'padding:0 16px;max-height:0;overflow:hidden;transition:max-height .2s,padding .2s;' +
      'font-size:0.88rem;color:var(--text-light);line-height:1.5;';
    aEl.textContent = f.a;

    var open = false;
    qEl.addEventListener('click', function() {
      open = !open;
      arrow.style.transform = open ? 'rotate(90deg)' : '';
      aEl.style.maxHeight   = open ? '200px' : '0';
      aEl.style.padding     = open ? '12px 16px' : '0 16px';
    });

    faq.appendChild(qEl);
    faq.appendChild(aEl);
    body.appendChild(faq);
  });

  // Odkaz na portál
  var linkBox = document.createElement('div');
  linkBox.style.cssText = 'margin-top:20px;text-align:center;';
  var link = document.createElement('a');
  link.href = 'https://www.mojedatovaschranka.cz';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.className = 'btn btn-primary';
  link.textContent = '\uD83D\uDD17 Otevřít portál datové schránky';
  linkBox.appendChild(link);
  body.appendChild(linkBox);
}
