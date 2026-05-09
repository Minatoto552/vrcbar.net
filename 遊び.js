import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://rsjeyuvhppajxsgmgqbp.supabase.co";
const supabaseKey = "sb_publishable_tZWRzd0lcS3mJKcWdKZtbw_TPNs5AFp";
const supabase = createClient(supabaseUrl, supabaseKey);

const ADMIN_PASSWORD = "1112";

let currentGroupId = "";
let currentGroupName = "";
let cart = [];
let optionGroupsCache = [];
let optionChoicesCache = [];
let selectedCustomerName = "";
let selectedReceiverName = "";
let ordersChannel = null;
let emergencyChannel = null;
let announcementChannel = null;
let alarmChannel = null;
let focusedMenuId = "";
let alarmCache = [];
let triggeredAlarmKeys = new Set();

const $ = id => document.getElementById(id);

const pages = {
  login: $("loginPage"),
  createGroup: $("createGroupPage"),
  home: $("homePage"),
  setting: $("settingPage"),
  admin: $("adminPage"),
  list: $("listPage"),
  register: $("registerPage"),
  order: $("orderPage"),
  receive: $("receivePage"),
  history: $("historyPage"),
  option: $("optionPage"),
  table: $("tablePage"),
  name: $("namePage"),
  alarm: $("alarmPage"),
  announcement: $("announcementPage"),
};

function showPage(name) {
  Object.values(pages).forEach(page => {
    if (page) page.classList.remove("active");
  });

  if (pages[name]) {
    pages[name].classList.add("active");
  }
}

function isActive(name) {
  return pages[name]?.classList.contains("active");
}

function esc(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function menuLinkHtml(item) {
  if (item.id && !String(item.id).startsWith("normal-")) {
    return `<span class="clickable-menu" onclick="openMenuFromOrder('${item.id}')">${esc(item.name)}</span>`;
  }

  return esc(item.name);
}

async function openPage(pageName, renderFunction) {
  showPage(pageName);

  if (typeof renderFunction === "function") {
    try {
      await renderFunction();
    } catch (error) {
      console.error(error);
      alert("読み込みに失敗しました。F12のConsoleを確認してください。");
    }
  }
}

function updateClock() {
  const now = new Date();
  const text = now.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  $("clockText").textContent = text;
}

function playAlertSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.18);
    oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.36);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.8);
  } catch (error) {
    console.log("音声再生がブラウザに制限されました。");
  }
}

function stopRealtime() {
  [ordersChannel, emergencyChannel, announcementChannel, alarmChannel].forEach(channel => {
    if (channel) supabase.removeChannel(channel);
  });

  ordersChannel = null;
  emergencyChannel = null;
  announcementChannel = null;
  alarmChannel = null;
}

function startRealtime() {
  if (!currentGroupId) return;

  stopRealtime();

  ordersChannel = supabase
    .channel("orders-" + currentGroupId)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "orders",
        filter: "group_id=eq." + currentGroupId
      },
      async () => {
        if (isActive("receive")) await renderReceivePage();
        if (isActive("history")) await renderHistoryPage();
      }
    )
    .subscribe();

  emergencyChannel = supabase
    .channel("emergency-" + currentGroupId)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "emergency_calls",
        filter: "group_id=eq." + currentGroupId
      },
      payload => {
        showEmergencyPopup(payload.new);
      }
    )
    .subscribe();

  announcementChannel = supabase
    .channel("announcement-" + currentGroupId)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "announcements",
        filter: "group_id=eq." + currentGroupId
      },
      payload => {
        showAnnouncement(payload.new);
      }
    )
    .subscribe();

  alarmChannel = supabase
    .channel("alarm-" + currentGroupId)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "alarms",
        filter: "group_id=eq." + currentGroupId
      },
      async () => {
        await loadAlarms();
        if (isActive("alarm")) await renderAlarmManagePage();
      }
    )
    .subscribe();
}

function showEmergencyPopup(data) {
  $("emergencyText").innerHTML = `
    ${esc(data.customer_name)} さん<br>
    ${esc(data.table_name)}<br><br>
    至急対応してください
  `;

  $("emergencyOverlay").classList.remove("hidden");
  playAlertSound();
}

function showAnnouncement(data) {
  $("announcementText").innerHTML = `
    <b>${esc(data.sender_name || "運営")}</b><br>
    ${esc(data.message)}
  `;

  $("announcementOverlay").classList.remove("hidden");
  playAlertSound();
}

function showAlarm(data) {
  $("alarmText").innerHTML = `
    ${esc(data.alarm_time)}<br>
    ${esc(data.message || "アラーム時間です")}
  `;

  $("alarmOverlay").classList.remove("hidden");
  playAlertSound();
}

