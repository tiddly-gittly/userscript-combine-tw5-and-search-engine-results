// ==UserScript==
// @name TiddlyWiki5: Combine TW5 and search engine results
// @description Combine TiddlyWiki and your preferred search engine to find your own answers more easily
// @version 0.3.1
// @author bimlas
// @supportURL https://github.com/tiddly-gittly/userscript-combine-tw5-and-search-engine-results/issues
// @downloadURL https://github.com/tiddly-gittly/userscript-combine-tw5-and-search-engine-results/raw/master/combine-tw5-and-search-engine-results.user.js
// @icon https://tiddlywiki.com/favicon.ico
// @namespace Violentmonkey Scripts
// @match *://www.google.com/search*
// @match *://cn.bing.com/*
// @match *://www.baidu.com/*
// @match *://www.startpage.com/*
// @match *://duckduckgo.com/*
// @match *://www.ecosia.org/search*
// @grant GM_xmlhttpRequest
// ==/UserScript==

// READ THE DOCUMENTATION BEFORE TRYING TO USE THE SCRIPT!
// https://github.com/bimlas/userscript-combine-tw5-and-search-engine-results

const wikis = [
  'http://localhost:5212',
];
const buildWikiFilter = function(query) {
  return `[!is[shadow]!is[system]!field:calendarEntry[yes]search[${query}]]`;
}

// NOTE: If you want to show results in the sidebar, change this option to
// 'sidebar', but remember that the sidebar is not always visible (for example,
// if the window is too narrow).
const placementOfResults = 'sidebar';

const searchEngineConfigs = {
  'www.google.com': {
    searchInputSelector: 'input[name=q]',
    searchResultsSelector: {
      main: '#center_col',
      sidebar: '#rhs'
    }
  },
  'cn.bing.com': {
    searchInputSelector: 'input#sb_form_q',
    searchResultsSelector: {
      main: '#b_results',
      sidebar: '#b_context'
    }
  },
  'www.baidu.com': {
    searchInputSelector: 'input#kw',
    searchResultsSelector: {
      main: '#content_left',
      sidebar: '#content_right'
    }
  },
  // StartPage changes its URL and website structure, so the script does not work in all cases
  'www.startpage.com': {
    searchInputSelector: '#q',
    searchResultsSelector: {
      main: 'div.mainline-results',
      sidebar: 'div.sidebar-results'
    }
  },
  'duckduckgo.com': {
    searchInputSelector: 'input[name=q]',
    searchResultsSelector: {
      main: '#links.results',
      sidebar: 'div.sidebar-modules'
    }
  },
  'www.ecosia.org': {
    searchInputSelector: 'input[name=q]',
    searchResultsSelector: {
      main: 'div.mainline',
      sidebar: 'div.sidebar'
    }
  },
}
const searchEngine = searchEngineConfigs[document.domain];

function fetchJSON(origin, url) {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      headers: {
        "Origin": origin,
      },
      url: url,
      onload: function(response) {
        resolve(JSON.parse(response.responseText));
      }
    });
  });
}

function getTiddlerLink(wiki, title) {
  const urlEncodedTitle = encodeURIComponent(title);
  const singleViewUrl = `${wiki}/${urlEncodedTitle}`;
  const normalViewUrl = `${wiki}/#${urlEncodedTitle}`;
  return `<a href="${singleViewUrl}">${title}</a> (<a href="${normalViewUrl}">#</a>)`;
}

function getWikiTitle(wiki) {
  return new Promise((resolve, reject) => {
    const urlEncodedQuery = encodeURIComponent('$:/SiteTitle');
    const url = `${wiki}/recipes/default/tiddlers/${urlEncodedQuery}`;
    fetchJSON(wiki, url)
    .then(results => {
      resolve(results.text);
    });
  });
}

function addToPage(text) {
  const searchEngineResults = document.querySelector(searchEngine.searchResultsSelector[placementOfResults]);
  const node = document.createElement('div');
  node.style.display = 'inline-flex';
  node.style.margin = '1em';
  node.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
  node.innerHTML = text;
  searchEngineResults.insertBefore(node, searchEngineResults.childNodes[0]);
}

function makeHtmlListFromTiddlers(wiki, listOfTiddlers) {
  const htmlList = listOfTiddlers.reduce((text, tiddler) => {
    return text + `<li>${getTiddlerLink(wiki, tiddler.title)}</li>`;
  }, '');
  return `<ul>${htmlList}</ul>`;
}

const query = document.querySelector(searchEngine.searchInputSelector).value;
const urlEncodedQuery = encodeURIComponent(buildWikiFilter(query));
let searchResults = '';
wikis.forEach(wiki => {
  const url = `${wiki}/recipes/default/tiddlers.json?filter=${urlEncodedQuery}`;
  Promise.all([
    fetchJSON(wiki, url),
    getWikiTitle(wiki)
  ])
  .then(([results, wikiTitle]) => {
    if(!results.length) return;
    const wikiLink = `<small><a href="${wiki}">${wiki}</a></small>`;
    const header = `<h3>${wikiTitle}</h3>${wikiLink}<p>`;
    addToPage(`<div style="margin: 1em;">${header}<p>${makeHtmlListFromTiddlers(wiki, results)}</p><div>`);
  });
});
