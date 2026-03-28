/**
 * exportWord.ts — Xuất file Word chuẩn BGD 2025-2026
 * Font: Times New Roman | Math: MathML (Word native) | Khổ: A4
 */

// KaTeX interface (tránh lỗi khi không có @types/katex)
interface KatexStatic {
  renderToString(latex: string, options?: Record<string, unknown>): string;
}

// Cache instance sau khi load lần đầu
let _katex: KatexStatic | null = null;

async function loadKatex(): Promise<KatexStatic | null> {
  if (_katex) return _katex;
  try {
    // Dynamic import — Vite sẽ bundle katex vào chunk riêng
    const mod = await import(/* @vite-ignore */ 'katex');
    _katex = (mod.default || mod) as KatexStatic;
    return _katex;
  } catch {
    // Fallback: thử lấy từ window (khi load từ CDN)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).katex || null;
  }
}

// ============================================================
// TIỆN ÍCH CHUNG
// ============================================================

/** Render LaTeX đồng bộ — dùng sau khi đã preload KaTeX */
function renderMathSync(text: string): string {
  if (!text) return text;
  const k = _katex;
  if (!k) return text; // KaTeX chưa load: trả về LaTeX nguyên bản

  let result = text.replace(/\$\$([^$]+)\$\$/g, (_, latex) => {
    try { return k.renderToString(latex.trim(), { throwOnError: false, output: 'mathml', displayMode: true }); }
    catch { return `<em>${latex}</em>`; }
  });
  result = result.replace(/\$([^$\n]+)\$/g, (_, latex) => {
    try { return k.renderToString(latex.trim(), { throwOnError: false, output: 'mathml', displayMode: false }); }
    catch { return `<em>${latex}</em>`; }
  });
  return result;
}

