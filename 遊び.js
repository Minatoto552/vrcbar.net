import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://rsjeyuvhppajxsgmgqbp.supabase.co";
const supabaseKey = "sb_publishable_tZWRzd0lcS3mJKcWdKZtbw_TPNs5AFp";

const supabase = createClient(
  supabaseUrl,
  supabaseKey
);

const ADMIN_PASSWORD = "1112";

let currentGroupId = "";
let currentGroupName = "";

let cart = [];

let optionGroupsCache = [];
let optionChoicesCache = [];

let selectedUserName = "";
let selectedUserIcon = "";

let focusedMenuId = "";

const $ = id =>
  document.getElementById(id);

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
  announcement: $("announcementPage")
};

function showPage(name){

  Object.values(pages).forEach(page=>{
    if(page){
      page.classList.remove("active");
    }
  });

  if(pages[name]){
    pages[name].classList.add("active");
  }
}

function esc(text){

  return String(text ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function getUserStorageKey(){

  return currentGroupId
    ? `vrc_bar_user_${currentGroupId}`
    : "vrc_bar_user";
}

function setSelectedUser(name, icon=""){

  selectedUserName = name || "";
  selectedUserIcon = icon || "";

  localStorage.setItem(
    getUserStorageKey(),
    JSON.stringify({
      name:selectedUserName,
      icon:selectedUserIcon
    })
  );

  if($("globalUserSelect")){
    $("globalUserSelect").value =
      selectedUserName;
  }

  if($("orderUserText")){
    $("orderUserText").textContent =
      selectedUserName || "未選択";
  }

  if($("receiveUserText")){
    $("receiveUserText").textContent =
      selectedUserName || "未選択";
  }

  if($("historyUserText")){
    $("historyUserText").textContent =
      selectedUserName || "未選択";
  }

  if($("announcementUserText")){
    $("announcementUserText").textContent =
      selectedUserName || "未選択";
  }

  if($("globalUserIcon")){

    if(selectedUserIcon){

      $("globalUserIcon").src =
        selectedUserIcon;

      $("globalUserIcon").style.display =
        "block";

    }else{

      $("globalUserIcon").style.display =
        "none";
    }
  }
}

async function loadGroups(){

  const { data, error } =
    await supabase
      .from("groups")
      .select("*");

  if(error){
    console.error(error);
    return [];
  }

  return data || [];
}

async function renderGroupOptions(){

  const groups =
    await loadGroups();

  $("groupSelect").innerHTML =
    `<option value="">グループを選択してください</option>`;

  $("adminGroupSelect").innerHTML =
    `<option value="">グループを選択してください</option>`;

  groups.forEach(group=>{

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

$("goCreateGroupButton").onclick = ()=>{
  showPage("createGroup");
};

$("backToLoginButton").onclick = ()=>{
  showPage("login");
};

$("createGroupButton").onclick =
async ()=>{

  const name =
    $("newGroupName").value.trim();

  const password =
    $("newGroupPassword").value.trim();

  if(!name || !password){

    alert("入力してください");
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

  if(error){

    console.error(error);
    alert("作成失敗");
    return;
  }

  alert("作成しました");

  $("newGroupName").value = "";
  $("newGroupPassword").value = "";

  await renderGroupOptions();

  showPage("login");
};

$("loginButton").onclick =
async ()=>{

  const groupId =
    $("groupSelect").value;

  const password =
    $("groupPassword").value.trim();

  if(!groupId || !password){

    alert("入力してください");
    return;
  }

  const { data, error } =
    await supabase
      .from("groups")
      .select("*")
      .eq("id",groupId)
      .single();

  if(error || !data){

    console.error(error);
    alert("取得失敗");
    return;
  }

  if(data.password !== password){

    alert("パスワードが違います");
    return;
  }

  currentGroupId =
    String(data.id);

  currentGroupName =
    data.name;

  $("currentGroupText").textContent =
    "現在のグループ：" +
    currentGroupName;

  document.body.classList.add(
    "logged-in"
  );

  $("globalUserBox").classList.remove(
    "hidden"
  );

  await renderNameSelects();

  showPage("home");
};

$("logoutButton").onclick = ()=>{

  currentGroupId = "";
  currentGroupName = "";

  cart = [];

  showPage("login");

  document.body.classList.remove(
    "logged-in"
  );

  $("globalUserBox").classList.add(
    "hidden"
  );
};

$("homeOrderButton").onclick =
async ()=>{

  await renderOrderPage();

  showPage("order");
};

$("homeReceiveButton").onclick =
async ()=>{

  await renderReceivePage();

  showPage("receive");
};

$("homeHistoryButton").onclick =
async ()=>{

  await renderHistoryPage();

  showPage("history");
};

$("homeListButton").onclick =
async ()=>{

  focusedMenuId = "";

  $("search").value = "";

  await renderMenus();

  showPage("list");
};

$("homeSettingButton").onclick =
()=>{
  showPage("setting");
};

document.querySelectorAll(
  ".backHome"
).forEach(btn=>{

  btn.onclick = ()=>{
    showPage("home");
  };
});

document.querySelectorAll(
  ".backSetting"
).forEach(btn=>{

  btn.onclick = ()=>{
    showPage("setting");
  };
});

async function loadOrderNames(){

  const { data, error } =
    await supabase
      .from("order_names")
      .select("*")
      .eq(
        "group_id",
        currentGroupId
      );

  if(error){

    console.error(error);
    return [];
  }

  return data || [];
}

async function renderNameSelects(){

  const names =
    await loadOrderNames();

  const selectIds = [
    "globalUserSelect",
    "emergencyNameSelect"
  ];

  selectIds.forEach(id=>{

    const select = $(id);

    if(!select) return;

    select.innerHTML =
      `<option value="">
        名前を選択してください
      </option>`;

    names.forEach(item=>{

      select.innerHTML += `
        <option
          value="${esc(item.name)}"
          data-icon="${esc(item.icon || "")}"
        >
          ${esc(item.name)}
        </option>
      `;
    });

    select.onchange = ()=>{

      const option =
        select.options[
          select.selectedIndex
        ];

      const icon =
        option.dataset.icon || "";

      setSelectedUser(
        select.value,
        icon
      );
    };
  });

  const savedRaw =
    localStorage.getItem(
      getUserStorageKey()
    );

  if(savedRaw){

    try{

      const saved =
        JSON.parse(savedRaw);

      setSelectedUser(
        saved.name || "",
        saved.icon || ""
      );

    }catch{

      setSelectedUser("","");
    }
  }
}

$("addOrderNameButton").onclick =
async ()=>{

  const name =
    $("orderNameInput").value.trim();

  const icon =
    $("orderIconInput").value.trim();

  if(!name){

    alert("名前を入力してください");
    return;
  }

  const { error } =
    await supabase
      .from("order_names")
      .insert([
        {
          group_id:
            currentGroupId,
          name,
          icon
        }
      ]);

  if(error){

    console.error(error);
    alert("追加失敗");
    return;
  }

  $("orderNameInput").value = "";
  $("orderIconInput").value = "";

  await renderOrderNameManagePage();
  await renderNameSelects();
};

async function renderOrderNameManagePage(){

  const names =
    await loadOrderNames();

  if(names.length === 0){

    $("orderNameManageList").innerHTML =
      `
      <div class="manage-item">
        まだ名前がありません。
      </div>
      `;

    return;
  }

  $("orderNameManageList").innerHTML =
    names.map(item=>`

      <div class="manage-item">

        <div
          style="
            display:flex;
            align-items:center;
            gap:10px;
          "
        >

          ${
            item.icon
            ? `
              <img
                src="${esc(item.icon)}"
                style="
                  width:40px;
                  height:40px;
                  border-radius:50%;
                  object-fit:cover;
                "
              >
            `
            : ""
          }

          <span>
            ${esc(item.name)}
          </span>

        </div>

        <button
          class="delete mini"
          onclick="deleteOrderName('${item.id}')"
        >
          削除
        </button>

      </div>

    `).join("");
}

window.deleteOrderName =
async id=>{

  await supabase
    .from("order_names")
    .delete()
    .eq("id",id);

  await renderOrderNameManagePage();
  await renderNameSelects();
};

function updateClock(){

  const now =
    new Date();

  $("clockText").textContent =
    now.toLocaleTimeString(
      "ja-JP"
    );
}

setInterval(updateClock,1000);

updateClock();

await renderGroupOptions();

showPage("login");
