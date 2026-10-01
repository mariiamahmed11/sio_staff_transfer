// ============================================================
// 7) الرسم
// ============================================================
function statusPhraseAndColor(r){
  const st = FORM_SCHEMAS[r.currentState];
  if (st.terminal === "ok") return { text:"تمت", cls:"status-done" };
  if (st.terminal === "bad") return { text:"مرفوضة", cls:"status-rejected" };
  // الموظف المطلوب نقله لا يرى تسلسل الإجراءات
  if (selectedRole === ROLE.employee)
    return { text: r.currentState === "employee" ? "بانتظار موافقتك" : "قيد الإجراء", cls:"status-open" };
  const who = st.actor === ROLE.planner && r.data.assignedPlanner ? `${st.actor} — ${r.data.assignedPlanner}` : st.actor;
  return { text:"مسندة إلى: " + who, cls:"status-open" };
}

function turnLabel(r){
  const st = FORM_SCHEMAS[r.currentState];
  if (canAct(r)) return `<span class="turn-chip">🔔 دورك الآن</span>`;
  if (!st.terminal && st.actor === ROLE.planner && selectedRole === ROLE.planner) return `<span class="view-chip">للاطلاع</span>`;
  return "—";
}

let boardSearch = "";
function searchBoard(term){
  boardSearch = term;
  renderRequestsBoard();
  const box = document.getElementById("boardSearch");
  if (box){ box.focus(); box.setSelectionRange(box.value.length, box.value.length); }
}

function renderRequestsBoard(){
  const host = document.getElementById("requestsList");
  const newBtn = document.getElementById("newReqBtn");
  newBtn.hidden = selectedRole !== ROLE.applicant;

  const visible = visibleRequests();
  if (!visible.length){
    host.innerHTML = `<div class="empty-board">${currentView === "applicant"
      ? "لا توجد طلبات بعد — ابدأ بزر «طلب جديد»."
      : currentView === "approvals" ? "لا توجد طلبات موافقة مسندة إلى هذا الدور حاليًا."
      : "لا توجد طلبات نقل بعد."}</div>`;
    return;
  }
  const term = boardSearch.trim();
  const sorted = [...visible]
    .filter(r => !term || getEmployees(r.data).some(e => matchesEmployee(e, term)))
    .sort((a, b) => (canAct(b) ? 1 : 0) - (canAct(a) ? 1 : 0));
  const hidePlanner = selectedRole === ROLE.employee;
  const search = `<input type="search" id="boardSearch" class="board-search" value="${esc(boardSearch)}"
    placeholder="🔍 ابحث في الطلبات بالرقم الوظيفي أو اسم الموظف" oninput="searchBoard(this.value)" aria-label="بحث في الطلبات">`;

  const rows = sorted.length ? sorted.map(r => {
    const { text, cls } = statusPhraseAndColor(r);
    const planner = hidePlanner ? "—" : (r.data.assignedPlanner ? esc(r.data.assignedPlanner) : `<span class="muted">لم يُسند بعد</span>`);
    return `<tr class="${cls} ${r.id === selectedRequestId ? "selected" : ""}" onclick="toggleRequest(${r.id})">
      <td class="rq-num-cell">#${r.id}</td>
      <td>${esc(employeesSummary(r.data)) || '<span class="muted">—</span>'}</td>
      <td>${planner}</td>
      <td>${esc(text)}</td>
      <td>${turnLabel(r)}</td>
    </tr>`;
  }).join("") : `<tr><td colspan="5" class="muted">لا توجد طلبات لموظف يطابق «${esc(term)}».</td></tr>`;

  host.innerHTML = search + `<div class="table-scroll"><table class="req-table">
    <thead><tr><th>رقم الطلب</th><th>الموظف</th><th>مسؤول التخطيط</th><th>الحالة</th><th>دورك الآن</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

function renderBanner(r){
  const host = document.getElementById("bannerHost");
  const st = r && FORM_SCHEMAS[r.currentState];
  if (!st || !st.terminal){ host.innerHTML = ""; return; }
  if (st.terminal === "ok"){
    host.innerHTML = `<div class="banner ok">✅<div><b>اكتمل الطلب #${r.id} بنجاح</b>صدر القرار الإداري وأُغلق الطلب.</div></div>`;
  } else {
    host.innerHTML = `<div class="banner bad">⛔<div><b>أُغلق الطلب #${r.id} بالرفض</b>${esc(r.lastReason || "تم رفض الطلب.")}</div></div>`;
  }
}