/** Tải file xuống dưới dạng .doc (Word mở được) */
function downloadWordDoc(htmlBody: string, filename: string, title = '') {
  const fullHtml = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8">
<meta name="ProgId" content="Word.Document">
<meta name="Generator" content="Math Matrix Pro 2026">
<title>${title}</title>
<style>
  @page {
    size: 210mm 297mm;
    margin: 25mm 20mm 25mm 30mm;
    mso-page-orientation: portrait;
  }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 13pt;
    line-height: 1.5;
    color: #000000;
    margin: 0;
    padding: 0;
  }
  h1 { font-size: 14pt; font-weight: bold; text-align: center; margin: 6pt 0; }
  h2 { font-size: 13pt; font-weight: bold; text-align: center; margin: 4pt 0; }
  p  { font-size: 13pt; margin: 3pt 0; }

  /* ── Bảng chuẩn ── */
  table {
    border-collapse: collapse;
    width: 100%;
    font-size: 11pt;
    font-family: 'Times New Roman', Times, serif;
    page-break-inside: avoid;
  }
  th, td {
    border: 1pt solid #000000;
    padding: 3pt 5pt;
    vertical-align: middle;
    text-align: center;
    word-wrap: break-word;
  }
  th {
    background-color: #D9D9D9;
    font-weight: bold;
    font-size: 11pt;
  }
  td.left { text-align: left; }
  td.bold { font-weight: bold; }
  td.total { background-color: #F2F2F2; font-weight: bold; }

  /* ── Đề thi ── */
  .exam-header { text-align: center; margin-bottom: 12pt; }
  .exam-header .school { font-size: 12pt; font-weight: bold; }
  .exam-header .title  { font-size: 14pt; font-weight: bold; text-transform: uppercase; }
  .exam-header .info   { font-size: 12pt; }
  .exam-header .line   { border-top: 1pt solid black; margin: 6pt 0; }

  .phan-header {
    font-size: 13pt;
    font-weight: bold;
    margin-top: 12pt;
    margin-bottom: 4pt;
  }
  .phan-note {
    font-size: 12pt;
    font-style: italic;
    margin-bottom: 6pt;
  }

  .cau {
    margin: 8pt 0;
    page-break-inside: avoid;
  }
  .cau-num { font-weight: bold; }

  .ds-table { width: 100%; border-collapse: collapse; margin: 4pt 0; }
  .ds-table td { border: none; padding: 2pt 4pt; font-size: 12pt; }
  .ds-table .label { font-weight: bold; width: 22pt; }
  .ds-table .dung-sai {
    text-align: right;
    white-space: nowrap;
    width: 60pt;
  }
  .box {
    display: inline-block;
    border: 1pt solid #000;
    width: 30pt;
    text-align: center;
    padding: 1pt 2pt;
    font-size: 10pt;
    margin-left: 4pt;
  }

  .tln-blank {
    display: inline-block;
    border-bottom: 1pt solid #000;
    width: 80pt;
    margin-left: 6pt;
  }

  .dap-an-section {
    margin-top: 20pt;
    border-top: 1pt solid #000;
    padding-top: 8pt;
  }
  .dap-an-table { width: 100%; border-collapse: collapse; font-size: 11pt; }
  .dap-an-table th, .dap-an-table td {
    border: 1pt solid #000;
    padding: 2pt 4pt;
    text-align: center;
  }

  .footer-end { text-align: center; margin-top: 20pt; font-weight: bold; font-style: italic; }

  /* KaTeX MathML — Word renders natively, no CSS needed */
</style>
</head>
<body>
${htmlBody}
</body>
</html>`;

  const blob = new Blob(['\ufeff' + fullHtml], {
    type: 'application/msword; charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ============================================================
// 1. XUẤT MA TRẬN ĐỀ THI
// ============================================================
export function exportMatrixWord(
  data: any[],
  countQuestions: (s: string) => number,
  monHoc = 'Toán',
  lop = '12'
) {
  const LEVEL_NAMES = ['Nhận biết', 'Thông hiểu', 'Vận dụng', 'Vận dụng cao'];

  // Tính tổng toàn bài
  let totalNLC = 0, totalDS = 0, totalTLN = 0;
  const rows: string[] = [];
  let stt = 0;

  data.forEach((chuong: any) => {
    let chuongNLC = 0, chuongDS = 0, chuongTLN = 0;
    const chuongRows: string[] = [];

    chuong.noiDungs.forEach((nd: any, ndIdx: number) => {
      stt++;
      let ndNLC = 0, ndDS = 0, ndTLN = 0;

      // Tính số câu theo mức độ
      const levels = LEVEL_NAMES.map((_, mIdx) => {
        const md = nd.mucDos[mIdx] || {};
        const nlc = countQuestions(md.qs?.nlc || '');
        const ds  = countQuestions(md.qs?.ds  || '');
        const tln = countQuestions(md.qs?.tln || '');
        ndNLC += nlc; ndDS += ds; ndTLN += tln;
        return { nlc, ds, tln };
      });

      chuongNLC += ndNLC; chuongDS += ndDS; chuongTLN += ndTLN;

      // 4 rows con cho 4 mức độ
      LEVEL_NAMES.forEach((mucDo, mIdx) => {
        const { nlc, ds, tln } = levels[mIdx];
        const isFirst = mIdx === 0;
        const rowspan = isFirst ? ` rowspan="4"` : '';
        const rowspanCells = isFirst
          ? `<td${rowspan}>${stt}</td><td class="left"${rowspan}>${chuong.tenChuong}</td><td class="left"${rowspan}>${nd.tenNoiDung}</td>`
          : '';
        chuongRows.push(`<tr>
          ${rowspanCells}
          <td>${mucDo}</td>
          <td>${nlc || ''}</td>
          <td>${ds  || ''}</td>
          <td>${tln || ''}</td>
          <td>${nlc + ds + tln || ''}</td>
        </tr>`);
      });
    });

    rows.push(...chuongRows);

    // Tổng chương
    totalNLC += chuongNLC; totalDS += chuongDS; totalTLN += chuongTLN;
    rows.push(`<tr class="total">
      <td colspan="3" class="bold left">Tổng: ${chuong.tenChuong}</td>
      <td></td>
      <td class="bold">${chuongNLC || ''}</td>
      <td class="bold">${chuongDS  || ''}</td>
      <td class="bold">${chuongTLN || ''}</td>
      <td class="bold">${chuongNLC + chuongDS + chuongTLN}</td>
    </tr>`);
  });

  const body = `
<div class="exam-header">
  <p class="school">SỞ GIÁO DỤC VÀ ĐÀO TẠO</p>
  <h1>MA TRẬN ĐỀ KIỂM TRA</h1>
  <h2>MÔN: ${monHoc} — LỚP ${lop}</h2>
  <p class="info">Năm học 2025-2026</p>
  <div class="line"></div>
</div>

<table>
  <thead>
    <tr>
      <th rowspan="2">STT</th>
      <th rowspan="2">Nội dung<br>kiến thức</th>
      <th rowspan="2">Đơn vị<br>kiến thức</th>
      <th rowspan="2">Mức độ<br>nhận thức</th>
      <th>Câu TNPA<br><small>(Phần I)</small></th>
      <th>Câu Đúng/Sai<br><small>(Phần II)</small></th>
      <th>Trả lời ngắn<br><small>(Phần III)</small></th>
      <th rowspan="2">Tổng<br>câu</th>
    </tr>
    <tr>
      <th>Số câu</th>
      <th>Số câu</th>
      <th>Số câu</th>
    </tr>
  </thead>
  <tbody>
    ${rows.join('\n')}
    <tr class="total">
      <td colspan="3" class="bold">TỔNG TOÀN ĐỀ</td>
      <td></td>
      <td class="bold">${totalNLC}</td>
      <td class="bold">${totalDS}</td>
      <td class="bold">${totalTLN}</td>
      <td class="bold">${totalNLC + totalDS + totalTLN}</td>
    </tr>
    <tr>
      <td colspan="3" class="bold">Tỉ lệ %</td>
      <td></td>
      <td>${totalNLC + totalDS + totalTLN > 0 ? Math.round(totalNLC * 100 / (totalNLC + totalDS + totalTLN)) : 0}%</td>
      <td>${totalNLC + totalDS + totalTLN > 0 ? Math.round(totalDS  * 100 / (totalNLC + totalDS + totalTLN)) : 0}%</td>
      <td>${totalNLC + totalDS + totalTLN > 0 ? Math.round(totalTLN * 100 / (totalNLC + totalDS + totalTLN)) : 0}%</td>
      <td>100%</td>
    </tr>
  </tbody>
</table>

<p style="margin-top:16pt; font-size:12pt;">
  <strong>Ghi chú:</strong> TNPA: Trắc nghiệm nhiều phương án; Đúng/Sai: Câu trắc nghiệm đúng sai 4 phát biểu; TLN: Câu trả lời ngắn.
</p>`;

  downloadWordDoc(body, `ma-tran-de-thi-${monHoc.toLowerCase()}.doc`, `Ma trận đề thi ${monHoc}`);
}

// ============================================================
// 2. XUẤT MA TRẬN ĐẶC TẢ
// ============================================================
export function exportSpecMatrixWord(
  data: any[],
  countQuestions: (s: string) => number,
  monHoc = 'Toán',
  lop = '12'
) {
  const LEVEL_NAMES = ['Nhận biết', 'Thông hiểu', 'Vận dụng', 'Vận dụng cao'];
  const rows: string[] = [];
  let stt = 0;

  data.forEach((chuong: any) => {
    // Header chương
    rows.push(`<tr>
      <td colspan="7" class="bold left" style="background:#E8E8E8;">
        ${chuong.tenChuong}
      </td>
    </tr>`);

    chuong.noiDungs.forEach((nd: any) => {
      stt++;

      LEVEL_NAMES.forEach((mucDo, mIdx) => {
        const md = nd.mucDos[mIdx] || {};
        const nlc = countQuestions(md.qs?.nlc || '');
        const ds  = countQuestions(md.qs?.ds  || '');
        const tln = countQuestions(md.qs?.tln || '');
        const yeuCau = md.yeuCau || `Yêu cầu cần đạt ở mức ${mucDo.toLowerCase()} của ${nd.tenNoiDung}.`;

        const isFirst = mIdx === 0;
        const rowspan = isFirst ? ` rowspan="4"` : '';
        const rowspanCells = isFirst
          ? `<td${rowspan} style="text-align:center;">${stt}</td>
             <td class="left"${rowspan}><strong>${nd.tenNoiDung}</strong></td>`
          : '';

        rows.push(`<tr>
          ${rowspanCells}
          <td>${mucDo}</td>
          <td class="left" style="font-size:10pt;">${yeuCau}</td>
          <td>${nlc || ''}</td>
          <td>${ds  || ''}</td>
          <td>${tln || ''}</td>
        </tr>`);
      });
    });
  });

  const body = `
<div class="exam-header">
  <p class="school">SỞ GIÁO DỤC VÀ ĐÀO TẠO</p>
  <h1>BẢNG ĐẶC TẢ ĐỀ KIỂM TRA</h1>
  <h2>MÔN: ${monHoc} — LỚP ${lop}</h2>
  <p class="info">Năm học 2025-2026</p>
  <div class="line"></div>
</div>

<table>
  <thead>
    <tr>
      <th rowspan="2" style="width:30pt;">STT</th>
      <th rowspan="2">Nội dung/Đơn vị kiến thức</th>
      <th rowspan="2">Mức độ</th>
      <th rowspan="2">Yêu cầu cần đạt</th>
      <th colspan="3">Số câu hỏi</th>
    </tr>
    <tr>
      <th>TNPA</th>
      <th>Đúng/Sai</th>
      <th>TLN</th>
    </tr>
  </thead>
  <tbody>
    ${rows.join('\n')}
  </tbody>
</table>

<p style="margin-top:16pt; font-size:12pt; font-style:italic;">
  Bảng đặc tả được lập theo Thông tư số 22/2021/TT-BGDĐT và cấu trúc đề thi THPT năm 2025-2026.
</p>`;

  downloadWordDoc(body, `bang-dac-ta-${monHoc.toLowerCase()}.doc`, `Bảng đặc tả ${monHoc}`);
}

// ============================================================
// 3. XUẤT ĐỀ THI
// ============================================================
export async function exportExamWord(
  exam: any[],
  monHoc = 'Toán',
  lop = '12',
  thoiGian = '90',
  truong = 'TRƯỜNG THPT ...',
  maDeThiNum = '001'
) {
  if (!exam || exam.length === 0) {
    alert('Chưa có đề thi! Vui lòng tạo đề thi trước.');
    return;
  }
  // Pre-load KaTeX để renderMathSync hoạt động đúng
  await loadKatex();

  const phanI  = exam.filter(q => q.phan === 'I');
  const phanII = exam.filter(q => q.phan === 'II');
  const phanIII= exam.filter(q => q.phan === 'III');

  // ── Phần I: Trắc nghiệm nhiều phương án ──
  const buildPhanI = () => {
    if (phanI.length === 0) return '';
    const items = phanI.map((q, i) => {
      const stt = i + 1;
      const noiDung = renderMathSync(q.noiDung || `Câu hỏi trắc nghiệm ${stt}.`);
      const options = ['A', 'B', 'C', 'D'].map(opt =>
        `<td style="width:22%;">${opt}. <span style="opacity:0.5">...</span></td>`
      ).join('');
      return `<div class="cau">
        <p class="cau-num">Câu ${stt}. <span style="font-weight:normal;">${noiDung}</span></p>
        <table style="width:100%; border:none; margin-top:2pt;">
          <tr style="border:none;">${options}</tr>
        </table>
      </div>`;
    });
    return `
<p class="phan-header">PHẦN I. TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN ĐÚNG (${phanI.length} câu)</p>
<p class="phan-note">Thí sinh chọn đáp án đúng nhất (A, B, C hoặc D).</p>
${items.join('\n')}`;
  };

  // ── Phần II: Đúng/Sai ──
  const buildPhanII = () => {
    if (phanII.length === 0) return '';
    const offset = phanI.length;
    const items = phanII.map((q, i) => {
      const stt = offset + i + 1;
      const context = renderMathSync(q.context || q.noiDung || `Câu Đúng/Sai ${i + 1}.`);
      const stmtLabels = ['a', 'b', 'c', 'd'];

      const stmtRows = (q.statements || [{text:'Mệnh đề a.'},{text:'Mệnh đề b.'},{text:'Mệnh đề c.'},{text:'Mệnh đề d.'}])
        .map((stmt: any, li: number) => {
          const stmtText = renderMathSync(stmt.text || `Mệnh đề ${stmtLabels[li]}.`);
          return `<tr>
            <td class="label" style="width:16pt; font-weight:bold; border:none; padding:2pt 4pt; vertical-align:top;">${stmtLabels[li]})</td>
            <td style="border:none; text-align:left; padding:2pt 4pt;">${stmtText}</td>
            <td style="border:none; white-space:nowrap; text-align:right; padding:2pt 4pt; width:70pt;">
              <span class="box">Đúng</span> <span class="box">Sai</span>
            </td>
          </tr>`;
        }).join('');

      return `<div class="cau">
        <p class="cau-num">Câu ${stt}. <span style="font-weight:normal;">${context}</span></p>
        <table class="ds-table">${stmtRows}</table>
      </div>`;
    });

    return `