$("closeEmergencyButton").onclick = () => {
  $("emergencyOverlay").classList.add("hidden");
};

$("closeAnnouncementButton").onclick = () => {
  $("announcementOverlay").classList.add("hidden");
};

$("closeAlarmButton").onclick = () => {
  $("alarmOverlay").classList.add("hidden");
};

$("floatingEmergencyButton").onclick = async () => {
  if (!currentGroupId) {
    alert("先にグループへログインしてください");
    return;
  }

  await renderEmergencyForm();
  $("emergencyFormOverlay").classList.remove("hidden");
};

$("closeEmergencyFormButton").onclick = () => {
  $("emergencyFormOverlay").classList.add("hidden");
};

async function loadGroups() {
  const { data, error } = await supabase
    .from("groups")
    .select("*");

  if (error) {
    console.error(error);
    alert("グループ読み込み失敗");
    return [];
  }

  return data || [];
}

async function renderGroupOptions() {
  const groups = await loadGroups();

  $("groupSelect").innerHTML =
    `<option value="">グループを選択してください</option>`;

  $("adminGroupSelect").innerHTML =
    `<option value="">グループを選択してください</option>`;

  groups.forEach(group => {
    $("groupSelect").innerHTML += `
      <option value="${group.id}">${esc(group.name)}</option>
    `;

    $("adminGroupSelect").innerHTML += `
      <option value="${group.id}">${esc(group.name)}</option>
    `;
  });
}

$("goCreateGroupButton").onclick = () => {
  showPage("createGroup");
};

$("backToLoginButton").onclick = () => {
  showPage("login");
};

$("homeOrderButton").onclick = async () => {
  await openPage("order", renderOrderPage);
};

$("homeReceiveButton").onclick = async () => {
  await openPage("receive", renderReceivePage);
};

$("homeHistoryButton").onclick = async () => {
  await openPage("history", renderHistoryPage);
};

$("homeListButton").onclick = async () => {
  focusedMenuId = "";
  $("search").value = "";
  await openPage("list", renderMenus);
};

$("homeSettingButton").onclick = () => {
  showPage("setting");
};

$("settingRegisterButton").onclick = () => {
  resetRegisterForm();
  showPage("register");
};

$("settingOptionButton").onclick = async () => {
  await openPage("option", renderOptionManagePage);
};

$("settingTableButton").onclick = async () => {
  await openPage("table", renderTableManagePage);
};

$("settingNameButton").onclick = async () => {
  await openPage("name", renderOrderNameManagePage);
};

$("settingAlarmButton").onclick = async () => {
  await openPage("alarm", renderAlarmManagePage);
};

$("settingAnnouncementButton").onclick = async () => {
  await openPage("announcement", renderAnnouncementPage);
};

$("settingAdminButton").onclick = async () => {
  await renderGroupOptions();
  showPage("admin");
};

document.querySelectorAll(".backHome").forEach(btn => {
  btn.onclick = () => {
    showPage("home");
  };
});

document.querySelectorAll(".backSetting").forEach(btn => {
  btn.onclick = () => {
    showPage("setting");
  };
});

document.querySelectorAll(".navOrder").forEach(btn => {
  btn.onclick = async () => {
    await openPage("order", renderOrderPage);
  };
});

document.querySelectorAll(".navReceive").forEach(btn => {
  btn.onclick = async () => {
    await openPage("receive", renderReceivePage);
  };
});

document.querySelectorAll(".navHistory").forEach(btn => {
  btn.onclick = async () => {
    await openPage("history", renderHistoryPage);
  };
});

document.querySelectorAll(".navList").forEach(btn => {
  btn.onclick = async () => {
    focusedMenuId = "";
    $("search").value = "";
    await openPage("list", renderMenus);
  };
});

$("logoutButton").onclick = () => {
  stopRealtime();

  currentGroupId = "";
  currentGroupName = "";
  cart = [];
  selectedCustomerName = "";
  selectedReceiverName = "";
  focusedMenuId = "";
  alarmCache = [];
  triggeredAlarmKeys.clear();

  document.body.classList.remove("logged-in");

  showPage("login");
};

$("createGroupButton").onclick = async () => {
  const name = $("newGroupName").value.trim();
  const password = $("newGroupPassword").value.trim();

  if (!name || !password) {
    alert("グループ名とパスワードを入力してください");
    return;
  }

  const { data: exists, error: checkError } = await supabase
    .from("groups")
    .select("*")
    .eq("name", name);

  if (checkError) {
    console.error(checkError);
    alert("グループ確認に失敗しました");
    return;
  }

  if (exists && exists.length > 0) {
    alert("同じ名前のグループがあります");
    return;
  }

  const { error } = await supabase
    .from("groups")
    .insert([{ name, password }]);

  if (error) {
    console.error(error);
    alert("グループ作成失敗");
    return;
  }

  $("newGroupName").value = "";
  $("newGroupPassword").value = "";

  await renderGroupOptions();

  alert("グループを作成しました");
  showPage("login");
};