// ---------- الحقول ----------
function renderEmployeePicker(f, reqId, d){
  if (isSelfRequest(d))
    return `<input type="text" id="f-${f.key}-${reqId}" value="${esc(d.employeeId)}" readonly class="auto-filled">`;
  const term = pickerSearch[reqId] || "";
  const list = allowedEmployees(d).filter(e => matchesEmployee(e, term) || e.employeeId === d.employeeId);
  const opts = list.map(e =>
    `<option value="${esc(e.employeeId)}" ${d.employeeId === e.employeeId ? "selected" : ""}>${esc(e.employeeId)} — ${esc(e.name)}</option>`).join("");
  return `<div class="picker">
    <input type="search" id="search-${reqId}" class="picker-search" value="${esc(term)}"
      placeholder="🔍 ابحث بالرقم الوظيفي أو الاسم" oninput="searchEmployee(${reqId}, this.value)" aria-label="بحث عن موظف">
    <select id="f-${f.key}-${reqId}" onchange="pickEmployee(${reqId}, this.value)">
      <option value="" ${!d.employeeId ? "selected" : ""}>${list.length ? "اختر الرقم الوظيفي..." : "لا توجد نتائج مطابقة للبحث"}</option>${opts}</select>
  </div>`;
}

function renderEmployeeTable(reqId, d){
  const rows = d.employees || [];
  const ids = EMPLOYEE_DIRECTORY.map(e => `<option value="${esc(e.employeeId)}">${esc(e.name)}</option>`).join("");
  const body = rows.map((row, i) => `<tr>
    <td class="row-num">${i + 1}</td>
    ${TABLE_COLUMNS.map((c, ci) => `<td><input type="text" id="t-${reqId}-${i}-${c.key}" value="${esc(row[c.key])}"
      ${c.key === "employeeId" ? `list="empIds" onchange="rowIdChanged(${reqId},${i})"` : ""}
      oninput="updateRow(${reqId},${i},'${c.key}',this.value)"
      onpaste="handleTablePaste(event,${reqId},${i},${ci})"
      aria-label="${esc(c.label)} — الصف ${i + 1}"></td>`).join("")}
    <td><button type="button" class="row-del" onclick="removeRow(${reqId},${i})" aria-label="حذف الصف ${i + 1}">✕</button></td>
  </tr>`).join("");
  return `<datalist id="empIds">${ids}</datalist>
    <div class="table-scroll"><table class="emp-table">
      <thead><tr><th>#</th>${TABLE_COLUMNS.map(c => `<th>${esc(c.label)}${c.required ? '<span class="req-mark">*</span>' : ""}</th>`).join("")}<th></th></tr></thead>
      <tbody>${body}</tbody>
    </table></div>
    <button type="button" class="btn btn-ghost btn-sm" onclick="addRow(${reqId})">+ إضافة صف</button>`;
}

function renderFieldHTML(f, reqId, d){
  const req = f.required ? '<span class="req-mark">*</span>' : '';
  const val = d[f.key];
  const id = `f-${f.key}-${reqId}`;
  let inner = "";
  switch (f.type){
    case "text":
      inner = f.readonly
        ? `<input type="text" id="${id}" value="${esc(val)}" readonly class="auto-filled" placeholder="تُعبّأ تلقائيًا">`
        : `<input type="text" id="${id}" value="${esc(val)}" oninput="updateField(${reqId},'${f.key}',this.value)">`;
      break;
    case "date":
      inner = `<input type="date" id="${id}" value="${esc(val)}" oninput="updateField(${reqId},'${f.key}',this.value)">`; break;
    case "textarea":
      inner = `<textarea id="${id}" oninput="updateField(${reqId},'${f.key}',this.value)">${esc(val)}</textarea>`; break;
    case "select":
      inner = `<select id="${id}" onchange="updateField(${reqId},'${f.key}',this.value)">
        <option value="" ${!val ? "selected" : ""} disabled>اختر...</option>
        ${f.options.map(o => `<option value="${esc(o)}" ${val === o ? "selected" : ""}>${esc(o)}</option>`).join("")}
      </select>`; break;
    case "radio":
      inner = `<div class="opt-row">${f.options.map((o, i) => `
        <label class="opt-item"><input type="radio" id="${id}-${i}" name="${f.key}_${reqId}" value="${esc(o)}" ${val === o ? "checked" : ""} onchange="updateField(${reqId},'${f.key}',this.value)">${esc(o)}</label>`).join("")}</div>`; break;
    case "checkbox":
      inner = `<div class="opt-row">${f.options.map((o, i) => `
        <label class="opt-item"><input type="checkbox" id="${id}-${i}" ${Array.isArray(val) && val.includes(o) ? "checked" : ""} onchange="toggleCheck(${reqId},'${f.key}',${JSON.stringify(o).replace(/"/g, "&quot;")})">${esc(o)}</label>`).join("")}</div>`; break;
    case "checkbox-single":
      return `<div class="field"><label class="single-check"><input type="checkbox" id="${id}" ${val === true ? "checked" : ""} onchange="updateField(${reqId},'${f.key}',this.checked)">${esc(f.label)}${req}</label></div>`;
    case "employee-picker":
      inner = renderEmployeePicker(f, reqId, d); break;
    case "employee-table":
      return `<div class="field">${renderEmployeeTable(reqId, d)}</div>`;
  }
  return `<div class="field"><label class="flabel" for="${id}">${esc(f.label)}${req}</label>${inner}</div>`;
}

