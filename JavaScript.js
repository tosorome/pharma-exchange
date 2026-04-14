// استدعاء بيانات Google Apps Script
google.charts.load("current", { packages: ["table"] });
google.charts.setOnLoadCallback(handleData);


function handleData() {
    // جلب البيانات من الملف المحلي الذي سيقوم الأكشن بتحديثه
    fetch('./data.json')
      .then((response) => {
        if (!response.ok) throw new Error("لم يتم العثور على ملف البيانات");
        return response.json();
      })
      .then((data) => {
        console.log("تم تحميل البيانات بنجاح، عدد الأصناف:", data.length);
        initializeDataTable(data);
      })
      .catch((error) => {
        console.error("خطأ:", error);
        alert("عذراً، تعذر تحميل قائمة الأدوية حالياً.");
      });
}

// استدعاء الدالة عند تحميل الصفحة مباشرة
document.addEventListener('DOMContentLoaded', handleData);
  

function handleProductQueryResponse(response) {
  if (response.isError()) {
    console.error(
      "Error in query: " +
        response.getMessage() +
        " " +
        response.getDetailedMessage()
    );
    return;
  }

  var data = response.getDataTable();
  var rows = [];

  // إنشاء الصفوف
  for (var i = 0; i < data.getNumberOfRows(); i++) {
    var row = [];
    for (var j = 0; j < 5; j++) {
      row.push(data.getValue(i, j));
    }
    // إضافة زر الطلب
    row.push(
      "<button class='order-button' onclick='openOrderModal(this)'>طلب</button>"
    );
    rows.push(row);
  }

    // تخزين البيانات في SessionStorage
    sessionStorage.setItem("productData", JSON.stringify(rows));

    // تهيئة DataTables
    initializeDataTable(rows);

}

function initializeDataTable(rows) {
    $(document).ready(function () {
      // مسح الجدول القديم إذا كان موجوداً لتجنب التكرار
      if ($.fn.DataTable.isDataTable('#productTable')) {
          $('#productTable').DataTable().destroy();
      }

      $("#productTable").DataTable({
        data: rows,
        pageLength: 50,
        order: [[0, "desc"]],
        columns: [
  { data: "ID", title: "ID", visible: false }, 
  { data: "Date", title: "الانتهاء" }, // لاحظ استخدمنا Date بدل Ex
  { data: "Product Name", title: "الصنف" }, // لاحظ استخدمنا Product Name
  { data: "Qty", title: "الكمية" }, // لاحظ استخدمنا Qty
  { data: "Price", title: "السعر" },
  { 
    data: null, 
    title: "طلب", 
    orderable: false,
    render: function (data, type, row) {
      return "<button class='order-button' onclick='openOrderModal(this)'>طلب</button>";
    }
  },
],
        language: {
          url: "https://cdn.datatables.net/plug-ins/1.13.6/i18n/ar.json",
        },
      });
    });
}


// فتح نافذة الطلب
function openOrderModal(button) {
   
    const table = $('#productTable').DataTable();
    const rowData = table.row($(button).parents('tr')).data();

    // نستخدم نفس الأسماء الموجودة في الإكسل
    const productID = rowData["ID"];
    const productName = rowData["Product Name"];
    const productPrice = rowData["Price"];
    const productDate = rowData["Date"];
    const availableQuantity = parseInt(rowData["Qty"]);

    // تعبئة البيانات في المودال (النافذة)
    document.getElementById("modalProductDate").innerText = `الانتهاء: ${productDate}`;
    document.getElementById("modalProductName").innerText = productName;
    
    const orderModal = document.getElementById("orderModal");
    orderModal.dataset.price = productPrice; 
    orderModal.dataset.availableQuantity = availableQuantity;
    orderModal.dataset.id = productID; // تخزين الـ ID أيضاً لضمان الدقة

    // إظهار النافذة
    orderModal.style.display = "block";
    document.getElementById("overlay").classList.add("show");
    document.getElementById("quantity").value = 1;
    document.getElementById("quantityError").style.display = 'none'; 
}

// إغلاق النافذة
function closeModal() {
  document.getElementById("orderModal").style.display = "none";
  document.getElementById("overlay").classList.remove("show");
}

