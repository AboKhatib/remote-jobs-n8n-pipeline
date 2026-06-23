const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ73YeIyOtdBJiH2erTzhrTOqVeog4zbFxs-2rg2zZVtf6akhuqwxBXQ9i5f-mJk_-ZRMe6DFJiNg3_/pub?gid=0&single=true&output=csv";

let jobs = [];
let filtered = [];
let search = "";
let sort = "newest";

const el = {
  content: document.getElementById("content"),
  search: document.getElementById("search"),
  clear: document.getElementById("search-clear"),
  sort: document.getElementById("sort-select"),
  refresh: document.getElementById("refresh-btn"),
  total: document.getElementById("stat-total"),
  showing: document.getElementById("stat-showing"),
  toast: document.getElementById("toast"),
  updated: document.getElementById("last-updated")
};

function escapeHTML(value) {
  if (!value) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toast(msg) {
  el.toast.textContent = msg;
  el.toast.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.toast.classList.remove("show"), 2500);
}

function setLoading(isLoading) {
  if (isLoading) {
    el.refresh.classList.add("spinning");
    el.content.innerHTML = `<div class="card">⏳ جارٍ تحميل أحدث القوائم...</div>`;
  } else {
    el.refresh.classList.remove("spinning");
  }
}

function splitCSVRows(text) {
  const rows = [];
  let row = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if ((ch === "," || ch === "\t") && !inQuotes) {
      row.push(cur);
      cur = "";
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") continue;
      row.push(cur);
      if (row.some(cell => String(cell).trim() !== "")) rows.push(row);
      row = [];
      cur = "";
      continue;
    }

    cur += ch;
  }

  if (cur !== "" || row.length) {
    row.push(cur);
    if (row.some(cell => String(cell).trim() !== "")) rows.push(row);
  }

  return rows;
}

function parseCSV(text) {
  const cleanText = text.replace(/^\uFEFF/, "").trim();
  if (!cleanText) return [];

  const rows = splitCSVRows(cleanText);
  if (rows.length === 0) return [];

  const headers = rows.shift().map(h =>
    String(h || "")
      .replace(/^\"|\"$/g, "")
      .trim()
      .toLowerCase()
  );

  console.log("📋 الرؤوس المستخرجة:", headers);

  return rows.map(vals => {
    const obj = {};
    headers.forEach((h, i) => {
      let v = vals[i] ?? "";
      v = String(v).replace(/^\"|\"$/g, "").trim();
      obj[h] = v;
    });

    return {
      title: obj.title || obj.job_title || obj.position || "",
      company: obj.company || obj.company_name || obj.employer || "",
      desc: obj.description || obj.desc || obj.summary || "",
      link: obj.url || obj.link || obj.application_link || "#",
      date: obj.posted_at || obj.date || obj.published_at || ""
    };
  }).filter(job => job.title || job.company || job.desc || job.link);
}

async function load() {
  setLoading(true);

  try {
    const res = await fetch(CSV_URL, { cache: "no-store" });

    if (!res.ok) {
      throw new Error(`خطأ في الشبكة: ${res.status} ${res.statusText}`);
    }

    const text = await res.text();

    if (text.trim().startsWith("<") && !text.includes(",") && !text.includes("\t")) {
      throw new Error("الرابط يعيد HTML وليس CSV. تأكد من رابط النشر الصحيح.");
    }

    jobs = parseCSV(text);
    apply();

    el.total.textContent = jobs.length;
    el.updated.textContent = "آخر تحديث: " + new Date().toLocaleTimeString();
    toast(`✅ تم تحميل ${jobs.length} وظيفة بنجاح`);
  } catch (err) {
    console.error("❌ فشل التحميل:", err);
    el.content.innerHTML = `
      <div class="card error-card">
        <div style="font-weight:600; font-size:1.1rem;">⚠️ تعذر تحميل البيانات</div>
        <p style="margin-top:8px;">${escapeHTML(err.message)}</p>
        <p style="margin-top:12px; font-size:0.9rem; color:#6b7280;">
          تأكد من أن جدول Google Sheets منشور للعامة.
        </p>
      </div>
    `;
    el.updated.textContent = "آخر تحديث: فشل";
    toast("❌ فشل التحميل — راجع وحدة التحكم");
    jobs = [];
    apply();
  } finally {
    setLoading(false);
  }
}

function apply() {
  const term = search.trim().toLowerCase();

  filtered = jobs.filter(j => {
    if (!term) return true;
    return (
      (j.title || "").toLowerCase().includes(term) ||
      (j.company || "").toLowerCase().includes(term) ||
      (j.desc || "").toLowerCase().includes(term) ||
      (j.date || "").toLowerCase().includes(term)
    );
  });

  if (sort === "alpha") {
    filtered.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  } else if (sort === "newest" || sort === "oldest") {
    filtered.sort((a, b) => {
      let da = new Date(a.date || 0).getTime();
      let db = new Date(b.date || 0).getTime();
      if (isNaN(da)) da = sort === "newest" ? -Infinity : Infinity;
      if (isNaN(db)) db = sort === "newest" ? -Infinity : Infinity;
      return sort === "newest" ? db - da : da - db;
    });
  }

  render();
}

function render() {
  el.showing.textContent = filtered.length;

  if (!filtered.length) {
    el.content.innerHTML = `
      <div class="card">
        <div class="company">🔍 لا توجد نتائج</div>
        <div class="title">لم نجد وظائف تطابق بحثك</div>
        <div class="desc">جرب كلمات بحث مختلفة أو امسح الفلتر.</div>
      </div>
    `;
    return;
  }

  el.content.innerHTML = `
    <div class="grid">
      ${filtered.map(job => `
        <article class="card">
          <div class="company">${escapeHTML(job.company || "شركة غير معروفة")}</div>
          <div class="title">
            ${escapeHTML(job.title || "وظيفة بدون عنوان")}
          </div>
          <div class="desc">${escapeHTML(job.desc || "لا يوجد وصف متاح.")}</div>
          ${job.date ? `<div style="margin-top:10px; font-size:0.75rem; color:#9ca3af;">📅 ${escapeHTML(job.date)}</div>` : ''}
          <div style="margin-top:12px; display:flex; gap:8px;">
            <a class="btn-apply" href="${escapeHTML(job.link)}" target="_blank" rel="noopener noreferrer">Apply</a>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

el.search.addEventListener("input", e => {
  search = e.target.value;
  el.clear.style.display = search.trim() ? "inline-block" : "none";
  apply();
});

el.clear.addEventListener("click", () => {
  el.search.value = "";
  search = "";
  el.clear.style.display = "none";
  apply();
});

el.sort.addEventListener("change", e => {
  sort = e.target.value;
  apply();
});

el.refresh.addEventListener("click", load);

load();