function renderSections(sections, reqId, d){
  return (sections || []).filter(sec => isShown(sec, d)).map(sec => `<fieldset><legend>${esc(sec.title)}</legend>
    ${sec.note ? `<p class="section-note">${esc(sec.note(d))}</p>` : ""}
    ${sec.fields.filter(f => isShown(f, d)).map(f => renderFieldHTML(f, reqId, d)).join("")}</fieldset>`).join("");
}

// ---------- محتوى خاص ببعض الخطوات ----------
// الملخص الذي يصل للموظف: البدلات المفقودة + المنطقة + المهام الجديدة
function renderEmployeeStep(r){
  const d = r.data;
  const responses = d.employeeResponses || {};
  return getEmployees(d).map((e, i) => `<fieldset class="emp-summary">
    <legend>${esc(e.name || e.employeeId)}</legend>
    <div class="kv"><b>البدلات المفقودة:</b> ${esc(d.allowancesLost || "لا توجد")}</div>
    <div class="kv"><b>المنطقة:</b> ${esc(d.region || "—")}</div>
    <div class="kv"><b>المهام الجديدة:</b> ${esc(d.expectedTasks || "—")}</div>
    <div class="opt-row decision-row">
      ${["أوافق على النقل","لا أوافق على النقل"].map((o, k) => `<label class="opt-item"><input type="radio" id="resp-${r.id}-${i}-${k}" name="resp_${r.id}_${i}" value="${o}" ${responses[i] === o ? "checked" : ""} onchange="setEmployeeResponse(${r.id},${i},this.value)">${o}</label>`).join("")}
    </div>
  </fieldset>`).join("");
}

function renderEmployeeResponses(r){
  const d = r.data;
  if (isSelfRequest(d)) return `<div class="notice">الطلب مقدَّم من الموظف نفسه، لذلك لا يحتاج إلى موافقة منفصلة.</div>`;
  if (!d.employeeResponses) return `<div class="notice">لم يُرسل الطلب للموظف لأخذ موافقته.</div>`;
  return `<fieldset><legend>رد الموظف</legend>${getEmployees(d).map((e, i) => {
    const v = d.employeeResponses[i] || "—";
    const cls = v.startsWith("لا") ? "resp-no" : "resp-yes";
    return `<div class="kv"><b>${esc(e.name || e.employeeId)}:</b> <span class="${cls}">${esc(v)}</span></div>`;
  }).join("")}</fieldset>`;
}

// قرار مدير قسم الموظف الحالي/الجديد
function renderManagerDecisions(r){
  const entries = Object.entries(r.data.mgrDecisions || {});
  if (!entries.length) return "";
  return `<fieldset><legend>قرار مدير القسم</legend>${entries.map(([who, x]) => {
    const cls = x.decision === "رفض" ? "resp-no" : "resp-yes";
    return `<div class="kv"><b>${esc(who)}:</b> <span class="${cls}">${esc(x.decision)}</span>${x.comment ? ` — ${esc(x.comment)}` : ""}</div>`;
  }).join("")}</fieldset>`;
}

