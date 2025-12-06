// ---------------------------
// Firebase Init (v8)
// ---------------------------
var firebaseConfig = {
    apiKey: "AIzaSyDMLkQa5ZtsezKD9BLMpQt1cmZcYThUjPs",
    authDomain: "family-photo-b81a9.firebaseapp.com",
    projectId: "family-photo-b81a9",
    storageBucket: "family-photo-b81a9.firebasestorage.app",
    messagingSenderId: "638306894478",
    appId: "1:638306894478:web:63e2a8600e5ffdb396ffdf"
};
firebase.initializeApp(firebaseConfig);

const db = firebase.database();

// ---------------------------
// Page Navigation
// ---------------------------
function showHome() {
    hideAll();
    document.getElementById("homePage").classList.remove("hidden");
}

function showAdminLogin() {
    hideAll();
    document.getElementById("adminLogin").classList.remove("hidden");
}

function showUserLogin() {
    hideAll();
    document.getElementById("userLogin").classList.remove("hidden");
}

function hideAll() {
    document.querySelectorAll(".page").forEach(x => x.classList.add("hidden"));
}

// ---------------------------
// Admin Login (Firebase Auth)
// ---------------------------
function adminLogin() {
    let email = document.getElementById("adminEmail").value;
    let pass = document.getElementById("adminPass").value;

    firebase.auth().signInWithEmailAndPassword(email, pass)
        .then(() => {
            loadFilesForAdmin();
            hideAll();
            document.getElementById("adminPanel").classList.remove("hidden");
        })
        .catch(err => {
            showMessage("adminMsg", err.message);
        });
}

// ---------------------------
// User Login (Password Only)
// ---------------------------
function userLogin() {
    let input = document.getElementById("userPass").value;

    db.ref("settings/userPassword").once("value", snap => {
        if (snap.val() === input) {
            loadFilesForUser();
            hideAll();
            document.getElementById("userPanel").classList.remove("hidden");
        } else {
            showMessage("userMsg", "ভুল পাসওয়ার্ড!");
        }
    });
}

// ---------------------------
// Update User Password
// ---------------------------
function updateUserPassword() {
    let newPass = document.getElementById("newUserPassword").value;

    db.ref("settings/userPassword").set(newPass);
    showMessage("adminMsg", "User Password Updated!");
}

// ---------------------------
// Add File
// ---------------------------
function addFile() {
    let title = document.getElementById("fileTitle").value;
    let link = document.getElementById("fileLink").value;

    let encoded = btoa(link);

    db.ref("files").push({
        title: title,
        link: encoded
    });

    document.getElementById("fileTitle").value = "";
    document.getElementById("fileLink").value = "";

    showMessage("adminMsg", "File Added!");
    loadFilesForAdmin();
}

// ---------------------------
// Delete File
// ---------------------------
function deleteFile(id) {
    db.ref("files/" + id).remove();
    loadFilesForAdmin();
}

// ---------------------------
// Load Files - Admin
// ---------------------------
function loadFilesForAdmin() {
    db.ref("files").on("value", snap => {
        let box = document.getElementById("adminFileList");
        box.innerHTML = "";

        snap.forEach(child => {
            let data = child.val();
            box.innerHTML += `
                <div class="fileBox">
                    <b>${data.title}</b>
                    <button onclick="openSecureLink('${data.link}')">Open</button>
                    <button onclick="deleteFile('${child.key}')" class="danger">Delete</button>
                </div>
            `;
        });
    });
}

// ---------------------------
// Load Files - User
// ---------------------------
function loadFilesForUser() {
    db.ref("files").on("value", snap => {
        let box = document.getElementById("userFileList");
        box.innerHTML = "";

        snap.forEach(child => {
            let data = child.val();
            box.innerHTML += `
                <div class="fileBox" onclick="openSecureLink('${data.link}')">
                    ${data.title}
                </div>
            `;
        });
    });
}

// ---------------------------
// Search Files (User)
// ---------------------------
function searchFiles() {
    let input = document.getElementById("searchInput").value.toLowerCase();

    document.querySelectorAll("#userFileList .fileBox").forEach(box => {
        box.style.display = box.innerText.toLowerCase().includes(input) ? "block" : "none";
    });
}

// ---------------------------
// Secure Link Open
// ---------------------------
function openSecureLink(encoded) {
    let url = atob(encoded);
    window.open(url, "_blank");
}

// ---------------------------
// Logout
// ---------------------------
function logout() {
    firebase.auth().signOut();
    showHome();
}

// ---------------------------
// Helper Message
// ---------------------------
function showMessage(id, msg) {
    let box = document.getElementById(id);
    box.innerText = msg;
    box.classList.add("show");

    setTimeout(() => {
        box.classList.remove("show");
    }, 2500);
}

// ---------------------------
// EXPORT FUNCTIONS (VERY IMPORTANT)
// ---------------------------
window.showAdminLogin = showAdminLogin;
window.showUserLogin = showUserLogin;
window.adminLogin = adminLogin;
window.userLogin = userLogin;
window.updateUserPassword = updateUserPassword;
window.addFile = addFile;
window.deleteFile = deleteFile;
window.searchFiles = searchFiles;
window.logout = logout;
window.openSecureLink = openSecureLink;
window.showHome = showHome;

