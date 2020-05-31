document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('start').addEventListener('click', () => {
    chrome.tabs.query({currentWindow: true, active : true}, function (tabs) {
      if (tabs[0]) {
        chrome.runtime.sendMessage({
          type:'useOnTab',
          tabId: tabs[0].id,
          audible: tabs[0].audible,
          title: tabs[0].title,
          url: tabs[0].url
        });
      }
    });
  });
});
