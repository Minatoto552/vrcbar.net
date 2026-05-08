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

const $ = id => document.getElementById(id);

const pages = {
  login: $("loginPage"),
  createGroup: $("createGroupPage"),
  admin: $("adminPage"),
  home: $("homePage"),
  list: $("listPage"),
  register: $("registerPage"),
  order: $("orderPage"),
  receive: $("receivePage"),
  history: $("historyPage"),
  option: $("optionPage"),
  table: $("tablePage"),
};

function showPage(name) {
  Object.values(pages).forEach(page => {
    if (page) page.classList.remove("active");
  });

  if (pages[name]) {
    pages[name].classList.add("active");
  }
}

function esc(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

  if ($("groupSelect")) {
    $("groupSelect").innerHTML =
      `<option value="">グループを選択してください</option>`;

    groups.forEach(group => {
      $("groupSelect").innerHTML += `
        <option value="${group.id}">
          ${esc(group.name)}
        </option>
      `;
    });
  }

  if ($("adminGroupSelect")) {
    $("adminGroupSelect").innerHTML =
      `<option value="">グループを選択してください</option>`;

    groups.forEach(group => {
      $("adminGroupSelect").innerHTML += `
        <option value="${group.id}">
          ${esc(group.name)}
        </option>
      `;
    });
  }
}

$("goCreateGroupButton").onclick = () => {
  showPage("createGroup");
};

$("backToLoginButton").onclick = () => {
  showPage("login");
};

$("goAdminButton").onclick = async () => {
  await renderGroupOptions();
  showPage("admin");
};

$("backToLoginFromAdminButton").onclick = () => {
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

  $("currentGroupText").textContent =
    "現在のグループ：" + currentGroupName;

  $("groupPassword").value = "";

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
    alert("グループと新パスワードを入力してください");
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

document.querySelectorAll(".backHome").forEach(btn => {
  btn.onclick = () => {
    showPage("home");
  };
});

$("logoutButton").onclick = () => {
  currentGroupId = "";
  currentGroupName = "";
  cart = [];
  showPage("login");
};

$("goListButton").onclick = async () => {
  await openPage("list", renderMenus);
};

$("goRegisterButton").onclick = () => {
  resetRegisterForm();
  showPage("register");
};

$("goOrderButton").onclick = async () => {
  await openPage("order", renderOrderPage);
};

$("goReceiveButton").onclick = async () => {
  await openPage("receive", renderReceivePage);
};

$("goHistoryButton").onclick = async () => {
  await openPage("history", renderHistoryPage);
};

$("goOptionButton").onclick = async () => {
  await openPage("option", renderOptionManagePage);
};

$("goTableButton").onclick = async () => {
  await openPage("table", renderTableManagePage);
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
  const keyword = $("search").value.toLowerCase();

  const filtered = menus.filter(menu => {
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

      <details>
        <summary>詳細を見る</summary>
        <p><b>内容：</b><br>${esc(menu.bottles)}</p>
        <p><b>作り方：</b><br>${esc(menu.recipe)}</p>
      </details>

      <div class="actions">
        <button class="edit" onclick="editMenu('${menu.id}')">
          編集
        </button>

        <button class="delete" onclick="deleteMenu('${menu.id}')">
          削除
        </button>
      </div>
    </div>
  `).join("");
}
