// ============================================================
// 3) حالة عدة الطلبات (في الذاكرة فقط لهذا النموذج الأولي)
// ============================================================
let requests = [];
let nextReqId = 1;
let selectedRequestId = null;
let selectedRole = ROLES[0];
let errorMsg = "";
let modalReqId = null;

function getReq(id){ return requests.find(r => r.id === id); }
function selectedReq(){ return getReq(selectedRequestId); }

function createRequest(){
  if (selectedRole !== "مقدم الطلب") return; // إنشاء الطلبات متاح فقط بدور مقدم الطلب
  const r = { id: nextReqId++, data:{}, currentState:"draft", completedSteps:[], history:[], lastReason:"" };
  requests.push(r);
  selectedRequestId = r.id;
  errorMsg = "";
  render();
}
function selectRequest(id){ selectedRequestId = id; errorMsg = ""; render(); }
function resetAll(){
  requests = []; nextReqId = 1; selectedRequestId = null; errorMsg = "";
  render();
}