// إضافة الطلب
function addToOrder() {
  const orderModal = document.getElementById("orderModal");

  const productDate = document.getElementById("modalProductDate").innerText.replace("Date: ", ""); // افترض أن تاريخ المنتج موجود هنا
  const availableQuantity = parseInt(orderModal.dataset.availableQuantity); // الكمية المتوفرة
         console.log(" الكمية المتوفرة:", availableQuantity);

  const selectedProduct = document.getElementById("modalProductName").innerText;
  // const quantity = parseInt(document.getElementById("quantity").value);
  // const price = parseFloat(document.getElementById("orderModal").dataset.price);
    const quantityInput = document.getElementById("quantity");
  const requestedQuantity = parseInt(quantityInput.value); // الكمية المطلوبة

  const price = parseFloat(orderModal.dataset.price);

  const totalPrice = requestedQuantity * price;

  // إضافة الطلب إلى localStorage
  let orders = JSON.parse(localStorage.getItem("orders")) || [];

  let productExists = false;

 // **منطق التحقق الجديد: التحقق اذا كانت الكمية المطلوبة متوفرة **
//   if (requestedQuantity > availableQuantity) {
//     // عرض رسالة الخطأ
//     const errorElement = document.getElementById("quantityError");
//     errorElement.innerText = `الكمية المطلوبة (${requestedQuantity}) أكبر من المتوفرة (${availableQuantity}).`;
//     errorElement.style.display = 'block';
//     
//     // إعادة الكمية إلى الحد الأقصى المتوفر أو 1 إذا كان المتوفر 0
//     quantityInput.value = availableQuantity > 0 ? availableQuantity : 1;
//     
//     return; // إيقاف الدالة ومنع الإضافة
//   } else {
//     // إخفاء رسالة الخطأ إذا كان التحقق ناجحاً
//     document.getElementById("quantityError").style.display = 'none';
//   }


  let hasError = false; // علم جديد لتتبع حدوث خطأ ومنع الإغلاق

  // **منطق التحقق الجديد والمعدل (يشمل الكمية السابقة):**
  orders = orders.map((order) => {
    if (order.name === selectedProduct && order.date === productDate) {
      // وجدنا طلباً سابقاً لنفس الصنف بنفس التاريخ
      const currentTotalQuantity = order.quantity;
      const newTotalQuantity = currentTotalQuantity + requestedQuantity;
         console.log(" الكمية المتوفرة 2:", currentTotalQuantity);

      if (newTotalQuantity > availableQuantity) {
        // إذا تجاوز المجموع الكمية المتوفرة، نمنع الإضافة ونعرض رسالة خطأ
        const errorElement = document.getElementById("quantityError");
        errorElement.innerText = `مجموع طلباتك لهذا الصنف (${newTotalQuantity}) يتجاوز الكمية المتوفرة (${availableQuantity}).`;
        errorElement.style.display = 'block';
        hasError = true; // تفعيل العلم بوجود خطأ
        productExists = true; 
        return order; // نُعيد الطلب السابق دون تعديل
      }

      // إذا كان متوفراً: تحديث الكمية والإجمالي
      order.quantity = newTotalQuantity;
      order.totalPrice = order.quantity * order.price;
      productExists = true;
    }
    return order;
  });
  
  // ******************************************************
  // FIX: إذا حدث خطأ أثناء تحديث طلب موجود، نتوقف فوراً ونترك النافذة مفتوحة
  if (hasError) {
    return; 
  }
  // ******************************************************

  // إذا لم يكن المنتج بنفس التاريخ موجودًا، أضف طلبًا جديدًا
  if (!productExists) {
        // تحقق بسيط للكمية المطلوبة حديثاً
    if (requestedQuantity > availableQuantity) {
      // إذا كانت الكمية المطلوبة حديثاً أكبر من المتوفرة
      const errorElement = document.getElementById("quantityError");
      errorElement.innerText = `الكمية المطلوبة (${requestedQuantity}) أكبر من المتوفرة (${availableQuantity}).`;
      errorElement.style.display = 'block';
 
   quantityInput.value = availableQuantity > 0 ? availableQuantity : 1;

      return; // إيقاف الدالة ومنع الإضافة
    }

    const newOrder = {
      date: productDate, // إضافة تاريخ المنتج للطلب الجديد
      name: selectedProduct,
      quantity: requestedQuantity,
      price: price,
      totalPrice: totalPrice,
    };
    orders.push(newOrder);
    addOrderToTable(newOrder);
  } else {
    // تحديث الجدول إذا تم تعديل الكمية
    updateOrderTable(orders);
  }

  localStorage.setItem("orders", JSON.stringify(orders));

  closeModal();
  document.getElementById("orderListTitle").style.display = "";
}

