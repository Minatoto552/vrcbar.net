import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://rsjeyuvhppajxsgmgqbp.supabase.co";
const supabaseKey = "sb_publishable_tZWRzd0lcS3mJKcWdKZtbw_TPNs5AFp";
const supabase = createClient(supabaseUrl, supabaseKey);

const ADMIN_PASSWORD = "1112";

let currentGroupId = "";
let currentGroupName = "";

const pages = {
  login: document.getElementById("loginPage"),
  createGroup: document.getElementById("createGroupPage"),
  admin: document.getElementById("adminPage"),
  list: document.getElementById("listPage"),
  register: document.getElementById("registerPage"),
};

const groupSelect = document.getElementById("groupSelect");
const groupPassword = document.getElementById("groupPassword");
const loginButton = document.getElementById("loginButton");

const goCreateGroupButton = document.getElementById("goCreateGroupButton");
const goAdminButton = document.getElementById("goAdminButton");
const backToLoginButton = document.getElementById("backToLoginButton");
const backToLoginFromAdminButton = document.getElementById("backToLoginFromAdminButton");

const newGroupName = document.getElementById("newGroupName");
const newGroupPassword = document.getElementById("newGroupPassword");
const createGroupButton = document.getElementById("createGroupButton");

const adminPassword = document.getElementById("adminPassword");
const adminGroupSelect = document.getElementById("adminGroupSelect");
const newPasswordForGroup = document.getElementById("newPasswordForGroup");
const changeGroupPasswordButton = document.getElementById("changeGroupPasswordButton");
const deleteGroupButton = document.getElementById("deleteGroupButton");

const currentGroupText = document.getElementById("currentGroupText");
const goRegisterButton = document.getElementById("goRegisterButton");
const backToListButton = document.getElementById("backToListButton");
const logoutButton = document.getElementById("logoutButton");

const form = document.getElementById("cocktailForm");
const menuList = document.getElementById("menuList");
const search = document.getElementById("search");
const submitButton = document.getElementById("submitButton");

function showPage(pageName) {
  Object.values(pages).forEach(page => {
    page.classList.remove("active");
  });

  pages[pageName].classList.add("active");
}

async function loadGroups() {
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error(error);
    alert("グループの読み込みに失敗しました");
    return [];
  }

  return data;
}

async function renderGroupOptions() {
  const groups = await loadGroups();

  groupSelect.innerHTML = `
    <option value="">
      グループを選択してください
    </option>
  `;

  adminGroupSelect.innerHTML = `
    <option value="">
      グループを選択してください
    </option>
  `;

  groups.forEach(group => {
    groupSelect.innerHTML += `
      <option value="${group.id}">
        ${group.name}
      </option>
    `;

    adminGroupSelect.innerHTML += `
      <option value="${group.id}">
        ${group.name}
      </option>
    `;
  });
}

goCreateGroupButton.addEventListener("click", () => {
  showPage("createGroup");
});

backToLoginButton.addEventListener("click", () => {
  showPage("login");
});

goAdminButton.addEventListener("click", async () => {
  adminPassword.value = "";
  newPasswordForGroup.value = "";
  await renderGroupOptions();
  showPage("admin");
});

backToLoginFromAdminButton.addEventListener("click", () => {
  showPage("login");
});

createGroupButton.addEventListener("click", async () => {
  const name = newGroupName.value.trim();
  const password = newGroupPassword.value.trim();

  if (name === "" || password === "") {
    alert("グループ名とパスワードを入力してください");
    return;
  }

  const { data: existingGroups, error: selectError } = await supabase
    .from("groups")
    .select("*")
    .eq("name", name);

  if (selectError) {
    console.error(selectError);
    alert("グループ確認に失敗しました");
    return;
  }

  if (existingGroups.length > 0) {
    alert("同じ名前のグループがすでにあります");
    return;
  }

  const { error } = await supabase
    .from("groups")
    .insert([
      {
        name: name,
        password: password
      }
    ]);

  if (error) {
    console.error(error);
    alert("グループ作成に失敗しました");
    return;
  }

  newGroupName.value = "";
  newGroupPassword.value = "";

  await renderGroupOptions();

  alert("グループを作成しました");
  showPage("login");
});

