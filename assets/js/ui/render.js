// ============================================================
// 7) الرسم
// ============================================================
function renderRoleBar(){
  const bar = document.getElementById("roleBar"); bar.innerHTML = "";
  ROLES.forEach(role=>{
    const b = document.createElement("button");
    b.className = "role-pill" + (role===selectedRole ? " active" : "");
    b.textContent = role;
    b.onclick = ()=>{ selectedRole = role; render(); };
    bar.appendChild(b);
  });
}
function statusPhraseAndColor(r){
  const st = FORM_SCHEMAS[r.currentState];
  if (st.terminal === "ok") return { text:"تمت", cls:"status-done" };
  if (st.terminal === "bad") return { text:"مرفوضة", cls:"status-rejected" };
  return { text:"مسندة إلى: " + st.actor, cls:"status-open" };
}
function renderRequestsBoard(){
  const host = document.getElementById("requestsList");
  const newBtn = document.getElementById("newReqBtn");
  if (newBtn) newBtn.style.display = (selectedRole === "مقدم الطلب") ? "inline-block" : "none";

  if (!requests.length){ host.innerHTML = `<div class="empty-board">لا توجد طلبات بعد</div>`; return; }

  const sorted = [...requests].sort((a,b)=>{
    const aTurn = FORM_SCHEMAS[a.currentState].actor===selectedRole && !FORM_SCHEMAS[a.currentState].terminal;
    const bTurn = FORM_SCHEMAS[b.currentState].actor===selectedRole && !FORM_SCHEMAS[b.currentState].terminal;
    return (bTurn?1:0) - (aTurn?1:0);
  });

  const rows = sorted.map(r=>{
    const st = FORM_SCHEMAS[r.currentState];
    const isTurn = st.actor===selectedRole && !st.terminal;
    const { text, cls } = statusPhraseAndColor(r);
    return `<tr class="${cls} ${r.id===selectedRequestId?'selected':''}" onclick="selectRequest(${r.id})">
      <td class="rq-num-cell">طلب رقم #${r.id}${r.data.name ? " — " + r.data.name : ""}</td>
      <td>${text}</td>
      <td>${isTurn ? "🔔 دورك الآن" : "—"}</td>
    </tr>`;
  }).join("");

  host.innerHTML = `<table class="req-table">
    <thead><tr><th>رقم الطلب</th><th>الحالة</th><th>دورك الآن</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}
function renderBanner(r){
  const host = document.getElementById("bannerHost");
  const st = FORM_SCHEMAS[r.currentState];
  if (!st.terminal){ host.innerHTML=""; return; }
  if (st.terminal==="ok"){
    host.innerHTML = `<div class="banner ok">✅<div><b>اكتمل الطلب #${r.id} بنجاح</b>تم تنفيذ النقل وتحديث الأنظمة وإشعار جميع الأطراف.</div></div>`;
  } else {
    host.innerHTML = `<div class="banner bad">⛔<div><b>أُغلق الطلب #${r.id} برفضه</b>${r.lastReason || "تم رفض الطلب."}</div></div>`;
  }
}
function renderFieldHTML(f, reqId, d){
  const req = f.required ? '<span class="req-mark">*</span>' : '';
  const val = d[f.key];
  let inner = "";
  switch(f.type){
    case "text":
      inner = `<input type="text" value="${(val||"").toString().replace(/"/g,'&quot;')}" oninput="updateField(${reqId},'${f.key}',this.value)">`; break;
    case "date":
      inner = `<input type="date" value="${val||""}" oninput="updateField(${reqId},'${f.key}',this.value)">`; break;
    case "textarea":
      inner = `<textarea oninput="updateField(${reqId},'${f.key}',this.value)">${val||""}</textarea>`; break;
    case "select":
      inner = `<select onchange="updateField(${reqId},'${f.key}',this.value)">
        <option value="" ${!val?"selected":""} disabled>اختر...</option>
        ${f.options.map(o=>`<option value="${o}" ${val===o?"selected":""}>${o}</option>`).join("")}
      </select>`; break;
    case "radio":
      inner = `<div class="opt-row">${f.options.map(o=>`
        <label class="opt-item"><input type="radio" name="${f.key}_${reqId}" value="${o}" ${val===o?"checked":""} onchange="updateField(${reqId},'${f.key}',this.value)">${o}</label>`).join("")}</div>`; break;
    case "checkbox":
      inner = `<div class="opt-row">${f.options.map(o=>`
        <label class="opt-item"><input type="checkbox" ${Array.isArray(val)&&val.includes(o)?"checked":""} onchange="toggleCheck(${reqId},'${f.key}','${o}')">${o}</label>`).join("")}</div>`; break;
    case "checkbox-single":
      return `<div class="field"><label class="single-check"><input type="checkbox" ${val===true?"checked":""} onchange="updateField(${reqId},'${f.key}',this.checked)">${f.label}${req}</label></div>`;
    case "file": {
      const chip = (val && val.name) ? `<span class="file-chip">📎 ${val.name} (${Math.round(val.size/1024)} كيلوبايت)</span>` : "";
      inner = `<div class="file-input-wrap"><input type="file" onchange="handleFile(${reqId},'${f.key}',this)">${chip}</div>`; break;
    }
  }
  return `<div class="field"><label class="flabel">${f.label}${req}</label>${inner}</div>`;
}
function renderSections(sections, reqId, d){
  return (sections||[]).map(sec => `<fieldset><legend>${sec.title}</legend>${sec.fields.map(f=>renderFieldHTML(f,reqId,d)).join("")}</fieldset>`).join("");
}
function renderEmployeeSummary(d){
  const rows = [
    ["الجهة الحالية", d.department], ["الجهة الجديدة", d.targetDept + (d.targetUnit? " — "+d.targetUnit:"")],
    ["المسمى الوظيفي المستهدف", d.targetJobTitle], ["المهام المتوقعة", d.expectedTasks],
    ["أثر مالي؟", d.hasFinancialImpact], ["الراتب المستهدف", d.targetSalary]
  ].filter(r=>r[1]);
  if (!rows.length) return "";
  return `<fieldset><legend>ملخص التفاصيل المعروضة على الموظف</legend>${rows.map(r=>`<div class="kv"><b>${r[0]}:</b> ${r[1]}</div>`).join("")}</fieldset>`;
}
function renderWorkspace(){
  const host = document.getElementById("workspace");
  const r = selectedReq();
  if (!r){
    host.innerHTML = `<div class="empty-workspace"></div>`;
    return;
  }
  renderBanner(r);

  const caseHTML = r.completedSteps.length ? r.completedSteps.map(s=>`
    <div class="case-step"><h4>${s.title}</h4><div class="who">${s.actor||""}</div>
    ${s.entries.length ? s.entries.map(e=>`<div class="kv"><b>${e.label}:</b> ${e.value}</div>`).join("") : '<div class="kv">لا توجد حقول لهذه الخطوة.</div>'}</div>
  `).join("") : `<div class="empty-case">لم تُعتمد أي بيانات بعد.</div>`;

  const tlHTML = r.history.length ? r.history.map(h=>`
    <li><div class="tl-state">${h.action}</div><div class="tl-meta">بواسطة: ${h.actor} — التالي: ${h.result}</div></li>
  `).join("") : `<li class="tl-meta">لم يبدأ أي إجراء بعد.</li>`;

  const st = FORM_SCHEMAS[r.currentState];
  const reqId = r.id;
  let actionHTML;

  if (st.terminal){
    actionHTML = `<p class="desc">انتهى مسار الطلب #${reqId}. يمكنك اختيار طلب آخر من اللوحة أعلاه، أو إنشاء طلب جديد.</p>`;
  } else {
    const ph = PHASE[st.phase];
    actionHTML = `
      <div class="status-badge" style="background:var(--${ph}-bg);color:var(--${ph}-tx);border:1px solid var(--${ph}-bd);">
        <span class="dot" style="background:var(--${ph}-bd);"></span>${st.title}
      </div>
      <p class="desc">${st.desc||""}</p>
      ${errorMsg?`<div class="err-box">${errorMsg}</div>`:""}
    `;
    const myTurn = selectedRole === st.actor;
    const needsPolicyGate = r.currentState === "draft" && !r.data.policyAgreed;
    if (!myTurn){
      actionHTML += `<div class="waiting">بانتظار إجراء من: <b>${st.actor}</b> — لا يوجد إجراء متاح لدورك الحالي (${selectedRole})</div>`;
    } else if (needsPolicyGate){
      actionHTML += `<div class="policy-gate">
        <p>قبل تعبئة بيانات الطلب، يجب الاطّلاع على سياسات وإجراءات النقل الوظيفي والموافقة عليها إلكترونيًا.</p>
        <button class="btn btn-primary" onclick="openPolicyModal(${reqId})">📄 عرض سياسات النقل والموافقة عليها</button>
      </div>`;
    } else {
      if (r.currentState === "employee") actionHTML += renderEmployeeSummary(r.data);
      actionHTML += renderSections(st.sections, reqId, r.data);
      if (st.decisions){
        actionHTML += `<div class="btn-row">` + st.decisions.map(d=>{
          const cls = d.kind==="reject"?"btn-reject":d.kind==="return"?"btn-return":"btn-primary";
          return `<button class="btn ${cls}" onclick='submitDecision(${reqId}, ${JSON.stringify(d).replace(/'/g,"&#39;")})'>${d.label}</button>`;
        }).join("") + `</div>`;
      } else {
        actionHTML += `<button class="btn btn-primary btn-block" onclick="submitStep(${reqId})">${st.submitLabel}</button>`;
      }
    }
  }

  host.innerHTML = `
    <div class="card"><h2>الإجراء الحالي</h2>${actionHTML}</div>
    <div class="card"><h2>ملف المعاملة</h2><p class="sub">رقم الطلب #${r.id}</p>${caseHTML}</div>
    <div class="card"><h2>سجل الإجراءات</h2><ul class="timeline">${tlHTML}</ul></div>
  `;
}
function render(){
  renderRoleBar();
  renderRequestsBoard();
  renderWorkspace();
}
