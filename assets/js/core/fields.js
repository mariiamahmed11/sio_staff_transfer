// ============================================================
// 5) أدوات التحقق والحقول
// ============================================================
function fieldValid(f, d){
  const v = d[f.key];
  if (f.type === "checkbox") return Array.isArray(v) && v.length > 0;
  if (f.type === "checkbox-single") return v === true;
  if (f.type === "file") return true; // اختياري دائمًا في هذا النموذج
  if (v === undefined || v === null) return false;
  return String(v).trim().length > 0;
}
function validateSchema(schema, d){
  const missing = [];
  (schema.sections||[]).forEach(sec => (sec.fields||[]).forEach(f => {
    if (f.required && !fieldValid(f, d)) missing.push(f.label);
  }));
  return missing;
}
function updateField(reqId, key, value){
  const r = getReq(reqId); if (!r) return; r.data[key] = value;
}
function toggleCheck(reqId, key, opt){
  const r = getReq(reqId); if (!r) return;
  if (!Array.isArray(r.data[key])) r.data[key] = [];
  const i = r.data[key].indexOf(opt);
  if (i>-1) r.data[key].splice(i,1); else r.data[key].push(opt);
}
function handleFile(reqId, key, input){
  const r = getReq(reqId); if (!r || !input.files[0]) return;
  const file = input.files[0];
  r.data[key] = { name: file.name, size: file.size };
  render();
}
function snapshotSchema(stateId, schema, d){
  const entries = [];
  (schema.sections||[]).forEach(sec => (sec.fields||[]).forEach(f => {
    const v = d[f.key];
    if (v===undefined || v===null || v==="" || (Array.isArray(v)&&v.length===0)) return;
    let display;
    if (Array.isArray(v)) display = v.join("، ");
    else if (v === true) display = "نعم — مُقرّ به";
    else if (f.type === "file") display = "📎 " + v.name + " (" + Math.round(v.size/1024) + " كيلوبايت)";
    else display = v;
    entries.push({ label: f.label, value: display });
  }));
  return { id: stateId, title: schema.title, actor: schema.actor, entries };
}
