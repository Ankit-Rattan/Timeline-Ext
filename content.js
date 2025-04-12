// This script runs on every page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'getTimeSpent') {
      // Send the time spent for the current domain
      chrome.runtime.sendMessage({
        type: 'updateTimeSpent',
        domain: window.location.hostname,
        timeSpent: Date.now()
      });
    }
  });
  