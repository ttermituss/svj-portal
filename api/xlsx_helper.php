<?php
/**
 * Minimální XLSX writer — čistý PHP, ZipArchive, žádné závislosti.
 * Použití: $bytes = buildXlsx($headers, $rows, 'Název listu');
 */

function buildXlsx(array $headers, array $rows, string $sheetName = 'List1'): string {
    $colCount = count($headers);
    $sheetXml = xlsxSheet($headers, $rows, $colCount);
    $tmpFile  = tempnam(sys_get_temp_dir(), 'xlsx_');

    $zip = new ZipArchive();
    $zip->open($tmpFile, ZipArchive::OVERWRITE);
    $zip->addFromString('[Content_Types].xml',         xlsxContentTypes());
    $zip->addFromString('_rels/.rels',                 xlsxRels());
    $zip->addFromString('xl/workbook.xml',             xlsxWorkbook($sheetName));
    $zip->addFromString('xl/_rels/workbook.xml.rels',  xlsxWorkbookRels());
    $zip->addFromString('xl/styles.xml',               xlsxStyles());
    $zip->addFromString('xl/worksheets/sheet1.xml',    $sheetXml);
    $zip->close();

    $bytes = file_get_contents($tmpFile);
    unlink($tmpFile);
    return $bytes;
}

function xlsxEsc(string $s): string {
    return htmlspecialchars($s, ENT_XML1 | ENT_QUOTES, 'UTF-8');
}

function xlsxColName(int $idx): string {
    // 0-based index → column letter(s): 0=A, 25=Z, 26=AA, ...
    $name = '';
    $idx++;
    while ($idx > 0) {
        $idx--;
        $name = chr(65 + ($idx % 26)) . $name;
        $idx  = intdiv($idx, 26);
    }
    return $name;
}

function xlsxCell(int $col, int $row, $value): string {
    $ref = xlsxColName($col) . $row;
    if ($value === null || $value === '') {
        return '<c r="' . $ref . '"/>';
    }
    if (is_numeric($value) && !preg_match('/^0\d/', (string)$value)) {
        return '<c r="' . $ref . '" t="n"><v>' . xlsxEsc((string)$value) . '</v></c>';
    }
    return '<c r="' . $ref . '" t="inlineStr"><is><t>' . xlsxEsc((string)$value) . '</t></is></c>';
}

function xlsxRow(int $rowNum, array $cells, bool $bold = false): string {
    $s = $bold ? ' s="1"' : '';
    $xml = '<row r="' . $rowNum . '"' . $s . '>';
    foreach ($cells as $col => $val) {
        $xml .= xlsxCell($col, $rowNum, $val);
    }
    $xml .= '</row>';
    return $xml;
}

function xlsxSheet(array $headers, array $rows, int $colCount): string {
    $xml  = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    $xml .= '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">';

    // Šířky sloupců — 20 znaků jako default
    $xml .= '<cols>';
    for ($i = 1; $i <= $colCount; $i++) {
        $xml .= '<col min="' . $i . '" max="' . $i . '" width="20" customWidth="1"/>';
    }
    $xml .= '</cols>';

    $xml .= '<sheetData>';
    $xml .= xlsxRow(1, $headers, true);
    foreach ($rows as $i => $row) {
        $xml .= xlsxRow($i + 2, array_values($row));
    }
    $xml .= '</sheetData>';
    $xml .= '</worksheet>';
    return $xml;
}

function xlsxContentTypes(): string {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        . '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        . '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        . '<Default Extension="xml" ContentType="application/xml"/>'
        . '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
        . '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        . '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
        . '</Types>';
}

function xlsxRels(): string {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
        . '</Relationships>';
}

function xlsxWorkbook(string $sheetName): string {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        . '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        . '<sheets><sheet name="' . xlsxEsc($sheetName) . '" sheetId="1" r:id="rId1"/></sheets>'
        . '</workbook>';
}

function xlsxWorkbookRels(): string {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
        . '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
        . '</Relationships>';
}

function xlsxStyles(): string {
    // Minimální styles.xml — font tučný (index 1) pro hlavičku
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        . '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        . '<fonts count="2">'
        . '<font><sz val="11"/><name val="Calibri"/></font>'
        . '<font><b/><sz val="11"/><name val="Calibri"/></font>'
        . '</fonts>'
        . '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
        . '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
        . '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
        . '<cellXfs count="2">'
        . '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
        . '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/>'
        . '</cellXfs>'
        . '</styleSheet>';
}
