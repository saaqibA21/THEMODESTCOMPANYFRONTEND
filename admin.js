const API = "https://themodestcompany.onrender.com";

/* ================================
   GLOBAL STATE
================================ */
let products = [];
let uploadedImages = [];
let editingProduct = null;
let revenueChart = null;

/* ================================
   DOM READY
================================ */
document.addEventListener("DOMContentLoaded", () => {

  /* AUTH DOM */
  window.adminLoginKey = document.getElementById("adminLoginKey");
  window.loginError = document.getElementById("loginError");
  window.adminLoginOverlay = document.getElementById("adminLoginOverlay");
  window.adminWrap = document.getElementById("adminWrap");

  /* ADD PRODUCT DOM */
  window.title = document.getElementById("title");
  window.price = document.getElementById("price");
  window.stock = document.getElementById("stock");
  window.category = document.getElementById("category");
  window.description = document.getElementById("description");
  window.isFeatured = document.getElementById("isFeatured");
  window.isNewArrival = document.getElementById("isNewArrival");
  window.imageUpload = document.getElementById("imageUpload");
  window.uploadPreview = document.getElementById("uploadPreview");
  window.status = document.getElementById("status");

  /* LIST DOM */
  window.productRows = document.getElementById("productRows");
  window.searchBox = document.getElementById("searchBox");
  window.lowStock = document.getElementById("lowStock");

  /* ANALYTICS DOM */
  window.analyticsRange = document.getElementById("analyticsRange");
  window.statOrders = document.getElementById("statOrders");
  window.statRevenue = document.getElementById("statRevenue");
  window.revenueChartCanvas = document.getElementById("revenueChart");

  /* EDIT MODAL DOM */
  window.editModal = document.getElementById("editModal");
  window.e_title = document.getElementById("e_title");
  window.e_price = document.getElementById("e_price");
  window.e_stock = document.getElementById("e_stock");
  window.e_category = document.getElementById("e_category");
  window.e_description = document.getElementById("e_description");
  window.e_featured = document.getElementById("e_featured");
  window.e_new = document.getElementById("e_new");
  window.e_images = document.getElementById("e_images");
  window.e_imageUpload = document.getElementById("e_imageUpload");

  imageUpload.addEventListener("change", handleImageUpload);
  e_imageUpload.addEventListener("change", handleEditImageUpload);

  checkAuth();
});

/* ================================
   AUTH
================================ */
function getKey() {
  return sessionStorage.getItem("ADMIN_KEY");
}

function headers(json = true) {
  const h = { "x-admin-key": getKey() };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

async function adminLogin() {
  if (!adminLoginKey) return;

  const key = adminLoginKey.value.trim();
  if (!key) return;

  const res = await fetch(`${API}/api/admin/products`, {
    headers: { "x-admin-key": key }
  });

  if (!res.ok) {
    loginError.innerText = "Invalid admin key";
    return;
  }

  sessionStorage.setItem("ADMIN_KEY", key);
  adminLoginOverlay.style.display = "none";
  adminWrap.style.display = "block";

  loadProducts();
  loadAnalytics();
}

function checkAuth() {
  const key = getKey();
  if (!key) return;

  fetch(`${API}/api/admin/products`, {
    headers: { "x-admin-key": key }
  })
    .then(res => {
      if (!res.ok) throw new Error();
      adminLoginOverlay.style.display = "none";
      adminWrap.style.display = "block";
      loadProducts();
      loadAnalytics();
    })
    .catch(() => sessionStorage.removeItem("ADMIN_KEY"));
}

/* ================================
   IMAGE UPLOAD
================================ */
async function handleImageUpload(e) {
  uploadedImages = await uploadImages(e.target.files, uploadPreview);
}

async function handleEditImageUpload(e) {
  const imgs = await uploadImages(e.target.files);
  editingProduct.images.push(...imgs);
  renderEditImages();
}

async function uploadImages(files, previewEl) {
  const fd = new FormData();
  [...files].forEach(f => fd.append("images", f));

  const res = await fetch(`${API}/api/admin/upload`, {
    method: "POST",
    headers: { "x-admin-key": getKey() },
    body: fd
  });

  const data = await res.json();
  const imgs = data.images || [];

  if (previewEl) {
    previewEl.innerHTML = "";
    imgs.forEach(i => {
      const img = document.createElement("img");
      img.src = i.url;
      img.className = "miniimg";
      previewEl.appendChild(img);
    });
  }

  return imgs;
}

/* ================================
   ADD PRODUCT
================================ */
async function addProduct() {
  status.innerText = "Saving...";

  const body = {
    title: title.value.trim(),
    price: Number(price.value),
    stock: Number(stock.value),
    category: String(category.value),
    description: description.value.trim(),
    images: uploadedImages,
    isFeatured: Boolean(isFeatured.checked),
    isNewArrival: Boolean(isNewArrival.checked)
  };

  const res = await fetch(`${API}/api/admin/products`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body)
  });

  status.innerText = res.ok ? "Added ✅" : "Error";
  if (res.ok) loadProducts();
}

