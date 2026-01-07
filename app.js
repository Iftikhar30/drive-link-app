// Delete Modal Global State
// ===========================
let deleteTargetKey = null;

function askDelete(key) {
    deleteTargetKey = key;
    document.getElementById("deleteModal").classList.remove("hidden");
}
function closeDeleteModal() {
    deleteTargetKey = null;
    document.getElementById("deleteModal").classList.add("hidden");
}
document.getElementById("confirmDeleteBtn").onclick = function () {
    if (!deleteTargetKey) return;

    db.ref("files/" + deleteTargetKey).remove()
        .then(() => {
            closeDeleteModal();
            loadFilesForAdmin();
        });
};


// ---------------------------
// Extract Drive File ID
// ---------------------------
function extractDriveFileId(url) {

    // 1) embeddedfolderview?id=xxxx
    let match0 = url.match(/embeddedfolderview\?id=([a-zA-Z0-9_-]+)/);
    if (match0) return match0[1];

    // 2) /file/d/xxxx/
    let match1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match1) return match1[1];

    // 3) open?id=xxxx
    let match2 = url.match(/open\?id=([a-zA-Z0-9_-]+)/);
    if (match2) return match2[1];

    // 4) uc?id=xxxx
    let match3 = url.match(/uc\?id=([a-zA-Z0-9_-]+)/);
    if (match3) return match3[1];

    return null;
}

// ---------------------------
// Get Thumbnail URL
// ---------------------------
function getThumbnailUrl(url) {

    // Folder Detect
    if (url.includes("embeddedfolderview") || url.includes("folders")) {
        return "https://cdn-icons-png.flaticon.com/512/716/716784.png"; 
    }

    const id = extractDriveFileId(url);

    if (!id) return "https://via.placeholder.com/100";

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
    db.ref("files")
      .orderByChild("order")   // 🔥 এই লাইনটা সবচেয়ে গুরুত্বপূর্ণ
      .once("value", snap => {

        let box = document.getElementById("adminFileList");
        box.innerHTML = "";

        snap.forEach(child => {
            let data = child.val();

            box.innerHTML += `
                <li class="draggable" data-key="${child.key}" draggable="true">
                    <span class="title">${data.title}</span>
                    <div class="actions">
                        <button onclick="openSecureLink('${data.link}')">Open</button>
                        <button class="btn" onclick="editFile('${child.key}','${data.title}','${data.link}')">Edit</button>
                        <button class="btn danger" onclick="askDelete('${child.key}')">Delete</button>
                    </div>
                </li>
            `;
        });

        enableDragAndDrop();
    });
}



// ---------------------------
// Load Files User (With Thumbnail)
// ---------------------------
function loadFilesForUser() {
    db.ref("files")
      .orderByChild("order")   // 🔥 এখানেও MUST
      .on("value", snap => {

        let box = document.getElementById("userFileList");
        box.innerHTML = "";

        snap.forEach(child => {
            let data = child.val();
            let fileUrl = atob(data.link);
            let thumb = getThumbnailUrl(fileUrl);

            box.innerHTML += `
                <li onclick="openSecureLink('${data.link}')" class="file-item">
                    <img src="${thumb}">
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
    window.open(url, "_blank"); // নতুন ট্যাবে Google Drive খুলবে
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

function editFile(id, oldTitle, oldLink) {
    // Prompt ব্যবহার করে নতুন value নিন
    let newTitle = prompt("Enter new file title:", oldTitle);
    if(newTitle === null) return; // Cancel করলে exit

    let newLink = prompt("Enter new file link:", atob(oldLink));
    if(newLink === null) return;

    // Update Firebase
    db.ref("files/" + id).update({
        title: newTitle,
        link: btoa(newLink)  // Encode again
    });

    loadFilesForAdmin(); // List refresh
}

function enableDragAndDrop() {
    const list = document.getElementById("adminFileList");

    let draggingItem = null;

    list.querySelectorAll(".draggable").forEach(item => {

        item.addEventListener("dragstart", () => {
            draggingItem = item;
            item.classList.add("dragging");
        });

        item.addEventListener("dragend", () => {
            item.classList.remove("dragging");
            draggingItem = null;
            saveOrderToFirebase();
        });
    });

    list.addEventListener("dragover", e => {
        e.preventDefault();
        const after = getDragAfterElement(list, e.clientY);
        const dragging = document.querySelector(".dragging");
        if (!dragging) return;

        if (after == null) {
            list.appendChild(dragging);
        } else {
            list.insertBefore(dragging, after);
        }
    });
}


function saveOrderToFirebase() {
    const items = document.querySelectorAll("#adminFileList .draggable");

    items.forEach((item, index) => {
        const key = item.getAttribute("data-key");
        db.ref("files/" + key + "/order").set(index);
    });
}


// Update Firebase order after drag
function updateOrderInFirebase() {
    const list = document.getElementById("adminFileList");
    const items = list.querySelectorAll('li');

    items.forEach((li, index) => {
        const key = li.getAttribute('data-key');
        db.ref("files/" + key).update({ order: index });
    });
}
function getDragAfterElement(container, y) {
    const items = [...container.querySelectorAll(".draggable:not(.dragging)")];

    return items.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset, element: child };
        }
        return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}
function saveOrderToFirebase() {
    document.querySelectorAll("#adminFileList .draggable")
        .forEach((item, index) => {
            const key = item.dataset.key;
            db.ref("files/" + key + "/order").set(index);
        });
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











