// ============================================================
// 6) الانتقال بين الخطوات
// ============================================================
function submitStep(reqId){
  const r = getReq(reqId); const schema = FORM_SCHEMAS[r.currentState];
  const missing = validateSchema(schema, r.data);
  if (missing.length){ errorMsg = "الرجاء تعبئة الحقول التالية: " + missing.join("، "); render(); return; }
  errorMsg = "";
  r.completedSteps.push(snapshotSchema(r.currentState, schema, r.data));
  const next = schema.route ? schema.route(r.data) : schema.next;
  r.history.push({ actor: schema.actor, action: schema.submitLabel || "تنفيذ", result: FORM_SCHEMAS[next].title || next });
  r.currentState = next;
  render();
}
function submitDecision(reqId, decision){
  const r = getReq(reqId); const schema = FORM_SCHEMAS[r.currentState];
  const missing = validateSchema(schema, r.data);
  if (missing.length){ errorMsg = "الرجاء تعبئة الحقول التالية: " + missing.join("، "); render(); return; }
  if (decision.requireComment && !((r.data[decision.commentKey]||"").trim())){
    errorMsg = "الرجاء كتابة ملاحظة توضّح سبب هذا القرار."; render(); return;
  }
  errorMsg = "";
  r.completedSteps.push(snapshotSchema(r.currentState, schema, r.data));
  r.history.push({ actor: schema.actor, action: decision.label, result: FORM_SCHEMAS[decision.next].title || decision.next });
  if (decision.kind === "reject" || decision.kind === "return") r.lastReason = decision.reason;
  r.currentState = decision.next;
  render();
}
