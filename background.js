const tabData = {
  id: undefined,
  audible: false,
  title: undefined,
  url: undefined
};
let currentTitle;
const ruleRegex = new RegExp('^/(.*?)/([gimuy]*)$');
let config;

class RegExpEx extends RegExp {
  constructor(pattern, flags) {
    super(pattern, flags);
  }

  toJSON() {
    return this.toString();
  }
}

function deserializeConfig(text) {
  const json = JSON.parse(text);
  if (typeof json !== 'object') {
    throw new Error('Invalid config');
  }
  if (!json.hasOwnProperty('noAudioTitle') || typeof json.noAudioTitle !== 'string') {
    throw new Error('Invalid config');
  }
  if (!json.hasOwnProperty('serverUrl') || typeof json.serverUrl !== 'string') {
    throw new Error('Invalid config');
  }
  if (!json.hasOwnProperty('origins') || typeof json.origins !== 'object') {
    throw new Error('Invalid config');
  }
  for (const rules of Object.values(json.origins)) {
    if (!rules.hasOwnProperty('cutFromStart') || typeof rules.cutFromStart !== 'number' || !Number.isInteger(rules.cutFromStart)) {
      throw new Error('Invalid config');
    }
    if (!rules.hasOwnProperty('cutFromEnd') || (rules.cutFromEnd !== null && (typeof rules.cutFromEnd !== 'number' || !Number.isInteger(rules.cutFromEnd)))) {
      throw new Error('Invalid config');
    }
    if (!rules.hasOwnProperty('pathWhiteListRules') || (rules.pathWhiteListRules !== null && !Array.isArray(rules.pathWhiteListRules))) {
      throw new Error('Invalid config');
    } else if (rules.pathWhiteListRules) {
      rules.pathWhiteListRules = rules.pathWhiteListRules
          .map(rule => {
            if (typeof rule !== 'string') {
              throw new Error('Invalid config');
            }
            const match = rule.match(ruleRegex);
            return new RegExpEx(match[1], match[2]);
          });
    }
    if (!rules.hasOwnProperty('titleBlackListRules') || (rules.titleBlackListRules !== null && !Array.isArray(rules.titleBlackListRules))) {
      throw new Error('Invalid config');
    } else if (rules.titleBlackListRules) {
      rules.titleBlackListRules = rules.titleBlackListRules
          .map(rule => {
            if (typeof rule !== 'string') {
              throw new Error('Invalid config');
            }
            const match = rule.match(ruleRegex);
            return new RegExpEx(match[1], match[2]);
          });
    }
  }
  return json;
}

function loadConfig() {
  fetch(chrome.runtime.getURL('/config.json'))
      .then((response) => response.text())
      .then((text) => {
        config = deserializeConfig(text);
        chrome.storage.local.set({ config: text });
      })
      .catch((error) => console.error(error));
}

function sendTitle() {
  if (!config) {
    chrome.storage.local.get('config', function (result) {
      if (result.config) {
        console.log(result.config);
        config = deserializeConfig(result.config);
        sendTitle();
      }
    });
    return;
  }
  let newTitle = config.noAudioTitle;
  if (tabData.audible) {
    const url = new URL(tabData.url);
    if (config.origins.hasOwnProperty(url.origin)) {
      const rules = config.origins[url.origin];
      newTitle = tabData.title.slice(rules.cutFromStart, typeof rules.cutFromEnd === 'number' ? -rules.cutFromEnd : undefined);
      let passed = true;
      if (rules.pathWhiteListRules) {
        passed = false;
        for (const rule of rules.pathWhiteListRules) {
          if (rule.test(url.pathname)) {
            passed = true;
            break;
          }
        }
      }
      if (passed && rules.titleBlackListRules) {
        for (const rule of rules.titleBlackListRules) {
          if (rule.test(newTitle)) {
            passed = false;
            break;
          }
        }
      }
      if (!passed) {
        newTitle = config.noAudioTitle;
      }
    } else {
      newTitle = config.noAudioTitle;
    }
  } else {
    newTitle = config.noAudioTitle;
  }
  if (currentTitle !== newTitle) {
    currentTitle = newTitle;
    console.log(currentTitle);
    //const blob = new Blob([currentTitle]);
    fetch(`${config.serverUrl}?title=${encodeURIComponent(currentTitle)}`, {
      method: 'GET',
      credentials: 'omit',
      //headers: {
        //'Content-Type': 'application/json',
        //'Content-Type': 'text/plain; charset=UTF-8'
        //'Content-Length': blob.size
      //},
      //data: currentTitle
    }).catch((err) => console.error(err));
  }
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.type === 'useOnTab' && tabData.id !== request.tabId) {
    tabData.id = request.tabId;
    tabData.audible = request.audible;
    tabData.title = request.title;
    tabData.url = request.url;
    sendTitle();
    chrome.storage.local.set({ tabId: tabData.id });
  }
});

chrome.tabs.onUpdated.addListener(function handleTabsUpdate(tabId, changeInfo, tab) {
  if (tabId !== tabData.id) {
    if (tabData.id === undefined) {
      chrome.storage.local.get('tabId', function (result) {
        if (result.tabId) {
          tabData.id = result.tabId;
          if (tabId === tabData.id) {
            tabData.audible = tab.audible;
            tabData.title = tab.title;
            tabData.url = tab.url;
            sendTitle();
          }
        }
      });
    }
    return;
  }
  let changed = false;
  if (changeInfo.hasOwnProperty('audible') && tabData.audible !== changeInfo.audible) {
    tabData.audible = changeInfo.audible;
    changed = true;
  }
  if (changeInfo.hasOwnProperty('title') && tabData.title !== changeInfo.title) {
    tabData.title = changeInfo.title;
    changed = true;
  }
  if (changeInfo.hasOwnProperty('url') && tabData.url !== changeInfo.url) {
    tabData.url = changeInfo.url;
    changed = true;
  }
  if (changed) {
    sendTitle();
  }
});

chrome.tabs.onRemoved.addListener(function (tabId) {
  if (tabId !== tabData.id) {
    return;
  }
  tabData.id = undefined;
  tabData.audible = false;
  tabData.title = undefined;
  tabData.url = undefined;
  sendTitle();
  chrome.storage.local.remove('tabId');
});

chrome.runtime.onInstalled.addListener(function() {
  loadConfig();
});
