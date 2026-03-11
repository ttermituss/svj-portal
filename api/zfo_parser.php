<?php
/**
 * ZFO parser — CMS/PKCS7 obálka České datové schránky.
 *
 * ZFO = binární CMS soubor. XML obsah začíná tagem <q:MessageDownloadResponse>.
 * CMS může mít XML chunked v ASN.1 OCTET STRING blocích po 1000 bytech.
 *
 * Strategie:
 *  1. Najít XML start v binárním souboru
 *  2. Extrahovat base64 přílohy regexem PŘED čištěním (zachovat všechny byty)
 *  3. ASN.1 markery ze base64 bloků vyčistit zvlášť
 *  4. Metadata parsovat z čisté části XML (bez příloh)
 *
 * Vrací: ['meta' => [...], 'files' => [['name', 'mime', 'meta_type', 'data'(binary)]]]
 * Chyba: ['error' => 'popis']
 */

function parseZfo(string $filePath): array
{
    if (!is_file($filePath)) return ['error' => 'Soubor nenalezen'];

    $raw = file_get_contents($filePath);
    if ($raw === false || strlen($raw) < 10) return ['error' => 'Nelze číst soubor'];

    // Najít XML část
    $xmlStart = strpos($raw, '<q:MessageDownloadResponse');
    if ($xmlStart === false) $xmlStart = strpos($raw, '<q:dmReturnedMessage');
    if ($xmlStart === false) return ['error' => 'Nepodporovaný formát — XML část nenalezena'];

    $xmlPart = substr($raw, $xmlStart);
    // Ukončit před null byty (CMS footer)
    $nullPos = strpos($xmlPart, "\x00");
    if ($nullPos !== false) $xmlPart = substr($xmlPart, 0, $nullPos);

    // Extrahovat QTimestamp pro čas zprávy (před čištěním)
    $ts = extractQTimestamp($xmlPart);

    // === Extrakce příloh regexem (před čištěním XML) ===
    $files = extractFilesFromRaw($xmlPart);

    // === Metadata: čistit XML, nahradit přílohy prázdnými tagy ===
    $xmlMeta = preg_replace(
        '/<p:dmEncodedContent>[\s\S]*?<\/p:dmEncodedContent>/s',
        '<p:dmEncodedContent/>', $xmlPart
    );
    $xmlMeta = cleanXmlBytes($xmlMeta);

    libxml_use_internal_errors(true);
    $xml = simplexml_load_string($xmlMeta);
    libxml_clear_errors();

    if ($xml === false) return ['error' => 'Nelze parsovat metadata ZFO'];

    $xml->registerXPathNamespace('q', 'http://isds.czechpoint.cz/v20/message');
    $xml->registerXPathNamespace('p', 'http://isds.czechpoint.cz/v20');

    $dmDm = $xml->xpath('//p:dmDm');
    if (empty($dmDm)) return ['error' => 'Zpráva neobsahuje element dmDm'];

    $dm = $dmDm[0];
    $dm->registerXPathNamespace('p', 'http://isds.czechpoint.cz/v20');

    $meta = [
        'dm_id'             => (string)($dm->xpath('p:dmID')[0] ?? ''),
        'sender'            => (string)($dm->xpath('p:dmSender')[0] ?? ''),
        'sender_isds'       => (string)($dm->xpath('p:dbIDSender')[0] ?? ''),
        'recipient'         => (string)($dm->xpath('p:dmRecipient')[0] ?? ''),
        'annotation'        => (string)($dm->xpath('p:dmAnnotation')[0] ?? ''),
        'sender_ref'        => (string)($dm->xpath('p:dmSenderRefNumber')[0] ?? ''),
        'personal_delivery' => strtolower((string)($dm->xpath('p:dmPersonalDelivery')[0] ?? '')) === 'true',
        'ts_zpravy'         => $ts,
    ];

    return ['meta' => $meta, 'files' => $files];
}

/**
 * Extrahuje přílohy regexem přímo z raw XML (před jakýmkoliv čištěním).
 * Zvlášť stripuje ASN.1 chunkovací markery z base64 obsahu.
 */
