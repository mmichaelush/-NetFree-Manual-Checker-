// קבוע: URL של ה-API
var NETFREE_API_BASE = "https://www.google.com/~netfree/test-url?u=";

var stopRequested = false;

document.addEventListener("DOMContentLoaded", function () {
  // לחצני קלט
  var pasteBtn = document.getElementById("pasteBtn");
  var loadFileBtn = document.getElementById("loadFileBtn");
  var clearInputBtn = document.getElementById("clearInputBtn");
  var fileInput = document.getElementById("fileInput");
  var startScanBtn = document.getElementById("startScanBtn");
  var urlInput = document.getElementById("urlInput");
  
  // לחצן סריקה מחדש בתחתית
  var rescanFooterBtn = document.getElementById("rescanFooterBtn");

  // לחצני ייצוא/פעולה
  var downloadOpenBtn = document.getElementById("downloadOpenBtn");
  var downloadUnknownBtn = document.getElementById("downloadUnknownBtn");
  var downloadBlockedBtn = document.getElementById("downloadBlockedBtn");
  var copyOpenBtn = document.getElementById("copyOpenBtn");
  var copyUnknownBtn = document.getElementById("copyUnknownBtn");
  var copyBlockedBtn = document.getElementById("copyBlockedBtn");
  var openWindowBtn = document.getElementById("openWindowBtn");
  var retryErrorsBtn = document.getElementById("retryErrorsBtn");

  initCollapseButtons();

  // --- לוגיקה לתיבת קלט ---

  if (pasteBtn) {
    pasteBtn.addEventListener("click", function() {
      navigator.clipboard.readText()
        .then(text => {
          if (text) {
            urlInput.value += (urlInput.value ? "\n" : "") + text;
          }
        })
        .catch(err => {
          alert("לא הצלחתי לקרוא מהלוח. ודא שנתת הרשאה.");
        });
    });
  }

  if (loadFileBtn) {
    loadFileBtn.addEventListener("click", function() {
      fileInput.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener("change", function(e) {
      var file = e.target.files[0];
      if (!file) return;
      
      var reader = new FileReader();
      reader.onload = function(e) {
        var content = e.target.result;
        urlInput.value += (urlInput.value ? "\n" : "") + content;
        fileInput.value = ""; // איפוס
      };
      reader.readAsText(file);
    });
  }

  if (clearInputBtn) {
    clearInputBtn.addEventListener("click", function() {
      stopRequested = true; // עצירת סריקה אם רצה
      urlInput.value = "";
      clearLists();
      setSummary(0, 0, 0, 0, 0);
      document.getElementById("statusSection").style.display = "none";
      if (rescanFooterBtn) rescanFooterBtn.style.display = "none";
      setVisualStatus(false);
      setStatus("הרשימה נוקתה והסריקה נעצרה.");
    });
  }

  if (startScanBtn) {
    startScanBtn.addEventListener("click", function() {
      startScanProcess(urlInput.value);
    });
  }

  if (rescanFooterBtn) {
    rescanFooterBtn.addEventListener("click", function() {
      startScanProcess(urlInput.value);
    });
  }

  // --- לוגיקה לפעולות ---

  if (downloadOpenBtn) downloadOpenBtn.addEventListener("click", function () { downloadListAsTxt(openUrls, "open-videos.txt"); });
  if (downloadUnknownBtn) downloadUnknownBtn.addEventListener("click", function () { downloadListAsTxt(unknownUrls, "unknown-videos.txt"); });
  if (downloadBlockedBtn) downloadBlockedBtn.addEventListener("click", function () { downloadListAsTxt(blockedUrls, "blocked-videos.txt"); });

  if (copyOpenBtn) copyOpenBtn.addEventListener("click", function () { copyListToClipboard(openUrls); });
  if (copyUnknownBtn) copyUnknownBtn.addEventListener("click", function () { copyListToClipboard(unknownUrls); });
  if (copyBlockedBtn) copyBlockedBtn.addEventListener("click", function () { copyListToClipboard(blockedUrls); });

  if (openWindowBtn) {
    openWindowBtn.addEventListener("click", function () {
      openInStandaloneWindow();
    });
  }

  if (retryErrorsBtn) {
    retryErrorsBtn.addEventListener("click", function () {
      retryErrorChecks();
    });
  }
});

function initCollapseButtons() {
  var buttons = document.querySelectorAll(".collapse-btn");
  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var targetId = btn.getAttribute("data-target");
      var listEl = document.getElementById(targetId);
      if (!listEl) return;

      var expanded = btn.getAttribute("aria-expanded") === "true";
      if (expanded) {
        btn.setAttribute("aria-expanded", "false");
        btn.textContent = "▸";
        listEl.style.display = "none";
      } else {
        btn.setAttribute("aria-expanded", "true");
        btn.textContent = "▾";
        listEl.style.display = "";
      }
    });
  });
}

