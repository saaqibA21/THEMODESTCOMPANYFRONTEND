const API = "http://localhost:5000";

/* ---------------- AUTH ---------------- */
function login() {
  const key = loginKey.value.trim();
  if (!key) return;

  sessionStorage.setItem("ADMIN_KEY", key);
  checkAuth();
}

function logout() {
  sessionStorage.removeItem("ADMIN_KEY");
  location.reload();
}

function checkAuth() {
  const key = sessionStorage.getItem("ADMIN_KEY");
  if (!key) return;

  // test admin access
  fetch(`${API}/api/admin/products`, {
    headers: { "x-admin-key": key }
  })
  .then(res => {
    if (!res.ok) throw new Error("Unauthorized");
    loginScreen.style.display = "none";
    dashboard.style.display = "block";
    loadProducts();
    loadAnalytics();
  })
  .catch(() => {
    loginError.innerText = "Invalid admin key";
    sessionStorage.removeItem("ADMIN_KEY");
  });
}

function headers() {
  return {
    "Content-Type": "application/json",
    "x-admin-key": sessionStorage.getItem("ADMIN_KEY")
  };
}

/* ---------------- PRODUCTS ---------------- */
async function addProduct() {
  const body = {
    title: title.value,
    price: Number(price.value),
    category: category.value,
    stock: Number(stock.value),
    description: description.value
  };

  const res = await fetch(`${API}/api/admin/products`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body)
  });

  const data = await res.json();
  status.innerText = res.ok ? "Product added" : data.error || "Error";
  loadProducts();
}

async function loadProducts() {
  const res = await fetch(`${API}/api/admin/products`, {
    headers: headers()
  });
  const products = await res.json();

  productRows.innerHTML = "";
  products.forEach(p => {
    productRows.innerHTML += `
      <tr>
        <td>${p.title}</td>
        <td>${p.category}</td>
        <td>₹${p.price}</td>
        <td><button class="danger" onclick="del('${p._id}')">Delete</button></td>
      </tr>
    `;
  });
}

async function del(id) {
  await fetch(`${API}/api/admin/products/${id}`, {
    method: "DELETE",
    headers: headers()
  });
  loadProducts();
}

/* ---------------- ANALYTICS ---------------- */
async function loadAnalytics() {
  const range = rangeSelect.value;
  const res = await fetch(`${API}/api/admin/analytics?range=${range}`, {
    headers: headers()
  });

  const d = await res.json();
  statRevenue.innerText = `₹${d.revenue}`;
  statOrders.innerText = d.totalOrders;
  statTop.innerText = d.topProducts[0]?.title || "—";
}

/* ---------------- INIT ---------------- */
checkAuth();
