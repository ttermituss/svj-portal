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

  function lookupAresVr(ico) {
    var clean = ico.replace(/\s/g, '').replace(/\D/g, '');
    return fetch('api/proxy.php?action=ares-vr&ico=' + encodeURIComponent(clean))
      .then(function(res) {
        if (!res.ok) return res.json().then(function(d) { throw new Error(d.error || 'Chyba ARES VR'); });
        return res.json();
      });
  }

  function justiceUrl(ico) {
    var clean = ico.replace(/\s/g, '').padStart(8, '0');
    return 'https://or.justice.cz/ias/ui/rejstrik-rejstrik?ico=' + clean;
  }

  function justiceListinyUrl(ico) {
    var clean = ico.replace(/\s/g, '').padStart(8, '0');
    return 'https://or.justice.cz/ias/ui/vypis-sl-firma?subjektId=&ico=' + clean;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '\u2014';
    try { return new Date(dateStr).toLocaleDateString('cs-CZ'); }
    catch (e) { return dateStr; }
  }

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

  function apiGet(endpoint) {
    return fetch(endpoint, { credentials: 'include' })
      .then(function(res) {
        return res.json().then(function(d) {
          if (!res.ok) throw new Error(d.error ? d.error.message : 'Chyba');
          return d;
        });
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
  };
})();
