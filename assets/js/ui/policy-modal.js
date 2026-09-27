// ============================================================
// 4) نافذة سياسات النقل
// ============================================================
function openPolicyModal(reqId){ modalReqId = reqId; document.getElementById("policyModal").style.display = "flex"; }
function closeModal(){ document.getElementById("policyModal").style.display = "none"; }
function agreeToPolicy(){
  const r = getReq(modalReqId);
  if (r) r.data.policyAgreed = true;
  closeModal(); render();
}
