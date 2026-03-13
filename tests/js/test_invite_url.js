/* ===== Testy pro invite URL logiku ===== */

suite('URLSearchParams — invite token z URL');

(function() {
  function parseInviteToken(search) {
    return new URLSearchParams(search).get('invite') || '';
  }

  assertEqual('Token z ?invite=abc123',       'abc123',  parseInviteToken('?invite=abc123'));
  assertEqual('Token z ?foo=bar&invite=xyz',  'xyz',     parseInviteToken('?foo=bar&invite=xyz'));
  assertEqual('Bez invite parametru',         '',        parseInviteToken('?foo=bar'));
  assertEqual('Prázdný query string',         '',        parseInviteToken(''));
  assertEqual('Token je URL-decoded',         'a b+c',   parseInviteToken('?invite=a+b%2Bc'));
})();

suite('Token validace — délka a hex');

(function() {
  function isValidToken(token) {
    return typeof token === 'string' &&
           token.length === 64 &&
           /^[0-9a-f]+$/.test(token);
  }

  var validToken   = Array(65).join('a');                       // 64× 'a' — platný hex
  var shortToken   = Array(33).join('a');                       // 32 znaků — krátký
  var longToken    = Array(129).join('a');                      // 128 znaků — dlouhý
  var nonHexToken  = Array(65).join('z');                       // 64× 'z' — není hex
  var emptyToken   = '';
  var mixedToken   = Array(33).join('a') + Array(33).join('A'); // velká písmena — ne lowercase hex

  assert('Platný 64-hex token projde',        isValidToken(validToken));
  assert('Krátký token neprojde',             !isValidToken(shortToken));
  assert('Příliš dlouhý token neprojde',      !isValidToken(longToken));
  assert('Non-hex znaky neprojdou',           !isValidToken(nonHexToken));
  assert('Prázdný token neprojde',            !isValidToken(emptyToken));
  assert('Velká písmena neprojdou',           !isValidToken(mixedToken));
})();

suite('Invite expirace — časová logika');

(function() {
  var now     = Date.now();
  var future  = new Date(now + 86400 * 1000).toISOString();  // za 24h
  var past    = new Date(now - 1000).toISOString();           // 1s zpět

  assert('Budoucí expiry je platný',  new Date(future).getTime() > now);
  assert('Minulý expiry je vypršelý', new Date(past).getTime() < now);
})();