$("loginButton").onclick = async () => {
  const groupId = $("groupSelect").value;
  const password = $("groupPassword").value.trim();

  if (!groupId || !password) {
    alert("グループとパスワードを入力してください");
    return;
  }

  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .single();

  if (error || !data) {
    console.error(error);
    alert("グループが見つかりません");
    return;
  }

  if (data.password !== password) {
    alert("パスワードが違います");
    return;
  }

  currentGroupId = String(data.id);
  currentGroupName = data.name;
  selectedCustomerName = "";
  selectedReceiverName = "";
  focusedMenuId = "";

  $("currentGroupText").textContent =
    "現在のグループ：" + currentGroupName;

  $("groupPassword").value = "";

  document.body.classList.add("logged-in");

  await loadAlarms();
  startRealtime();

  showPage("home");
};

$("changeGroupPasswordButton").onclick = async () => {
  if ($("adminPassword").value.trim() !== ADMIN_PASSWORD) {
    alert("管理人パスワードが違います");
    return;
  }

  const groupId = $("adminGroupSelect").value;
  const newPass = $("newPasswordForGroup").value.trim();

  if (!groupId || !newPass) {
    alert("入力してください");
    return;
  }

  const { error } = await supabase
    .from("groups")
    .update({ password: newPass })
    .eq("id", groupId);

  if (error) {
    console.error(error);
    alert("変更失敗");
    return;
  }

  alert("変更しました");
  $("newPasswordForGroup").value = "";
};

$("deleteGroupButton").onclick = async () => {
  if ($("adminPassword").value.trim() !== ADMIN_PASSWORD) {
    alert("管理人パスワードが違います");
    return;
  }

  const groupId = $("adminGroupSelect").value;

  if (!groupId) {
    alert("グループを選択してください");
    return;
  }

  if (!confirm("このグループを削除しますか？")) {
    return;
  }

  await supabase.from("orders").delete().eq("group_id", groupId);
  await supabase.from("cocktails").delete().eq("group_id", groupId);
  await supabase.from("option_choices").delete().eq("group_id", groupId);
  await supabase.from("option_groups").delete().eq("group_id", groupId);
  await supabase.from("tables").delete().eq("group_id", groupId);
  await supabase.from("order_names").delete().eq("group_id", groupId);
  await supabase.from("emergency_calls").delete().eq("group_id", groupId);
  await supabase.from("announcements").delete().eq("group_id", groupId);
  await supabase.from("alarms").delete().eq("group_id", groupId);

  const { error } = await supabase
    .from("groups")
    .delete()
    .eq("id", groupId);

  if (error) {
    console.error(error);
    alert("削除失敗");
    return;
  }

  await renderGroupOptions();

  alert("削除しました");
  showPage("login");
};

function resetRegisterForm() {
  $("cocktailForm").reset();
  $("editCocktailId").value = "";
  $("submitButton").textContent = "登録する";
}

async function loadMenus() {
  const { data, error } = await supabase
    .from("cocktails")
    .select("*")
    .eq("group_id", currentGroupId);

  if (error) {
    console.error(error);
    throw error;
  }

  return data || [];
}

async function renderMenus() {
  const menus = await loadMenus();

  let filtered = menus;

  if (focusedMenuId) {
    filtered = menus.filter(menu =>
      String(menu.id) === String(focusedMenuId)
    );
  } else {
    const keyword = $("search").value.toLowerCase();

    filtered = menus.filter(menu => {
      return `
        ${menu.name || ""}
        ${menu.item_type || ""}
        ${menu.category || ""}
        ${menu.taste || ""}
        ${menu.description || ""}
      `
        .toLowerCase()
        .includes(keyword);
    });
  }

  if (filtered.length === 0) {
    $("menuList").innerHTML =
      `<div class="card">まだ登録がありません。</div>`;
    return;
  }

  $("menuList").innerHTML = filtered.map(menu => `
    <div class="card">
      <div class="card-image">
        ${menu.image ? `<img src="${esc(menu.image)}">` : "🍹"}
      </div>

      <h3>${esc(menu.name)}</h3>

      <span class="tag">${esc(menu.item_type || "通常")}</span>
      <span class="tag">${esc(menu.category)}</span>
      <span class="tag">${esc(menu.taste)}</span>

      <p>${esc(menu.description)}</p>

      <details ${focusedMenuId ? "open" : ""}>
        <summary>詳細を見る</summary>
        <p><b>内容：</b><br>${esc(menu.bottles)}</p>
        <p><b>作り方：</b><br>${esc(menu.recipe)}</p>
      </details>

      <div class="actions">
        <button class="edit" onclick="editMenu('${menu.id}')">編集</button>
        <button class="delete" onclick="deleteMenu('${menu.id}')">削除</button>
      </div>
    </div>
  `).join("");
}

