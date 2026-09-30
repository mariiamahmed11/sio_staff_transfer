// ============================================================
// 3) حالة عدة الطلبات (في الذاكرة فقط لهذا النموذج الأولي)
// ============================================================
let requests = [];
let nextReqId = 1;
let selectedRequestId = null;
let selectedRole = ROLES[0];
let selectedPlanner = PLANNERS[0];
let errorMsg = "";

function getReq(id){ return requests.find(r => r.id === id); }
function selectedReq(){ return getReq(selectedRequestId); }

function createRequest(){
  if (selectedRole !== ROLE.applicant) return; // إنشاء الطلبات متاح فقط بدور مقدم الطلب
  const r = {
    id: nextReqId++,
    data: { employees: blankRows(3), policyAgreed: true },
    currentState: "draft",
    completedSteps: [], history: [],
    lastReason: "", returnReason: ""
  };
  requests.push(r);
  selectedRequestId = r.id;
  errorMsg = "";
  render();
}
function selectRequest(id){ selectedRequestId = id; errorMsg = ""; render(); }
function selectRole(role){ selectedRole = role; errorMsg = ""; render(); }
function selectPlanner(name){ selectedPlanner = name; errorMsg = ""; render(); }
function resetAll(){
  requests = []; nextReqId = 1; selectedRequestId = null; errorMsg = "";
  render();
}
