// ============================================================
// ورقة القرار الإداري — تُعبّأ تلقائيًا من بيانات الطلب
// ============================================================
// في رابط المعاينة لا يمكن فتح نافذة الطباعة، فيُضبط هذا المتغير هناك
const PRINT_SUPPORTED = !window.__PREVIEW_NO_PRINT__;

const toArabicDigits = n => String(n).replace(/\d/g, x => "٠١٢٣٤٥٦٧٨٩"[x]);

function formatDecisionDate(iso){
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("ar-SA-u-ca-gregory", { year:"numeric", month:"2-digit", day:"2-digit" }) + " م";
}

function renderDecisionSheet(r){
  const d = r.data;
  const emps = getEmployees(d);
  const plural = emps.length > 1;
  const clauses = [
    plural ? "نقل الموظفين بين وحدات حسب ما هو موضح قرين كل اسم."
           : "نقل الموظف بين وحدات حسب ما هو موضح قرين اسمه.",
    isSelfRequest(d) ? "النقل بناءً على طلب الموظف." : "النقل لمصلحة العمل.",
    "على جهات الاختصاص تنفيذ مقتضاه اعتباراً من تاريخه."
  ];
  const ordinals = ["أولاً","ثانياً","ثالثاً","رابعاً"];

  const rowCount = Math.max(emps.length, DECISION_CONFIG.minTableRows);
  const rows = Array.from({length: rowCount}, (_, i) => {
    const e = emps[i];
    return `<tr><td>${toArabicDigits(i + 1)}</td>` + (e
      ? `<td>${esc(e.name)}</td><td>${esc(e.employeeId)}</td><td>${esc(e.jobTitle)}</td><td>نقل</td><td>${esc(targetLabel(e))}</td>`
      : `<td></td><td></td><td></td><td></td><td></td>`) + `</tr>`;
  }).join("");

  return `<div class="decision-sheet" id="decisionSheet">
    <section class="ds-page">
      <div class="ds-watermark" aria-hidden="true">نسخة تجريبية</div>
      <div class="ds-head">
        <img src="assets/images/logo.png" alt="المؤسسة العامة للري">
        <div class="ds-meta">طلب رقم: ${toArabicDigits(r.id)}<br>التاريخ: ${esc(formatDecisionDate(d.decisionDate)) || "—"}</div>
      </div>
      <h3 class="ds-title">قـرار إداري</h3>
      <p class="ds-line">إن ${esc(DECISION_CONFIG.issuerTitle)}،</p>
      <p class="ds-line">بناءً على الصلاحيات المخولة له،</p>
      <p class="ds-line">وبناءً على ما تقتضيه مصلحة العمل،</p>
      <p class="ds-decides">يقرر ما يلي</p>
      ${clauses.map((c, i) => `<p class="ds-line">${ordinals[i]}: ${c}</p>`).join("")}
      <div class="ds-sign">
        <div>${esc(DECISION_CONFIG.issuerTitle)}</div>
        <div class="ds-sign-name">${esc(DECISION_CONFIG.signatory)}</div>
      </div>
      <div class="ds-copies">${DECISION_CONFIG.copies.map(c => `<div>${esc(c)}</div>`).join("")}</div>
    </section>
    <section class="ds-page ds-annex">
      <div class="ds-watermark" aria-hidden="true">نسخة تجريبية</div>
      <div class="ds-table-wrap">
        <table class="ds-table">
          <thead><tr><th>م</th><th>الاسم</th><th>رقم الوظيفة</th><th>المسمى الوظيفي</th><th>الإجراء</th><th>الوحدة المنقول لها</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>
  </div>
  ${PRINT_SUPPORTED
    ? `<button class="btn btn-ghost btn-print" onclick="printDecision()">🖨️ طباعة القرار الإداري</button>`
    : `<p class="print-note">الطباعة متاحة عند تشغيل النظام من ملفاته (index.html)، ولا تعمل في رابط المعاينة.</p>`}`;
}

function printDecision(){
  const sheet = document.getElementById("decisionSheet");
  const host = document.getElementById("printHost");
  if (!sheet || !host) return;
  host.innerHTML = sheet.outerHTML;
  document.body.classList.add("print-decision");
  const done = () => { document.body.classList.remove("print-decision"); host.innerHTML = ""; window.removeEventListener("afterprint", done); };
  window.addEventListener("afterprint", done);
  window.print();
}