window.openMenuFromOrder = async id => {
  focusedMenuId = String(id);
  $("search").value = "";
  showPage("list");
  await renderMenus();
};

$("search").addEventListener("input", () => {
  focusedMenuId = "";
  renderMenus();
});

$("cocktailForm").onsubmit = async event => {
  event.preventDefault();

  if (!currentGroupId) {
    alert("先にログインしてください");
    return;
  }

  const editId = $("editCocktailId").value;

  const data = {
    group_id: currentGroupId,
    item_type: $("itemType").value,
    category: $("category").value,
    name: $("name").value,
    taste: $("taste").value,
    bottles: $("bottles").value,
    recipe: $("recipe").value,
    description: $("description").value,
    image: $("image").value
  };

  const result = editId
    ? await supabase.from("cocktails").update(data).eq("id", editId)
    : await supabase.from("cocktails").insert([data]);

  if (result.error) {
    console.error(result.error);
    alert("保存失敗");
    return;
  }

  resetRegisterForm();
  focusedMenuId = "";
  await renderMenus();
  showPage("list");
};

window.editMenu = async id => {
  const { data, error } = await supabase
    .from("cocktails")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    console.error(error);
    alert("取得失敗");
    return;
  }

  $("editCocktailId").value = data.id;
  $("itemType").value = data.item_type || "通常";
  $("category").value = data.category;
  $("name").value = data.name;
  $("taste").value = data.taste;
  $("bottles").value = data.bottles || "";
  $("recipe").value = data.recipe || "";
  $("description").value = data.description || "";
  $("image").value = data.image || "";
  $("submitButton").textContent = "更新する";

  showPage("register");
};

window.deleteMenu = async id => {
  if (!confirm("削除しますか？")) return;

  const { error } = await supabase
    .from("cocktails")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("削除失敗");
    return;
  }

  focusedMenuId = "";
  await renderMenus();
};

async function loadTables() {
  const { data, error } = await supabase
    .from("tables")
    .select("*")
    .eq("group_id", currentGroupId);

  if (error) {
    console.error(error);
    throw error;
  }

  return data || [];
}

$("addTableButton").onclick = async () => {
  const name = $("tableNameInput").value.trim();

  if (!name) {
    alert("卓名を入力してください");
    return;
  }

  const { error } = await supabase
    .from("tables")
    .insert([{ group_id: currentGroupId, name }]);

  if (error) {
    console.error(error);
    alert("追加失敗");
    return;
  }

  $("tableNameInput").value = "";
  await renderTableManagePage();
};

async function renderTableManagePage() {
  const tables = await loadTables();

  if (tables.length === 0) {
    $("tableManageList").innerHTML =
      `<div class="manage-item">まだ卓がありません。</div>`;
    return;
  }

  $("tableManageList").innerHTML = tables.map(table => `
    <div class="manage-item">
      ${esc(table.name)}
      <button class="delete mini" onclick="deleteTable('${table.id}')">削除</button>
    </div>
  `).join("");
}

window.deleteTable = async id => {
  const { error } = await supabase
    .from("tables")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("削除失敗");
    return;
  }

  await renderTableManagePage();
};

async function loadOrderNames() {
  const { data, error } = await supabase
    .from("order_names")
    .select("*")
    .eq("group_id", currentGroupId);

  if (error) {
    console.error(error);
    throw error;
  }

  return data || [];
}

$("addOrderNameButton").onclick = async () => {
  const name = $("orderNameInput").value.trim();

  if (!name) {
    alert("名前を入力してください");
    return;
  }

  const { error } = await supabase
    .from("order_names")
    .insert([{ group_id: currentGroupId, name }]);

  if (error) {
    console.error(error);
    alert("追加失敗");
    return;
  }

  $("orderNameInput").value = "";
  await renderOrderNameManagePage();
};

async function renderOrderNameManagePage() {
  const names = await loadOrderNames();

  if (names.length === 0) {
    $("orderNameManageList").innerHTML =
      `<div class="manage-item">まだ名前がありません。</div>`;
    return;
  }

  $("orderNameManageList").innerHTML = names.map(item => `
    <div class="manage-item">
      ${esc(item.name)}
      <button class="delete mini" onclick="deleteOrderName('${item.id}')">削除</button>
    </div>
  `).join("");
}

