// ============================================================
// 5) أدوات التحقق والحقول وبيانات الموظفين
// ============================================================
function esc(v){
  return String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
const isShown = (item, d) => !item.showIf || item.showIf(d);

// ---------- نظام الموظفين (تمثيل ببيانات ثابتة) ----------
const EMP_INFO_KEYS = ["name","department","jobTitle","grade","specialty"];

function findEmployee(id){
  const key = String(id ?? "").trim();
  return EMPLOYEE_DIRECTORY.find(e => e.employeeId === key);
}
// الموظفون المتاحون للاختيار حسب صفة مقدّم الطلب
function allowedEmployees(d){
  if (d.applicantCapacity === CAPACITY.fromMine) return EMPLOYEE_DIRECTORY.filter(e => e.department === CURRENT_MANAGER.department);
  if (d.applicantCapacity === CAPACITY.toMine)   return EMPLOYEE_DIRECTORY.filter(e => e.department !== CURRENT_MANAGER.department);
  return EMPLOYEE_DIRECTORY;
}
function fillEmployee(target, id){
  const e = findEmployee(id);
  if (!e) return false;
  target.employeeId = e.employeeId;
  EMP_INFO_KEYS.forEach(k => target[k] = e[k]);
  return true;
}
function clearEmployee(target){
  target.employeeId = "";
  EMP_INFO_KEYS.forEach(k => target[k] = "");
}
function blankRow(){
  const row = {}; TABLE_COLUMNS.forEach(c => row[c.key] = ""); return row;
}
function blankRows(n){ return Array.from({length:n}, blankRow); }
const rowHasData = row => TABLE_COLUMNS.some(c => String(row[c.key] || "").trim());

// قائمة موحّدة بالموظفين في الطلب (فردي أو جدول)
function getEmployees(d){
  if (isMulti(d)) return (d.employees || []).filter(rowHasData);
  if (!d.employeeId && !d.name) return [];
  return [{ employeeId:d.employeeId, name:d.name, department:d.department, jobTitle:d.jobTitle,
            grade:d.grade, specialty:d.specialty, targetDept:d.targetDept, targetUnit:d.targetUnit }];
}
const targetLabel = e => [e.targetDept, e.targetUnit].filter(Boolean).join(" — ");

function employeesSummary(d){
  const list = getEmployees(d);
  if (!list.length) return "";
  if (list.length === 1) return list[0].name || list[0].employeeId;
  return `${list[0].name || list[0].employeeId} و${list.length - 1} آخرون`;
}

// ---------- التحقق ----------
function tableProblems(d){
  const rows = (d.employees || []).map((row, i) => ({row, i})).filter(x => rowHasData(x.row));
  if (!rows.length) return ["جدول الموظفين (أضف موظفًا واحدًا على الأقل)"];
  const req = TABLE_COLUMNS.filter(c => c.required);
  return rows.filter(x => req.some(c => !String(x.row[c.key] || "").trim()))
    .map(x => `الصف ${x.i + 1} في جدول الموظفين (${req.map(c => c.label).join(" و")})`);
}
function fieldValid(f, d){
  const v = d[f.key];
  if (f.type === "checkbox") return Array.isArray(v) && v.length > 0;
  if (f.type === "checkbox-single") return v === true;
  if (f.type === "employee-table") return tableProblems(d).length === 0;
  if (v === undefined || v === null) return false;
  return String(v).trim().length > 0;
}
function validateSchema(schema, d){
  const missing = [];
  (schema.sections || []).filter(sec => isShown(sec, d)).forEach(sec =>
    (sec.fields || []).filter(f => isShown(f, d)).forEach(f => {
      if (!f.required || fieldValid(f, d)) return;
      if (f.type === "employee-table") missing.push(...tableProblems(d));
      else missing.push(f.label);
    }));
  return missing;
}

// ---------- تحديث البيانات ----------
// تغييرات تستدعي تعبئة تلقائية وإعادة رسم النموذج
const FIELD_HOOKS = {
  applicantCapacity(d, value, prev){
    if (value === CAPACITY.self){
      fillEmployee(d, SELF_EMPLOYEE_ID);
      d.employeeCount = EMPLOYEE_COUNT.single;
    } else if (prev === CAPACITY.self || (d.employeeId && !allowedEmployees(d).some(e => e.employeeId === d.employeeId))){
      clearEmployee(d);
    }
    // مدير يطلب نقل موظف إلى قسمه: الجهة المستهدفة هي قسمه
    if (value === CAPACITY.toMine && !d.targetDept) d.targetDept = CURRENT_MANAGER.department;
    if (value !== CAPACITY.toMine && d.targetDept === CURRENT_MANAGER.department) d.targetDept = "";
  },
  employeeCount(){},
  sendToEmployee(){}
};

function updateField(reqId, key, value){
  const r = getReq(reqId); if (!r) return;
  const prev = r.data[key];
  r.data[key] = value;
  if (FIELD_HOOKS[key]){ FIELD_HOOKS[key](r.data, value, prev); render(); }
}
function toggleCheck(reqId, key, opt){
  const r = getReq(reqId); if (!r) return;
  if (!Array.isArray(r.data[key])) r.data[key] = [];
  const i = r.data[key].indexOf(opt);
  if (i > -1) r.data[key].splice(i,1); else r.data[key].push(opt);
}
function pickEmployee(reqId, id){
  const r = getReq(reqId); if (!r) return;
  if (!fillEmployee(r.data, id)) clearEmployee(r.data);
  render();
}

// ---------- البحث عن موظف بالرقم الوظيفي أو الاسم ----------
const pickerSearch = {};
const matchesEmployee = (e, term) => !term.trim() || e.employeeId.includes(term.trim()) || e.name.includes(term.trim());

function searchEmployee(reqId, term){
  const r = getReq(reqId); if (!r) return;
  pickerSearch[reqId] = term;
  // كتابة رقم وظيفي كامل تختار الموظف مباشرة
  const exact = allowedEmployees(r.data).find(e => e.employeeId === term.trim());
  if (exact) fillEmployee(r.data, exact.employeeId);
  render();
  const box = document.getElementById("search-" + reqId);
  if (box){ box.focus(); box.setSelectionRange(box.value.length, box.value.length); }
}

// ---------- جدول عدة موظفين ----------
function autofillRow(d, row){
  const e = findEmployee(row.employeeId);
  if (e) EMP_INFO_KEYS.forEach(k => { if (!String(row[k] || "").trim()) row[k] = e[k]; });
  if (d.applicantCapacity === CAPACITY.toMine && rowHasData(row) && !row.targetDept) row.targetDept = CURRENT_MANAGER.department;
}
function updateRow(reqId, i, key, value){
  const r = getReq(reqId); if (!r) return;
  r.data.employees[i][key] = value;
}
function rowIdChanged(reqId, i){
  const r = getReq(reqId); if (!r) return;
  const row = r.data.employees[i];
  if (findEmployee(row.employeeId)){ EMP_INFO_KEYS.forEach(k => row[k] = ""); autofillRow(r.data, row); render(); }
}
function addRow(reqId){
  const r = getReq(reqId); if (!r) return;
  r.data.employees.push(blankRow()); render();
}
function removeRow(reqId, i){
  const r = getReq(reqId); if (!r) return;
  r.data.employees.splice(i, 1);
  if (!r.data.employees.length) r.data.employees.push(blankRow());
  render();
}
// لصق عدة صفوف/أعمدة من Excel: يبدأ من الخلية التي لُصق فيها
function handleTablePaste(ev, reqId, rowIdx, colIdx){
  const text = (ev.clipboardData || window.clipboardData).getData("text") || "";
  if (!/[\t\n]/.test(text.replace(/\s+$/,""))) return; // قيمة واحدة: لصق عادي
  ev.preventDefault();
  const r = getReq(reqId); if (!r) return;
  const lines = text.replace(/\r/g,"").split("\n").filter(l => l.trim() !== "");
  lines.forEach((line, k) => {
    const idx = rowIdx + k;
    while (r.data.employees.length <= idx) r.data.employees.push(blankRow());
    const row = r.data.employees[idx];
    line.split("\t").forEach((val, c) => {
      const col = TABLE_COLUMNS[colIdx + c];
      if (col) row[col.key] = val.trim();
    });
    autofillRow(r.data, row);
  });
  render();
}

// ---------- ردود الموظف ----------
function setEmployeeResponse(reqId, i, value){
  const r = getReq(reqId); if (!r) return;
  if (!r.data.employeeResponses) r.data.employeeResponses = {};
  r.data.employeeResponses[i] = value;
}

// ---------- لقطة بيانات الخطوة لملف المعاملة ----------
function displayValue(f, v, d){
  if (f.type === "employee-table")
    return getEmployees(d).map(e => `${e.name || "—"} (${e.employeeId || "—"}) ← ${targetLabel(e) || "—"}`).join("؛ ");
  if (Array.isArray(v)) return v.join("، ");
  if (v === true) return "نعم — مُقرّ به";
  return v;
}
function snapshotSchema(stateId, schema, d, actor){
  const entries = [];
  if (schema.custom === "employee"){
    getEmployees(d).forEach((e, i) => entries.push({ label: e.name || e.employeeId, value: (d.employeeResponses || {})[i] || "—" }));
  }
  (schema.sections || []).filter(sec => isShown(sec, d)).forEach(sec =>
    (sec.fields || []).filter(f => isShown(f, d)).forEach(f => {
      const v = d[f.key];
      if (f.type !== "employee-table" && (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0))) return;
      const shown = displayValue(f, v, d);
      if (shown) entries.push({ label: f.label, value: shown });
    }));
  return { id: stateId, title: schema.title, actor, entries };
}