// إضافة الطلب إلى الجدول
function addOrderToTable(order) {
  const orderTable = document
    .getElementById("orderTable")
    .getElementsByTagName("tbody")[0];
  const newRow = orderTable.insertRow(0);

  const dateCell = newRow.insertCell(0);
  const nameCell = newRow.insertCell(1);
  const quantityCell = newRow.insertCell(2);
  const priceCell = newRow.insertCell(3);
  const totalCell = newRow.insertCell(4);
  const actionCell = newRow.insertCell(5);

  dateCell.innerText = order.date;
  nameCell.innerText = order.name;
  quantityCell.innerText = order.quantity;
  if (
    order.price === null ||
    order.price === undefined ||
    order.price === "" ||
    isNaN(order.price)
  ) {
    priceCell.innerText = 0; // أو أي قيمة افتراضية
  } else {
    priceCell.innerText = order.price.toFixed(0);
  }

  //priceCell.innerText = order.price.toFixed(2);
  if (
    order.totalPrice === null ||
    order.price === undefined ||
    order.price === "" ||
    isNaN(order.price)
  ) {
    totalCell.innerText = 0; // أو أي قيمة افتراضية
  } else {
    totalCell.innerText = order.totalPrice.toFixed(0);
  }

  // totalCell.innerText = order.totalPrice.toFixed(2);
  actionCell.innerHTML =
    "<button class='order-button-red' onclick='cancelOrder(this)'>×</button>";

  updateTotal();
}

// الدالة لزيادة الكمية
function increment() {
  let quantityInput = document.getElementById("quantity");
  quantityInput.value = parseInt(quantityInput.value) + 1;
}

// الدالة لنقص الكمية
function decrement() {
  let quantityInput = document.getElementById("quantity");
  if (quantityInput.value > 1) {
    quantityInput.value = parseInt(quantityInput.value) - 1;
  }
}

// تحديث الجدول إذا تم تعديل الكمية
function updateOrderTable(orders) {
  const orderTable = document
    .getElementById("orderTable")
    .getElementsByTagName("tbody")[0];
  orderTable.innerHTML = ""; // مسح الجدول

  // إعادة إضافة الطلبات المحدثة إلى الجدول
  orders.forEach((order) => {
    addOrderToTable(order);
  });
}

// تحميل الطلبات المحفوظة عند تحميل الصفحة
window.onload = function () {
  loadOrders();
};

// تحميل الطلبات من localStorage
function loadOrders() {
  const orders = JSON.parse(localStorage.getItem("orders")) || [];
  if (orders.length > 0) {
    document.getElementById("orderListTitle").style.display = "";

    orders.forEach((order) => addOrderToTable(order));
  }
}

// إلغاء الطلب
function cancelOrder(button) {
  const row = button.parentNode.parentNode;
  const productName = row.cells[1].innerText;

  // حذف الطلب من الجدول
  row.parentNode.removeChild(row);

  // حذف الطلب من localStorage
  let orders = JSON.parse(localStorage.getItem("orders")) || [];
  orders = orders.filter((order) => order.name !== productName);
  localStorage.setItem("orders", JSON.stringify(orders));

  // إخفاء الجدول إذا لم يكن هناك طلبات
  if (orders.length === 0) {
    document.getElementById("orderListTitle").style.display = "none";
  } else {
    updateTotal();
  }
}

function cancelAllOrders() {
  const orderTable = document
    .getElementById("orderTable")
    .getElementsByTagName("tbody")[0];

  // حذف جميع الصفوف
  while (orderTable.rows.length > 0) {
    orderTable.deleteRow(0);
  }

  // حذف البيانات من localStorage
  localStorage.removeItem("orders");

  // اخفاء جدول الطلبات
  document.getElementById("orderListTitle").style.display = "none";

  /* عدد الطلبات في السلة */ document.getElementById("cart-count").textContent =
    orderTable.rows.length;
}