window.deleteOrderName = async id => {
  const { error } = await supabase
    .from("order_names")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("削除失敗");
    return;
  }

  await renderOrderNameManagePage();
};

async function renderNameSelects() {
  const names = await loadOrderNames();

  const selects = [
    $("customerNameSelect"),
    $("receiverNameSelect"),
    $("emergencyNameSelect"),
    $("announcementSenderSelect")
  ].filter(Boolean);

  selects.forEach(select => {
    select.innerHTML = `<option value="">名前を選択してください</option>`;

    names.forEach(item => {
      select.innerHTML += `<option value="${esc(item.name)}">${esc(item.name)}</option>`;
    });
  });

  if (selectedCustomerName) $("customerNameSelect").value = selectedCustomerName;
  if (selectedReceiverName) $("receiverNameSelect").value = selectedReceiverName;

  $("customerNameSelect").onchange = () => {
    selectedCustomerName = $("customerNameSelect").value;
  };

  $("receiverNameSelect").onchange = () => {
    selectedReceiverName = $("receiverNameSelect").value;
  };
}

async function loadOptions() {
  const { data: groups, error: groupError } = await supabase
    .from("option_groups")
    .select("*")
    .eq("group_id", currentGroupId);

  const { data: choices, error: choiceError } = await supabase
    .from("option_choices")
    .select("*")
    .eq("group_id", currentGroupId);

  if (groupError || choiceError) {
    console.error(groupError || choiceError);
    throw groupError || choiceError;
  }

  optionGroupsCache = groups || [];
  optionChoicesCache = choices || [];
}

$("addOptionGroupButton").onclick = async () => {
  const name = $("optionGroupName").value.trim();

  if (!name) {
    alert("項目名を入力してください");
    return;
  }

  const { error } = await supabase
    .from("option_groups")
    .insert([{ group_id: currentGroupId, name }]);

  if (error) {
    console.error(error);
    alert("追加失敗");
    return;
  }

  $("optionGroupName").value = "";
  await renderOptionManagePage();
};

$("addOptionChoiceButton").onclick = async () => {
  const optionGroupId = $("optionGroupSelect").value;
  const name = $("optionChoiceName").value.trim();
  const subName = $("optionChoiceSubName").value.trim();

  if (!optionGroupId || !name) {
    alert("項目と選択肢名を入力してください");
    return;
  }

  const { error } = await supabase
    .from("option_choices")
    .insert([
      {
        group_id: currentGroupId,
        option_group_id: optionGroupId,
        name,
        sub_name: subName
      }
    ]);

  if (error) {
    console.error(error);
    alert("追加失敗");
    return;
  }

  $("optionChoiceName").value = "";
  $("optionChoiceSubName").value = "";

  await renderOptionManagePage();
};

async function renderOptionManagePage() {
  await loadOptions();

  $("optionGroupSelect").innerHTML =
    `<option value="">項目を選択してください</option>`;

  optionGroupsCache.forEach(group => {
    $("optionGroupSelect").innerHTML += `
      <option value="${group.id}">${esc(group.name)}</option>
    `;
  });

  if (optionGroupsCache.length === 0) {
    $("optionManageList").innerHTML =
      `<div class="manage-item">まだ選択項目がありません。</div>`;
    return;
  }

  $("optionManageList").innerHTML = optionGroupsCache.map(group => {
    const choices = optionChoicesCache.filter(choice =>
      String(choice.option_group_id) === String(group.id)
    );

    return `
      <div class="manage-item">
        <h3>${esc(group.name)}</h3>

        ${
          choices.length === 0
            ? `<p>まだ選択肢がありません。</p>`
            : choices.map(choice => `
                <p>
                  ${esc(choice.name)}
                  ${choice.sub_name ? " / " + esc(choice.sub_name) : ""}
                  <button class="delete mini" onclick="deleteOptionChoice('${choice.id}')">削除</button>
                </p>
              `).join("")
        }

        <button class="delete mini" onclick="deleteOptionGroup('${group.id}')">項目ごと削除</button>
      </div>
    `;
  }).join("");
}

window.deleteOptionChoice = async id => {
  const { error } = await supabase
    .from("option_choices")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("削除失敗");
    return;
  }

  await renderOptionManagePage();
};

window.deleteOptionGroup = async id => {
  if (!confirm("項目ごと削除しますか？")) return;

  await supabase
    .from("option_choices")
    .delete()
    .eq("option_group_id", id);

  const { error } = await supabase
    .from("option_groups")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("削除失敗");
    return;
  }

  await renderOptionManagePage();
};

