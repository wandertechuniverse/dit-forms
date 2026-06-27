const auth = {
  async requireLogin() {
    const token = api.getToken();
    if (!token) {
      window.location.href = "/login.html";
      return null;
    }
    try {
      const user = await api.get("/auth/me");
      return user;
    } catch (e) {
      api.clearToken();
      window.location.href = "/login.html";
      return null;
    }
  },
  logout() {
    api.clearToken();
    localStorage.removeItem("dit_programClassId");
    localStorage.removeItem("dit_termId");
    window.location.href = "/login.html";
  },
  renderTopbar(user) {
    const el = document.getElementById("user-info");
    if (el) el.innerHTML = `<span>${user.email} (${user.role})</span><button class="btn btn-secondary btn-sm" onclick="auth.logout()">Logout</button>`;
  },
  renderSidebar(activePage) {
    const sidebar = document.getElementById("sidebar-nav");
    if (!sidebar) return;
    const { programClassId, termId } = getScope();
    const q = programClassId && termId ? `?programClassId=${programClassId}&termId=${termId}` : "";
    const links = [
      { href: "/admin/dashboard.html", label: "Dashboard", key: "dashboard" },
      { href: `/admin/students.html${q}`, label: "Students", key: "students" },
      { href: `/admin/forms.html${q}`, label: "Forms", key: "forms" },
      { href: `/admin/submissions.html${q}`, label: "Submissions", key: "submissions" },
      { href: `/admin/handout-orders.html${q}`, label: "Handout Orders", key: "handouts" },
      { href: `/admin/payments.html${q}`, label: "Payments", key: "payments" },
    ];
    sidebar.innerHTML = links.map(l => `<a href="${l.href}" class="${activePage === l.key ? 'active' : ''}">${l.label}</a>`).join("");
  },
};
