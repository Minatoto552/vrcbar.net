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
  option: $("optionPage"),
  table: $("tablePage"),
};

function showPage(name) {
  Object.values(pages).forEach(page => page.classList.remove("active"));
  pages[name].classList.add("active");
}

function esc(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadGroups() {
  const { data, error } = await supabase.from("groups").select("*").order("id");
  if (error) {
    alert("グループ読み込み失敗");
    console.error(error);
    return [];
  }
  return data;
}

async function renderGroupOptions() {
  const groups = await loadGroups();

  $("groupSelect").innerHTML = `<option value="">グループを選択してください</option>`;
  $("adminGroupSelect").innerHTML = `<option value="">グループを選択してください</option>`;

  groups.forEach(group => {
    $("groupSelect").innerHTML += `<option value="${group.id}">${esc(group.name)}</option>`;
    $("adminGroupSelect").innerHTML += `<option value="${group.id}">${esc(group.name)}</option>`;
  });
}

$("goCreateGroupButton").onclick = () => showPage("createGroup");
$("backToLoginButton").onclick = () => showPage("login");
$("goAdminButton").onclick = async () => {
  await renderGroupOptions();
  showPage("admin");
};
$("backToLoginFromAdminButton").onclick = () => showPage("login");

$("createGroupButton").onclick = async () => {
  const name = $("newGroupName").value.trim();
  const password = $("newGroupPassword").value.trim();

  if (!name || !password) {
    alert("グループ名とパスワードを入力してください");
    return;
  }

  const { data: exists } = await supabase.from("groups").select("*").eq("name", name);

  if (exists.length > 0) {
    alert("同じ名前のグループがあります");
    return;
  }

  const { error } = await supabase.from("groups").insert([{ name, password }]);

  if (error) {
    alert("グループ作成失敗");
    console.error(error);
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
    alert("グループが見つかりません");
    return;
  }

  if (data.password !== password) {
    alert("パスワードが違います");
    return;
  }

  currentGroupId = String(data.id);
  currentGroupName = data.name;
  $("currentGroupText").textContent = "現在のグループ：" + currentGroupName;
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

  const { error } = await supabase.from("groups").update({ password: newPass }).eq("id", groupId);

  if (error) {
    alert("変更失敗");
    console.error(error);
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
  if (!groupId) return alert("グループを選択してください");

  if (!confirm("このグループを削除しますか？")) return;

  await supabase.from("orders").delete().eq("group_id", groupId);
  await supabase.from("cocktails").delete().eq("group_id", groupId);
  await supabase.from("option_choices").delete().eq("group_id", groupId);
  await supabase.from("option_groups").delete().eq("group_id", groupId);
  await supabase.from("tables").delete().eq("group_id", groupId);

  const { error } = await supabase.from("groups").delete().eq("id", groupId);

  if (error) {
    alert("削除失敗");
    console.error(error);
    return;
  }

  await renderGroupOptions();
  alert("削除しました");
};

document.querySelectorAll(".backHome").forEach(btn => {
  btn.onclick = () => showPage("home");
});

$("logoutButton").onclick = () => {
  currentGroupId = "";
  currentGroupName = "";
  cart = [];
  showPage("login");
};

$("goListButton").onclick = async () => {
  await renderMenus();
  showPage("list");
};

$("goRegisterButton").onclick = () => {
  resetRegisterForm();
  showPage("register");
};

$("goOrderButton").onclick = async () => {
  await renderOrderPage();
  showPage("order");
};

$("goReceiveButton").onclick = async () => {
  await renderReceivePage();
  showPage("receive");
};

$("goOptionButton").onclick = async () => {
  await renderOptionManagePage();
  showPage("option");
};

$("goTableButton").onclick = async () => {
  await renderTableManagePage();
  showPage("table");
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
    .eq("group_id", currentGroupId)
    .order("id", { ascending: false });

  if (error) {
    alert("メニュー読み込み失敗");
    console.error(error);
    return [];
  }

  return data;
}

async function renderMenus() {
  const menus = await loadMenus();
  const keyword = $("search").value.toLowerCase();

  const filtered = menus.filter(menu => {
    return `${menu.name} ${menu.item_type} ${menu.category} ${menu.taste} ${menu.description}`
      .toLowerCase()
      .includes(keyword);
  });

  if (filtered.length === 0) {
    $("menuList").innerHTML = `<div class="card">まだ登録がありません。</div>`;
    return;
  }

  $("menuList").innerHTML = filtered.map(menu => `
    <div class="card">
      <div class="card-image">
        ${menu.image ? `<img src="${esc(menu.image)}">` : "🍹"}
      </div>
      <h3>${esc(menu.name)}</h3>
      <span class="tag">${esc(menu.item_type || "カクテル")}</span>
      <span class="tag">${esc(menu.category)}</span>
      <span class="tag">${esc(menu.taste)}</span>
      <p>${esc(menu.description)}</p>
      <details>
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

$("search").addEventListener("input", renderMenus);

$("cocktailForm").onsubmit = async event => {
  event.preventDefault();

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
    alert("保存失敗。cocktailsに item_type カラムがあるか確認してね");
    console.error(result.error);
    return;
  }

  resetRegisterForm();
  await renderMenus();
  showPage("list");
};

window.editMenu = async id => {
  const { data, error } = await supabase.from("cocktails").select("*").eq("id", id).single();

  if (error) return alert("取得失敗");

  $("editCocktailId").value = data.id;
  $("itemType").value = data.item_type || "カクテル";
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
  const { error } = await supabase.from("cocktails").delete().eq("id", id);
  if (error) return alert("削除失敗");
  await renderMenus();
};

async function loadTables() {
  const { data } = await supabase.from("tables").select("*").eq("group_id", currentGroupId).order("id");
  return data || [];
}

async function loadOptions() {
  const { data: groups } = await supabase
    .from("option_groups")
    .select("*")
    .eq("group_id", currentGroupId)
    .order("id");

  const { data: choices } = await supabase
    .from("option_choices")
    .select("*")
    .eq("group_id", currentGroupId)
    .order("id");

  optionGroupsCache = groups || [];
  optionChoicesCache = choices || [];
}

async function renderOrderPage() {
  cart = [];
  renderCart();

  const tables = await loadTables();
  const menus = await loadMenus();
  await loadOptions();

  $("orderTableSelect").innerHTML = `<option value="">卓を選択してください</option>`;
  tables.forEach(table => {
    $("orderTableSelect").innerHTML += `<option>${esc(table.name)}</option>`;
  });

  $("orderOptions").innerHTML = optionGroupsCache.map(group => {
    const choices = optionChoicesCache.filter(choice => String(choice.option_group_id) === String(group.id));

    return `
      <div class="option-box">
        <label>${esc(group.name)}</label>
        <select class="order-option" data-name="${esc(group.name)}">
          <option value="">選択なし</option>
          ${choices.map(choice => `
            <option value="${esc(choice.name)}">
              ${esc(choice.name)}${choice.sub_name ? " / " + esc(choice.sub_name) : ""}
            </option>
          `).join("")}
        </select>
      </div>
    `;
  }).join("");

  $("orderItemList").innerHTML = menus.map(item => `
    <div class="card">
      <div class="card-image">
        ${item.image ? `<img src="${esc(item.image)}">` : "🍹"}
      </div>
      <h3>${esc(item.name)}</h3>
      <span class="tag">${esc(item.item_type || "カクテル")}</span>
      <span class="tag">${esc(item.category)}</span>
      <p>${esc(item.description)}</p>
      <button class="primary" onclick="addToCart('${item.id}')">カートに追加</button>
    </div>
  `).join("");
}

window.addToCart = async id => {
  const menus = await loadMenus();
  const item = menus.find(menu => String(menu.id) === String(id));
  if (!item) return;

  cart.push({
    id: item.id,
    name: item.name,
    item_type: item.item_type || "カクテル"
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
  const customerName = $("customerName").value.trim();

  if (!tableName) return alert("卓を選択してください");
  if (!customerName) return alert("名前を入力してください");
  if (cart.length === 0) return alert("カートに商品を入れてください");

  const selectedOptions = [];
  document.querySelectorAll(".order-option").forEach(select => {
    if (select.value) {
      selectedOptions.push({
        name: select.dataset.name,
        value: select.value
      });
    }
  });

  const { error } = await supabase.from("orders").insert([{
    group_id: currentGroupId,
    table_name: tableName,
    customer_name: customerName,
    items: cart,
    options: selectedOptions,
    memo: $("orderMemo").value,
    status: "pending"
  }]);

  if (error) {
    alert("注文失敗");
    console.error(error);
    return;
  }

  alert("注文しました");
  cart = [];
  $("customerName").value = "";
  $("orderMemo").value = "";
  renderCart();
};

async function renderReceivePage() {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("group_id", currentGroupId)
    .neq("status", "done")
    .order("id", { ascending: true });

  if (error) {
    alert("注文読み込み失敗");
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    $("orderReceiveList").innerHTML = `<div class="card">現在の注文はありません。</div>`;
    return;
  }

  $("orderReceiveList").innerHTML = data.map(order => {
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
          ${(order.items || []).map(item => `<li>${esc(item.name)} / ${esc(item.item_type)}</li>`).join("")}
        </ul>

        <p><b>選択：</b></p>
        <ul>
          ${(order.options || []).map(opt => `<li>${esc(opt.name)}：${esc(opt.value)}</li>`).join("")}
        </ul>

        <p><b>メモ：</b>${esc(order.memo)}</p>
        <p><b>状態：</b>${statusText}</p>

        <button class="status-button ${buttonClass}" onclick="advanceOrderStatus('${order.id}', '${order.status}')">
          ${nextText}
        </button>
      </div>
    `;
  }).join("");
}

window.advanceOrderStatus = async (id, status) => {
  const nextStatus = status === "pending" ? "making" : "done";

  const { error } = await supabase
    .from("orders")
    .update({ status: nextStatus })
    .eq("id", id);

  if (error) {
    alert("状態変更失敗");
    console.error(error);
    return;
  }

  await renderReceivePage();
};

$("addOptionGroupButton").onclick = async () => {
  const name = $("optionGroupName").value.trim();
  if (!name) return alert("項目名を入力してください");

  const { error } = await supabase.from("option_groups").insert([{
    group_id: currentGroupId,
    name
  }]);

  if (error) return alert("追加失敗");

  $("optionGroupName").value = "";
  await renderOptionManagePage();
};

$("addOptionChoiceButton").onclick = async () => {
  const optionGroupId = $("optionGroupSelect").value;
  const name = $("optionChoiceName").value.trim();
  const subName = $("optionChoiceSubName").value.trim();

  if (!optionGroupId || !name) return alert("項目と選択肢名を入力してください");

  const { error } = await supabase.from("option_choices").insert([{
    group_id: currentGroupId,
    option_group_id: optionGroupId,
    name,
    sub_name: subName
  }]);

  if (error) return alert("追加失敗");

  $("optionChoiceName").value = "";
  $("optionChoiceSubName").value = "";
  await renderOptionManagePage();
};

async function renderOptionManagePage() {
  await loadOptions();

  $("optionGroupSelect").innerHTML = `<option value="">項目を選択してください</option>`;
  optionGroupsCache.forEach(group => {
    $("optionGroupSelect").innerHTML += `<option value="${group.id}">${esc(group.name)}</option>`;
  });

  $("optionManageList").innerHTML = optionGroupsCache.map(group => {
    const choices = optionChoicesCache.filter(choice => String(choice.option_group_id) === String(group.id));

    return `
      <div class="manage-item">
        <h3>${esc(group.name)}</h3>
        ${choices.map(choice => `
          <p>
            ${esc(choice.name)} ${choice.sub_name ? " / " + esc(choice.sub_name) : ""}
            <button class="delete mini" onclick="deleteOptionChoice('${choice.id}')">削除</button>
          </p>
        `).join("")}
        <button class="delete mini" onclick="deleteOptionGroup('${group.id}')">項目ごと削除</button>
      </div>
    `;
  }).join("");
}

window.deleteOptionChoice = async id => {
  await supabase.from("option_choices").delete().eq("id", id);
  await renderOptionManagePage();
};

window.deleteOptionGroup = async id => {
  if (!confirm("項目ごと削除しますか？")) return;
  await supabase.from("option_choices").delete().eq("option_group_id", id);
  await supabase.from("option_groups").delete().eq("id", id);
  await renderOptionManagePage();
};

$("addTableButton").onclick = async () => {
  const name = $("tableNameInput").value.trim();
  if (!name) return alert("卓名を入力してください");

  const { error } = await supabase.from("tables").insert([{
    group_id: currentGroupId,
    name
  }]);

  if (error) return alert("追加失敗");

  $("tableNameInput").value = "";
  await renderTableManagePage();
};

async function renderTableManagePage() {
  const tables = await loadTables();

  $("tableManageList").innerHTML = tables.map(table => `
    <div class="manage-item">
      ${esc(table.name)}
      <button class="delete mini" onclick="deleteTable('${table.id}')">削除</button>
    </div>
  `).join("");
}

window.deleteTable = async id => {
  await supabase.from("tables").delete().eq("id", id);
  await renderTableManagePage();
};

await renderGroupOptions();
showPage("login");
