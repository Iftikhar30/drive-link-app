/* app.js  
   Secure Drive File Manager (SDFM)  
   - Uses Firebase v8 (CDN scripts loaded in index.html)  
*/

/* --------- Firebase config (Your config) --------- */
var firebaseConfig = {
  apiKey: "AIzaSyDMLkQa5ZtsezKD9BLMpQt1cmZcYThUjPs",
  authDomain: "family-photo-b81a9.firebaseapp.com",
  projectId: "family-photo-b81a9",
  storageBucket: "family-photo-b81a9.firebasestorage.app",
  messagingSenderId: "638306894478",
  appId: "1:638306894478:web:63e2a8600e5ffdb396ffdf"
};

firebase.initializeApp(firebaseConfig);
var auth = firebase.auth();
var db = firebase.database();

/* ---------------- Global State ---------------- */
let currentPage = "home";
let filesData = {};
let currentUser = null;

/* ------------- Page Selectors ------------- */
const homePage = document.getElementById("homePage");
const adminLoginPage = document.getElementById("adminLoginPage");
const userLoginPage = document.getElementById("userLoginPage");
const adminPanel = document.getElementById("adminPanel");
const userPanel = document.getElementById("userPanel");

const adminLoginMsg = document.getElementById("adminLoginMsg");
const userLoginMsg = document.getElementById("userLoginMsg");
const updatePasswordMsg = document.getElementById("updatePasswordMsg");
const addFileMsg = document.getElementById("addFileMsg");

const adminFileList = document.getElementById("adminFileList");
const userFileList = document.getElementById("userFileList");
const searchInput = document.getElementById("searchInput");

/* ------------ Navigation Helper ------------ */
function showSection(section) {
  [homePage, adminLoginPage, userLoginPage, adminPanel, userPanel].forEach(s => {
    if (!s) return;
    s.classList.add("hidden");
  });
  section.classList.remove("hidden");
  window.scrollTo(0, 0);
}

function showHome() { showSection(homePage); currentPage = "home"; }
function showAdminLogin() { showSection(adminLoginPage); currentPage = "adminLogin"; }
function showUserLogin() { showSection(userLoginPage); currentPage = "userLogin"; }

window.showAdminLogin = showAdminLogin;
window.showUserLogin = showUserLogin;
window.showHome = showHome;

/* =======================================================
   1️⃣ ADMIN LOGIN
======================================================= */
function adminLogin() {
  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value;

  adminLoginMsg.textContent = "";
  adminLoginMsg.className = "message";

  if (!email || !password) {
    adminLoginMsg.textContent = "Enter email and password.";
    adminLoginMsg.classList.add("error");
    return;
  }

  auth.signInWithEmailAndPassword(email, password)
    .then(userCred => {
      currentUser = userCred.user;
      loadFilesForAdmin();
      showSection(adminPanel);
    })
    .catch(err => {
      adminLoginMsg.textContent = err.message;
      adminLoginMsg.classList.add("error");
    });
}
window.adminLogin = adminLogin;

/* =======================================================
   🔥 FIXED UNIVERSAL GOOGLE DRIVE ID EXTRACTOR
======================================================= */
function extractDriveId(url) {
  // Pattern 1: /file/d/FILEID/
  let m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];

  // Pattern 2: id=FILEID
  m = url.match(/id=([a-zA-Z0-9_-]+)/);
  if (m) return m[1];

  // Pattern 3: uc?export=download&id=FILEID
  m = url.match(/id=([a-zA-Z0-9_-]+)/);
  if (m) return m[1];

  return null;
}

/* =======================================================
   2️⃣ USER LOGIN (Password Only)
======================================================= */
function userLogin() {
  const val = document.getElementById("userPasswordInput").value;

  userLoginMsg.textContent = "";
  userLoginMsg.className = "message";

  if (!val) {
    userLoginMsg.textContent = "Enter password.";
    userLoginMsg.classList.add("error");
    return;
  }

  db.ref("settings/userPassword").once("value").then(snap => {
    const stored = snap.val();

    if (val === stored) {
      loadFilesForUser();
      showSection(userPanel);
      currentPage = "userPanel";
    } else {
      userLoginMsg.textContent = "Incorrect password.";
      userLoginMsg.classList.add("error");
    }
  });
}
window.userLogin = userLogin;

