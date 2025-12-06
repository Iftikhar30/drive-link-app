// ---------------------------
// Extract Drive File ID
// ---------------------------
function extractDriveFileId(url) {
    const match = url.match(/\/d\/(.+?)\//);
    return match ? match[1] : null;
}

// ---------------------------
// Get Thumbnail URL
// ---------------------------
function getThumbnailUrl(url) {

    // If folder link → show folder icon
    if (url.includes("drive.google.com/drive/folders")) {
        return "https://cdn-icons-png.flaticon.com/512/716/716784.png";
    }

    const id = extractDriveFileId(url);
    if (!id) return "https://via.placeholder.com/80";

    return `https://drive.google.com/thumbnail?id=${id}`;
}

var firebaseConfig = {
    apiKey: "AIzaSyDMLkQa5ZtsezKD9BLMpQt1cmZcYThUjPs",
    authDomain: "family-photo-b81a9.firebaseapp.com",
    databaseURL: "https://family-photo-b81a9-default-rtdb.firebaseio.com",
    projectId: "family-photo-b81a9",
    storageBucket: "family-photo-b81a9.firebasestorage.app",
    messagingSenderId: "638306894478",
    appId: "1:638306894478:web:63e2a8600e5ffdb396ffdf"
};
firebase.initializeApp(firebaseConfig);

const db = firebase.database();

// ---------------------------
function hideAll() {
    document.querySelectorAll("section").forEach(x => x.classList.add("hidden"));
}

function showHome() {
    hideAll();
    document.getElementById("userLoginPage").classList.remove("hidden");
}

function showAdminLogin() {
    hideAll();
    document.getElementById("adminLoginPage").classList.remove("hidden");
}

// ---------------------------
function adminLogin() {
    let email = document.getElementById("adminEmail").value;
    let pass = document.getElementById("adminPassword").value;

    firebase.auth().signInWithEmailAndPassword(email, pass)
        .then(() => {
            loadFilesForAdmin();
            hideAll();
            document.getElementById("adminPanel").classList.remove("hidden");
        })
        .catch(err => showMessage("adminLoginMsg", err.message));
}

// ---------------------------
function userLogin() {
    let input = document.getElementById("userPasswordInput").value;

    db.ref("settings/userPassword").once("value", snap => {
        if (snap.val() === input) {
            loadFilesForUser();
            hideAll();
            document.getElementById("userPanel").classList.remove("hidden");
        } else {
            showMessage("userLoginMsg", "ভুল পাসওয়ার্ড!");
        }
    });
}

// ---------------------------
function updateUserPassword() {
    let newPass = document.getElementById("newUserPassword").value;

    db.ref("settings/userPassword").set(newPass);
    showMessage("updatePasswordMsg", "User Password Updated!");
}

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

    showMessage("addFileMsg", "File Added!");
    loadFilesForAdmin();
}

// ---------------------------
function deleteFile(id) {
    db.ref("files/" + id).remove();
    loadFilesForAdmin();
}

// ---------------------------
function loadFilesForAdmin() {
    db.ref("files").on("value", snap => {
        let box = document.getElementById("adminFileList");
        box.innerHTML = "";

        snap.forEach(child => {
            let data = child.val();

            box.innerHTML += `
                <li>
                    <span class="title">${data.title}</span>
                    <div class="actions">
                      <button onclick="openSecureLink('${data.link}')">Open</button>
                      <button class="btn danger" onclick="deleteFile('${child.key}')">Delete</button>
                    </div>
                </li>
            `;
        });
    });
}

// ---------------------------
// Load Files User (With Thumbnail)
// ---------------------------
function loadFilesForUser() {
    db.ref("files").on("value", snap => {
        let box = document.getElementById("userFileList");
        box.innerHTML = "";

        snap.forEach(child => {
            let data = child.val();
            let fileUrl = atob(data.link);
            let thumb = getThumbnailUrl(fileUrl);

            box.innerHTML += `
                <li onclick="openSecureLink('${data.link}')" class="file-item">
                    <img src="${thumb}" class="thumb">
                    <span class="title">${data.title}</span>
                </li>
            `;
        });
    });
}

// ---------------------------
function searchFiles() {
    let input = document.getElementById("searchInput").value.toLowerCase();

    document.querySelectorAll("#userFileList li").forEach(item => {
        item.style.display = item.innerText.toLowerCase().includes(input) ? "flex" : "none";
    });
}

// ---------------------------
function openSecureLink(encoded) {
    let url = atob(encoded);

    let box = document.getElementById("filePreviewBox");
    let frame = document.getElementById("filePreviewFrame");

    frame.src = url;
    box.classList.remove("hidden");
}

// ---------------------------
function logout() {
    firebase.auth().signOut();
    showHome();
}

// ---------------------------
function showMessage(id, msg) {
    let box = document.getElementById(id);
    box.innerText = msg;

    box.classList.add("success");

    setTimeout(() => {
        box.innerText = "";
        box.classList.remove("success");
    }, 2000);
}

// EXPORT
window.showAdminLogin = showAdminLogin;
window.adminLogin = adminLogin;
window.userLogin = userLogin;
window.updateUserPassword = updateUserPassword;
window.addFile = addFile;
window.deleteFile = deleteFile;
window.openSecureLink = openSecureLink;
window.searchFiles = searchFiles;
window.logout = logout;
window.showHome = showHome;
