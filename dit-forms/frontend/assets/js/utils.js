const utils = {
  formatDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString();
  },
  formatMoney(amount, currency = "USD") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  },
  escapeHtml(str) {
    if (str == null) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  },
  showAlert(containerId, message, type = "info") {
    const c = document.getElementById(containerId);
    if (!c) return;
    c.innerHTML = `<div class="alert alert-${type}">${utils.escapeHtml(message)}</div>`;
    if (type === "success") setTimeout(() => { c.innerHTML = ""; }, 3000);
  },
  setLoading(btn, loading) {
    if (loading) {
      btn.dataset.originalText = btn.innerHTML;
      btn.innerHTML = '<span class="spinner"></span> Loading...';
      btn.disabled = true;
    } else {
      btn.innerHTML = btn.dataset.originalText || "Submit";
      btn.disabled = false;
    }
  },
};
