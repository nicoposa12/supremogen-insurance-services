/**
 * Zero-dependency Excel (.xls / XML Spreadsheet 2003) export utility.
 * Generates compact, compressed spreadsheets with tight autofit column widths
 * based on the last letter/number, left alignment, alternating zebra striping,
 * and automatic clickable hyperlinks with blue underline highlight for URLs and file attachments.
 */

export type ExcelCell = string | number | { text: string; url: string } | null | undefined;

function escapeXml(str: any): string {
  if (str == null) return '';
  const val = typeof str === 'object' && 'text' in str ? str.text : str;
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getDisplayString(val: any): string {
  if (val == null) return '';
  if (typeof val === 'number') {
    return val % 1 === 0
      ? val.toLocaleString('en-US')
      : val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (typeof val === 'object' && 'text' in val) {
    return String(val.text ?? '');
  }
  return String(val);
}

function isWebLink(val: any): boolean {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('www.') ||
    /^facebook\.com/i.test(trimmed) ||
    /^fb\.com/i.test(trimmed)
  );
}

function normalizeUrl(val: string): string {
  const trimmed = val.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function exportToExcelXml(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: ExcelCell[][]
) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<?mso-application progid="Excel.Sheet"?>\n';
  xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
  xml += ' xmlns:o="urn:schemas-microsoft-com:office:office"\n';
  xml += ' xmlns:x="urn:schemas-microsoft-com:office:excel"\n';
  xml += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n';
  xml += ' xmlns:html="http://www.w3.org/TR/REC-html40">\n';

  // Document Properties
  xml += ' <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">\n';
  xml += '  <Author>Supremogen Insurance Services</Author>\n';
  xml += `  <Created>${new Date().toISOString()}</Created>\n`;
  xml += ' </DocumentProperties>\n';

  // Styles
  xml += ' <Styles>\n';

  // Default Style
  xml += '  <Style ss:ID="Default" ss:Name="Normal">\n';
  xml += '   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>\n';
  xml += '   <Borders/>\n';
  xml += '   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="9.5" ss:Color="#1E293B"/>\n';
  xml += '   <Interior/>\n';
  xml += '   <NumberFormat/>\n';
  xml += '   <Protection/>\n';
  xml += '  </Style>\n';

  // Header Style (Burgundy #4A0E17, Left-aligned, Bold White, Subtle Border)
  xml += '  <Style ss:ID="HeaderStyle">\n';
  xml += '   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>\n';
  xml += '   <Borders>\n';
  xml += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3D0B12"/>\n';
  xml += '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3D0B12"/>\n';
  xml += '    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3D0B12"/>\n';
  xml += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3D0B12"/>\n';
  xml += '   </Borders>\n';
  xml += '   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="9.5" ss:Color="#FFFFFF" ss:Bold="1"/>\n';
  xml += '   <Interior ss:Color="#4A0E17" ss:Pattern="Solid"/>\n';
  xml += '  </Style>\n';

  // Data Row Style (White Row, Left-aligned, Thin Border)
  xml += '  <Style ss:ID="DataStyle">\n';
  xml += '   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>\n';
  xml += '   <Borders>\n';
  xml += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>\n';
  xml += '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>\n';
  xml += '    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>\n';
  xml += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>\n';
  xml += '   </Borders>\n';
  xml += '   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="9.5" ss:Color="#1E293B"/>\n';
  xml += '   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>\n';
  xml += '  </Style>\n';

  // Data Row Alternate Style (Soft Tint #F8FAFC, Left-aligned, Thin Border)
  xml += '  <Style ss:ID="DataStyleAlt">\n';
  xml += '   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>\n';
  xml += '   <Borders>\n';
  xml += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>\n';
  xml += '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>\n';
  xml += '    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>\n';
  xml += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>\n';
  xml += '   </Borders>\n';
  xml += '   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="9.5" ss:Color="#1E293B"/>\n';
  xml += '   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>\n';
  xml += '  </Style>\n';

  // Number / Currency Style (White Row, Left-aligned, Formatted #,##0.##, Thin Border)
  xml += '  <Style ss:ID="CurrencyStyle">\n';
  xml += '   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>\n';
  xml += '   <Borders>\n';
  xml += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>\n';
  xml += '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>\n';
  xml += '    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>\n';
  xml += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>\n';
  xml += '   </Borders>\n';
  xml += '   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="9.5" ss:Color="#1E293B"/>\n';
  xml += '   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>\n';
  xml += '   <NumberFormat ss:Format="#,##0.##"/>\n';
  xml += '  </Style>\n';

  // Number / Currency Alternate Style (Soft Tint #F8FAFC, Left-aligned, Formatted #,##0.##, Thin Border)
  xml += '  <Style ss:ID="CurrencyStyleAlt">\n';
  xml += '   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>\n';
  xml += '   <Borders>\n';
  xml += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>\n';
  xml += '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>\n';
  xml += '    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>\n';
  xml += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>\n';
  xml += '   </Borders>\n';
  xml += '   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="9.5" ss:Color="#1E293B"/>\n';
  xml += '   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>\n';
  xml += '   <NumberFormat ss:Format="#,##0.##"/>\n';
  xml += '  </Style>\n';

  // Link Style (White Row, Left-aligned, Blue #1D4ED8, Underline)
  xml += '  <Style ss:ID="LinkStyle">\n';
  xml += '   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>\n';
  xml += '   <Borders>\n';
  xml += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>\n';
  xml += '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>\n';
  xml += '    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>\n';
  xml += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>\n';
  xml += '   </Borders>\n';
  xml += '   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="9.5" ss:Color="#1D4ED8" ss:Underline="Single"/>\n';
  xml += '   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>\n';
  xml += '  </Style>\n';

  // Link Alternate Style (Soft Tint #F8FAFC, Left-aligned, Blue #1D4ED8, Underline)
  xml += '  <Style ss:ID="LinkStyleAlt">\n';
  xml += '   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>\n';
  xml += '   <Borders>\n';
  xml += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>\n';
  xml += '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>\n';
  xml += '    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>\n';
  xml += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>\n';
  xml += '   </Borders>\n';
  xml += '   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="9.5" ss:Color="#1D4ED8" ss:Underline="Single"/>\n';
  xml += '   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>\n';
  xml += '  </Style>\n';

  // Attachment Link Style (White Row, Left-aligned, Emerald/Blue #0D9488, Underline)
  xml += '  <Style ss:ID="AttachmentStyle">\n';
  xml += '   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>\n';
  xml += '   <Borders>\n';
  xml += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>\n';
  xml += '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>\n';
  xml += '    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>\n';
  xml += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>\n';
  xml += '   </Borders>\n';
  xml += '   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="9.5" ss:Color="#0369A1" ss:Underline="Single"/>\n';
  xml += '   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>\n';
  xml += '  </Style>\n';

  // Attachment Link Alternate Style (Soft Tint #F8FAFC, Left-aligned, Emerald/Blue #0D9488, Underline)
  xml += '  <Style ss:ID="AttachmentStyleAlt">\n';
  xml += '   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>\n';
  xml += '   <Borders>\n';
  xml += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>\n';
  xml += '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>\n';
  xml += '    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>\n';
  xml += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>\n';
  xml += '   </Borders>\n';
  xml += '   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="9.5" ss:Color="#0369A1" ss:Underline="Single"/>\n';
  xml += '   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>\n';
  xml += '  </Style>\n';

  xml += ' </Styles>\n';

  // Worksheet
  xml += ` <Worksheet ss:Name="${escapeXml(sheetName || 'Insurance Requests')}">\n`;
  xml += '  <Table ss:DefaultRowHeight="18">\n';

  // Column Widths: Compressed & snug to the last character without empty gap space
  headers.forEach((header, colIdx) => {
    let maxLen = header.length;
    rows.forEach((row) => {
      const displayStr = getDisplayString(row[colIdx]);
      if (displayStr.length > maxLen) maxLen = displayStr.length;
    });
    // Snug measurement: ~5.8pt per character + 8pt margin fits closely to the last letter/number
    const width = Math.min(Math.max(Math.round(maxLen * 5.8 + 8), 28), 240);
    xml += `   <Column ss:AutoFitWidth="1" ss:Width="${width}"/>\n`;
  });

  // Header Row (Height 22)
  xml += '   <Row ss:Height="22">\n';
  headers.forEach((header) => {
    xml += `    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">${escapeXml(header)}</Data></Cell>\n`;
  });
  xml += '   </Row>\n';

  // Data Rows (Height 18 - compact with alternating zebra striping and active hyperlinks)
  rows.forEach((row, rowIdx) => {
    const isAlt = rowIdx % 2 === 1;
    const dataStyleId = isAlt ? 'DataStyleAlt' : 'DataStyle';
    const currStyleId = isAlt ? 'CurrencyStyleAlt' : 'CurrencyStyle';
    const linkStyleId = isAlt ? 'LinkStyleAlt' : 'LinkStyle';
    const attStyleId = isAlt ? 'AttachmentStyleAlt' : 'AttachmentStyle';

    xml += '   <Row ss:Height="18">\n';
    row.forEach((val) => {
      if (typeof val === 'number') {
        xml += `    <Cell ss:StyleID="${currStyleId}"><Data ss:Type="Number">${val}</Data></Cell>\n`;
      } else if (val && typeof val === 'object' && 'text' in val && 'url' in val) {
        const href = normalizeUrl(String(val.url));
        xml += `    <Cell ss:StyleID="${attStyleId}" ss:HRef="${escapeXml(href)}"><Data ss:Type="String">${escapeXml(val.text)}</Data></Cell>\n`;
      } else if (typeof val === 'string' && isWebLink(val)) {
        const href = normalizeUrl(val);
        xml += `    <Cell ss:StyleID="${linkStyleId}" ss:HRef="${escapeXml(href)}"><Data ss:Type="String">${escapeXml(val)}</Data></Cell>\n`;
      } else {
        const textVal = val && typeof val === 'object' && 'text' in val ? (val as { text: unknown }).text : (val ?? '');
        xml += `    <Cell ss:StyleID="${dataStyleId}"><Data ss:Type="String">${escapeXml(textVal)}</Data></Cell>\n`;
      }
    });
    xml += '   </Row>\n';
  });

  xml += '  </Table>\n';
  xml += ' </Worksheet>\n';
  xml += '</Workbook>';

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.xls') ? filename : `${filename}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
