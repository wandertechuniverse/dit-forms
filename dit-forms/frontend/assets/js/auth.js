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
    const topbar = document.getElementById("user-info");
    if (topbar) {
      topbar.innerHTML = `
        <span>${user.email} (${user.role})</span>
        <button class="btn btn-secondary btn-sm" onclick="auth.logout()">Logout</button>
      `;
    }
  },

  renderSidebar(activePage, user) {
    const sidebar = document.getElementById("sidebar-nav");
    if (!sidebar) return;

    const { programClassId, termId } = getScope();
    const scopeQuery = programClassId && termId
      ? `?programClassId=${programClassId}&termId=${termId}`
      : "";

    const links = [
      { href: "/admin/dashboard.html", label: "Dashboard", key: "dashboard" },
      { href: `/admin/students.html${scopeQuery}`, label: "Students", key: "students" },
      { href: `/admin/forms.html${scopeQuery}`, label: "Forms", key: "forms" },
      { href: `/admin/submissions.html${scopeQuery}`, label: "Submissions", key: "submissions" },
      { href: `/admin/handout-orders.html${scopeQuery}`, label: "Handout Orders", key: "handouts" },
      { href: `/admin/payments.html${scopeQuery}`, label: "Payments", key: "payments" },
    ];

    if (user && user.role === "admin") {
      links.push({ href: "/admin/class-reps.html", label: "Class Reps", key: "class-reps" });
    }

    const iconMap = {
      dashboard: "📊",
      students: "🎓",
      forms: "📝",
      submissions: "📬",
      handouts: "📦",
      payments: "💰",
      "class-reps": "👥",
    };

    sidebar.innerHTML = links.map((l) => `
      <a href="${l.href}" class="${activePage === l.key ? "active" : ""}">${iconMap[l.key] || ""} ${l.label}</a>
    `).join("");
  },
};
