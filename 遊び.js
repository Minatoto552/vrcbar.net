const ADMIN_PASSWORD = "1112";

let STORAGE_KEY = "";
let currentGroupId = "";
let currentGroupName = "";

const GROUPS_KEY = "vrcCocktailGroups";

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

const goCreateGroupButton =
  document.getElementById("goCreateGroupButton");

const goAdminButton =
  document.getElementById("goAdminButton");

const backToLoginButton =
  document.getElementById("backToLoginButton");

const backToLoginFromAdminButton =
  document.getElementById("backToLoginFromAdminButton");

const newGroupName =
  document.getElementById("newGroupName");

const newGroupPassword =
  document.getElementById("newGroupPassword");

const createGroupButton =
  document.getElementById("createGroupButton");

const adminPassword =
  document.getElementById("adminPassword");

const adminGroupSelect =
  document.getElementById("adminGroupSelect");

const newPasswordForGroup =
  document.getElementById("newPasswordForGroup");

const changeGroupPasswordButton =
  document.getElementById("changeGroupPasswordButton");

const deleteGroupButton =
  document.getElementById("deleteGroupButton");

const currentGroupText =
  document.getElementById("currentGroupText");

const goRegisterButton =
  document.getElementById("goRegisterButton");

const backToListButton =
  document.getElementById("backToListButton");

const logoutButton =
  document.getElementById("logoutButton");

const form = document.getElementById("cocktailForm");
const menuList = document.getElementById("menuList");
const search = document.getElementById("search");

function showPage(pageName) {
  Object.values(pages).forEach(page => {
    page.classList.remove("active");
  });

  pages[pageName].classList.add("active");
}

function loadGroups() {
  return JSON.parse(
    localStorage.getItem(GROUPS_KEY) || "[]"
  );
}

function saveGroups(groups) {
  localStorage.setItem(
    GROUPS_KEY,
    JSON.stringify(groups)
  );
}

function makeGroupId(groupName) {
  return groupName
    .trim()
    .toLowerCase()
    .replaceAll(" ", "-");
}

function makeStorageKey(groupId) {
  return "vrcCocktailMenu_" + groupId;
}

function renderGroupOptions() {
  const groups = loadGroups();

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

goAdminButton.addEventListener("click", () => {
  adminPassword.value = "";
  newPasswordForGroup.value = "";
  renderGroupOptions();
  showPage("admin");
});

backToLoginFromAdminButton.addEventListener("click", () => {
  showPage("login");
});

createGroupButton.addEventListener("click", () => {
  const name = newGroupName.value.trim();
  const password = newGroupPassword.value.trim();

  if (name === "" || password === "") {
    alert("グループ名とパスワードを入力してください");
    return;
  }

  const groups = loadGroups();
  const id = makeGroupId(name);

  const exists = groups.some(group => {
    return group.id === id;
  });

  if (exists) {
    alert("同じ名前のグループがすでにあります");
    return;
  }

  groups.push({
    id: id,
    name: name,
    password: password
  });

  saveGroups(groups);

  newGroupName.value = "";
  newGroupPassword.value = "";

  renderGroupOptions();

  alert("グループを作成しました");

  showPage("login");
});

loginButton.addEventListener("click", () => {
  const groupId = groupSelect.value;
  const password = groupPassword.value.trim();

  if (groupId === "" || password === "") {
    alert("グループとパスワードを入力してください");
    return;
  }

  const groups = loadGroups();

  const group = groups.find(item => {
    return item.id === groupId;
  });

  if (!group) {
    alert("グループが見つかりません");
    return;
  }

  if (group.password !== password) {
    alert("パスワードが違います");
    return;
  }

  currentGroupId = group.id;
  currentGroupName = group.name;
  STORAGE_KEY = makeStorageKey(group.id);

  currentGroupText.textContent =
    "現在のグループ：" + currentGroupName;

  groupPassword.value = "";

  renderMenus();

  showPage("list");
});

changeGroupPasswordButton.addEventListener("click", () => {
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

  const groups = loadGroups();

  const group = groups.find(item => {
    return item.id === groupId;
  });

  if (!group) {
    alert("グループが見つかりません");
    return;
  }

  group.password = newPass;

  saveGroups(groups);

  newPasswordForGroup.value = "";

  alert("グループパスワードを変更しました");
});

deleteGroupButton.addEventListener("click", () => {
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

  const groups = loadGroups();

  const group = groups.find(item => {
    return item.id === groupId;
  });

  if (!group) {
    alert("グループが見つかりません");
    return;
  }

  if (!confirm(group.name + " を削除しますか？")) {
    return;
  }

  const newGroups = groups.filter(item => {
    return item.id !== groupId;
  });

  saveGroups(newGroups);

  localStorage.removeItem(makeStorageKey(groupId));

  if (currentGroupId === groupId) {
    STORAGE_KEY = "";
    currentGroupId = "";
    currentGroupName = "";
    menuList.innerHTML = "";
  }

  renderGroupOptions();

  adminGroupSelect.value = "";
  newPasswordForGroup.value = "";

  alert("グループを削除しました");
});

goRegisterButton.addEventListener("click", () => {
  form.reset();
  showPage("register");
});

backToListButton.addEventListener("click", () => {
  showPage("list");
});

logoutButton.addEventListener("click", () => {
  STORAGE_KEY = "";
  currentGroupId = "";
  currentGroupName = "";

  search.value = "";
  menuList.innerHTML = "";

  showPage("login");
});

function loadMenus() {
  if (!STORAGE_KEY) {
    return [];
  }

  return JSON.parse(
    localStorage.getItem(STORAGE_KEY) || "[]"
  );
}

function saveMenus(menus) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(menus)
  );
}

