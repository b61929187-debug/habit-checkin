(function () {
  "use strict";

  var STORAGE_KEY = "xiaobu-habits-v1";
  var MAX_NAME_LENGTH = 20;
  var AVATAR_THEMES = [
    ["#e1f0e7", "#236449"],
    ["#fbe8e2", "#a74e39"],
    ["#f8edcd", "#80601a"],
    ["#e4edf8", "#365d87"],
    ["#efe7f3", "#704c82"],
    ["#e8eee2", "#556b32"],
  ];
  var ICONS = {
    check:
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m20 6-11 11-5-5"/></svg>',
    trash:
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><path d="M10 11v6M14 11v6"/></svg>',
  };

  var elements = {
    currentDate: document.getElementById("current-date"),
    completedCount: document.getElementById("completed-count"),
    totalCount: document.getElementById("total-count"),
    progressMessage: document.getElementById("progress-message"),
    progressRing: document.getElementById("progress-ring"),
    habitCountBadge: document.getElementById("habit-count-badge"),
    habitList: document.getElementById("habit-list"),
    emptyState: document.getElementById("empty-state"),
    habitForm: document.getElementById("habit-form"),
    habitName: document.getElementById("habit-name"),
    formMessage: document.getElementById("form-message"),
    suggestionChips: Array.prototype.slice.call(
      document.querySelectorAll("[data-suggestion]")
    ),
    toast: document.getElementById("toast"),
    toastMessage: document.getElementById("toast-message"),
    toastAction: document.getElementById("toast-action"),
  };

  var state = loadState();
  var todayKey = getLocalDateKey();
  var toastTimeout = null;
  var currentToastAction = null;

  init();

  function init() {
    render();
    bindEvents();
    updateDayAtMidnight();
  }

  function bindEvents() {
    elements.habitForm.addEventListener("submit", function (event) {
      event.preventDefault();
      addHabit(elements.habitName.value, true);
    });

    elements.habitName.addEventListener("input", function () {
      if (elements.formMessage.classList.contains("is-error")) {
        setFormMessage("最多 20 个字", "");
      }
    });

    elements.suggestionChips.forEach(function (button) {
      button.addEventListener("click", function () {
        addHabit(button.getAttribute("data-suggestion"), false);
      });
    });

    elements.habitList.addEventListener("click", function (event) {
      var toggleButton = event.target.closest("[data-action='toggle']");
      if (toggleButton) {
        toggleHabit(toggleButton.getAttribute("data-id"));
        return;
      }

      var deleteButton = event.target.closest("[data-action='delete']");
      if (deleteButton) {
        deleteHabit(deleteButton.getAttribute("data-id"));
      }
    });

    elements.toastAction.addEventListener("click", function () {
      if (typeof currentToastAction === "function") {
        var action = currentToastAction;
        hideToast();
        action();
      }
    });

    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) {
        refreshDateIfNeeded();
      }
    });
  }

  function loadState() {
    var fallback = { habits: [], completions: {} };

    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || !Array.isArray(saved.habits) || typeof saved.completions !== "object") {
        return fallback;
      }

      var validHabits = saved.habits
        .filter(function (habit) {
          return (
            habit &&
            typeof habit.id === "string" &&
            typeof habit.name === "string" &&
            habit.name.trim()
          );
        })
        .map(function (habit) {
          return {
            id: habit.id,
            name: normalizeName(habit.name, MAX_NAME_LENGTH),
            createdAt: habit.createdAt || new Date().toISOString(),
          };
        });

      var validCompletions = {};
      Object.keys(saved.completions).forEach(function (dateKey) {
        if (
          /^\d{4}-\d{2}-\d{2}$/.test(dateKey) &&
          Array.isArray(saved.completions[dateKey])
        ) {
          validCompletions[dateKey] = saved.completions[dateKey].filter(function (id) {
            return typeof id === "string";
          });
        }
      });

      return { habits: validHabits, completions: validCompletions };
    } catch (error) {
      return fallback;
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      showToast("浏览器未能保存数据，请检查存储权限。");
    }
  }

  function addHabit(rawName, fromForm) {
    var name = normalizeName(rawName, MAX_NAME_LENGTH);

    if (!name) {
      if (fromForm) {
        setFormMessage("先写下想坚持的习惯。", "is-error");
        elements.habitName.focus();
      }
      return false;
    }

    var isDuplicate = state.habits.some(function (habit) {
      return habit.name.toLocaleLowerCase("zh-CN") === name.toLocaleLowerCase("zh-CN");
    });

    if (isDuplicate) {
      setFormMessage("这个习惯已经在清单里了。", "is-error");
      if (fromForm) {
        elements.habitName.select();
      }
      return false;
    }

    state.habits.push({
      id: createId(),
      name: name,
      createdAt: new Date().toISOString(),
    });
    saveState();
    setFormMessage("已添加“" + name + "”。", "is-success");
    elements.habitName.value = "";
    elements.habitName.focus();
    render();
    return true;
  }

  function toggleHabit(id) {
    var habitExists = state.habits.some(function (habit) {
      return habit.id === id;
    });
    if (!habitExists) {
      return;
    }

    var completed = getCompletedIds();
    if (completed.has(id)) {
      completed.delete(id);
    } else {
      completed.add(id);
    }

    state.completions[todayKey] = Array.from(completed);
    saveState();
    render();
  }

  function deleteHabit(id) {
    var habitIndex = state.habits.findIndex(function (habit) {
      return habit.id === id;
    });
    if (habitIndex === -1) {
      return;
    }

    var habit = state.habits[habitIndex];
    var completionState = {};

    Object.keys(state.completions).forEach(function (dateKey) {
      var ids = state.completions[dateKey];
      if (ids.indexOf(id) !== -1) {
        completionState[dateKey] = true;
        state.completions[dateKey] = ids.filter(function (value) {
          return value !== id;
        });
      }
    });

    state.habits.splice(habitIndex, 1);
    saveState();
    render();

    showToast(
      "已删除“" + habit.name + "”。",
      function undoDelete() {
        var insertAt = Math.min(habitIndex, state.habits.length);
        state.habits.splice(insertAt, 0, habit);
        Object.keys(completionState).forEach(function (dateKey) {
          var ids = state.completions[dateKey] || [];
          if (ids.indexOf(habit.id) === -1) {
            ids.push(habit.id);
          }
          state.completions[dateKey] = ids;
        });
        saveState();
        render();
        showToast("已恢复“" + habit.name + "”。");
      }
    );
  }

  function render() {
    renderDate();
    renderProgress();
    renderHabits();
    renderSuggestions();
  }

  function renderDate() {
    var date = new Date();
    var monthDay = new Intl.DateTimeFormat("zh-CN", {
      month: "long",
      day: "numeric",
    }).format(date);
    var weekday = new Intl.DateTimeFormat("zh-CN", {
      weekday: "short",
    }).format(date);

    elements.currentDate.textContent = monthDay + " · " + weekday;
    elements.currentDate.setAttribute("datetime", todayKey);
  }

  function renderProgress() {
    var completed = getCompletedIds();
    var completedCount = state.habits.reduce(function (count, habit) {
      return count + (completed.has(habit.id) ? 1 : 0);
    }, 0);
    var totalCount = state.habits.length;
    var percent = totalCount === 0 ? 0 : (completedCount / totalCount) * 100;

    elements.completedCount.textContent = String(completedCount);
    elements.totalCount.textContent = String(totalCount);
    elements.progressRing.style.setProperty("--progress", String(percent));
    elements.progressRing.classList.toggle(
      "is-complete",
      totalCount > 0 && completedCount === totalCount
    );

    if (totalCount === 0) {
      elements.progressMessage.textContent = "先添加一个习惯";
    } else if (completedCount === totalCount) {
      elements.progressMessage.textContent =
        totalCount === 1 ? "这一小步，完成了" : "今天全部完成";
    } else if (completedCount === 0) {
      elements.progressMessage.textContent = "从第一件小事开始";
    } else {
      elements.progressMessage.textContent =
        "还剩 " + (totalCount - completedCount) + " 项";
    }
  }

  function renderHabits() {
    var completed = getCompletedIds();
    var fragment = document.createDocumentFragment();

    state.habits.forEach(function (habit) {
      var isComplete = completed.has(habit.id);
      var item = document.createElement("li");
      item.className = "habit-row" + (isComplete ? " is-complete" : "");

      var toggle = document.createElement("button");
      toggle.className = "habit-toggle";
      toggle.type = "button";
      toggle.dataset.action = "toggle";
      toggle.dataset.id = habit.id;
      toggle.setAttribute("aria-pressed", String(isComplete));
      toggle.setAttribute(
        "aria-label",
        (isComplete ? "取消完成：" : "标记完成：") + habit.name
      );

      var check = document.createElement("span");
      check.className = "check-circle";
      check.innerHTML = ICONS.check;

      var avatar = document.createElement("span");
      var theme = AVATAR_THEMES[hashString(habit.id) % AVATAR_THEMES.length];
      avatar.className = "habit-avatar";
      avatar.style.backgroundColor = theme[0];
      avatar.style.color = theme[1];
      avatar.textContent = Array.from(habit.name)[0] || "小";
      avatar.setAttribute("aria-hidden", "true");

      var copy = document.createElement("span");
      copy.className = "habit-copy";

      var name = document.createElement("span");
      name.className = "habit-name";
      name.textContent = habit.name;

      var status = document.createElement("span");
      status.className = "habit-status";
      status.textContent = isComplete ? "已完成" : "今天还没完成";

      copy.appendChild(name);
      copy.appendChild(status);
      toggle.appendChild(check);
      toggle.appendChild(avatar);
      toggle.appendChild(copy);

      var deleteButton = document.createElement("button");
      deleteButton.className = "delete-button";
      deleteButton.type = "button";
      deleteButton.dataset.action = "delete";
      deleteButton.dataset.id = habit.id;
      deleteButton.setAttribute("aria-label", "删除习惯：" + habit.name);
      deleteButton.innerHTML = ICONS.trash;

      item.appendChild(toggle);
      item.appendChild(deleteButton);
      fragment.appendChild(item);
    });

    elements.habitList.replaceChildren(fragment);
    elements.habitCountBadge.textContent = state.habits.length + " 项";
    elements.emptyState.hidden = state.habits.length > 0;
    elements.habitList.hidden = state.habits.length === 0;
  }

  function renderSuggestions() {
    elements.suggestionChips.forEach(function (button) {
      var suggestion = button.getAttribute("data-suggestion");
      var alreadyAdded = state.habits.some(function (habit) {
        return (
          habit.name.toLocaleLowerCase("zh-CN") ===
          suggestion.toLocaleLowerCase("zh-CN")
        );
      });

      button.classList.toggle("is-added", alreadyAdded);
      button.querySelector(".chip-mark").textContent = alreadyAdded ? "✓" : "+";
      button.setAttribute("aria-label", alreadyAdded ? suggestion + "，已添加" : "添加" + suggestion);
    });
  }

  function getCompletedIds() {
    if (!Array.isArray(state.completions[todayKey])) {
      state.completions[todayKey] = [];
    }
    return new Set(state.completions[todayKey]);
  }

  function normalizeName(value, maxLength) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxLength);
  }

  function setFormMessage(message, className) {
    elements.formMessage.textContent = message;
    elements.formMessage.classList.remove("is-error", "is-success");
    if (className) {
      elements.formMessage.classList.add(className);
    }
  }

  function showToast(message, onAction) {
    window.clearTimeout(toastTimeout);
    elements.toastMessage.textContent = message;
    currentToastAction = typeof onAction === "function" ? onAction : null;
    elements.toastAction.hidden = !currentToastAction;
    elements.toast.hidden = false;

    toastTimeout = window.setTimeout(hideToast, currentToastAction ? 6000 : 3500);
  }

  function hideToast() {
    window.clearTimeout(toastTimeout);
    elements.toast.hidden = true;
    elements.toastAction.hidden = true;
    currentToastAction = null;
  }

  function updateDayAtMidnight() {
    window.setInterval(refreshDateIfNeeded, 30000);
  }

  function refreshDateIfNeeded() {
    var currentKey = getLocalDateKey();
    if (currentKey !== todayKey) {
      todayKey = currentKey;
      setFormMessage("新的一天，继续完成一件小事。", "");
      render();
    }
  }

  function getLocalDateKey(date) {
    var current = date || new Date();
    var year = current.getFullYear();
    var month = String(current.getMonth() + 1).padStart(2, "0");
    var day = String(current.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function hashString(value) {
    var hash = 0;
    for (var index = 0; index < value.length; index += 1) {
      hash = (hash * 31 + value.charCodeAt(index)) | 0;
    }
    return Math.abs(hash);
  }
})();
