// ============================================================
// 2) مخطط النماذج لكل خطوة — عدّلي هنا لإضافة/تغيير أي حقل
// ============================================================
function approvalSchema(actorName, nextIfApprove, isFinal){
  const baseDecisions = isFinal ? [
    {label:"الاعتماد النهائي", next:"executed_prep", kind:"primary"},
    {label:"الرفض", next:"rejected", kind:"reject", reason:"رفض رئيس المؤسسة الطلب نهائيًا", requireComment:true},
    {label:"الإرجاع للتعديل", next:"draft", kind:"return", reason:"أُعيد الطلب لمقدمه للتعديل بقرار رئيس المؤسسة", requireComment:true}
  ] : [
    {label:"اعتماد ورفع للمستوى التالي", next:nextIfApprove, kind:"primary"},
    {label:"الرفض", next:"rejected", kind:"reject", reason:`رفض ${actorName} الطلب`, requireComment:true},
    {label:"الإرجاع للتعديل", next:"draft", kind:"return", reason:`أُعيد الطلب للتعديل بقرار ${actorName}`, requireComment:true}
  ];
  return {
    phase:"purple", actor: actorName,
    title: "اعتماد " + actorName,
    desc: isFinal ? "المستوى الرابع والأخير في سلسلة الاعتماد — القرار هنا نهائي." : "أحد مستويات سلسلة الاعتماد الإداري بالتسلسل.",
    sections: [{ title:"القرار", fields:[
      {key:"comment_"+actorName, label:"ملاحظات (إلزامي عند الرفض أو الإرجاع)", type:"textarea"}
    ]}],
    decisions: baseDecisions.map(d => ({...d, commentKey:"comment_"+actorName}))
  };
}