function renderMenus() {
  const menus = loadMenus();

  const keyword = search.value.toLowerCase();

  const filtered = menus.filter(menu => {
    const text = `
      ${menu.name}
      ${menu.category}
      ${menu.taste}
      ${menu.description}
      ${menu.bottles}
    `.toLowerCase();

    return text.includes(keyword);
  });

  if (filtered.length === 0) {
    menuList.innerHTML = `
      <div class="card">
        <p>
          まだカクテルが登録されていません。
        </p>
      </div>
    `;
    return;
  }

  menuList.innerHTML = filtered.map(menu => `

    <div class="card">

      <div class="card-image">
        ${
          menu.image
          ? `<img src="${menu.image}">`
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
        ${menu.description}
      </p>

      <details>
        <summary>
          レシピを見る
        </summary>

        <p>
          <b>材料：</b><br>
          ${menu.bottles}
        </p>

        <p>
          <b>作り方：</b><br>
          ${menu.recipe}
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

form.addEventListener("submit", event => {
  event.preventDefault();

  if (!STORAGE_KEY) {
    alert("先にログインしてください");
    return;
  }

  const menus = loadMenus();

  const newMenu = {
    id: crypto.randomUUID(),

    category:
      document.getElementById("category").value,

    name:
      document.getElementById("name").value,

    taste:
      document.getElementById("taste").value,

    bottles:
      document.getElementById("bottles").value,

    recipe:
      document.getElementById("recipe").value,

    description:
      document.getElementById("description").value,

    image:
      document.getElementById("image").value,
  };

  menus.unshift(newMenu);

  saveMenus(menus);

  renderMenus();

  form.reset();

  showPage("list");
});

window.deleteMenu = function(id) {
  const menus = loadMenus().filter(menu => {
    return menu.id !== id;
  });

  saveMenus(menus);

  renderMenus();
}

window.editMenu = function(id) {
  const menu = loadMenus().find(menu => {
    return menu.id === id;
  });

  document.getElementById("category").value =
    menu.category;

  document.getElementById("name").value =
    menu.name;

  document.getElementById("taste").value =
    menu.taste;

  document.getElementById("bottles").value =
    menu.bottles;

  document.getElementById("recipe").value =
    menu.recipe;

  document.getElementById("description").value =
    menu.description;

  document.getElementById("image").value =
    menu.image;

  deleteMenu(id);

  showPage("register");
}

search.addEventListener(
  "input",
  renderMenus
);

renderGroupOptions();
showPage("login");