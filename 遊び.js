import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl =
  "https://rsjeyuvhppajxsgmgqbp.supabase.co";

const supabaseKey =
  "sb_publishable_tZWRzd0lcS3mJKcWdKZtbw_TPNs5AFp";

const supabase =
  createClient(supabaseUrl, supabaseKey);

const ADMIN_PASSWORD = "1112";

let currentGroupId = "";
let currentGroupName = "";

let cart = [];

let optionGroupsCache = [];
let optionChoicesCache = [];

let selectedCustomerName = "";

let ordersChannel = null;
let emergencyChannel = null;

let focusedMenuId = "";

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
  emergency: $("emergencyPage"),
  option: $("optionPage"),
  table: $("tablePage"),
  name: $("namePage"),
};

function showPage(name) {

  Object.values(pages).forEach(page => {
    page.classList.remove("active");
  });

  pages[name].classList.add("active");
}

function isActive(name) {
  return pages[name].classList.contains("active");
}

function esc(text) {

  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function menuLinkHtml(item) {

  if (
    item.id &&
    !String(item.id).startsWith("normal-")
  ) {

    return `
      <span
        class="clickable-menu"
        onclick="openMenuFromOrder('${item.id}')"
      >
        ${esc(item.name)}
      </span>
    `;
  }

  return esc(item.name);
}

async function openPage(
  pageName,
  renderFunction
) {

  showPage(pageName);

  if (typeof renderFunction === "function") {

    try {
      await renderFunction();
    } catch (error) {

      console.error(error);

      alert(
        "読み込み失敗。F12のConsoleを確認してください。"
      );
    }
  }
}

function stopRealtime() {

  if (ordersChannel) {
    supabase.removeChannel(ordersChannel);
    ordersChannel = null;
  }

  if (emergencyChannel) {
    supabase.removeChannel(emergencyChannel);
    emergencyChannel = null;
  }
}

function startRealtime() {

  if (!currentGroupId) return;

  stopRealtime();

  ordersChannel =
    supabase
      .channel("orders-" + currentGroupId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter:
            "group_id=eq." +
            currentGroupId
        },

        async () => {

          if (isActive("receive")) {
            await renderReceivePage();
          }

          if (isActive("history")) {
            await renderHistoryPage();
          }
        }
      )
      .subscribe();

  emergencyChannel =
    supabase
      .channel(
        "emergency-" + currentGroupId
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "emergency_calls",
          filter:
            "group_id=eq." +
            currentGroupId
        },

        payload => {
          showEmergencyPopup(payload.new);
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

  $("emergencyOverlay")
    .classList
    .remove("hidden");
}

$("closeEmergencyButton").onclick =
  () => {

    $("emergencyOverlay")
      .classList
      .add("hidden");
  };

async function loadGroups() {

  const {
    data,
    error
  } =
    await supabase
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

  const groups =
    await loadGroups();

  $("groupSelect").innerHTML =
    `<option value="">
      グループを選択してください
    </option>`;

  $("adminGroupSelect").innerHTML =
    `<option value="">
      グループを選択してください
    </option>`;

  groups.forEach(group => {

    $("groupSelect").innerHTML += `
      <option value="${group.id}">
        ${esc(group.name)}
      </option>
    `;

    $("adminGroupSelect").innerHTML += `
      <option value="${group.id}">
        ${esc(group.name)}
      </option>
    `;
  });
}

$("goCreateGroupButton").onclick =
  () => {
    showPage("createGroup");
  };

$("backToLoginButton").onclick =
  () => {
    showPage("login");
  };

$("homeSettingButton").onclick =
  () => {
    showPage("setting");
  };

document
  .querySelectorAll(".backHome")
  .forEach(btn => {

    btn.onclick = () => {
      showPage("home");
    };
  });

document
  .querySelectorAll(".backSetting")
  .forEach(btn => {

    btn.onclick = () => {
      showPage("setting");
    };
  });

document
  .querySelectorAll(".backOrder")
  .forEach(btn => {

    btn.onclick = async () => {

      await openPage(
        "order",
        renderOrderPage
      );
    };
  });

$("homeOrderButton").onclick =
  async () => {

    await openPage(
      "order",
      renderOrderPage
    );
  };

$("homeReceiveButton").onclick =
  async () => {

    await openPage(
      "receive",
      renderReceivePage
    );
  };

$("homeHistoryButton").onclick =
  async () => {

    await openPage(
      "history",
      renderHistoryPage
    );
  };

$("homeListButton").onclick =
  async () => {

    focusedMenuId = "";

    $("search").value = "";

    await openPage(
      "list",
      renderMenus
    );
  };

$("settingRegisterButton").onclick =
  () => {

    resetRegisterForm();

    showPage("register");
  };

$("settingOptionButton").onclick =
  async () => {

    await openPage(
      "option",
      renderOptionManagePage
    );
  };

$("settingTableButton").onclick =
  async () => {

    await openPage(
      "table",
      renderTableManagePage
    );
  };

$("settingNameButton").onclick =
  async () => {

    await openPage(
      "name",
      renderOrderNameManagePage
    );
  };

$("settingAdminButton").onclick =
  async () => {

    await renderGroupOptions();

    showPage("admin");
  };

document
  .querySelectorAll(".navOrder")
  .forEach(btn => {

    btn.onclick = async () => {

      await openPage(
        "order",
        renderOrderPage
      );
    };
  });

document
  .querySelectorAll(".navReceive")
  .forEach(btn => {

    btn.onclick = async () => {

      await openPage(
        "receive",
        renderReceivePage
      );
    };
  });

document
  .querySelectorAll(".navHistory")
  .forEach(btn => {

    btn.onclick = async () => {

      await openPage(
        "history",
        renderHistoryPage
      );
    };
  });

document
  .querySelectorAll(".navList")
  .forEach(btn => {

    btn.onclick = async () => {

      focusedMenuId = "";

      $("search").value = "";

      await openPage(
        "list",
        renderMenus
      );
    };
  });

$("orderEmergencyButton").onclick =
  async () => {

    await openPage(
      "emergency",
      renderEmergencyPage
    );
  };

$("logoutButton").onclick =
  () => {

    stopRealtime();

    currentGroupId = "";
    currentGroupName = "";

    cart = [];

    selectedCustomerName = "";

    focusedMenuId = "";

    showPage("login");
  };

$("createGroupButton").onclick =
  async () => {

    const name =
      $("newGroupName")
        .value
        .trim();

    const password =
      $("newGroupPassword")
        .value
        .trim();

    if (!name || !password) {

      alert(
        "グループ名とパスワードを入力してください"
      );

      return;
    }

    const {
      data: exists
    } =
      await supabase
        .from("groups")
        .select("*")
        .eq("name", name);

    if (
      exists &&
      exists.length > 0
    ) {

      alert(
        "同じ名前のグループがあります"
      );

      return;
    }

    const { error } =
      await supabase
        .from("groups")
        .insert([
          {
            name,
            password
          }
        ]);

    if (error) {

      console.error(error);

      alert(
        "グループ作成失敗"
      );

      return;
    }

    $("newGroupName").value = "";
    $("newGroupPassword").value = "";

    await renderGroupOptions();

    alert(
      "グループを作成しました"
    );

    showPage("login");
  };

$("loginButton").onclick =
  async () => {

    const groupId =
      $("groupSelect").value;

    const password =
      $("groupPassword")
        .value
        .trim();

    if (
      !groupId ||
      !password
    ) {

      alert(
        "グループとパスワードを入力してください"
      );

      return;
    }

    const {
      data,
      error
    } =
      await supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .single();

    if (
      error ||
      !data
    ) {

      console.error(error);

      alert(
        "グループが見つかりません"
      );

      return;
    }

    if (
      data.password !== password
    ) {

      alert(
        "パスワードが違います"
      );

      return;
    }

    currentGroupId =
      String(data.id);

    currentGroupName =
      data.name;

    $("currentGroupText")
      .textContent =
        "現在のグループ：" +
        currentGroupName;

    $("groupPassword").value = "";

    startRealtime();

    showPage("home");
  };

$("changeGroupPasswordButton").onclick =
  async () => {

    if (
      $("adminPassword")
        .value
        .trim() !== ADMIN_PASSWORD
    ) {

      alert(
        "管理人パスワードが違います"
      );

      return;
    }

    const groupId =
      $("adminGroupSelect").value;

    const newPass =
      $("newPasswordForGroup")
        .value
        .trim();

    if (
      !groupId ||
      !newPass
    ) {

      alert(
        "入力してください"
      );

      return;
    }

    const
