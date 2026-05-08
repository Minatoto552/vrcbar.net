const STORAGE_KEY = "vrcCocktailMenu";

const form = document.getElementById("cocktailForm");
const menuList = document.getElementById("menuList");
const search = document.getElementById("search");

function loadMenus() {

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

  const keyword =
    search.value.toLowerCase();

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

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

search.addEventListener(
  "input",
  renderMenus
);

renderMenus();