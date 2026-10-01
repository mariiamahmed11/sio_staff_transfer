// ============================================================
// الصفحة الرئيسية وبوابات الدخول
// ============================================================
// home            : الخيارات الثلاثة
// planning-choice : رئيس القسم أو مسؤول التخطيط
// applicant       : تقديم طلب ومتابعة طلباتي
// head / planner  : قسم تخطيط الموارد البشرية
// approvals       : طلبات الموافقة (يُحدَّد صاحب الدور من تسجيل الدخول)
let currentView = "home";

// الأدوار التي تصلها طلبات الموافقة. في النظام الفعلي يُعرف الدور من صلاحيات تسجيل الدخول،
// وفي هذا النموذج يُحاكى تسجيل الدخول باختيار الدور.
const APPROVER_ROLES = [ROLE.curMgr, ROLE.newMgr, ROLE.employee, ROLE.deputy, ROLE.planMgr, ROLE.hrMgr, ROLE.president];
let approverRole = APPROVER_ROLES[0];

const VIEW_OF_ROLE = { [ROLE.applicant]:"applicant", [ROLE.head]:"head", [ROLE.planner]:"planner" };

function openView(view){
  currentView = view;
  errorMsg = "";
  if (view === "applicant") selectedRole = ROLE.applicant;
  if (view === "head")      selectedRole = ROLE.head;
  if (view === "planner")   selectedRole = ROLE.planner;
  if (view === "approvals") selectedRole = approverRole;
  render();
  window.scrollTo(0, 0);
}
function goHome(){ openView("home"); }

// تبديل الدور مباشرة (يُستخدم داخل البوابات وفي الاختبارات)
function selectRole(role){
  if (APPROVER_ROLES.includes(role)) approverRole = role;
  selectedRole = role;
  currentView = VIEW_OF_ROLE[role] || "approvals";
  errorMsg = "";
  render();
}
function selectApprover(i){ selectRole(APPROVER_ROLES[i]); }

// الطلبات التي تظهر في كل بوابة
function visibleRequests(){
  if (currentView !== "approvals") return requests;
  // طلبات بانتظار قرار صاحب الدور، أو سبق أن بتّ فيها
  return requests.filter(r => FORM_SCHEMAS[r.currentState].actor === selectedRole
    || r.history.some(h => h.actor === selectedRole));
}

const PORTAL_TEXT = {
  applicant: { title:"طلباتي",                    sub:"قدّم طلب نقل جديدًا وتابع حالة طلباتك." },
  head:      { title:"طلبات النقل الواردة",        sub:"استقبل الطلبات وأسندها إلى مسؤولي تخطيط الموارد البشرية." },
  planner:   { title:"طلبات النقل",               sub:"الطلبات المسندة إليك تستطيع إكمال إجراءاتها، وبقية الطلبات للاطلاع فقط." },
  approvals: { title:"طلبات الموافقة",            sub:"الطلبات التي تنتظر قرارك، والطلبات التي سبق أن بتَّ فيها." }
};

function renderHome(){
  const host = document.getElementById("homeView");
  if (currentView === "planning-choice"){
    host.innerHTML = `<div class="home-head">
        <button class="back-link" onclick="goHome()">→ الرئيسية</button>
        <h2>قسم تخطيط الموارد البشرية</h2>
        <p>اختر صفة الدخول لإدارة طلبات النقل.</p>
      </div>
      <div class="home-grid two">
        <button class="home-card" onclick="openView('head')">
          <span class="home-icon" aria-hidden="true">🗂️</span>
          <span class="home-title">الدخول كرئيس قسم تخطيط الموارد البشرية</span>
          <span class="home-desc">استقبال طلبات النقل وإسنادها إلى مسؤولي التخطيط.</span>
        </button>
        <button class="home-card" onclick="openView('planner')">
          <span class="home-icon" aria-hidden="true">🧾</span>
          <span class="home-title">الدخول كمسؤول تخطيط الموارد البشرية</span>
          <span class="home-desc">دراسة الطلبات المسندة إليك وإرسالها للموافقات وإصدار القرار الإداري.</span>
        </button>
      </div>`;
    return;
  }
  host.innerHTML = `<div class="home-head">
      <h2>مرحبًا بك في نظام النقل الوظيفي</h2>
      <p>اختر الخدمة التي تريدها.</p>
    </div>
    <div class="home-grid">
      <button class="home-card" onclick="openView('applicant')">
        <span class="home-num">١</span>
        <span class="home-icon" aria-hidden="true">📝</span>
        <span class="home-title">تقديم طلب ومتابعة طلباتي</span>
        <span class="home-desc">تقديم طلب نقل لنفسك أو لموظف في قسمك، ومتابعة حالة طلباتك.</span>
      </button>
      <button class="home-card" onclick="openView('planning-choice')">
        <span class="home-num">٢</span>
        <span class="home-icon" aria-hidden="true">🏢</span>
        <span class="home-title">الدخول كموظف بقسم تخطيط الموارد البشرية</span>
        <span class="home-desc">إدارة طلبات النقل: الاستقبال والإسناد والدراسة وإصدار القرار.</span>
      </button>
      <button class="home-card" onclick="openView('approvals')">
        <span class="home-num">٣</span>
        <span class="home-icon" aria-hidden="true">✅</span>
        <span class="home-title">الاطلاع على طلبات الموافقة</span>
        <span class="home-desc">البتّ بالموافقة أو الرفض في الطلبات المسندة إليك حسب صلاحيتك.</span>
      </button>
    </div>
    <div class="home-foot">
      <button class="reset-btn" onclick="resetAll()">↺ إعادة ضبط بيانات التجربة (حذف جميع الطلبات)</button>
    </div>`;
}

// شريط أعلى البوابة: العودة للرئيسية + هوية المستخدم (محاكاة تسجيل الدخول)
function renderPortalBar(){
  const bar = document.getElementById("portalBar");
  const back = currentView === "head" || currentView === "planner"
    ? `<button class="back-link" onclick="openView('planning-choice')">→ قسم تخطيط الموارد البشرية</button>`
    : `<button class="back-link" onclick="goHome()">→ الرئيسية</button>`;

  let who = "";
  if (currentView === "applicant") who = `<span class="who-chip">مقدم الطلب</span>`;
  if (currentView === "head")      who = `<span class="who-chip">${esc(ROLE.head)}</span>`;
  if (currentView === "planner"){
    who = `<span class="sim-label">مسجّل الدخول باسم (محاكاة):</span>` + PLANNERS.map((p, i) =>
      `<button class="planner-chip${p === selectedPlanner ? " active" : ""}" onclick="selectPlanner(PLANNERS[${i}])">${esc(p)}</button>`).join("");
  }
  if (currentView === "approvals"){
    who = `<span class="sim-label">مسجّل الدخول بصفة (محاكاة لصلاحيات تسجيل الدخول):</span>` + APPROVER_ROLES.map((r, i) =>
      `<button class="planner-chip${r === selectedRole ? " active" : ""}" onclick="selectApprover(${i})">${esc(r)}</button>`).join("");
  }
  bar.innerHTML = `<div class="portal-top">${back}</div><div class="portal-who">${who}</div>`;

  const t = PORTAL_TEXT[currentView] || PORTAL_TEXT.applicant;
  document.getElementById("boardTitle").textContent = t.title;
  document.getElementById("boardSub").textContent = t.sub;
}