async function renderEmergencyForm() {
  await renderNameSelects();

  const tables = await loadTables();

  $("emergencyTableSelect").innerHTML =
    `<option value="">卓を選択してください</option>`;

  tables.forEach(item => {
    $("emergencyTableSelect").innerHTML += `
      <option value="${esc(item.name)}">${esc(item.name)}</option>
    `;
  });
}

$("sendEmergencyButton").onclick = async () => {
  const customerName = $("emergencyNameSelect").value;
  const tableName = $("emergencyTableSelect").value;

  if (!customerName || !tableName) {
    alert("名前と卓を選択してください");
    return;
  }

  const { error } = await supabase
    .from("emergency_calls")
    .insert([
      {
        group_id: currentGroupId,
        customer_name: customerName,
        table_name: tableName,
        status: "active"
      }
    ]);

  if (error) {
    console.error(error);
    alert("緊急通知の送信に失敗しました");
    return;
  }

  $("emergencyFormOverlay").classList.add("hidden");
};

async function renderAnnouncementPage() {
  await renderNameSelects();
  $("announcementMessageInput").value = "";
}

$("sendAnnouncementButton").onclick = async () => {
  const senderName = $("announcementSenderSelect").value || "運営";
  const message = $("announcementMessageInput").value.trim();

  if (!message) {
    alert("アナウンス内容を入力してください");
    return;
  }

  const { error } = await supabase
    .from("announcements")
    .insert([
      {
        group_id: currentGroupId,
        sender_name: senderName,
        message
      }
    ]);

  if (error) {
    console.error(error);
    alert("アナウンス送信に失敗しました");
    return;
  }

  $("announcementMessageInput").value = "";
  alert("アナウンスを送信しました");
};

async function loadAlarms() {
  const { data, error } = await supabase
    .from("alarms")
    .select("*")
    .eq("group_id", currentGroupId);

  if (error) {
    console.error(error);
    return [];
  }

  alarmCache = data || [];
  return alarmCache;
}

async function renderAlarmManagePage() {
  await loadAlarms();

  if (alarmCache.length === 0) {
    $("alarmManageList").innerHTML =
      `<div class="manage-item">まだアラームがありません。</div>`;
    return;
  }

  $("alarmManageList").innerHTML = alarmCache.map(alarm => `
    <div class="manage-item">
      <h3>${esc(alarm.alarm_time)}</h3>
      <p>${esc(alarm.message)}</p>
      <p>状態：${alarm.enabled ? "有効" : "無効"}</p>

      <button class="secondary mini" onclick="toggleAlarm('${alarm.id}', ${!alarm.enabled})">
        ${alarm.enabled ? "無効にする" : "有効にする"}
      </button>

      <button class="delete mini" onclick="deleteAlarm('${alarm.id}')">
        削除
      </button>
    </div>
  `).join("");
}

$("addAlarmButton").onclick = async () => {
  const alarmTime = $("alarmTimeInput").value;
  const message = $("alarmMessageInput").value.trim();

  if (!alarmTime) {
    alert("時刻を入力してください");
    return;
  }

  const { error } = await supabase
    .from("alarms")
    .insert([
      {
        group_id: currentGroupId,
        alarm_time: alarmTime,
        message: message || "アラーム時間です",
        enabled: true
      }
    ]);

  if (error) {
    console.error(error);
    alert("アラーム追加に失敗しました");
    return;
  }

  $("alarmTimeInput").value = "";
  $("alarmMessageInput").value = "";

  await renderAlarmManagePage();
};

window.toggleAlarm = async (id, enabled) => {
  const { error } = await supabase
    .from("alarms")
    .update({ enabled })
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("変更失敗");
    return;
  }

  await renderAlarmManagePage();
};

window.deleteAlarm = async id => {
  const { error } = await supabase
    .from("alarms")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("削除失敗");
    return;
  }

  await renderAlarmManagePage();
};

function checkAlarms() {
  if (!currentGroupId || alarmCache.length === 0) return;

  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const currentTime = `${hh}:${mm}`;

  alarmCache.forEach(alarm => {
    if (!alarm.enabled) return;

    const key = `${todayKey()}-${alarm.id}-${alarm.alarm_time}`;

    if (alarm.alarm_time === currentTime && !triggeredAlarmKeys.has(key)) {
      triggeredAlarmKeys.add(key);
      showAlarm(alarm);
    }
  });
}

function setupOrderTabs() {
  document.querySelectorAll(".tab-button").forEach(button => {
    button.onclick = () => {
      document.querySelectorAll(".tab-button").forEach(btn => {
        btn.classList.remove("active");
      });

      document.querySelectorAll(".order-tab").forEach(tab => {
        tab.classList.remove("active");
      });

      button.classList.add("active");

      const tabName = button.dataset.tab;

      if (tabName === "normal") $("normalOrderPanel").classList.add("active");
      if (tabName === "food") $("foodOrderPanel").classList.add("active");
      if (tabName === "original") $("originalOrderPanel").classList.add("active");
    };
  });
}