<p class="phan-header">PHẦN II. TRẮC NGHIỆM ĐÚNG/SAI (${phanII.length} câu)</p>
<p class="phan-note">Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn <strong>Đúng</strong> hoặc <strong>Sai</strong>.</p>
${items.join('\n')}`;
  };

  // ── Phần III: Trả lời ngắn ──
  const buildPhanIII = () => {
    if (phanIII.length === 0) return '';
    const offset = phanI.length + phanII.length;
    const items = phanIII.map((q, i) => {
      const stt = offset + i + 1;
      const noiDung = renderMathSync(q.noiDung || `Câu trả lời ngắn ${i + 1}.`);
      return `<div class="cau">
        <p class="cau-num">Câu ${stt}. <span style="font-weight:normal;">${noiDung}</span></p>
        <p style="margin-top:4pt;">Trả lời: <span class="tln-blank">&nbsp;</span></p>
      </div>`;
    });

    return `
<p class="phan-header">PHẦN III. TRẢ LỜI NGẮN (${phanIII.length} câu)</p>
<p class="phan-note">Thí sinh viết đáp án vào ô trống tương ứng.</p>
${items.join('\n')}`;
  };

  // ── Đáp án ──
  const buildDapAn = () => {
    // Phần I
    const dapAnI = phanI.map((q, i) =>
      `<td style="border:1pt solid #000; padding:2pt 4pt; text-align:center;">${i + 1}</td>` +
      `<td style="border:1pt solid #000; padding:2pt 4pt; text-align:center; font-weight:bold;">${q.dapAn || 'A'}</td>`
    ).join('');

    // Phần II
    const dapAnII = phanII.map((q, i) => {
      const offset = phanI.length;
      const stmts = (q.statements || []).map((s: any, li: number) =>
        `${['a','b','c','d'][li]}) ${s.answer || '?'}`
      ).join(', ');
      return `<tr>
        <td style="border:1pt solid #000; padding:2pt 4pt; text-align:center;">${offset + i + 1}</td>
        <td style="border:1pt solid #000; padding:2pt 4pt; text-align:left; font-size:10pt;">${stmts}</td>
      </tr>`;
    }).join('');

    // Phần III
    const dapAnIII = phanIII.map((q, i) => {
      const offset = phanI.length + phanII.length;
      return `<tr>
        <td style="border:1pt solid #000; padding:2pt 4pt; text-align:center;">${offset + i + 1}</td>
        <td style="border:1pt solid #000; padding:2pt 4pt; font-size:10pt;">${renderMathSync(q.dapAn || '...')}</td>
      </tr>`;
    }).join('');

    return `
