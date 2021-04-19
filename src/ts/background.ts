import 'webext-dynamic-content-scripts';
import addDomainPermissionToggle from 'webext-domain-permission-toggle';

export const enum StorageKey {
  ColorsDisabled = 'colorsDisabled',
  DarkMode = 'darkMode',
}

chrome.contextMenus.create({
  id: 'change-icon-color',
  title: 'Change icon colors',
  contexts: ['page', 'page_action', 'browser_action'],
  documentUrlPatterns: [
    'https://github.com/*',
    'https://gitlab.com/*',
    'https://*.gogs.io/*',
    'https://*.gitea.io/*',
    'https://dev.azure.com/*'
  ],
});

chrome.contextMenus.create({
  id: 'toggle-dark-mode',
  title: 'Toggle dark mode',
  contexts: ['page', 'page_action', 'browser_action'],
  documentUrlPatterns: [
    'https://github.com/*',
    'https://gitlab.com/*',
    'https://*.gogs.io/*',
    'https://*.gitea.io/*',
    'https://dev.azure.com/*'
  ],
});

addDomainPermissionToggle();

const toggleStorage = (key: StorageKey) => (tabs: chrome.tabs.Tab[]) => {
  const activeTab = tabs[0];

  chrome.storage.sync.get(key, (storage) => {
    chrome.storage.sync.set({ [key]: !storage[key] }, () =>
      chrome.tabs.reload(activeTab.id!)
    );
  });
};

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'change-icon-color') {
    chrome.tabs.query(
      {
        active: true,
        currentWindow: true,
      },
      toggleStorage(StorageKey.ColorsDisabled)
    );
  } else if (info.menuItemId === 'toggle-dark-mode') {
    chrome.tabs.query(
      {
        active: true,
        currentWindow: true,
      },
      toggleStorage(StorageKey.DarkMode)
    );
  }
});
