<?php
/**
 * Minimální PDF writer s TrueType fontem — čistý PHP, žádné závislosti.
 * Podporuje české znaky (UTF-8 → CIDFont Type2 s ToUnicode CMap).
 * Použití: $bytes = buildPdf($headers, $rows, $title, $sheetName);
 */

function buildPdf(array $headers, array $rows, string $title = '', string $subtitle = ''): string {
    $fontPath     = __DIR__ . '/fonts/DejaVuSans.ttf';
    $fontBoldPath = __DIR__ . '/fonts/DejaVuSans-Bold.ttf';

    $ttf     = parseTtfMetrics($fontPath);
    $ttfBold = parseTtfMetrics($fontBoldPath);

    $pageW = 842; // A4 landscape width (pt)
    $pageH = 595; // A4 landscape height (pt)
    $margin = 40;
    $usableW = $pageW - 2 * $margin;

    $fontSize     = 9;
    $fontSizeHead = 9;
    $headerH      = 22;
    $rowH         = 18;
    $titleSize    = 14;
    $subtitleSize = 9;

    $colCount = count($headers);
    $colWidths = calcColWidths($headers, $rows, $ttf, $ttfBold, $fontSize, $usableW, $colCount);

    $pages = paginateRows($rows, $pageH, $margin, $headerH, $rowH, $titleSize, $subtitleSize, $title);

    $objects = [];
    $objIdx  = 0;

    // Obj 1: Catalog
    $objects[++$objIdx] = "<< /Type /Catalog /Pages 2 0 R >>";

    // Obj 2: Pages (placeholder)
    $pagesObjId = ++$objIdx;

    // Obj 3: Font regular
    $fontRegularStreamId = ++$objIdx;
    $fontData = file_get_contents($fontPath);
    $fontDataZ = gzcompress($fontData, 6);
    $objects[$fontRegularStreamId] = "<< /Length " . strlen($fontDataZ)
        . " /Length1 " . strlen($fontData)
        . " /Filter /FlateDecode >> stream\n" . $fontDataZ . "\nendstream";

    $fontDescRegId = ++$objIdx;
    $objects[$fontDescRegId] = "<< /Type /FontDescriptor /FontName /DejaVuSans"
        . " /Flags 32 /ItalicAngle 0"
        . " /Ascent " . $ttf['ascent'] . " /Descent " . $ttf['descent']
        . " /CapHeight 729 /StemV 87"
        . " /FontBBox [-1021 -463 1794 1232]"
        . " /FontFile2 " . $fontRegularStreamId . " 0 R >>";

    $cidRegId = ++$objIdx;
    $objects[$cidRegId] = "<< /Type /Font /Subtype /CIDFontType2 /BaseFont /DejaVuSans"
        . " /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >>"
        . " /FontDescriptor " . $fontDescRegId . " 0 R"
        . " /DW 600"
        . " /W " . buildWidthArray($ttf) . " >>";

    $toUnicodeRegId = ++$objIdx;
    $cmapReg = buildToUnicodeCMap($ttf);
    $cmapRegZ = gzcompress($cmapReg, 6);
    $objects[$toUnicodeRegId] = "<< /Length " . strlen($cmapRegZ) . " /Filter /FlateDecode >> stream\n" . $cmapRegZ . "\nendstream";

    $fontRegObjId = ++$objIdx;
    $objects[$fontRegObjId] = "<< /Type /Font /Subtype /Type0 /BaseFont /DejaVuSans"
        . " /Encoding /Identity-H"
        . " /DescendantFonts [" . $cidRegId . " 0 R]"
        . " /ToUnicode " . $toUnicodeRegId . " 0 R >>";

    // Obj: Font bold
    $fontBoldStreamId = ++$objIdx;
    $fontBoldData = file_get_contents($fontBoldPath);
    $fontBoldDataZ = gzcompress($fontBoldData, 6);
    $objects[$fontBoldStreamId] = "<< /Length " . strlen($fontBoldDataZ)
        . " /Length1 " . strlen($fontBoldData)
        . " /Filter /FlateDecode >> stream\n" . $fontBoldDataZ . "\nendstream";

    $fontDescBoldId = ++$objIdx;
    $objects[$fontDescBoldId] = "<< /Type /FontDescriptor /FontName /DejaVuSans-Bold"
        . " /Flags 32 /ItalicAngle 0"
        . " /Ascent " . $ttfBold['ascent'] . " /Descent " . $ttfBold['descent']
        . " /CapHeight 729 /StemV 120"
        . " /FontBBox [-1069 -415 1870 1232]"
        . " /FontFile2 " . $fontBoldStreamId . " 0 R >>";

    $cidBoldId = ++$objIdx;
    $objects[$cidBoldId] = "<< /Type /Font /Subtype /CIDFontType2 /BaseFont /DejaVuSans-Bold"
        . " /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >>"
        . " /FontDescriptor " . $fontDescBoldId . " 0 R"
        . " /DW 600"
        . " /W " . buildWidthArray($ttfBold) . " >>";

    $toUnicodeBoldId = ++$objIdx;
    $cmapBold = buildToUnicodeCMap($ttfBold);
    $cmapBoldZ = gzcompress($cmapBold, 6);
    $objects[$toUnicodeBoldId] = "<< /Length " . strlen($cmapBoldZ) . " /Filter /FlateDecode >> stream\n" . $cmapBoldZ . "\nendstream";

    $fontBoldObjId = ++$objIdx;
    $objects[$fontBoldObjId] = "<< /Type /Font /Subtype /Type0 /BaseFont /DejaVuSans-Bold"
        . " /Encoding /Identity-H"
        . " /DescendantFonts [" . $cidBoldId . " 0 R]"
        . " /ToUnicode " . $toUnicodeBoldId . " 0 R >>";

    // Resources dict (shared)
    $resourcesDict = "<< /Font << /F1 " . $fontRegObjId . " 0 R /F2 " . $fontBoldObjId . " 0 R >> >>";

    // Pages
    $pageObjIds = [];
    foreach ($pages as $pageIdx => $pageRows) {
        $stream = renderPage(
            $pageRows, $headers, $colWidths, $title, $subtitle,
            $pageW, $pageH, $margin, $fontSize, $fontSizeHead, $titleSize, $subtitleSize,
            $headerH, $rowH, $ttf, $ttfBold, $pageIdx, count($pages)
        );
        $streamZ = gzcompress($stream, 6);

        $contentId = ++$objIdx;
        $objects[$contentId] = "<< /Length " . strlen($streamZ) . " /Filter /FlateDecode >> stream\n" . $streamZ . "\nendstream";

        $pageId = ++$objIdx;
        $objects[$pageId] = "<< /Type /Page /Parent " . $pagesObjId . " 0 R"
            . " /MediaBox [0 0 " . $pageW . " " . $pageH . "]"
            . " /Contents " . $contentId . " 0 R"
            . " /Resources " . $resourcesDict . " >>";
        $pageObjIds[] = $pageId;
    }

    // Fill Pages object
    $kids = implode(' ', array_map(fn($id) => $id . ' 0 R', $pageObjIds));
    $objects[$pagesObjId] = "<< /Type /Pages /Kids [" . $kids . "] /Count " . count($pageObjIds) . " >>";

    return assemblePdf($objects);
}

