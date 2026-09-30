// ============================================================
// بيانات تجريبية تمثّل نظام شؤون الموظفين
// سيُستبدل هذا الملف لاحقًا بالربط الفعلي مع نظام بيانات الموظفين
// ============================================================
const DEPARTMENTS = {
  projects: "الإدارة العامة للمشاريع — قسم الإشراف الهندسي",
  operations: "إدارة التشغيل والصيانة — قسم محطات الضخ",
  finance: "إدارة الشؤون المالية — قسم الحسابات",
  it: "إدارة تقنية المعلومات — قسم الدعم الفني",
  hr: "إدارة الموارد البشرية — قسم تخطيط الموارد البشرية"
};

const EMPLOYEE_DIRECTORY = [
  { employeeId:"10245", name:"مريم أحمد السويلم",   department:DEPARTMENTS.hr,         jobTitle:"أخصائي موارد بشرية",   grade:"السابعة",  specialty:"إدارة موارد بشرية" },
  { employeeId:"10311", name:"سلطان محمد العتيبي",  department:DEPARTMENTS.projects,   jobTitle:"مهندس مدني",           grade:"الثامنة",  specialty:"هندسة مدنية" },
  { employeeId:"10318", name:"لمى عبدالرحمن الزهراني", department:DEPARTMENTS.projects, jobTitle:"مهندس مشاريع",         grade:"السابعة",  specialty:"هندسة مدنية" },
  { employeeId:"10342", name:"تركي سعد القرني",     department:DEPARTMENTS.projects,   jobTitle:"مراقب فني",            grade:"السادسة",  specialty:"مساحة" },
  { employeeId:"10357", name:"عبير خالد الحربي",    department:DEPARTMENTS.projects,   jobTitle:"إداري مشاريع",         grade:"الخامسة",  specialty:"إدارة أعمال" },
  { employeeId:"10402", name:"ماجد ناصر الشمري",    department:DEPARTMENTS.operations, jobTitle:"فني تشغيل",            grade:"الخامسة",  specialty:"كهرباء" },
  { employeeId:"10415", name:"نوف فهد السبيعي",     department:DEPARTMENTS.operations, jobTitle:"مهندس ميكانيكا",       grade:"الثامنة",  specialty:"هندسة ميكانيكية" },
  { employeeId:"10433", name:"بندر علي المالكي",    department:DEPARTMENTS.finance,    jobTitle:"محاسب",                grade:"السادسة",  specialty:"محاسبة" },
  { employeeId:"10468", name:"أسماء يوسف البقمي",   department:DEPARTMENTS.it,         jobTitle:"أخصائي دعم فني",       grade:"السادسة",  specialty:"نظم معلومات" },
  { employeeId:"10471", name:"راكان حمد الدوسري",   department:DEPARTMENTS.it,         jobTitle:"مطور تطبيقات",         grade:"السابعة",  specialty:"علوم حاسب" }
];

// الموظف الذي يمثّل "المستخدم الحالي" عند تقديم الطلب بنفسه
const SELF_EMPLOYEE_ID = "10245";

// مدير القسم الذي يمثّل "المستخدم الحالي" عند التقديم بصفة مدير قسم
const CURRENT_MANAGER = { name:"عبدالله سعد الحربي", department:DEPARTMENTS.projects };

// إعدادات ورقة القرار الإداري
const DECISION_CONFIG = {
  issuerTitle: "الرئيس التنفيذي",
  signatory: "م. محمد بن زيد ابوحيد",
  copies: [
    "صورة لسعادة نائب الرئيس للعمليات والسدود",
    "صورة لقسم خدمات الموظفين",
    "صورة لقسم الرواتب والتعويضات",
    "صورة لوحدة شؤون الموظفين",
    "صورة لوحدة الرواتب"
  ],
  minTableRows: 7
};