async function renderOrderPage() {
  cart = [];
  renderCart();

  $("normalOptions").innerHTML = `<p>読み込み中...</p>`;
  $("foodItemList").innerHTML = `<div class="card">読み込み中...</div>`;
  $("originalItemList").innerHTML = `<div class="card">読み込み中...</div>`;

  const tables = await loadTables();
  await loadOptions();
  await renderNameSelects();

  $("orderTableSelect").innerHTML =
    `<option value="">卓を選択してください</option>`;

  tables.forEach(table => {
    $("orderTableSelect").innerHTML += `
      <option>${esc(table.name)}</option>
    `;
  });

  renderNormalOptions();
  await renderOrderItemList("フード", "foodItemList");
  await renderOrderItemList("オリジナル", "originalItemList");
}

function renderNormalOptions() {
  if (optionGroupsCache.length === 0) {
    $("normalOptions").innerHTML =
      `<div class="card">まだ選択項目が登録されていません。</div>`;
    return;
  }

  $("normalOptions").innerHTML = optionGroupsCache.map(group => {
    const choices = optionChoicesCache.filter(choice =>
      String(choice.option_group_id) === String(group.id)
    );

    return `
      <div class="option-box">
        <label>${esc(group.name)}</label>

        <select class="normal-option" data-name="${esc(group.name)}">
          <option value="">選択なし</option>

          ${choices.map(choice => `
            <option value="${esc(choice.name)}">
              ${esc(choice.name)}
              ${choice.sub_name ? " / " + esc(choice.sub_name) : ""}
            </option>
          `).join("")}
        </select>
      </div>
    `;
  }).join("");
}

async function renderOrderItemList(type, elementId) {
  const menus = await loadMenus();

  const filtered = menus.filter(item =>
    String(item.item_type || "") === type
  );

  if (filtered.length === 0) {
    $(elementId).innerHTML =
      `<div class="card">まだ${esc(type)}が登録されていません。</div>`;
    return;
  }

  $(elementId).innerHTML = filtered.map(item => `
    <div class="card">
      <div class="card-image">
        ${item.image ? `<img src="${esc(item.image)}">` : "🍹"}
      </div>

      <h3>${esc(item.name)}</h3>
      <span class="tag">${esc(item.item_type || "")}</span>
      <span class="tag">${esc(item.category || "")}</span>
      <p>${esc(item.description)}</p>

      <button class="primary" onclick="addMenuToCart('${item.id}')">カートに追加</button>
    </div>
  `).join("");
}

$("addNormalToCartButton").onclick = () => {
  const selectedOptions = [];

  document.querySelectorAll(".normal-option").forEach(select => {
    if (select.value) {
      selectedOptions.push({
        name: select.dataset.name,
        value: select.value
      });
    }
  });

  if (selectedOptions.length === 0) {
    alert("選択項目を1つ以上選んでください");
    return;
  }

  cart.push({
    id: "normal-" + Date.now(),
    name: "通常カクテル",
    item_type: "通常",
    options: selectedOptions
  });

  renderCart();
};

window.addMenuToCart = async id => {
  const menus = await loadMenus();
  const item = menus.find(menu => String(menu.id) === String(id));

  if (!item) return;

  cart.push({
    id: item.id,
    name: item.name,
    item_type: item.item_type || "",
    options: []
  });

  renderCart();
};

function renderCart() {
  if (cart.length === 0) {
    $("cartList").innerHTML = `<p>カートは空です。</p>`;
    return;
  }

  $("cartList").innerHTML = cart.map((item, index) => `
    <div class="cart-item">
      <b>${esc(item.name)}</b><br>
      <span>${esc(item.item_type)}</span>

      ${
        item.options && item.options.length > 0
          ? `<ul>${item.options.map(opt => `<li>${esc(opt.name)}：${esc(opt.value)}</li>`).join("")}</ul>`
          : ""
      }

      <button class="delete mini" onclick="removeCartItem(${index})">削除</button>
    </div>
  `).join("");
}

window.removeCartItem = index => {
  cart.splice(index, 1);
  renderCart();
};

$("sendOrderButton").onclick = async () => {
  const tableName = $("orderTableSelect").value;
  const customerName = $("customerNameSelect").value;

  selectedCustomerName = customerName;

  if (!tableName) {
    alert("卓を選択してください");
    return;
  }

  if (!customerName) {
    alert("名前を選択してください");
    return;
  }

  if (cart.length === 0) {
    alert("カートに商品を入れてください");
    return;
  }

  const { error } = await supabase
    .from("orders")
    .insert([
      {
        group_id: currentGroupId,
        table_name: tableName,
        customer_name: customerName,
        items: cart,
        options: [],
        memo: $("orderMemo").value,
        status: "pending",
        updated_by: "",
        updated_at: new Date().toISOString()
      }
    ]);

  if (error) {
    console.error(error);
    alert("注文失敗");
    return;
  }

  alert("注文しました");

  cart = [];
  $("orderMemo").value = "";

  renderCart();
};