/* ===== TTF PARSER (minimal — cmap + hmtx for glyph widths) ===== */

function parseTtfMetrics(string $path): array {
    $data = file_get_contents($path);
    $tables = [];
    $numTables = unpack('n', $data, 4)[1];
    for ($i = 0; $i < $numTables; $i++) {
        $off = 12 + $i * 16;
        $tag = substr($data, $off, 4);
        $tables[$tag] = [
            'offset' => unpack('N', $data, $off + 8)[1],
            'length' => unpack('N', $data, $off + 12)[1],
        ];
    }

    // head
    $headOff = $tables['head']['offset'];
    $unitsPerEm = unpack('n', $data, $headOff + 18)[1];

    // hhea
    $hheaOff = $tables['hhea']['offset'];
    $ascent  = unpackS16($data, $hheaOff + 4);
    $descent = unpackS16($data, $hheaOff + 6);
    $numHmtx = unpack('n', $data, $hheaOff + 34)[1];

    // hmtx — advance widths
    $hmtxOff = $tables['hmtx']['offset'];
    $widths = [];
    for ($i = 0; $i < $numHmtx; $i++) {
        $widths[$i] = unpack('n', $data, $hmtxOff + $i * 4)[1];
    }
    $lastW = $widths[$numHmtx - 1];

    // cmap — find format 4 subtable (Unicode BMP)
    $cmapOff = $tables['cmap']['offset'];
    $numSub  = unpack('n', $data, $cmapOff + 2)[1];
    $fmt4Off = null;
    for ($i = 0; $i < $numSub; $i++) {
        $subOff = $cmapOff + 4 + $i * 8;
        $platId = unpack('n', $data, $subOff)[1];
        $encId  = unpack('n', $data, $subOff + 2)[1];
        $subTableOff = $cmapOff + unpack('N', $data, $subOff + 4)[1];
        $fmt = unpack('n', $data, $subTableOff)[1];
        if ($fmt === 4 && ($platId === 0 || ($platId === 3 && $encId === 1))) {
            $fmt4Off = $subTableOff;
            break;
        }
    }

    $charToGlyph = [];
    if ($fmt4Off !== null) {
        $segCount = unpack('n', $data, $fmt4Off + 6)[1] / 2;
        $endOff   = $fmt4Off + 14;
        $startOff = $endOff + $segCount * 2 + 2;
        $deltaOff = $startOff + $segCount * 2;
        $rangeOff = $deltaOff + $segCount * 2;

        for ($i = 0; $i < $segCount; $i++) {
            $endCode   = unpack('n', $data, $endOff + $i * 2)[1];
            $startCode = unpack('n', $data, $startOff + $i * 2)[1];
            $delta     = unpackS16($data, $deltaOff + $i * 2);
            $rangeOffVal = unpack('n', $data, $rangeOff + $i * 2)[1];

            if ($startCode === 0xFFFF) break;

            for ($c = $startCode; $c <= $endCode; $c++) {
                if ($rangeOffVal === 0) {
                    $gid = ($c + $delta) & 0xFFFF;
                } else {
                    $glyphOff = $rangeOff + $i * 2 + $rangeOffVal + ($c - $startCode) * 2;
                    $gid = unpack('n', $data, $glyphOff)[1];
                    if ($gid !== 0) $gid = ($gid + $delta) & 0xFFFF;
                }
                $charToGlyph[$c] = $gid;
            }
        }
    }

    $scale = 1000 / $unitsPerEm;
    $charWidths = [];
    foreach ($charToGlyph as $cp => $gid) {
        $w = ($gid < $numHmtx) ? $widths[$gid] : $lastW;
        $charWidths[$cp] = (int)round($w * $scale);
    }

    return [
        'unitsPerEm'  => $unitsPerEm,
        'scale'       => $scale,
        'ascent'      => (int)round($ascent * $scale),
        'descent'     => (int)round($descent * $scale),
        'charWidths'  => $charWidths,
        'charToGlyph' => $charToGlyph,
        'defaultW'    => 600,
    ];
}

