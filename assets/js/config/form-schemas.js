// ============================================================
// 2) مخطط النماذج لكل خطوة — عدّلي هنا لإضافة/تغيير أي حقل
// ============================================================
// خصائص الحقل: key, label, type, options, required,
//   showIf(d)   — يظهر الحقل فقط عند تحقق الشرط (ويُتجاهل في التحقق إن كان مخفيًا)
//   readonly    — حقل للعرض فقط (يُعبّأ تلقائيًا من نظام الموظفين)
// الأنواع: text, date, textarea, select, radio, checkbox, checkbox-single,
//          employee-picker (قائمة الأرقام الوظيفية), employee-table (جدول عدة موظفين)

const CAPACITY = {
  self:    "طلب من الموظف نفسه",
  fromMine:"طلب من مدير قسم بنقل موظف من قسمه إلى قسم آخر",
  toMine:  "طلب من مدير قسم بنقل موظف من قسم آخر إلى قسمه"
};
const EMPLOYEE_COUNT = { single:"موظف واحد", multi:"أكثر من موظف" };

const isSelfRequest = d => d.applicantCapacity === CAPACITY.self;
const isMulti = d => !!d.applicantCapacity && !isSelfRequest(d) && d.employeeCount === EMPLOYEE_COUNT.multi;
const hasCapacity = d => !!d.applicantCapacity;

// أعمدة جدول الموظفين (نفس حقول النموذج الفردي + الجهة المنقول إليها لكل موظف)
const TABLE_COLUMNS = [
  { key:"employeeId", label:"الرقم الوظيفي", required:true },
  { key:"name",       label:"الاسم", required:true },
  { key:"department", label:"الإدارة / القسم الحالي" },
  { key:"jobTitle",   label:"المسمى الوظيفي" },
  { key:"grade",      label:"الدرجة" },
  { key:"specialty",  label:"التخصص" },
  { key:"targetDept", label:"الإدارة المنقول لها", required:true },
  { key:"targetUnit", label:"القسم / الوحدة المنقول لها" }
];

function approvalSchema(actorName, nextIfApprove, isFinal){
  const commentKey = "comment_" + actorName;
  return {
    phase:"purple", actor: actorName,
    title: "اعتماد " + actorName,
    desc: isFinal ? "المستوى الرابع والأخير في سلسلة الاعتماد — القرار هنا نهائي." : "أحد مستويات سلسلة الاعتماد الإداري بالتسلسل.",
    sections: [{ title:"القرار", fields:[
      {key:commentKey, label:"ملاحظات (إلزامي عند الرفض أو الإرجاع)", type:"textarea"}
    ]}],
    decisions: [
      {label: isFinal ? "الاعتماد النهائي" : "اعتماد ورفع للمستوى التالي", next:nextIfApprove, kind:"primary"},
      {label:"الرفض", next:"rejected", kind:"reject", reason:`رفض ${actorName} الطلب`, requireComment:true, commentKey},
      {label:"الإرجاع للتعديل", next:"returned", kind:"return", reason:`أُعيد الطلب للتعديل بقرار ${actorName}`, requireComment:true, commentKey}
    ]
  };
}

// اعتماد رفض مسؤول التخطيط — يمر على النائب ثم المدير ثم مدير الموارد البشرية
function rejectionReviewSchema(actorName, nextIfApprove){
  const commentKey = "rejComment_" + actorName;
  return {
    phase:"coral", actor: actorName,
    title: "اعتماد رفض الطلب — " + actorName,
    desc: "رفض مسؤول تخطيط الموارد البشرية الطلب، ولا يُغلق الطلب إلا بعد اعتماد الرفض. عند الاعتماد النهائي تظهر التوصية لمقدم الطلب.",
    showRecommendation: true,
    sections: [{ title:"القرار", fields:[
      {key:commentKey, label:"ملاحظات (إلزامي عند عدم اعتماد الرفض)", type:"textarea"}
    ]}],
    decisions: [
      {label:"اعتماد الرفض", next:nextIfApprove, kind:"reject",
        reasonFn: d => "التوصية: " + (d.studyRecommendation || "—")},
      {label:"عدم اعتماد الرفض وإعادته لمسؤول التخطيط", next:"planner_decision", kind:"return", requireComment:true, commentKey}
    ]
  };
}