function renderStepExtras(r, st){
  let html = "";
  if (r.currentState === "draft" && r.returnReason)
    html += `<div class="notice amber"><b>أُعيد الطلب إليك للتعديل.</b> ${esc(r.returnReason)}</div>`;
  if (st.showReturnReason && r.returnReason)
    html += `<div class="notice amber"><b>سبب الإرجاع:</b> ${esc(r.returnReason)}</div>`;
  if (st.showRecommendation)
    html += `<div class="notice coral"><b>توصية مسؤول التخطيط (سبب الرفض):</b> ${esc(r.data.studyRecommendation || "—")}</div>`;
  if (st.showManagerDecisions) html += renderManagerDecisions(r);
  if (st.showEmployeeResponses) html += renderEmployeeResponses(r);
  if (st.custom === "employee") html += renderEmployeeStep(r);
  return html;
}

// ---------- مساحة العمل ----------
function renderActionCard(r){
  const st = FORM_SCHEMAS[r.currentState];
  const reqId = r.id;

  if (st.terminal === "ok"){
    return selectedRole === ROLE.employee
      ? `<p class="desc">تم اعتماد نقلك وصدر القرار الإداري.</p>`
      : `<p class="desc">اكتمل الطلب #${reqId}. القرار الإداري محفوظ في ملف المعاملة أدناه، ويمكن طباعته من هناك.</p>`;
  }
  if (st.terminal === "bad"){
    return `<p class="desc">انتهى مسار الطلب #${reqId} بالرفض، وسبب الرفض موضّح أعلاه.</p>`;
  }

  // الموظف المطلوب نقله يرى فقط ما يخصه
  if (selectedRole === ROLE.employee && r.currentState !== "employee"){
    return `<div class="waiting">طلب النقل قيد الإجراء، ولا يوجد إجراء مطلوب منك حاليًا.</div>`;
  }

  const ph = PHASE[st.phase];
  let html = `
    <div class="status-badge" style="background:var(--${ph}-bg);color:var(--${ph}-tx);border:1px solid var(--${ph}-bd);">
      <span class="dot" style="background:var(--${ph}-bd);"></span>${esc(st.title)}
    </div>
    <p class="desc">${esc(typeof st.desc === "function" ? st.desc(r.data) : (st.desc || ""))}</p>
    ${errorMsg ? `<div class="err-box">${esc(errorMsg)}</div>` : ""}`;

  if (!canAct(r)){
    if (st.actor === ROLE.planner && selectedRole === ROLE.planner)
      return html + `<div class="waiting">هذا الطلب مُسند إلى <b>${esc(r.data.assignedPlanner)}</b> — يمكنك الاطلاع عليه فقط دون اتخاذ أي إجراء.</div>`;
    return html + `<div class="waiting">بانتظار إجراء من: <b>${esc(actorLabel(r, st))}</b> — لا يوجد إجراء متاح لدورك الحالي (${esc(selectedRole)})</div>`;
  }

  html += renderStepExtras(r, st);
  html += renderSections(st.sections, reqId, r.data);
  if (st.showDecisionSheet) html += renderDecisionSheet(r);

  if (st.decisions){
    html += `<div class="btn-row">` + st.decisions.map((dcs, i) => {
      if (!isShown(dcs, r.data)) return "";
      const cls = dcs.kind === "reject" ? "btn-reject" : dcs.kind === "return" ? "btn-return" : "btn-primary";
      return `<button class="btn ${cls}" onclick="submitDecision(${reqId},${i})">${esc(dcs.label)}</button>`;
    }).join("") + `</div>`;
  } else {
    html += `<button class="btn btn-primary btn-block" onclick="submitStep(${reqId})">${esc(st.submitLabel)}</button>`;
  }
  return html;
}

function renderWorkspace(){
  const host = document.getElementById("workspace");
  // يظهر الطلب المختار فقط إذا كان ضمن طلبات البوابة الحالية
  const r = visibleRequests().includes(selectedReq()) ? selectedReq() : null;
  renderBanner(r);
  if (!r){
    host.innerHTML = `<div class="empty-workspace">اضغط على أي طلب في الجدول لعرض تفاصيله.</div>`;
    return;
  }
  const st = FORM_SCHEMAS[r.currentState];
  // الموظف المطلوب نقله لا يرى ملف المعاملة ولا سجل الإجراءات،
  // ومقدم الطلب يرى عند الرفض سبب الرفض (التوصية) فقط.
  const hideCase = selectedRole === ROLE.employee || (selectedRole === ROLE.applicant && st.terminal === "bad");

  const active = canAct(r);
  let html = "";

  if (selectedRole === ROLE.applicant){
    // مقدم الطلب لا يرى "الإجراء الحالي"؛ يظهر له نموذج الطلب فقط حين يكون عليه تعبئته أو تعديله
    if (active) html += `<div class="card action-card is-active">
      <div class="action-head"><h2>طلب النقل #${r.id}</h2></div>${renderActionCard(r)}</div>`;
  } else {
    // ملوّن إذا كان على الدور الحالي إجراء، ورصاصي بالكامل إذا لم يكن
    html += `<div class="card action-card ${active ? "is-active" : "is-idle"}">
      <div class="action-head"><h2>الإجراء الحالي</h2>
        <span class="action-state">${active ? "🔔 دورك الآن" : "لا يوجد إجراء مطلوب منك"}</span></div>
      <p class="sub">طلب رقم #${r.id}</p>${renderActionCard(r)}</div>`;
  }

  if (!hideCase) html += renderCaseFile(r) + renderTimeline(r);
  host.innerHTML = html;
}

