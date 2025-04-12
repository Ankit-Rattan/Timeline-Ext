const siteList = document.getElementById("siteList");
const productivityEl = document.getElementById("productivity");
const refreshBtn = document.getElementById("refresh");
const exportBtn = document.getElementById("export");

const CATEGORY_COLORS = {
  work: "work",
  education: "education",
  neutral: "neutral",
  social: "social",
  distraction: "distraction",
};

const CATEGORY_WEIGHTS = {
  work: 1.0,
  education: 0.8,
  neutral: 0.5,
  social: 0.2,
  distraction: 0.0,
};

const DOMAIN_CATEGORIES = {
  "docs.google.com": "education",
  "mail.google.com": "work",
  "github.com": "work",
  "stackoverflow.com": "work",
  "facebook.com": "social",
  "instagram.com": "social",
  "youtube.com": "distraction",
  "twitter.com": "social",
  "linkedin.com": "work",
  "netflix.com": "distraction",
  "reddit.com": "social",
};

function getCategory(domain) {
  return DOMAIN_CATEGORIES[domain] || "neutral";
}

function formatTime(ms) {
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${min}m ${rem}s`;
}

function calculateProductivity(data) {
  let total = 0;
  let score = 0;

  for (const domain in data) {
    const time = data[domain];
    const category = getCategory(domain);
    const weight = CATEGORY_WEIGHTS[category];

    total += time;
    score += time * weight;
  }

  const percent = total ? Math.round((score / total) * 100) : 0;
  return percent;
}

function renderSiteList(data) {
  siteList.innerHTML = "";

  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);

  for (const [domain, time] of sorted) {
    const category = getCategory(domain);
    const div = document.createElement("div");
    div.className = "site-card";
    div.innerHTML = `
      <div class="site-top">
        <span>${domain}</span>
        <span>${formatTime(time)}</span>
      </div>
      <div class="site-meta">
        <span>Category: ${category}</span>
        <span class="badge ${CATEGORY_COLORS[category]}">${category}</span>
      </div>
    `;
    siteList.appendChild(div);
  }
}

let currentChart = null;

function renderChart(data) {
  const ctx = document.getElementById("timeChart").getContext("2d");

  if (currentChart) {
    currentChart.destroy();
  }

  const labels = [];
  const values = [];
  const backgroundColors = [];

  for (const domain in data) {
    const category = getCategory(domain);
    labels.push(domain);
    values.push(Math.round(data[domain] / 1000));
    backgroundColors.push(getColorForCategory(category));
  }

  currentChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Time (s)",
        data: values,
        backgroundColor: backgroundColors,
      }]
    },
    options: {
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { ticks: { autoSkip: false } },
        y: { beginAtZero: true }
      }
    }
  });
}

function getColorForCategory(category) {
  switch (category) {
    case "work": return "#10b981";
    case "education": return "#3b82f6";
    case "social": return "#facc15";
    case "distraction": return "#ef4444";
    default: return "#9ca3af";
  }
}

function exportToCSV(data) {
  let csv = "Domain,Time Spent (seconds),Category\n";

  for (const domain in data) {
    const time = Math.floor(data[domain] / 1000);
    const category = getCategory(domain);
    csv += `${domain},${time},${category}\n`;
  }

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  if (chrome.downloads) {
    chrome.downloads.download({
      url: url,
      filename: `productivity-data-${Date.now()}.csv`,
      saveAs: true,
    });
  } else {
    alert("Download API not available. Please check permissions in manifest.json.");
  }
}

function renderPopup() {
  chrome.storage.local.get(["websiteData"], (res) => {
    const allData = res.websiteData || {};

    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const filtered = {};

    for (const domain in allData) {
      const entry = allData[domain];
      if (typeof entry === "object" && entry.timestamp > cutoff) {
        filtered[domain] = entry.time;
      } else if (typeof entry === "number") {
        filtered[domain] = entry;
      }
    }

    const productivity = calculateProductivity(filtered);
    productivityEl.innerText = `🔥 Productivity: ${productivity}%`;

    renderSiteList(filtered);
    renderChart(filtered);
  });
}

refreshBtn.addEventListener("click", renderPopup);
exportBtn.addEventListener("click", () => {
  chrome.storage.local.get(["websiteData"], (res) => {
    const data = res.websiteData || {};
    exportToCSV(data);
  });
});

renderPopup();


setInterval(() => {
  renderPopup();
}, 1 * 60 * 1000); 