const FORM_SCHEMAS = {
  draft: {
    phase:"teal", actor:"مقدم الطلب", title:"نموذج طلب النقل الوظيفي",
    sections:[
      { title:"صفة مقدّم الطلب", fields:[
        {key:"applicantCapacity", label:"صفة مقدّم الطلب", type:"select", options:["إدارة القسم","موظف داخل القسم"], required:true}
      ]},
      { title:"بيانات مقدّم الطلب", fields:[
        {key:"name", label:"اسم الموظف", type:"text", required:true},
        {key:"employeeId", label:"الرقم الوظيفي", type:"text", required:true},
        {key:"department", label:"الإدارة / القسم / المكتب الحالي", type:"text", required:true},
        {key:"jobTitle", label:"المسمى الوظيفي الحالي", type:"text", required:true},
        {key:"grade", label:"الدرجة الوظيفية", type:"text", required:true},
        {key:"specialty", label:"التخصص", type:"text"}
      ]},
      { title:"تفاصيل الطلب", fields:[
        {key:"transferType", label:"نوع النقل", type:"radio", options:["داخل الجهة","خارج الجهة"], required:true},
        {key:"justifications", label:"مبررات طلب النقل", type:"checkbox", options:[
          "سد احتياج وظيفي","إعادة توزيع للموظفين بالإدارة","قصور بالوحدة التنظيمية",
          "تحديث بالمهام والمسؤوليات بالإدارة","تنمية وتطوير قدرات الموظف","أخرى"], required:true},
        {key:"supportingJustification", label:"مبررات داعمة لطلب النقل", type:"textarea"}
      ]},
      { title:"الجهة المراد النقل إليها", fields:[
        {key:"targetDept", label:"الإدارة", type:"text", required:true},
        {key:"targetUnit", label:"القسم / الوحدة", type:"text"},
        {key:"expectedTasks", label:"المهام المتوقّع أن يقوم بها الموظف بالجهة الجديدة", type:"textarea", required:true}
      ]},
      { title:"موافقة الجهات المعنية", fields:[
        {key:"currentDeptApproval", label:"موافقة الجهة الحالية للموظف", type:"radio", options:["موافقة متوفرة","لا توجد بعد"], required:true},
        {key:"targetDeptApproval", label:"موافقة الجهة المراد النقل إليها", type:"radio", options:["موافقة متوفرة","لا توجد بعد"], required:true},
        {key:"targetDate", label:"التاريخ المستهدف للانتقال", type:"date"}
      ]}
    ],
    submitLabel:"تقديم الطلب", next:"received"
  },

  received: { phase:"gray", actor:"مسؤول تخطيط الموارد البشرية", title:"استقبال الطلب",
    desc:"وصل طلب النقل إلى تخطيط الموارد البشرية، وينتظر بدء الدراسة.",
    sections:[], submitLabel:"بدء دراسة الطلب", next:"study" },

  study: {
    phase:"gray", actor:"مسؤول تخطيط الموارد البشرية", title:"نموذج دراسة حالة الطلب",
    desc:"دراسة الاحتياج ومطابقة الوظيفة، وتحديد الحاجة لموافقة مالية.",
    sections:[
      { title:"بيانات الطلب", fields:[
        {key:"availableUnit", label:"الوحدة التنظيمية المتاح الانتقال إليها", type:"text", required:true},
        {key:"probationPeriod", label:"هل الموظف في فترة التجربة؟", type:"radio", options:["نعم","لا"], required:true}
      ]},
      { title:"الأثر المالي والتنظيمي", fields:[
        {key:"budgetConflict", label:"هل يخالف التحوير تعليمات الميزانية؟", type:"radio", options:["نعم","لا"], required:true},
        {key:"hasFinancialImpact", label:"هل يوجد أثر مالي على الانتقال؟", type:"radio", options:["نعم","لا"], required:true}
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
      { title:"التوصية", fields:[
        {key:"studyRecommendation", label:"توصية مسؤول تخطيط الموارد البشرية", type:"textarea", required:true}
      ]}
    ],
    submitLabel:"إنهاء الدراسة والمتابعة",
    route: (d) => d.hasFinancialImpact === "نعم" ? "financial" : "employee"
  },

  financial: {
    phase:"amber", actor:"مسؤول الموافقات المالية", title:"نموذج دراسة الأثر المالي",
    desc:"دراسة الأثر المالي المترتب على النقل، وإرسال القرار.",
    sections:[
      { title:"البيانات المالية", fields:[
        {key:"currentSalary", label:"الراتب الأساسي الحالي", type:"text"},
        {key:"targetSalary", label:"الراتب / الدرجة المستهدفة", type:"text"},
        {key:"allowancesAffected", label:"البدلات المتأثرة بالنقل (إن وجدت)", type:"textarea"},
        {key:"budgetAvailable", label:"هل يتوفر الاعتماد المالي اللازم؟", type:"radio", options:["نعم","لا"], required:true},
        {key:"financialNotes", label:"ملاحظات مسؤول الموافقات المالية", type:"textarea"}
      ]}
    ],
    decisions:[
      {label:"الموافقة على الطلب المالي", next:"employee", kind:"primary"},
      {label:"رفض الطلب المالي", next:"rejected", kind:"reject", reason:"رفض مسؤول الموافقات المالية الطلب لعدم توفر الاعتماد المالي"}
    ]
  },

  employee: {
    phase:"gray", actor:"الموظف المطلوب نقله", title:"البتّ في نموذج طلب موافقة النقل",
    desc:"مراجعة تفاصيل النقل المعروضة أدناه في ملف المعاملة، ثم اتخاذ القرار.",
    sections:[
      { title:"إقرار الموظف", fields:[
        {key:"employeeSignatureName", label:"اسم الموظف (إقرارًا بالاطّلاع)", type:"text", required:true},
        {key:"employeeDecisionDate", label:"التاريخ", type:"date"}
      ]}
    ],
    decisions:[
      {label:"أوافق على النقل", next:"admin_draft", kind:"primary"},
      {label:"لا أوافق على النقل", next:"rejected", kind:"reject", reason:"رفض الموظف المطلوب نقله الموافقة على النقل"}
    ]
  },

  admin_draft: {
    phase:"purple", actor:"مسؤول تخطيط الموارد البشرية", title:"إعداد القرار الإداري (مسودة)",
    desc:"إعداد مسودة القرار، وتحديد صاحب الصلاحية آليًا حسب نوع النقل والدرجة.",
    sections:[
      { title:"بيانات القرار", fields:[
        {key:"decisionType", label:"نوع القرار", type:"select", options:[
          "نقل داخل المنطقة لمصلحة العمل","نقل خارج المنطقة لمصلحة العمل","نقل خارج المنطقة بناءً على طلب الموظف"], required:true},
        {key:"decisionDate", label:"تاريخ القرار", type:"date", required:true},
        {key:"decisionFile", label:"رفع ملف القرار الإداري (اختياري)", type:"file"}
      ]}
    ],
    submitLabel:"رفع القرار لصاحب الصلاحية", next:"appr1"
  },

  appr1: approvalSchema("نائب مدير تخطيط الموارد البشرية","appr2", false),
  appr2: approvalSchema("مدير تخطيط الموارد البشرية","appr3", false),
  appr3: approvalSchema("مدير الموارد البشرية","appr4", false),
  appr4: approvalSchema("رئيس المؤسسة","executed_prep", true),

  executed_prep: {
    phase:"green", actor:"مسؤول تخطيط الموارد البشرية", title:"تنفيذ القرار وتحديث الأنظمة",
    desc:"تنفيذ التغيير في الأنظمة وإشعار جميع الأطراف.",
    sections:[
      { title:"بيانات التنفيذ", fields:[
        {key:"executionDate", label:"تاريخ التنفيذ الفعلي", type:"date", required:true},
        {key:"executionNotes", label:"ملاحظات التنفيذ", type:"textarea"}
      ]}
    ],
    submitLabel:"تنفيذ الإجراء وإغلاق الطلب", next:"executed"
  },

  executed: { terminal:"ok" },
  rejected: { terminal:"bad" }
};
