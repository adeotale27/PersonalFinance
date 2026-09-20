import api from "./api";

export async function downloadEntity(entity, params = {}, filename = "export") {
  const qs = new URLSearchParams();
  qs.set("entity", entity);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    qs.set(key, String(value));
  });

  const response = await api.get(`/export?${qs.toString()}`, { responseType: "blob" });
  const blob = new Blob([response.data], { type: response.headers["content-type"] || "application/vnd.ms-excel" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}-${Date.now()}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function downloadFinancialSnapshot() {
  const response = await api.get("/export/financial-snapshot", { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: response.headers["content-type"] }));
  const link = document.createElement("a"); link.href = url; link.download = `nivara-financial-snapshot-${Date.now()}.xlsx`;
  document.body.appendChild(link); link.click(); link.remove(); window.URL.revokeObjectURL(url);
}