// ملف المعاملة: النماذج فقط (أحدث نسخة من كل نموذج) والقرار الإداري بعد صدوره
function renderCaseFile(r){
  const latest = new Map();
  r.completedSteps.forEach(s => { latest.delete(s.id); latest.set(s.id, s); });
  const steps = [...latest.values()];
  const hasDecision = r.currentState === "executed";
  const count = steps.length + (hasDecision ? 1 : 0);
  const forms = steps.map((s, i) => `<article class="case-step">
      <div class="case-head">
        <span class="case-num">${i + 1}</span>
        <div class="case-titles"><h4>${esc(s.title)}</h4><div class="who">${esc(s.actor || "")}</div></div>
      </div>
      ${s.entries.length
        ? `<dl class="case-kv">${s.entries.map(e => `<div class="case-row"><dt>${esc(e.label)}</dt><dd>${esc(e.value)}</dd></div>`).join("")}</dl>`
        : `<p class="case-empty">لا توجد بيانات مُدخلة في هذه الخطوة.</p>`}
    </article>`).join("");
  const decision = hasDecision ? `<article class="case-step">
      <div class="case-head">
        <span class="case-num">${steps.length + 1}</span>
        <div class="case-titles"><h4>القرار الإداري</h4><div class="who">صدر بتاريخ ${esc(formatDecisionDate(r.data.decisionDate))}</div></div>
      </div>
      <div class="case-decision">${renderDecisionSheet(r)}</div>
    </article>` : "";
  const body = count ? forms + decision
    : `<div class="empty-case">لا توجد نماذج مكتملة بعد. تظهر هنا النماذج بعد تعبئتها، والقرار الإداري بعد صدوره.</div>`;
  return `<div class="card case-card"><h2>ملف المعاملة</h2>
    <p class="sub">طلب رقم #${r.id} — ${count} ${count === 1 ? "مستند" : "مستندات"} (النماذج والقرار الإداري، وبقية الإجراءات في سجل الإجراءات)</p>
    <div class="case-list">${body}</div></div>`;
}

// سجل الإجراءات: الإجراءات المكتملة بتفاصيلها، ثم الإجراء التالي بعنوان رصاصي ودائرة رصاصية
function renderTimeline(r){
  const done = r.history.map(h => `
    <li class="tl-done">
      <div class="tl-state">${esc(h.action)}</div>
      <div class="tl-meta">بواسطة: ${esc(h.actor)}${h.at ? ` · ${esc(h.at)}` : ""}</div>
      ${h.note ? `<div class="tl-note">${esc(h.note)}</div>` : ""}
    </li>`).join("");

  const st = FORM_SCHEMAS[r.currentState];
  const next = st.terminal
    ? `<li class="tl-end ${st.terminal === "ok" ? "is-ok" : "is-bad"}"><div class="tl-state">${esc(st.title)}</div></li>`
    : `<li class="tl-next">
        <div class="tl-state">${esc(st.title)}</div>
        <div class="tl-meta">الإجراء التالي — بانتظار: ${esc(actorLabel(r, st))}</div>
      </li>`;
  return `<div class="card"><h2>سجل الإجراءات</h2><ul class="timeline">${done}${next}</ul></div>`;
}

function render(){
  const atHome = currentView === "home" || currentView === "planning-choice";
  document.getElementById("homeView").hidden = !atHome;
  document.getElementById("appView").hidden = atHome;
  if (atHome){ renderHome(); return; }
  renderPortalBar();
  renderRequestsBoard();
  renderWorkspace();
}
