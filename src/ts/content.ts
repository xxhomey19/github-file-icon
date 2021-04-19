import * as fileIcons from 'file-icons-js';
import * as domLoaded from 'dom-loaded';
import select from 'select-dom';
import mobile from 'is-mobile';
import { observe } from 'selector-observer';

import { StorageKey } from './background';
import '../css/icons.css';
import '../css/pseudo-class.css';

let colorsDisabled = false;
let darkMode = false;

const fonts = [
  { name: 'FontAwesome', path: 'fonts/fontawesome.woff2' },
  { name: 'Mfizz', path: 'fonts/mfixx.woff2' },
  { name: 'Devicons', path: 'fonts/devopicons.woff2' },
  { name: 'file-icons', path: 'fonts/file-icons.woff2' },
  { name: 'octicons', path: 'fonts/octicons.woff2' },
];

const getSelector = (hostname: string) => {
  switch (true) {
    case /.*github.*/.test(hostname):
      return {
        filenameSelector:
          'tr.js-navigation-item > td.content > span, .files-list > a.list-item, div.js-navigation-item > div[role="rowheader"] > span',
        iconSelector:
          'tr.js-navigation-item > td.icon, .files-list > a.list-item, div.js-navigation-item > div[role="gridcell"]:first-child',
        host: 'github',
      };
    case /.*gitlab.*/.test(hostname):
      return {
        filenameSelector: 'tr.tree-item > td.tree-item-file-name > a > span',
        iconSelector: 'tr.tree-item > td.tree-item-file-name > i',
        host: 'gitlab',
      };
    case /.*azure.*/.test(hostname):
      return {
        filenameSelector: 'table.bolt-table tbody > a > td[aria-colindex=\"1\"] span.text-ellipsis',
        iconSelector: 'table.bolt-table tbody > a > td[aria-colindex=\"1\"] span.icon-margin',
        host: 'azure',
      }
    default:
      return {
        filenameSelector: 'tr > td.name > a',
        iconSelector: 'tr > td.name > span',
        host: 'others',
      };
  }
};

const loadFonts = () => {
  fonts.forEach((font) => {
    const fontFace = new FontFace(
      font.name,
      `url("${chrome.extension.getURL(font.path)}") format("woff2")`,
      {
        style: 'normal',
        weight: 'normal',
      }
    );

    fontFace
      .load()
      .then((loadedFontFace) => document.fonts.add(loadedFontFace));
  });
};

const getGitHubMobileFilename = (filenameDom: HTMLElement) =>
  Array.from(filenameDom.childNodes)
    .filter((node) => node.nodeType === node.TEXT_NODE)
    .map((node) => node.nodeValue!.trim())
    .join('');

const { filenameSelector, iconSelector, host } = getSelector(
  window.location.hostname
);
const isMobile = mobile();
const isGitHub = host === 'github';
const isAzure = host === 'azure';

const replaceIcon = ({
  iconDom,
  filenameDom,
}: {
  iconDom: HTMLElement | null;
  filenameDom: HTMLElement;
}) => {
  const filename =
    isGitHub && isMobile
      ? getGitHubMobileFilename(filenameDom)
      : filenameDom.innerText.trim();

  let isDirectory = false;
  if (iconDom) {
    isDirectory = iconDom.classList.contains('octicon-file-directory');
  }

  const className: string | null = colorsDisabled
    ? fileIcons.getClass(filename)
    : fileIcons.getClassWithColor(filename);

  const darkClassName = darkMode ? 'dark' : '';

  if (className && !isDirectory) {
    const icon = document.createElement('span');

    if (isGitHub) {
      icon.className = `icon octicon-file ${className} ${darkClassName}`;
    } else {
      icon.className = `${className} ${darkClassName}`;
      icon.style.marginRight = '3px';
    }

    if (iconDom) {
      iconDom.parentNode!.replaceChild(icon, iconDom as HTMLElement);
    }
  }
};

const update = () => {
  const filenameDoms = select.all(filenameSelector);
  const iconDoms = select.all(iconSelector);

  for (let i = 0; i < filenameDoms.length; i += 1) {
    replaceIcon({
      iconDom: iconDoms[i],
      filenameDom: filenameDoms[i],
    });
  }
};

const init = async () => {
  loadFonts();

  await domLoaded;

  if (isGitHub) {
    observe('.js-navigation-container > .js-navigation-item', {
      add(element) {
        const filenameDom = select('div[role="rowheader"] > span', element);

        if (!filenameDom) {
          return;
        }

        replaceIcon({
          iconDom: select('.octicon-file', element) as HTMLElement,
          filenameDom,
        });
      },
    });
  } else if (isAzure) {
    observe('table.bolt-table tbody > a', {
      add(element) {
        const filenameDom = select('td[aria-colindex=\"1\"] span.text-ellipsis', element);
        const originalIconDon = select('td[aria-colindex=\"1\"] span.icon-margin', element);

        if (!filenameDom || !originalIconDon) {
          return;
        }

        const isFolder = originalIconDon.classList.contains('repos-folder-icon');
        const className = fileIcons.getClass(filenameDom.innerText.trim());
        
        if (!isFolder && className) {
          const newIconDom = document.createElement("span");
          originalIconDon?.appendChild(newIconDom);
          originalIconDon.classList.add("clear-pseudo-class");
          replaceIcon({
            iconDom: newIconDom,
            filenameDom,
          });
        }
      },
    });
  }else {
    update();
    document.addEventListener('pjax:end', update);
  }
};

chrome.storage.sync.get(
  [StorageKey.ColorsDisabled, StorageKey.DarkMode],
  (result) => {
    colorsDisabled =
      result.colorsDisabled === undefined
        ? colorsDisabled
        : result.colorsDisabled;

    darkMode = result.darkMode === undefined ? darkMode : result.darkMode;

    init();
  }
);
