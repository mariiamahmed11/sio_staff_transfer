// ============================================================
// 4) نافذة سياسات النقل
// ============================================================
// الضغط على "طلب جديد" يعرض السياسات مباشرة، ولا يُنشأ الطلب إلا بعد الموافقة عليها
function startNewRequest(){
  if (selectedRole !== ROLE.applicant) return;
  document.getElementById("policyModal").style.display = "flex";
}
function closeModal(){ document.getElementById("policyModal").style.display = "none"; }
function agreeToPolicy(){
  closeModal();
  createRequest();
}