// دالة لحساب الإجمالي
function updateTotal() {
  const orderTable = document
    .getElementById("orderTable")
    .getElementsByTagName("tbody")[0];
  const rows = orderTable.getElementsByTagName("tr");
  let totalSum = 0;

  // جمع جميع القيم في عمود الإجمالي
  for (let row of rows) {
    const totalCell = row.cells[4]; // إجمالي السعر في العمود الخامس
    if (totalCell) {
      totalSum += parseFloat(totalCell.innerText); // إضافة قيمة كل صف إلى المجموع
    }
  }

  // تحديث أو إضافة صف الإجمالي
  let totalRow = document.getElementById("totalRow");
  if (!totalRow) {
    // إذا لم يكن هناك صف إجمالي، أنشئ صفاً جديداً
    totalRow = document.createElement("tr");
    totalRow.id = "totalRow";

    const totalLabelCell = document.createElement("td");
    totalLabelCell.colSpan = 4; // دمج 4 خلايا لتكون صف الإجمالي
    totalLabelCell.innerText = "الإجمالي:";
    totalRow.appendChild(totalLabelCell);

    const totalAmountCell = document.createElement("td");
    totalAmountCell.id = "totalAmount";
    totalAmountCell.innerText = totalSum.toFixed(2);
    totalRow.appendChild(totalAmountCell);

    orderTable.appendChild(totalRow);
  } else {
    // إذا كان الصف الإجمالي موجودًا، حدّث قيمته
    const totalAmountCell = document.getElementById("totalAmount");
    if (totalAmountCell) {
      totalAmountCell.innerText = totalSum.toFixed(2);
    }
  }

  /* عدد الطلبات في السلة */ document.getElementById("cart-count").textContent =
    rows.length - 1;
}

// ارسال الطلبات عبر الواتس
function sendOrderViaWhatsApp() {
  let orders = JSON.parse(localStorage.getItem("orders")) || [];

  if (orders.length === 0) {
    alert("لا يوجد طلبات لإرسالها.");
    return;
  }

  // let message = 'تفاصيل الطلب:\n';
  // orders.forEach(order => {
  //     // message += `المنتج: ${order.name}, الكمية: ${order.quantity}, السعر: ${order.price.toFixed(2)}, الإجمالي: ${order.totalPrice.toFixed(2)}\n`;
  //     message += `المنتج: ${order.name}, الكمية: ${order.quantity}, السعر: ${(order.price !== null && order.price !== undefined) ? order.price.toFixed(2) : 'N/A'}, الإجمالي: ${(order.totalPrice !== null && order.totalPrice !== undefined) ? order.totalPrice.toFixed(2) : 'N/A'}\n`;

  // });
  let message = "الاسم      | الكمية | السعر  | الإجمالي \n";
  message += "--------------------------------------------\n";

  orders.forEach((order) => {
    // let price = parseFloat(order.price).toString(); // حذف الأصفار غير الضرورية
    // let totalPrice = parseFloat(order.totalPrice).toString(); // حذف الأصفار غير الضرورية
    let price = isNaN(parseFloat(order.price)) ? "" : parseFloat(order.price).toFixed(2);
    let totalPrice = isNaN(parseFloat(order.totalPrice)) ? "" : parseFloat(order.totalPrice).toFixed(2);

    message += `${order.name.padEnd(10)} | ${order.quantity
      .toString()
      .padEnd(6)} | ${price.padEnd(7)} | ${totalPrice.padEnd(7)}\n`;
  });

  // حساب الإجمالي النهائي
  let totalSum = orders.reduce((sum, order) => sum + order.totalPrice, 0);
  message += `\nالإجمالي الكلي: ${totalSum.toFixed(2)} ريال`;

  // تحويل النص إلى URI
  const encodedMessage = encodeURIComponent(message);
  const whatsappNumber = "770963942"; // قم بإضافة رقمك بدون علامة +

  // بناء رابط الواتساب
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;

  // فتح رابط الواتساب
  window.open(whatsappLink, "_blank");
}

/* عند الضغط على السلة يمرر الى جدول الطلبات*/
document.getElementById("cartButton").addEventListener("click", function () {
  const orderTable = document.getElementById("orderTable");
  orderTable.scrollIntoView({ behavior: "smooth" });
});