<div class="dap-an-section" style="page-break-before: always;">
  <h2 style="text-align:center; margin-bottom:8pt;">ĐÁP ÁN — MÃ ĐỀ ${maDeThiNum}</h2>
  
  <p><strong>Phần I. Trắc nghiệm nhiều phương án:</strong></p>
  <table style="border-collapse:collapse; font-size:11pt; margin-bottom:8pt;">
    <tr>${dapAnI}</tr>
  </table>

  <p style="margin-top:8pt;"><strong>Phần II. Đúng/Sai:</strong></p>
  <table style="border-collapse:collapse; width:60%; font-size:11pt; margin-bottom:8pt;">
    <tr>
      <th style="border:1pt solid #000; padding:2pt 8pt; background:#D9D9D9;">Câu</th>
      <th style="border:1pt solid #000; padding:2pt 8pt; background:#D9D9D9;">Đáp án (a, b, c, d)</th>
    </tr>
    ${dapAnII}
  </table>

  <p style="margin-top:8pt;"><strong>Phần III. Trả lời ngắn:</strong></p>
  <table style="border-collapse:collapse; width:60%; font-size:11pt;">
    <tr>
      <th style="border:1pt solid #000; padding:2pt 8pt; background:#D9D9D9;">Câu</th>
      <th style="border:1pt solid #000; padding:2pt 8pt; background:#D9D9D9;">Đáp án</th>
    </tr>
    ${dapAnIII}
  </table>