loginButton.addEventListener("click", async () => {
  const groupId = groupSelect.value;
  const password = groupPassword.value.trim();

  if (groupId === "" || password === "") {
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

  currentGroupText.textContent =
    "現在のグループ：" + currentGroupName;

  groupPassword.value = "";

  await renderMenus();

  showPage("list");
});

changeGroupPasswordButton.addEventListener("click", async () => {
  const adminPass = adminPassword.value.trim();
  const groupId = adminGroupSelect.value;
  const newPass = newPasswordForGroup.value.trim();

  if (adminPass !== ADMIN_PASSWORD) {
    alert("管理人パスワードが違います");
    return;
  }

  if (groupId === "") {
    alert("グループを選択してください");
    return;
  }

  if (newPass === "") {
    alert("新しいグループパスワードを入力してください");
    return;
  }

  const { error } = await supabase
    .from("groups")
    .update({ password: newPass })
    .eq("id", groupId);

  if (error) {
    console.error(error);
    alert("パスワード変更に失敗しました");
    return;
  }

  newPasswordForGroup.value = "";

  alert("グループパスワードを変更しました");
});

deleteGroupButton.addEventListener("click", async () => {
  const adminPass = adminPassword.value.trim();
  const groupId = adminGroupSelect.value;

  if (adminPass !== ADMIN_PASSWORD) {
    alert("管理人パスワードが違います");
    return;
  }

  if (groupId === "") {
    alert("グループを選択してください");
    return;
  }

  const selectedOption =
    adminGroupSelect.options[adminGroupSelect.selectedIndex];

  const groupName = selectedOption.textContent.trim();

  if (!confirm(groupName + " を削除しますか？")) {
    return;
  }

  const { error: cocktailError } = await supabase
    .from("cocktails")
    .delete()
    .eq("group_id", groupId);

  if (cocktailError) {
    console.error(cocktailError);
    alert("カクテル削除に失敗しました");
    return;
  }

  const { error: groupError } = await supabase
    .from("groups")
    .delete()
    .eq("id", groupId);

  if (groupError) {
    console.error(groupError);
    alert("グループ削除に失敗しました");
    return;
  }

  if (currentGroupId === groupId) {
    currentGroupId = "";
    currentGroupName = "";
    menuList.innerHTML = "";
  }

  adminGroupSelect.value = "";
  newPasswordForGroup.value = "";

  await renderGroupOptions();

  alert("グループを削除しました");
});

goRegisterButton.addEventListener("click", () => {
  form.reset();
  document.getElementById("editCocktailId").value = "";
  submitButton.textContent = "登録する";
  showPage("register");
});

backToListButton.addEventListener("click", () => {
  form.reset();
  document.getElementById("editCocktailId").value = "";
  submitButton.textContent = "登録する";
  showPage("list");
});

logoutButton.addEventListener("click", () => {
  currentGroupId = "";
  currentGroupName = "";

  search.value = "";
  menuList.innerHTML = "";

  showPage("login");
});

async function loadMenus() {
  if (!currentGroupId) {
    return [];
  }

  const { data, error } = await supabase
    .from("cocktails")
    .select("*")
    .eq("group_id", currentGroupId)
    .order("id", { ascending: false });

  if (error) {
    console.error(error);
    alert("カクテル一覧の読み込みに失敗しました");
    return [];
  }

  return data;
}

async function renderMenus() {
  const menus = await loadMenus();

  const keyword = search.value.toLowerCase();

  const filtered = menus.filter(menu => {
    const text = `
      ${menu.name || ""}
      ${menu.category || ""}
      ${menu.taste || ""}
      ${menu.description || ""}
      ${menu.bottles || ""}
    `.toLowerCase();

    return text.includes(keyword);
  });

  if (filtered.length === 0) {
    menuList.innerHTML = `
      <div class="card">
        <p>まだカクテルが登録されていません。</p>
      </div>
    `;
    return;
  }

  menuList.innerHTML = filtered.map(menu => `

    <div class="card">

      <div class="card-image">
        ${
          menu.image
          ? `<img src="${menu.image}" alt="${menu.name}">`
          : "🍹"
        }
      </div>

      <h3>${menu.name}</h3>

      <div class="tag">
        ${menu.category}
      </div>

      <div class="tag">
        ${menu.taste}
      </div>

      <p>
        ${menu.description || ""}
      </p>

      <details>
        <summary>
          レシピを見る
        </summary>

        <p>
          <b>材料：</b><br>
          ${menu.bottles || ""}
        </p>

        <p>
          <b>作り方：</b><br>
          ${menu.recipe || ""}
        </p>
      </details>

      <div class="actions">

        <button
          class="edit"
          onclick="editMenu('${menu.id}')"
        >
          編集
        </button>

        <button
          class="delete"
          onclick="deleteMenu('${menu.id}')"
        >
          削除
        </button>

      </div>

    </div>

  `).join("");
}

form.addEventListener("submit", async event => {
  event.preventDefault();

  if (!currentGroupId) {
    alert("先にログインしてください");
    return;
  }

  const editId = document.getElementById("editCocktailId").value;

  const cocktailData = {
    group_id: currentGroupId,
    category: document.getElementById("category").value,
    name: document.getElementById("name").value,
    taste: document.getElementById("taste").value,
    bottles: document.getElementById("bottles").value,
    recipe: document.getElementById("recipe").value,
    description: document.getElementById("description").value,
    image: document.getElementById("image").value
  };

  if (editId) {
    const { error } = await supabase
      .from("cocktails")
      .update(cocktailData)
      .eq("id", editId);

    if (error) {
      console.error(error);
      alert("更新に失敗しました");
      return;
    }
  } else {
    const { error } = await supabase
      .from("cocktails")
      .insert([cocktailData]);

    if (error) {
      console.error(error);
      alert("登録に失敗しました");
      return;
    }
  }

  await renderMenus();

  form.reset();
  document.getElementById("editCocktailId").value = "";
  submitButton.textContent = "登録する";

  showPage("list");
});

window.deleteMenu = async function(id) {
  if (!confirm("このカクテルを削除しますか？")) {
    return;
  }

  const { error } = await supabase
    .from("cocktails")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("削除に失敗しました");
    return;
  }

  await renderMenus();
}

window.editMenu = async function(id) {
  const { data, error } = await supabase
    .from("cocktails")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    console.error(error);
    alert("編集データの取得に失敗しました");
    return;
  }

  document.getElementById("editCocktailId").value = data.id;
  document.getElementById("category").value = data.category;
  document.getElementById("name").value = data.name;
  document.getElementById("taste").value = data.taste;
  document.getElementById("bottles").value = data.bottles || "";
  document.getElementById("recipe").value = data.recipe || "";
  document.getElementById("description").value = data.description || "";
  document.getElementById("image").value = data.image || "";

  submitButton.textContent = "更新する";

  showPage("register");
}

search.addEventListener("input", async () => {
  await renderMenus();
});

await renderGroupOptions();
showPage("login");