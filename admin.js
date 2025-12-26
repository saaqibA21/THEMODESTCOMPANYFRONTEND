const API = "https://themodestcompany.onrender.com";

document.addEventListener("DOMContentLoaded", () => {

  window.adminLoginKey = document.getElementById("adminLoginKey");
  window.loginError = document.getElementById("loginError");
  window.adminLoginOverlay = document.getElementById("adminLoginOverlay");
  window.adminWrap = document.getElementById("adminWrap");

  checkAuth();
});


/* ================================
   GLOBAL STATE
================================ */
let products = [];
let uploadedImages = [];
let editingProduct = null;
let revenueChart = null;



/* ================================
   DOM REFERENCES
================================ */
const revenueChartCanvas = document.getElementById("revenueChart");

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

function logout() {
  sessionStorage.removeItem("ADMIN_KEY");
  location.reload();
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
    .catch(() => {
      sessionStorage.removeItem("ADMIN_KEY");
    });
}

/* ================================
   IMAGE UPLOAD (CLOUDINARY)
================================ */
async function uploadImages(files, previewEl) {
  const fd = new FormData();
  [...files].forEach(f => fd.append("images", f));

  const res = await fetch(`${API}/api/admin/upload`, {
    method: "POST",
    headers: { "x-admin-key": getKey() },
    body: fd
  });

  if (!res.ok) throw new Error("Image upload failed");

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
imageUpload.addEventListener("change", async e => {
  if (!e.target.files.length) return;
  uploadedImages = await uploadImages(e.target.files, uploadPreview);
});

async function addProduct() {
  try {
    status.innerText = "Saving...";

    const body = {
      title: title.value.trim(),
      price: Number(price.value),
      stock: Number(stock.value),

      // ✅ CRITICAL FIXES
      category: String(category.value),
      isFeatured: Boolean(isFeatured.checked),
      isNewArrival: Boolean(isNewArrival.checked),

      description: description.value.trim(),
      images: uploadedImages
    };

    if (!body.title || !body.price || !body.category) {
      status.innerText = "Missing required fields";
      return;
    }

    const res = await fetch(`${API}/api/admin/products`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      status.innerText = "Error saving product";
      return;
    }

    status.innerText = "Added ✅";

    uploadedImages = [];
    uploadPreview.innerHTML = "";
    imageUpload.value = "";
    title.value = "";
    price.value = "";
    stock.value = "";
    description.value = "";
    isFeatured.checked = false;
    isNewArrival.checked = false;

    loadProducts();
  } catch {
    status.innerText = "Server error";
  }
}

/* ================================
   LOAD + RENDER PRODUCTS
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
  const threshold = Number(lowStock.value || 0);

  productRows.innerHTML = "";

  products
    .filter(p => !q || p.title.toLowerCase().includes(q))
    .filter(p => !threshold || p.stock <= threshold)
    .forEach(p => {
      const img = p.images?.[0]?.url || "";

      productRows.innerHTML += `
        <tr>
          <td>${img ? `<img src="${img}" class="miniimg">` : "—"}</td>
          <td>${p.title}</td>
          <td>${p.category}</td>
          <td>₹${p.price}</td>
          <td>${p.stock}</td>
          <td>
            <span class="toggle ${p.isFeatured ? "on" : ""}"
              onclick="toggleFlag('${p._id}','isFeatured')">Featured</span>
            <span class="toggle ${p.isNewArrival ? "on" : ""}"
              onclick="toggleFlag('${p._id}','isNewArrival')">New</span>
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
   DELETE
================================ */
async function del(id) {
  if (!confirm("Delete product?")) return;

  await fetch(`${API}/api/admin/products/${id}`, {
    method: "DELETE",
    headers: headers(false)
  });

  loadProducts();
}

/* ================================
   FEATURE / NEW TOGGLES
================================ */
async function toggleFlag(id, field) {
  const p = products.find(x => x._id === id);
  p[field] = !p[field];

  await fetch(`${API}/api/admin/products/${id}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({ [field]: Boolean(p[field]) })
  });

  renderProducts();
}

/* ================================
   EDIT PRODUCT
================================ */
function openEdit(id) {
  editingProduct = products.find(p => p._id === id);
  if (!editingProduct) return;

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

function closeEdit() {
  editModal.style.display = "none";
}

function renderEditImages() {
  e_images.innerHTML = "";
  editingProduct.images.forEach((img, i) => {
    e_images.innerHTML += `
      <div class="img-chip">
        <img src="${img.url}">
        <button onclick="removeEditImage(${i})">×</button>
      </div>
    `;
  });
}

function removeEditImage(i) {
  editingProduct.images.splice(i, 1);
  renderEditImages();
}

e_imageUpload.addEventListener("change", async e => {
  if (!e.target.files.length) return;
  const imgs = await uploadImages(e.target.files);
  editingProduct.images.push(...imgs);
  renderEditImages();
});

async function saveEdit() {
  if (!editingProduct) return;

  await fetch(`${API}/api/admin/products/${editingProduct._id}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({
      title: e_title.value.trim(),
      price: Number(e_price.value),
      stock: Number(e_stock.value),
      category: String(e_category.value),
      description: e_description.value.trim(),
      images: editingProduct.images,
      isFeatured: Boolean(e_featured.checked),
      isNewArrival: Boolean(e_new.checked)
    })
  });

  closeEdit();
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
      datasets: [{
        data: [d.totalRevenue || 0],
        backgroundColor: "#c9a24d"
      }]
    },
    options: {
      plugins: { legend: { display: false } }
    }
  });
}

/* ================================
   INIT
================================ */
checkAuth();