</div>`;
  };

  const body = `
<div class="exam-header">
  <table style="width:100%; border:none; font-size:12pt;">
    <tr>
      <td style="border:none; text-align:left; width:50%; vertical-align:top;">
        <strong>${truong.toUpperCase()}</strong><br>
        <strong>Tổ: Toán</strong>
      </td>
      <td style="border:none; text-align:right; width:50%; vertical-align:top;">
        <strong>MÃ ĐỀ: ${maDeThiNum}</strong>
      </td>
    </tr>
  </table>

  <div class="line"></div>

  <h1>ĐỀ KIỂM TRA</h1>
  <h2>MÔN: ${monHoc.toUpperCase()} — LỚP ${lop}</h2>
  <p class="info">
    Thời gian làm bài: <strong>${thoiGian} phút</strong> 
    (không kể thời gian phát đề)
  </p>
  <p class="info" style="font-style:italic;">
    Thí sinh không được sử dụng tài liệu. Giám thị không giải thích gì thêm.
  </p>

  <div class="line"></div>

  <table style="width:100%; border:1pt solid #000; border-collapse:collapse; margin-top:6pt; font-size:12pt;">
    <tr>
      <td style="border:1pt solid #000; padding:4pt 8pt; text-align:center; width:50%;">
        <strong>Họ và tên:</strong> ........................................................................
      </td>
      <td style="border:1pt solid #000; padding:4pt 8pt; text-align:center; width:25%;">
        <strong>Số báo danh:</strong> ......................
      </td>
      <td style="border:1pt solid #000; padding:4pt 8pt; text-align:center; width:25%;">
        <strong>Lớp:</strong> ......................
      </td>
    </tr>
  </table>
</div>

${buildPhanI()}
${buildPhanII()}
${buildPhanIII()}

<p class="footer-end">— HẾT —</p>
<p style="text-align:center; font-size:11pt; font-style:italic;">
  (Đề thi gồm ${exam.length} câu hỏi trên ${Math.ceil(exam.length / 15)} trang)
</p>

${buildDapAn()}`;

  downloadWordDoc(body, `de-thi-${monHoc.toLowerCase()}-ma${maDeThiNum}.doc`, `Đề thi ${monHoc} Lớp ${lop}`);
}