// رفض الموظف المطلوب نقله: الإجراء الوحيد لمسؤول التخطيط هو إرسال الطلب لتسلسل الموافقات لإعلامهم،
// وخيارهم الوحيد "قبول الرفض"، وبعد قبول الجميع يُغلق الطلب بالرفض
const employeeRefused = d => Object.values(d.employeeResponses || {}).some(v => v.startsWith("لا"));
const REFUSAL_REASON = "رفض الموظف المطلوب نقله النقل، وقبلت جميع مستويات الاعتماد رفضه.";

function acknowledgeSchema(actorName, next){
  return {
    phase:"coral", actor: actorName,
    title: "العلم برفض الموظف — " + actorName,
    desc: "رفض الموظف المطلوب نقله النقل، وأرسل مسؤول التخطيط الطلب لإعلامك. الخيار المتاح هو قبول الرفض، وبعد قبول جميع المستويات يُغلق الطلب بالرفض.",
    showEmployeeResponses: true,
    sections: [],
    decisions: [
      {label:"قبول الرفض", next, kind:"primary", reasonFn: () => REFUSAL_REASON}
    ]
  };
}

const FORM_SCHEMAS = {
  draft: {
    phase:"teal", actor:ROLE.applicant, title:"نموذج طلب النقل الوظيفي", caseForm:true,
    sections:[
      { title:"صفة مقدّم الطلب", fields:[
        {key:"applicantCapacity", label:"صفة مقدّم الطلب", type:"select", options:Object.values(CAPACITY), required:true},
        {key:"employeeCount", label:"عدد الموظفين المطلوب نقلهم", type:"radio", options:Object.values(EMPLOYEE_COUNT), required:true,
          showIf: d => hasCapacity(d) && !isSelfRequest(d)}
      ]},
      { title:"بيانات الموظف المطلوب نقله",
        showIf: d => hasCapacity(d) && !isMulti(d),
        note: d => isSelfRequest(d)
          ? "تُعبّأ بياناتك الوظيفية تلقائيًا من نظام شؤون الموظفين."
          : "اختر الرقم الوظيفي، وتُعبّأ بقية البيانات تلقائيًا من نظام شؤون الموظفين.",
        fields:[
          {key:"employeeId", label:"الرقم الوظيفي", type:"employee-picker", required:true},
          {key:"name", label:"اسم الموظف", type:"text", readonly:true, required:true},
          {key:"department", label:"الإدارة / القسم / المكتب الحالي", type:"text", readonly:true},
          {key:"jobTitle", label:"المسمى الوظيفي الحالي", type:"text", readonly:true},
          {key:"grade", label:"الدرجة الوظيفية", type:"text", readonly:true},
          {key:"specialty", label:"التخصص", type:"text", readonly:true}
      ]},
      { title:"بيانات الموظفين المطلوب نقلهم",
        showIf: isMulti,
        note: () => "كل موظف في صف. يمكنك نسخ الصفوف من Excel ولصقها مباشرة في الجدول، ويكفي إدخال الرقم الوظيفي لتعبئة بقية البيانات تلقائيًا.",
        fields:[
          {key:"employees", label:"جدول الموظفين", type:"employee-table", required:true}
      ]},
      { title:"تفاصيل الطلب", showIf: hasCapacity, fields:[
        {key:"transferType", label:"نوع النقل", type:"radio", options:["داخل الجهة","خارج الجهة"], required:true},
        {key:"region", label:"المنطقة", type:"radio", options:["داخل المنطقة","خارج المنطقة"], required:true},
        {key:"justifications", label:"مبررات طلب النقل", type:"checkbox", options:[
          "سد احتياج وظيفي","إعادة توزيع للموظفين بالإدارة","قصور بالوحدة التنظيمية",
          "تحديث بالمهام والمسؤوليات بالإدارة","تنمية وتطوير قدرات الموظف","أخرى"], required:true},
        {key:"supportingJustification", label:"مبررات داعمة لطلب النقل", type:"textarea"}
      ]},
      { title:"الجهة المراد النقل إليها", showIf: hasCapacity, fields:[
        {key:"targetDept", label:"الإدارة", type:"text", required:true, showIf: d => !isMulti(d)},
        {key:"targetUnit", label:"القسم / الوحدة", type:"text", showIf: d => !isMulti(d)},
        {key:"expectedTasks", label:"المهام المتوقّع أن يقوم بها الموظف بالجهة الجديدة", type:"textarea", required:true}
      ]}
    ],
    submitLabel:"تقديم الطلب", next:"head_review"
  },

  head_review: {
    phase:"gray", actor:ROLE.head, title:"استقبال الطلب وإسناده",
    desc:"يستقبل رئيس قسم تخطيط الموارد البشرية طلب النقل ويسنده إلى أحد مسؤولي التخطيط. يستطيع المسؤول المكلَّف وحده إكمال إجراءات الطلب، ويطّلع عليه بقية المسؤولين دون اتخاذ أي إجراء.",
    sections:[
      { title:"إسناد الطلب", fields:[
        {key:"assignedPlanner", label:"مسؤول تخطيط الموارد البشرية المكلَّف", type:"select", options:PLANNERS, required:true}
      ]}
    ],
    submitLabel:"إسناد الطلب", next:"study",
    historyNote: d => "المسؤول المكلَّف: " + d.assignedPlanner
  },

  study: {
    phase:"gray", actor:ROLE.planner, title:"نموذج دراسة حالة الطلب", caseForm:true,
    desc:"دراسة الاحتياج ومطابقة الوظيفة، وتحديد البدلات المفقودة وما إذا كان الطلب سيُرسل للموظف لأخذ موافقته.",
    sections:[
      { title:"بيانات الطلب", fields:[
        {key:"availableUnit", label:"الوحدة التنظيمية المتاح الانتقال إليها", type:"text", required:true},
        {key:"probationPeriod", label:"هل الموظف في فترة التجربة؟", type:"radio", options:["نعم","لا"], required:true}
      ]},
      { title:"الأثر المالي والتنظيمي", fields:[
        {key:"budgetConflict", label:"هل يخالف التحوير تعليمات الميزانية؟", type:"radio", options:["نعم","لا"], required:true},
        {key:"hasFinancialImpact", label:"هل يوجد أثر مالي على الانتقال؟", type:"radio", options:["نعم","لا"], required:true},
        {key:"allowancesLost", label:"البدلات المفقودة نتيجة النقل (إن وجدت)", type:"textarea"}
      ]},
      { title:"الأنظمة والموافقات", fields:[
        {key:"matchesWorkforcePlan", label:"هل يتوافق مع خطة القوى العاملة المعتمدة؟", type:"radio", options:["نعم","لا"], required:true},
        {key:"jobExistsInStructure", label:"هل الوظيفة المستهدفة موجودة في الهيكل الوظيفي؟", type:"radio", options:["نعم","لا"], required:true}
      ]},
      { title:"متطلبات الوظيفة المراد النقل إليها", fields:[
        {key:"targetJobTitle", label:"المسمى الوظيفي للوظيفة المستهدفة", type:"text", required:true},
        {key:"meetsQualifications", label:"هل يمتلك الموظف المؤهلات والجدارات المطلوبة؟", type:"radio", options:["نعم","لا"], required:true},
        {key:"significantTaskDifference", label:"هل تختلف المهام اختلافًا جوهريًا عن العمل الحالي؟", type:"radio", options:["نعم","لا"], required:true}
      ]},
      { title:"موافقة الموظف", showIf: d => !isSelfRequest(d), fields:[
        {key:"sendToEmployee", label:"إرسال الطلب للموظف للموافقة", type:"radio", options:["نعم","لا"], required:true}
      ]},
      { title:"التوصية", fields:[
        {key:"studyRecommendation", label:"توصية مسؤول تخطيط الموارد البشرية (تظهر لمقدم الطلب في حال الرفض)", type:"textarea", required:true}
      ]}
    ],
    decisions:[
      // يُرسل للموظف إن اختير ذلك، وإلا يُرفع مباشرة لتسلسل الموافقات
      {label:"إرسال الطلب للموافقة", kind:"primary",
        route: d => (!isSelfRequest(d) && d.sendToEmployee === "نعم") ? "employee" : "appr1"},
      // الرفض يكفيه كتابة التوصية (سبب الرفض)
      {label:"رفض الطلب وإشعار مقدم الطلب", next:"rej1", kind:"reject", requiredKeys:["studyRecommendation"],
        noteFn: d => "التوصية: " + d.studyRecommendation}
    ]
  },

  employee: {
    phase:"amber", actor:ROLE.employee, title:"نموذج موافقة الموظف على النقل", caseForm:true,
    desc:"اطّلع على ملخص النقل أدناه، ثم حدّد موافقتك.",
    custom:"employee",
    sections:[],
    submitLabel:"إرسال الرد", next:"planner_decision"
  },

  planner_decision: {
    phase:"gray", actor:ROLE.planner, title:"قرار مسؤول التخطيط",
    desc: d => employeeRefused(d)
      ? "رفض الموظف المطلوب نقله النقل. الإجراء المتاح لك هو إرسال الطلب لتسلسل الموافقات لإعلامهم برفضه."
      : "وافق الموظف على النقل. راجع رده ثم أرسل الطلب لتسلسل الموافقات أو ارفضه. الرفض يحتاج إلى اعتماد نائب المدير والمدير ومدير الموارد البشرية ثم يُشعَر مقدم الطلب.",
    showEmployeeResponses: true,
    sections:[
      { title:"التوصية", showIf: d => !employeeRefused(d), fields:[
        {key:"studyRecommendation", label:"التوصية (تظهر لمقدم الطلب في حال الرفض)", type:"textarea", required:true}
      ]}
    ],
    decisions:[
      {label:"إرسال الطلب لتسلسل الموافقات", next:"appr1", kind:"primary", showIf: d => !employeeRefused(d)},
      {label:"رفض الطلب وإشعار مقدم الطلب", next:"rej1", kind:"reject", showIf: d => !employeeRefused(d),
        noteFn: d => "التوصية: " + d.studyRecommendation},
      {label:"إرسال الطلب للموافقات لإعلامهم", next:"ack1", kind:"primary", showIf: employeeRefused}
    ]
  },

  appr1: approvalSchema(ROLE.deputy,    "appr2", false),
  appr2: approvalSchema(ROLE.planMgr,   "appr3", false),
  appr3: approvalSchema(ROLE.hrMgr,     "appr4", false),
  appr4: approvalSchema(ROLE.president, "decision_prep", true),

  rej1: rejectionReviewSchema(ROLE.deputy,  "rej2"),
  rej2: rejectionReviewSchema(ROLE.planMgr, "rej3"),
  rej3: rejectionReviewSchema(ROLE.hrMgr,   "rejected"),

  ack1: acknowledgeSchema(ROLE.deputy,    "ack2"),
  ack2: acknowledgeSchema(ROLE.planMgr,   "ack3"),
  ack3: acknowledgeSchema(ROLE.hrMgr,     "ack4"),
  ack4: acknowledgeSchema(ROLE.president, "rejected"),

  returned: {
    phase:"amber", actor:ROLE.planner, title:"طلب مُعاد للتعديل",
    desc:"أُعيد الطلب من سلسلة الاعتماد. راجع سبب الإرجاع ثم أرسل الطلب لمقدمه ليعدّله ويعيد تقديمه.",
    showReturnReason: true,
    sections:[],
    submitLabel:"إرسال الطلب لمقدم الطلب للتعديل", next:"draft"
  },

  decision_prep: {
    phase:"green", actor:ROLE.planner, title:"إصدار القرار الإداري وإغلاق الطلب",
    desc:"اعتُمد الطلب من جميع الأطراف. القرار الإداري أدناه مُعبّأ تلقائيًا من بيانات الطلب؛ راجعه واطبعه ثم أنهِ الإجراء.",
    showDecisionSheet: true,
    sections:[
      { title:"بيانات القرار", fields:[
        {key:"decisionDate", label:"تاريخ القرار", type:"date", required:true}
      ]}
    ],
    submitLabel:"إنهاء الإجراء وإغلاق الطلب", next:"executed",
    onEnter: r => { if (!r.data.decisionDate) r.data.decisionDate = new Date().toISOString().slice(0,10); }
  },

  executed: { terminal:"ok",  title:"اكتمل الطلب" },
  rejected: { terminal:"bad", title:"أُغلق الطلب بالرفض" }
};
