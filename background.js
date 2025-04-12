let activeTabId = null;
let activeStartTime = null;

function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return null;
  }
}

// Save time spent on the current tab
async function handleTabSwitch(newTabId) {
  const now = Date.now();

  // Save time spent on previous tab
  if (activeTabId !== null && activeStartTime !== null) {
    const timeSpent = now - activeStartTime;

    try {
      const prevTab = await chrome.tabs.get(activeTabId);
      const prevDomain = getDomain(prevTab.url);

      if (prevDomain) {
        chrome.storage.local.get(["websiteData"], (res) => {
          const data = res.websiteData || {};

          if (!data[prevDomain]) {
            data[prevDomain] = { time: 0, timestamp: now };
          }

          data[prevDomain].time += timeSpent;
          data[prevDomain].timestamp = now;

          chrome.storage.local.set({ websiteData: data });
        });
      }
    } catch (err) {
      // tab might have been closed
    }
  }

  // Start timing new tab
  activeTabId = newTabId;
  activeStartTime = now;

  // UPDATING IN PROCESS.....
  // Check if the site is YouTube and limit is set
  chrome.storage.local.get(["timeLimits", "notifiedToday", "websiteData"], (res) => {
    const limit = res.timeLimits?.["www.youtube.com"];
    const notified = res.notifiedToday?.["www.youtube.com"];
    const data = res.websiteData || {};

    if (limit && data["www.youtube.com"]?.time >= limit && !notified) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icon128.png",
        title: "Time's up!",
        message: "You've used all your allotted time for YouTube today.",
        priority: 2,
      });

      // Mark as notified
      const updatedNotified = res.notifiedToday || {};
      updatedNotified["www.youtube.com"] = true;
      chrome.storage.local.set({ notifiedToday: updatedNotified });
    }
  });
}

// When user switches tab
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await handleTabSwitch(activeInfo.tabId);
});

// When user switches window
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs.length > 0) {
    await handleTabSwitch(tabs[0].id);
  }
});

// When tab is updated (URL change, etc)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && changeInfo.status === "complete") {
    handleTabSwitch(tabId);
  }
});

setInterval(() => {
  if (activeTabId && activeStartTime) {
    handleTabSwitch(activeTabId);
  }
}, 60 * 1000); // 1 minute

function scheduleDailyReset() {
  const now = new Date();
  const nextMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0, 0, 0
  );
  const delay = nextMidnight - now;

  setTimeout(() => {
    chrome.storage.local.set({ notifiedToday: {} });
    scheduleDailyReset(); 
  }, delay);
}

scheduleDailyReset();