function extractFilesFromRaw(string $xmlPart): array
{
    $files = [];
    // Najít každý <p:dmFile>...</p:dmFile> blok
    // dmFile (ne dmFiles!) — [^a-zA-Z] po dmFile zajistí, že netrefíme dmFiles
    preg_match_all(
        '/<(?:[^:>]+:)?dmFile([^a-zA-Z][^>]*)>[\s\S]*?<(?:[^:>]+:)?dmEncodedContent>([\s\S]*?)<\/(?:[^:>]+:)?dmEncodedContent>[\s\S]*?<\/(?:[^:>]+:)?dmFile>/s',
        $xmlPart, $matches, PREG_SET_ORDER
    );

    foreach ($matches as $m) {
        $attrsRaw = $m[1];
        $b64Raw   = $m[2];

        // Attributy: dmFileDescr, dmMimeType, dmFileMetaType
        $name   = zfoAttr($attrsRaw, 'dmFileDescr') ?: 'priloha';
        $mime   = zfoAttr($attrsRaw, 'dmMimeType')  ?: 'application/octet-stream';
        $metaT  = zfoAttr($attrsRaw, 'dmFileMetaType') ?: 'enclosure';

        // Z base64 vyčistit ASN.1 TLV markery a non-base64 znaky
        $b64clean = cleanBase64($b64Raw);
        $binary   = base64_decode($b64clean);
        if ($binary === false || strlen($binary) === 0) continue;

        $files[] = [
            'name'      => sanitizeFilename($name),
            'mime'      => $mime,
            'meta_type' => $metaT,
            'data'      => $binary,
        ];
    }
    return $files;
}

/**
 * Odstraní ASN.1 TLV markery a non-base64 znaky z base64 bloku.
 */
function cleanBase64(string $raw): string
{
    // Strip ASN.1 OCTET STRING headers (délky long-form)
    $clean = preg_replace('/\x04\x82[\x00-\xff][\x00-\xff]/s', '', $raw);
    $clean = preg_replace('/\x04\x81[\x00-\xff]/s',            '', $clean);
    $clean = preg_replace('/\x04[\x00-\x7f]/s',                '', $clean);
    // Ponechat jen platné base64 znaky
    $clean = preg_replace('/[^A-Za-z0-9+\/=\s]/s', '', $clean);
    return $clean;
}

/**
 * Vyčistí XML od ASN.1 znaků a invalidních XML znaků.
 */
function cleanXmlBytes(string $s): string
{
    // Strip ASN.1 chunk markery
    $s = preg_replace('/\x04\x82[\x00-\xff][\x00-\xff]/s', '', $s);
    $s = preg_replace('/\x04\x81[\x00-\xff]/s',            '', $s);
    $s = preg_replace('/\x04[\x00-\x7f]/s',                '', $s);
    // Strip invalidní XML znaky (control chars kromě tab/lf/cr)
    $s = preg_replace('/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/s', '', $s);
    return $s;
}

/**
 * Extrahuje hodnotu XML atributu z attribute stringu.
 */
function zfoAttr(string $attrsRaw, string $name): string
{
    if (preg_match('/' . preg_quote($name) . '="([^"]*)"/', $attrsRaw, $m)) {
        return $m[1];
    }
    return '';
}

/**
 * Extrahuje datum/čas z ASN.1 QTimestamp.
 */
function extractQTimestamp(string $xmlPart): ?string
{
    if (!preg_match('/<[^:>]*:dmQTimestamp[^>]*>([\s\S]+?)<\/[^:>]*:dmQTimestamp>/i', $xmlPart, $m)) {
        return null;
    }
    $bin = base64_decode(preg_replace('/\s+/', '', $m[1]));
    if ($bin === false) return null;

    // GeneralizedTime: ASN.1 tag \x18 + \x0f + 15 ASCII znaků (YYYYMMDDHHmmssZ)
    if (preg_match('/\x18\x0f(20\d{12}Z)/', $bin, $gm)) {
        $dt = DateTime::createFromFormat('YmdHis\Z', $gm[1], new DateTimeZone('UTC'));
        if ($dt) {
            $dt->setTimezone(new DateTimeZone('Europe/Prague'));
            return $dt->format('Y-m-d H:i:s');
        }
    }
    return null;
}

function sanitizeFilename(string $name): string
{
    $name = basename($name);
    $name = preg_replace('/[^\w\-. áčďéěíňóřšťůúýžÁČĎÉĚÍŇÓŘŠŤŮÚÝŽ]/u', '_', $name);
    return mb_substr($name, 0, 200);
}
