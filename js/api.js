/* ===== API CALLS ===== */

var Api = (function() {

  /** ARES lookup přes nový svj.php (uloží do DB) */
  function lookupAres(ico) {
    var clean = ico.replace(/\s/g, '').replace(/\D/g, '');
    if (!clean) return Promise.reject(new Error('Prázdné IČO'));
    return fetch('api/svj.php?action=lookup&ico=' + encodeURIComponent(clean))
      .then(function(res) {
        return res.json().then(function(d) {
          if (!res.ok) throw new Error(d.error ? d.error.message : 'Chyba ARES');
          return d;
        });
      });
  }

  /** Starý ARES proxy (zpětná kompatibilita) */
  function lookupAresLegacy(ico) {
    var clean = ico.replace(/\s/g, '').replace(/\D/g, '');
    if (!clean) return Promise.reject(new Error('Prázdné IČO'));
    return fetch('api/proxy.php?action=ares&ico=' + encodeURIComponent(clean))
      .then(function(res) {
        if (!res.ok) return res.json().then(function(d) { throw new Error(d.error || 'Chyba ARES'); });
        return res.json();
      });
  }

  /** Načte statutární orgán SVJ z veřejného rejstříku ARES VR. @param {string} ico */
  function lookupAresVr(ico) {
    var clean = ico.replace(/\s/g, '').replace(/\D/g, '');
    return fetch('api/proxy.php?action=ares-vr&ico=' + encodeURIComponent(clean))
      .then(function(res) {
        if (!res.ok) return res.json().then(function(d) { throw new Error(d.error || 'Chyba ARES VR'); });
        return res.json();
      });
  }

  /** Vrátí URL na záznam v OR justice.cz pro dané IČO. @param {string} ico */
  function justiceUrl(ico) {
    var clean = ico.replace(/\s/g, '').padStart(8, '0');
    return 'https://or.justice.cz/ias/ui/rejstrik-rejstrik?ico=' + clean;
  }

  /** Vrátí URL na listiny (dokumenty) v OR justice.cz pro dané IČO. @param {string} ico */
  function justiceListinyUrl(ico) {
    var clean = ico.replace(/\s/g, '').padStart(8, '0');
    return 'https://or.justice.cz/ias/ui/vypis-sl-firma?subjektId=&ico=' + clean;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '\u2014';
    try { return new Date(dateStr).toLocaleDateString('cs-CZ'); }
    catch (e) { return dateStr; }
  }

  /**
   * Sestaví textovou adresu z objektu sídla z ARES.
   * @param {{nazevUlice?:string, cisloDomovni?:string, cisloOrientacni?:string, nazevObce?:string, psc?:string|number}|null} sidlo
   * @returns {string}
   */
  function formatAddress(sidlo) {
    if (!sidlo) return '\u2014';
    var parts = [];
    if (sidlo.nazevUlice) {
      var addr = sidlo.nazevUlice;
      if (sidlo.cisloDomovni) addr += ' ' + sidlo.cisloDomovni;
      if (sidlo.cisloOrientacni) addr += '/' + sidlo.cisloOrientacni;
      parts.push(addr);
    }
    if (sidlo.nazevObce) parts.push(sidlo.nazevObce);
    if (sidlo.psc) parts.push(String(sidlo.psc));
    return parts.join(', ') || '\u2014';
  }

  /** Link přihlášeného uživatele k SVJ */
  function linkSvj(svjId) {
    return fetch('api/svj.php?action=link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ svj_id: svjId }),
    }).then(function(res) {
      return res.json().then(function(d) {
        if (!res.ok) throw new Error(d.error ? d.error.message : 'Chyba');
        return d;
      });
    });
  }

  /**
   * POST požadavek na API endpoint se JSON tělem. Hodí Error při !res.ok.
   * @param {string} endpoint  Relativní URL (např. 'api/fond_oprav.php?action=add')
   * @param {Object} data      JSON tělo požadavku
   * @returns {Promise<Object>}
   */
  function apiPost(endpoint, data) {
    return fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    }).then(function(res) {
      return res.json().then(function(d) {
        if (!res.ok) throw new Error(d.error ? d.error.message : 'Chyba');
        return d;
      });
    });
  }

  /**
   * GET požadavek na API endpoint. Hodí Error při !res.ok.
   * @param {string} endpoint  Relativní URL
   * @returns {Promise<Object>}
   */
  function apiGet(endpoint) {
    return fetch(endpoint, { credentials: 'include' })
      .then(function(res) {
        return res.json().then(function(d) {
          if (!res.ok) throw new Error(d.error ? d.error.message : 'Chyba');
          return d;
        });
      });
  }

  /** apiGet s in-memory cache. Opakované volání stejného endpointu vrátí cached výsledek po dobu ttlSeconds. */
  var _apiCache = {};
  function apiGetCached(endpoint, ttlSeconds) {
    var now = Date.now();
    var cached = _apiCache[endpoint];
    if (cached && (now - cached.ts) < ttlSeconds * 1000) return Promise.resolve(cached.data);
    return apiGet(endpoint).then(function(data) {
      _apiCache[endpoint] = { data: data, ts: now };
      return data;
    });
  }

  /** Ověří pozvánkový token — vrátí {valid, role, svj} nebo hodí Error */
  function validateInvite(token) {
    return fetch('api/invite.php?action=validate&token=' + encodeURIComponent(token))
      .then(function(res) {
        return res.json().then(function(d) {
          if (!res.ok) throw new Error(d.error ? d.error.message : 'Neplatná pozvánka');
          return d;
        });
      });
  }

  /** Vytvoří pozvánku (vybor/admin) */
  function createInvite(role, expiresDays) {
    return apiPost('api/invite.php?action=create', { role: role, expires_days: expiresDays });
  }

  /** Vypíše pozvánky pro aktuální SVJ */
  function listInvites() {
    return apiGet('api/invite.php?action=list');
  }

  /** Zruší pozvánku */
  function revokeInvite(inviteId) {
    return apiPost('api/invite.php?action=revoke', { invite_id: inviteId });
  }

  return {
    lookupAres: lookupAres,
    lookupAresLegacy: lookupAresLegacy,
    lookupAresVr: lookupAresVr,
    justiceUrl: justiceUrl,
    justiceListinyUrl: justiceListinyUrl,
    formatDate: formatDate,
    formatAddress: formatAddress,
    linkSvj: linkSvj,
    validateInvite: validateInvite,
    createInvite: createInvite,
    listInvites: listInvites,
    revokeInvite: revokeInvite,
    apiPost: apiPost,
    apiGet: apiGet,
    apiGetCached: apiGetCached,
  };
})();