function unpackS16(string $data, int $off): int {
    $v = unpack('n', $data, $off)[1];
    return ($v >= 0x8000) ? $v - 0x10000 : $v;
}

/* ===== PDF FONT HELPERS ===== */

function buildWidthArray(array $ttf): string {
    $w = $ttf['charWidths'];
    if (empty($w)) return '[]';
    // CID widths: output as individual [cid [w]] entries for used codepoints
    // Group consecutive GIDs for compactness
    $gidWidths = [];
    foreach ($ttf['charToGlyph'] as $cp => $gid) {
        if ($gid === 0) continue;
        $gw = $w[$cp] ?? $ttf['defaultW'];
        $gidWidths[$gid] = $gw;
    }
    ksort($gidWidths);
    $out = '[';
    $prev = -2;
    $run = [];
    foreach ($gidWidths as $gid => $gw) {
        if ($gid !== $prev + 1) {
            if ($run) $out .= $prev - count($run) + 1 . ' [' . implode(' ', $run) . '] ';
            $run = [];
        }
        $run[] = $gw;
        $prev = $gid;
    }
    if ($run) $out .= $prev - count($run) + 1 . ' [' . implode(' ', $run) . '] ';
    $out .= ']';
    return $out;
}

function buildToUnicodeCMap(array $ttf): string {
    $lines = [];
    foreach ($ttf['charToGlyph'] as $cp => $gid) {
        if ($gid === 0 || $cp > 0xFFFF) continue;
        $lines[] = sprintf('<%04X> <%04X>', $gid, $cp);
    }
    // Split into chunks of 100
    $chunks = array_chunk($lines, 100);
    $cmap = "/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n"
        . "/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n"
        . "/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n"
        . "1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n";
    foreach ($chunks as $chunk) {
        $cmap .= count($chunk) . " beginbfchar\n" . implode("\n", $chunk) . "\nendbfchar\n";
    }
    $cmap .= "endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend";
    return $cmap;
}

/* ===== TEXT ENCODING + WIDTH CALC ===== */

function pdfEncodeText(string $utf8, array $ttf): string {
    $hex = '';
    $len = strlen($utf8);
    $i = 0;
    while ($i < $len) {
        $byte = ord($utf8[$i]);
        if ($byte < 0x80) { $cp = $byte; $i++; }
        elseif (($byte & 0xE0) === 0xC0) { $cp = (($byte & 0x1F) << 6) | (ord($utf8[$i+1]) & 0x3F); $i += 2; }
        elseif (($byte & 0xF0) === 0xE0) { $cp = (($byte & 0x0F) << 12) | ((ord($utf8[$i+1]) & 0x3F) << 6) | (ord($utf8[$i+2]) & 0x3F); $i += 3; }
        else { $cp = 0xFFFD; $i += 4; }

        $gid = $ttf['charToGlyph'][$cp] ?? 0;
        $hex .= sprintf('%04X', $gid);
    }
    return '<' . $hex . '>';
}

