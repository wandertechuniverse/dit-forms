const utils = {
  formatDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString();
  },

  formatMoney(amount, currency = "KES") {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency,
    }).format(amount);
  },

  escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },

  showAlert(containerId, message, type = "info") {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `<div class="alert alert-${type}">${utils.escapeHtml(message)}</div>`;
    if (type === "success") {
      setTimeout(() => { container.innerHTML = ""; }, 3000);
    }
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

  debounce(fn, ms = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  },

  async confirmAction(message) {
    return window.confirm(message);
  },
};