/* =======================================================
   3️⃣ ADMIN: Update User Password
======================================================= */
function updateUserPassword() {
  const newPass = document.getElementById("newUserPassword").value;

  updatePasswordMsg.textContent = "";
  updatePasswordMsg.className = "message";

  if (!auth.currentUser) {
    updatePasswordMsg.textContent = "Admin not authenticated.";
    updatePasswordMsg.classList.add("error");
    return;
  }

  db.ref("settings/userPassword").set(newPass)
    .then(() => {
      updatePasswordMsg.textContent = "Password updated.";
      updatePasswordMsg.classList.add("success");
    });
}
window.updateUserPassword = updateUserPassword;

/* =======================================================
   4️⃣ ADD FILE (BASE64 ENCODED)
======================================================= */
function addFile() {
  const title = document.getElementById("fileTitle").value;
  const link = document.getElementById("fileLink").value;

  if (!auth.currentUser) {
    addFileMsg.textContent = "Admin not authenticated.";
    addFileMsg.classList.add("error");
    return;
  }

  const encoded = btoa(unescape(encodeURIComponent(link)));

  db.ref("files").push({
    title: title,
    link: encoded
  }).then(() => {
    addFileMsg.textContent = "File added.";
    addFileMsg.classList.add("success");
  });
}
window.addFile = addFile;

/* =======================================================
   5️⃣ DELETE FILE
======================================================= */
function deleteFile(id) {
  if (!auth.currentUser) return alert("Admin not authenticated");
  db.ref("files/" + id).remove();
}
window.deleteFile = deleteFile;

/* =======================================================
   6️⃣ LOGOUT (🔥 FIXED — Always back to Home)
======================================================= */
function logout() {
  firebase.auth().signOut().finally(() => {
    showHome();
  });

  // User logout
  showHome();
}
window.logout = logout;

/* =======================================================
   7️⃣ LOAD FILES FOR ADMIN
======================================================= */
function loadFilesForAdmin() {
  db.ref("files").on("value", snap => {
    const val = snap.val() || {};
    adminFileList.innerHTML = "";

    Object.keys(val).forEach(id => {
      const item = val[id];
      const decoded = decodeURIComponent(escape(atob(item.link)));

      const li = document.createElement("li");
      li.innerHTML = `
        <span>${item.title}</span>
        <button onclick="window.open('${decoded}', '_blank')">Open</button>
        <button class="danger" onclick="deleteFile('${id}')">Delete</button>
      `;
      adminFileList.appendChild(li);
    });
  });
}
window.loadFilesForAdmin = loadFilesForAdmin;

/* =======================================================
   8️⃣ LOAD FILES FOR USER (Secure Preview)
======================================================= */
function loadFilesForUser() {
  db.ref("files").on("value", snap => {
    const val = snap.val() || {};
    filesData = val;
    renderUserList();
  });
}
window.loadFilesForUser = loadFilesForUser;

/* =======================================================
   🔥 9️⃣ SECURE PREVIEW INSIDE WEBSITE (No redirect)
======================================================= */
function openSecureLink(encodedLink) {
  const decoded = decodeURIComponent(escape(atob(encodedLink)));
  const fileId = extractDriveId(decoded);

  if (!fileId) return alert("Invalid Google Drive link.");

  const previewURL = `https://drive.google.com/file/d/${fileId}/preview`;

  document.getElementById("filePreviewBox").classList.remove("hidden");
  document.getElementById("filePreviewFrame").src = previewURL;
}
window.openSecureLink = openSecureLink;

/* =======================================================
   🔟 RENDER USER LIST
======================================================= */
function renderUserList(filter = "") {
  filter = filter.toLowerCase();
  userFileList.innerHTML = "";

  Object.keys(filesData).forEach(id => {
    const file = filesData[id];
    if (!file.title.toLowerCase().includes(filter)) return;

    const li = document.createElement("li");
    li.innerHTML = `<span class="title">${file.title}</span>`;
    li.onclick = () => openSecureLink(file.link);
    userFileList.appendChild(li);
  });
}
window.searchFiles = renderUserList;

/* =======================================================
   Auto-start on User Login Page (Your request)
======================================================= */
showUserLogin();