function textWidth(string $utf8, array $ttf, float $fontSize): float {
    $w = 0;
    $len = strlen($utf8);
    $i = 0;
    while ($i < $len) {
        $byte = ord($utf8[$i]);
        if ($byte < 0x80) { $cp = $byte; $i++; }
        elseif (($byte & 0xE0) === 0xC0) { $cp = (($byte & 0x1F) << 6) | (ord($utf8[$i+1]) & 0x3F); $i += 2; }
        elseif (($byte & 0xF0) === 0xE0) { $cp = (($byte & 0x0F) << 12) | ((ord($utf8[$i+1]) & 0x3F) << 6) | (ord($utf8[$i+2]) & 0x3F); $i += 3; }
        else { $cp = 0xFFFD; $i += 4; }
        $w += $ttf['charWidths'][$cp] ?? $ttf['defaultW'];
    }
    return $w * $fontSize / 1000;
}

function truncateText(string $utf8, array $ttf, float $fontSize, float $maxW): string {
    $ellipsis = "\xE2\x80\xA6"; // …
    $ellW = textWidth($ellipsis, $ttf, $fontSize);
    if (textWidth($utf8, $ttf, $fontSize) <= $maxW) return $utf8;

    $chars = mb_str_split($utf8);
    $result = '';
    $w = 0;
    foreach ($chars as $ch) {
        $cw = textWidth($ch, $ttf, $fontSize);
        if ($w + $cw + $ellW > $maxW) break;
        $result .= $ch;
        $w += $cw;
    }
    return $result . $ellipsis;
}

/* ===== COLUMN WIDTHS ===== */

function calcColWidths(array $headers, array $rows, array $ttf, array $ttfBold, float $fontSize, float $usableW, int $colCount): array {
    $minWidths = [];
    for ($i = 0; $i < $colCount; $i++) {
        $w = textWidth($headers[$i] ?? '', $ttfBold, $fontSize) + 12;
        foreach ($rows as $row) {
            $vals = array_values($row);
            $cw = textWidth((string)($vals[$i] ?? ''), $ttf, $fontSize) + 12;
            $w = max($w, min($cw, 200)); // cap single col at 200pt
        }
        $minWidths[$i] = $w;
    }

    $total = array_sum($minWidths);
    if ($total <= $usableW) {
        $scale = $usableW / $total;
        return array_map(fn($w) => $w * $scale, $minWidths);
    }
    // Shrink proportionally
    $scale = $usableW / $total;
    return array_map(fn($w) => max($w * $scale, 30), $minWidths);
}

/* ===== PAGINATION ===== */

function paginateRows(array $rows, float $pageH, float $margin, float $headerH, float $rowH, float $titleSize, float $subtitleSize, string $title): array {
    $pages = [];
    $footerH = 24;
    $firstPageTop = $margin + ($title ? $titleSize + $subtitleSize + 20 : 0);
    $availFirst = $pageH - $firstPageTop - $margin - $footerH - $headerH;
    $availOther = $pageH - $margin * 2 - $footerH - $headerH;

    $idx = 0;
    $total = count($rows);

    // First page
    $countFirst = max(1, (int)floor($availFirst / $rowH));
    $pages[] = array_slice($rows, 0, min($countFirst, $total));
    $idx = min($countFirst, $total);

    // Subsequent pages
    $countOther = max(1, (int)floor($availOther / $rowH));
    while ($idx < $total) {
        $pages[] = array_slice($rows, $idx, $countOther);
        $idx += $countOther;
    }

    return $pages ?: [[]];
}

/* ===== RENDER PAGE ===== */