/* ================================
   PRODUCTS
================================ */
async function loadProducts() {
  const res = await fetch(`${API}/api/admin/products`, {
    headers: headers(false)
  });
  products = await res.json();
  renderProducts();
}

function renderProducts() {
  const q = searchBox.value.toLowerCase();
  const th = Number(lowStock.value || 0);

  productRows.innerHTML = "";

  products
    .filter(p => !q || p.title.toLowerCase().includes(q))
    .filter(p => !th || p.stock <= th)
    .forEach(p => {
      productRows.innerHTML += `
        <tr>
          <td>${p.images?.[0] ? `<img class="miniimg" src="${p.images[0].url}">` : "—"}</td>
          <td>${p.title}</td>
          <td>₹${p.price}</td>
          <td>${p.stock}</td>
          <td>
            <span class="toggle ${p.isFeatured ? "on" : ""}" onclick="toggleFlag('${p._id}','isFeatured')">Featured</span>
            <span class="toggle ${p.isNewArrival ? "on" : ""}" onclick="toggleFlag('${p._id}','isNewArrival')">New</span>
          </td>
          <td>
            <button class="btn" onclick="openEdit('${p._id}')">Edit</button>
            <button class="danger" onclick="del('${p._id}')">Delete</button>
          </td>
        </tr>
      `;
    });
}

/* ================================
   EDIT PRODUCT
================================ */
function openEdit(id) {
  editingProduct = products.find(p => p._id === id);
  e_title.value = editingProduct.title;
  e_price.value = editingProduct.price;
  e_stock.value = editingProduct.stock;
  e_category.value = editingProduct.category;
  e_description.value = editingProduct.description || "";
  e_featured.checked = !!editingProduct.isFeatured;
  e_new.checked = !!editingProduct.isNewArrival;
  renderEditImages();
  editModal.style.display = "flex";
}

function renderEditImages() {
  e_images.innerHTML = "";
  editingProduct.images.forEach((img, i) => {
    e_images.innerHTML += `
      <div class="img-chip">
        <img src="${img.url}">
        <button onclick="editingProduct.images.splice(${i},1);renderEditImages()">×</button>
      </div>
    `;
  });
}

async function saveEdit() {
  await fetch(`${API}/api/admin/products/${editingProduct._id}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({
      title: e_title.value,
      price: Number(e_price.value),
      stock: Number(e_stock.value),
      category: e_category.value,
      description: e_description.value,
      images: editingProduct.images,
      isFeatured: e_featured.checked,
      isNewArrival: e_new.checked
    })
  });
  editModal.style.display = "none";
  loadProducts();
}

/* ================================
   ANALYTICS
================================ */
async function loadAnalytics() {
  const res = await fetch(
    `${API}/api/admin/analytics?range=${analyticsRange.value}`,
    { headers: headers(false) }
  );

  const d = await res.json();

  statOrders.innerText = d.totalOrders || 0;
  statRevenue.innerText = (d.totalRevenue || 0).toLocaleString("en-IN");

  if (revenueChart) revenueChart.destroy();
  revenueChart = new Chart(revenueChartCanvas, {
    type: "bar",
    data: {
      labels: ["Revenue"],
      datasets: [{ data: [d.totalRevenue || 0], backgroundColor: "#c9a24d" }]
    },
    options: { plugins: { legend: { display: false } } }
  });
}