async function loadOrders(includeDone = false) {
  let query = supabase
    .from("orders")
    .select("*")
    .eq("group_id", currentGroupId);

  if (!includeDone) {
    query = query.neq("status", "done");
  }

  const { data, error } = await query;

  if (error) {
    console.error(error);
    throw error;
  }

  return data || [];
}

async function renderReceivePage() {
  await renderNameSelects();

  const orders = await loadOrders(false);

  if (orders.length === 0) {
    $("orderReceiveList").innerHTML =
      `<div class="card">現在の注文はありません。</div>`;
    return;
  }

  $("orderReceiveList").innerHTML = orders.map(order => {
    const statusText = order.status === "making" ? "対応中" : "未対応";
    const nextText = order.status === "making" ? "お届け済みにする" : "対応中にする";
    const statusClass = order.status === "making" ? "making" : "pending";
    const buttonClass = order.status === "making" ? "status-making" : "status-pending";

    return `
      <div class="order-card ${statusClass}">
        <h3>卓：${esc(order.table_name)}</h3>
        <p><b>名前：</b>${esc(order.customer_name)}</p>
        <p><b>商品：</b></p>

        <ul>
          ${(order.items || []).map(item => `
            <li>
              ${menuLinkHtml(item)} / ${esc(item.item_type)}
              ${
                item.options && item.options.length > 0
                  ? `<ul>${item.options.map(opt => `<li>${esc(opt.name)}：${esc(opt.value)}</li>`).join("")}</ul>`
                  : ""
              }
            </li>
          `).join("")}
        </ul>

        <p><b>メモ：</b>${esc(order.memo)}</p>
        <p><b>状態：</b>${statusText}</p>
        <p><b>最終更新：</b>${esc(order.updated_by || "未更新")}</p>

        <button class="status-button ${buttonClass}" onclick="advanceOrderStatus('${order.id}', '${order.status}')">
          ${nextText}
        </button>
      </div>
    `;
  }).join("");
}

window.advanceOrderStatus = async (id, status) => {
  const updater = $("receiverNameSelect").value;

  if (!updater) {
    alert("更新者名を選択してください");
    return;
  }

  selectedReceiverName = updater;

  const nextStatus = status === "pending" ? "making" : "done";

  const { error } = await supabase
    .from("orders")
    .update({
      status: nextStatus,
      updated_by: updater,
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("状態変更失敗。ordersに updated_by / updated_at 列があるか確認してください。");
    return;
  }

  await renderReceivePage();
};

async function renderHistoryPage() {
  const orders = await loadOrders(true);

  if (orders.length === 0) {
    $("orderHistoryList").innerHTML =
      `<div class="card">注文履歴はありません。</div>`;
    return;
  }

  $("orderHistoryList").innerHTML = orders.map(order => {
    let statusText = "未対応";
    if (order.status === "making") statusText = "対応中";
    if (order.status === "done") statusText = "お届け済み";

    return `
      <div class="order-card ${esc(order.status)}">
        <h3>卓：${esc(order.table_name)}</h3>
        <p><b>名前：</b>${esc(order.customer_name)}</p>
        <p><b>状態：</b>${statusText}</p>
        <p><b>最終更新：</b>${esc(order.updated_by || "未更新")}</p>

        <ul>
          ${(order.items || []).map(item => `
            <li>
              ${menuLinkHtml(item)} / ${esc(item.item_type)}
              ${
                item.options && item.options.length > 0
                  ? `<ul>${item.options.map(opt => `<li>${esc(opt.name)}：${esc(opt.value)}</li>`).join("")}</ul>`
                  : ""
              }
            </li>
          `).join("")}
        </ul>

        <p><b>メモ：</b>${esc(order.memo)}</p>
      </div>
    `;
  }).join("");
}

$("resetHistoryButton").onclick = async () => {
  if (!confirm("このグループの注文履歴を全て削除しますか？")) return;

  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("group_id", currentGroupId);

  if (error) {
    console.error(error);
    alert("履歴リセット失敗");
    return;
  }

  alert("履歴をリセットしました");
  await renderHistoryPage();
};

setupOrderTabs();

updateClock();
setInterval(updateClock, 1000);
setInterval(checkAlarms, 10000);

await renderGroupOptions();
showPage("login");
