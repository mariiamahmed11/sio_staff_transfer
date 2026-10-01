// ============================================================
// 6) الانتقال بين الخطوات
// ============================================================
// هل يستطيع الدور الحالي اتخاذ إجراء على الطلب؟
// خطوات مسؤول التخطيط متاحة فقط للمسؤول الذي أسند إليه رئيس القسم الطلب.
function canAct(r){
  const st = FORM_SCHEMAS[r.currentState];
  if (st.terminal || st.actor !== selectedRole) return false;
  if (st.actor === ROLE.planner) return r.data.assignedPlanner === selectedPlanner;
  return true;
}
function actorLabel(r, st){
  return st.actor === ROLE.planner && r.data.assignedPlanner ? `${st.actor} (${r.data.assignedPlanner})` : st.actor;
}

// ملف المعاملة يحفظ النماذج فقط (caseForm)، وبقية الخطوات تظهر في سجل الإجراءات مع ملاحظتها
function moveTo(r, schema, next, actionLabel, note){
  const actor = actorLabel(r, schema);
  if (schema.caseForm) r.completedSteps.push(snapshotSchema(r.currentState, schema, r.data, actor));
  r.history.push({ actor, action: actionLabel, result: FORM_SCHEMAS[next].title || next, note: note || "" });
  if (r.currentState === "draft") resetForResubmission(r);
  r.currentState = next;
  if (FORM_SCHEMAS[next].onEnter) FORM_SCHEMAS[next].onEnter(r);
}

// عند (إعادة) تقديم الطلب تبدأ الموافقات من جديد
function resetForResubmission(r){
  Object.keys(r.data).forEach(k => { if (/^(comment_|rejComment_|mgrComment_)/.test(k)) delete r.data[k]; });
  delete r.data.employeeResponses;
  delete r.data.mgrDecisions;
  r.returnReason = "";
}

function stepProblems(r, schema){
  const missing = validateSchema(schema, r.data);
  if (schema.custom === "employee"){
    const responses = r.data.employeeResponses || {};
    getEmployees(r.data).forEach((e, i) => { if (!responses[i]) missing.push("رد " + (e.name || e.employeeId)); });
  }
  return missing;
}

function submitStep(reqId){
  const r = getReq(reqId); const schema = FORM_SCHEMAS[r.currentState];
  if (!canAct(r)) return;
  const missing = stepProblems(r, schema);
  if (missing.length){ errorMsg = "الرجاء إكمال ما يلي: " + missing.join("، "); render(); return; }
  errorMsg = "";
  const next = schema.route ? schema.route(r.data) : schema.next;
  moveTo(r, schema, next, schema.submitLabel || "تنفيذ", schema.historyNote ? schema.historyNote(r.data) : "");
  render();
}

function submitDecision(reqId, idx){
  const r = getReq(reqId); const schema = FORM_SCHEMAS[r.currentState];
  if (!canAct(r)) return;
  const decision = schema.decisions[idx];
  if (!decision || !isShown(decision, r.data)) return;
  // بعض القرارات (مثل الرفض) تكتفي بحقول محددة بدل النموذج كاملًا
  const missing = decision.requiredKeys
    ? decision.requiredKeys.filter(k => !String(r.data[k] ?? "").trim())
        .map(k => labelOf(schema, k))
    : stepProblems(r, schema);
  if (missing.length){ errorMsg = "الرجاء إكمال ما يلي: " + missing.join("، "); render(); return; }
  const comment = decision.commentKey ? (r.data[decision.commentKey] || "").trim() : "";
  if (decision.requireComment && !comment){
    errorMsg = "الرجاء كتابة ملاحظة توضّح سبب هذا القرار."; render(); return;
  }
  errorMsg = "";
  if (decision.apply) decision.apply(r.data, comment);
  const next = decision.route ? decision.route(r.data) : decision.next;
  if (next === "rejected"){
    r.lastReason = decision.reasonFn ? decision.reasonFn(r.data) : `${decision.reason}${comment ? ": " + comment : ""}`;
  }
  if (next === "returned") r.returnReason = `${decision.reason}: ${comment}`;
  moveTo(r, schema, next, decision.label, decision.noteFn ? decision.noteFn(r.data) : (comment ? "الملاحظات: " + comment : ""));
  render();
}

function labelOf(schema, key){
  for (const sec of schema.sections || [])
    for (const f of sec.fields || []) if (f.key === key) return f.label;
  return key;
}