function renderPage(
    array $rows, array $headers, array $colWidths, string $title, string $subtitle,
    float $pageW, float $pageH, float $margin,
    float $fontSize, float $fontSizeHead, float $titleSize, float $subtitleSize,
    float $headerH, float $rowH,
    array $ttf, array $ttfBold,
    int $pageIdx, int $totalPages
): string {
    $s = '';
    $y = $pageH - $margin;

    // Title (first page only)
    if ($pageIdx === 0 && $title) {
        $s .= "BT /F2 {$titleSize} Tf " . $margin . " " . sprintf('%.2f', $y - $titleSize) . " Td "
            . pdfEncodeText($title, $ttfBold) . " Tj ET\n";
        $y -= $titleSize + 4;

        if ($subtitle) {
            $s .= "BT /F1 {$subtitleSize} Tf " . $margin . " " . sprintf('%.2f', $y - $subtitleSize)
                . " Td 0.4 0.4 0.4 rg " . pdfEncodeText($subtitle, $ttf) . " Tj 0 0 0 rg ET\n";
            $y -= $subtitleSize + 12;
        } else {
            $y -= 8;
        }
    }

    // Table header background
    $hdrY = $y - $headerH;
    $s .= "0.92 0.92 0.95 rg " . $margin . " " . sprintf('%.2f', $hdrY) . " "
        . array_sum($colWidths) . " " . $headerH . " re f 0 0 0 rg\n";

    // Header text
    $x = $margin;
    foreach ($headers as $i => $hdr) {
        $cw = $colWidths[$i] ?? 60;
        $tx = $x + 6;
        $ty = $hdrY + ($headerH - $fontSizeHead) / 2 + 1;
        $text = truncateText($hdr, $ttfBold, $fontSizeHead, $cw - 10);
        $s .= "BT /F2 {$fontSizeHead} Tf " . sprintf('%.2f', $tx) . " " . sprintf('%.2f', $ty)
            . " Td " . pdfEncodeText($text, $ttfBold) . " Tj ET\n";
        $x += $cw;
    }
    $y = $hdrY;

    // Rows
    foreach ($rows as $ri => $row) {
        $rowY = $y - $rowH;

        // Alternating row background
        if ($ri % 2 === 1) {
            $s .= "0.97 0.97 0.98 rg " . $margin . " " . sprintf('%.2f', $rowY) . " "
                . array_sum($colWidths) . " " . $rowH . " re f 0 0 0 rg\n";
        }

        // Row border (bottom line)
        $s .= "0.85 0.85 0.85 RG 0.5 w " . $margin . " " . sprintf('%.2f', $rowY)
            . " m " . ($margin + array_sum($colWidths)) . " " . sprintf('%.2f', $rowY) . " l S 0 0 0 RG\n";

        $x = $margin;
        $vals = array_values($row);
        foreach ($vals as $i => $val) {
            $cw = $colWidths[$i] ?? 60;
            $tx = $x + 6;
            $ty = $rowY + ($rowH - $fontSize) / 2 + 1;
            $text = truncateText((string)($val ?? ''), $ttf, $fontSize, $cw - 10);
            $s .= "BT /F1 {$fontSize} Tf " . sprintf('%.2f', $tx) . " " . sprintf('%.2f', $ty)
                . " Td 0.15 0.15 0.15 rg " . pdfEncodeText($text, $ttf) . " Tj 0 0 0 rg ET\n";
            $x += $cw;
        }
        $y = $rowY;
    }

    // Footer — page number
    $footerText = 'Strana ' . ($pageIdx + 1) . ' / ' . $totalPages;
    $footerW = textWidth($footerText, $ttf, 8);
    $s .= "BT /F1 8 Tf " . sprintf('%.2f', $pageW - $margin - $footerW) . " "
        . sprintf('%.2f', $margin - 14) . " Td 0.5 0.5 0.5 rg "
        . pdfEncodeText($footerText, $ttf) . " Tj 0 0 0 rg ET\n";

    // Footer — date
    $dateText = 'Exportováno: ' . date('d.m.Y H:i');
    $s .= "BT /F1 8 Tf " . $margin . " " . sprintf('%.2f', $margin - 14)
        . " Td 0.5 0.5 0.5 rg " . pdfEncodeText($dateText, $ttf) . " Tj 0 0 0 rg ET\n";

    return $s;
}

/* ===== ASSEMBLE PDF ===== */

function assemblePdf(array $objects): string {
    $pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
    $offsets = [];

    foreach ($objects as $id => $body) {
        $offsets[$id] = strlen($pdf);
        $pdf .= $id . " 0 obj\n" . $body . "\nendobj\n";
    }

    $xrefOff = strlen($pdf);
    $maxId = max(array_keys($objects));
    $pdf .= "xref\n0 " . ($maxId + 1) . "\n";
    $pdf .= "0000000000 65535 f \n";
    for ($i = 1; $i <= $maxId; $i++) {
        $off = $offsets[$i] ?? 0;
        $pdf .= sprintf("%010d 00000 n \n", $off);
    }

    $pdf .= "trailer\n<< /Size " . ($maxId + 1) . " /Root 1 0 R >>\nstartxref\n" . $xrefOff . "\n%%EOF";
    return $pdf;
}