var openUrls = [];
var unknownUrls = [];
var blockedUrls = [];
var errorUrls = [];
var openSet = new Set();
var unknownSet = new Set();
var blockedSet = new Set();
var errorSet = new Set();
var totalUrlsCount = 0;

function setStatus(text) {
  var el = document.getElementById("statusText");
  if (el) el.textContent = text;
}

function setError(message) {
  var box = document.getElementById("errorBox");
  if (!box) return;
  if (!message) {
    box.hidden = true;
    box.textContent = "";
  } else {
    box.hidden = false;
    box.textContent = message;
  }
}

function setVisualStatus(finished) {
  var header = document.querySelector(".header");
  if (!header) return;
  
  if (finished) {
    header.classList.add("finished");
  } else {
    header.classList.remove("finished");
  }
}

function setProgress(current, total) {
  var progressBar = document.getElementById("progressBar");
  var progressCount = document.getElementById("progressCount");
  var progressTotal = document.getElementById("progressTotal");

  if (progressCount) progressCount.textContent = String(current);
  if (progressTotal) progressTotal.textContent = String(total);

  var percent = 0;
  if (total > 0) {
    percent = Math.round((current / total) * 100);
  }
  if (progressBar) {
    progressBar.style.width = percent + "%";
  }
}

function setSummary(totalFound, openCount, unknownCount, blockedCount, errorCount) {
  var totalFoundEl = document.getElementById("totalFound");
  var openCountEl = document.getElementById("openCount");
  var unknownCountEl = document.getElementById("unknownCount");
  var blockedCountEl = document.getElementById("blockedCount");
  var errorCountEl = document.getElementById("errorCount");

  if (totalFoundEl) totalFoundEl.textContent = String(totalFound);
  if (openCountEl) openCountEl.textContent = String(openCount);
  if (unknownCountEl) unknownCountEl.textContent = String(unknownCount);
  if (blockedCountEl) blockedCountEl.textContent = String(blockedCount);
  if (errorCountEl) errorCountEl.textContent = String(errorCount);
}

function clearLists() {
  var openListEl = document.getElementById("openList");
  var unknownListEl = document.getElementById("unknownList");
  var blockedListEl = document.getElementById("blockedList");
  var errorListEl = document.getElementById("errorList");

  if (openListEl) openListEl.innerHTML = "";
  if (unknownListEl) unknownListEl.innerHTML = "";
  if (blockedListEl) blockedListEl.innerHTML = "";
  if (errorListEl) errorListEl.innerHTML = "";

  openUrls = [];
  unknownUrls = [];
  blockedUrls = [];
  errorUrls = [];
  openSet = new Set();
  unknownSet = new Set();
  blockedSet = new Set();
  errorSet = new Set();
  totalUrlsCount = 0;

  toggleActionButtons(false);
}

function toggleActionButtons(enable) {
  var ids = [
    "downloadOpenBtn", "downloadUnknownBtn", "downloadBlockedBtn", 
    "copyOpenBtn", "copyUnknownBtn", "copyBlockedBtn", "retryErrorsBtn"
  ];
  ids.forEach(id => {
    var el = document.getElementById(id);
    if(el) el.disabled = !enable;
  });
}

function extractYouTubeLinksFromText(text) {
  // Regex לזיהוי קישורי יוטיוב
  var regex = /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[\w\-]+)/g;
  var found = text.match(regex) || [];
  
  // ניקוי כפילויות
  return uniqueArray(found);
}

function startScanProcess(textInput) {
  if (!textInput.trim()) {
    alert("אנא הזן קישורים לבדיקה");
    return;
  }
  
  stopRequested = false;
  setError(null);
  clearLists();
  setVisualStatus(false);
  
  var rescanFooterBtn = document.getElementById("rescanFooterBtn");
  if(rescanFooterBtn) rescanFooterBtn.style.display = "none";

  document.getElementById("statusSection").style.display = "block";
  setStatus("מנתח קישורים...");
  
  var urls = extractYouTubeLinksFromText(textInput);

  if (!urls.length) {
    setStatus("לא נמצאו קישורי YouTube תקינים בטקסט.");
    setSummary(0, 0, 0, 0, 0);
    return;
  }

  totalUrlsCount = urls.length;
  setStatus("מתחיל בבדיקה (" + urls.length + " קישורים)...");
  setProgress(0, urls.length);
  setSummary(totalUrlsCount, 0, 0, 0, 0);

  checkUrlsSequential(urls);
}

function uniqueArray(arr) {
  var seen = {};
  var out = [];
  for (var i = 0; i < arr.length; i++) {
    var val = arr[i];
    if (!seen[val]) {
      seen[val] = true;
      out.push(val);
    }
  }
  return out;
}

function checkUrlsSequential(urls) {
  var index = 0;
  var total = urls.length;

  function next() {
    if (stopRequested) {
      setStatus("הבדיקה נעצרה לבקשת המשתמש.");
      updateButtonsState();
      return;
    }

    if (index >= total) {
      setStatus("הבדיקה הסתיימה בהצלחה!");
      setSummary(totalUrlsCount, openUrls.length, unknownUrls.length, blockedUrls.length, errorUrls.length);

      updateButtonsState();
      
      var rescanFooterBtn = document.getElementById("rescanFooterBtn");
      if(rescanFooterBtn) rescanFooterBtn.style.display = "inline-flex";

      playCompleted();
      setVisualStatus(true);
      return;
    }

    var url = urls[index];
    var currentIndex = index + 1;
    setProgress(currentIndex, total);

    checkSingleUrl(url).then(function () {
      index++;
      next();
    });
  }

  next();
}

function updateButtonsState() {
  var downloadOpenBtn = document.getElementById("downloadOpenBtn");
  var downloadUnknownBtn = document.getElementById("downloadUnknownBtn");
  var downloadBlockedBtn = document.getElementById("downloadBlockedBtn");
  var copyOpenBtn = document.getElementById("copyOpenBtn");
  var copyUnknownBtn = document.getElementById("copyUnknownBtn");
  var copyBlockedBtn = document.getElementById("copyBlockedBtn");
  var retryErrorsBtn = document.getElementById("retryErrorsBtn");

  if (downloadOpenBtn && openUrls.length > 0) downloadOpenBtn.disabled = false;
  if (downloadUnknownBtn && unknownUrls.length > 0) downloadUnknownBtn.disabled = false;
  if (downloadBlockedBtn && blockedUrls.length > 0) downloadBlockedBtn.disabled = false;
  if (copyOpenBtn && openUrls.length > 0) copyOpenBtn.disabled = false;
  if (copyUnknownBtn && unknownUrls.length > 0) copyUnknownBtn.disabled = false;
  if (copyBlockedBtn && blockedUrls.length > 0) copyBlockedBtn.disabled = false;
  if (retryErrorsBtn && errorUrls.length > 0) retryErrorsBtn.disabled = false;
}

function checkSingleUrl(videoUrl) {
  var apiUrl = NETFREE_API_BASE + encodeURIComponent(videoUrl);

  return fetch(apiUrl, {
    method: "GET"
  })
    .then(function (response) {
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }
      return response.json();
    })
    .then(function (data) {
      var blockStatus = data ? data.block : undefined;

      if (blockStatus === "deny") {
        if (!blockedSet.has(videoUrl)) {
          blockedSet.add(videoUrl);
          blockedUrls.push(videoUrl);
          appendUrlToList("blockedList", videoUrl, "חסום", "url-pill-blocked");
        }
      } else if (blockStatus === "unknown-video") {
        if (!unknownSet.has(videoUrl)) {
          unknownSet.add(videoUrl);
          unknownUrls.push(videoUrl);
          appendUrlToList("unknownList", videoUrl, "לא נבדק", "url-pill-unknown");
        }
      } else {
        if (!openSet.has(videoUrl)) {
          openSet.add(videoUrl);
          openUrls.push(videoUrl);
          appendUrlToList("openList", videoUrl, "פתוח", "url-pill-open");
        }
      }
      setSummary(totalUrlsCount, openUrls.length, unknownUrls.length, blockedUrls.length, errorUrls.length);
    })
    .catch(function (err) {
      if (!errorSet.has(videoUrl)) {
        errorSet.add(videoUrl);
        errorUrls.push(videoUrl);
        appendUrlToList("errorList", videoUrl, "שגיאה", "url-pill-error");
        setSummary(totalUrlsCount, openUrls.length, unknownUrls.length, blockedUrls.length, errorUrls.length);
      }
    });
}

function retryErrorChecks() {
  if (!errorUrls.length) return;

  var urlsToRetry = errorUrls.slice();
  var errorListEl = document.getElementById("errorList");
  var retryErrorsBtn = document.getElementById("retryErrorsBtn");
  
  if (errorListEl) errorListEl.innerHTML = "";
  errorUrls = [];
  errorSet = new Set();

  if (retryErrorsBtn) retryErrorsBtn.disabled = true;

  setError(null);
  setVisualStatus(false);
  setStatus("מנסה שוב שגיאות (" + urlsToRetry.length + ")...");
  
  stopRequested = false;
  setProgress(0, urlsToRetry.length);

  var index = 0;
  var total = urlsToRetry.length;

  function nextRetry() {
    if (stopRequested) {
      setStatus("בדיקה חוזרת נעצרה.");
      return;
    }

    if (index >= total) {
      setStatus("בדיקה חוזרת הסתיימה.");
      setSummary(totalUrlsCount, openUrls.length, unknownUrls.length, blockedUrls.length, errorUrls.length);
      if (errorUrls.length > 0) {
        if (retryErrorsBtn) retryErrorsBtn.disabled = false;
      }
      playCompleted();
      setVisualStatus(errorUrls.length === 0);
      return;
    }

    var url = urlsToRetry[index];
    setProgress(index + 1, total);

    checkSingleUrl(url).then(function() {
      index++;
      nextRetry();
    });
  }

  nextRetry();
}

function appendUrlToList(listId, url, label, pillClass) {
  var listEl = document.getElementById(listId);
  if (!listEl) return;

  var li = document.createElement("li");
  li.className = "url-item";

  var spanUrl = document.createElement("span");
  spanUrl.className = "url-text";
  spanUrl.textContent = url;
  spanUrl.title = url;

  var pill = document.createElement("span");
  pill.className = "url-pill " + pillClass;
  pill.textContent = label;

  li.appendChild(spanUrl);
  li.appendChild(pill);

  listEl.appendChild(li);
}

function downloadListAsTxt(urls, filename) {
  if (!urls || !urls.length) return;

  var content = urls.join("\n");
  var blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  var url = URL.createObjectURL(blob);

  var a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

function copyListToClipboard(urls) {
  if (!urls || !urls.length) return;
  var text = urls.join("\n");

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () {
      setStatus("הועתק ללוח!");
      setTimeout(() => setStatus(""), 2000);
    }).catch(function () {
      fallbackCopyText(text);
    });
  } else {
    fallbackCopyText(text);
  }
}

function fallbackCopyText(text) {
  var textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
    setStatus("הועתק ללוח!");
    setTimeout(() => setStatus(""), 2000);
  } catch (err) {
    setError("שגיאה בהעתקה.");
  }
  document.body.removeChild(textarea);
}

function openInStandaloneWindow() {
  // פתיחת חלון חדש ורחב יותר
  chrome.windows.create({
    url: "popup.html",
    type: "popup",
    width: 600,
    height: 800
  });
}

function playCompleted() {
  try {
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    var ctx = new AudioContext();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(659.25, ctx.currentTime + 0.1);
    osc.frequency.linearRampToValueAtTime(783.99, ctx.currentTime + 0.2);
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    // Silent fail
  }
}