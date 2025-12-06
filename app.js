/* ------------------------------
   Firebase Configuration
------------------------------ */
const firebaseConfig = {
    apiKey: "YOUR-KEY",
    authDomain: "YOUR-PROJECT.firebaseapp.com",
    databaseURL: "https://YOUR-PROJECT-default-rtdb.firebaseio.com",
    projectId: "YOUR-PROJECT",
    storageBucket: "YOUR-PROJECT.appspot.com",
    messagingSenderId: "00000000000",
    appId: "YOUR-ID"
};
firebase.initializeApp(firebaseConfig);

let currentPage = "home";

/* ------------------------------
   Universal Google Drive ID Extractor
------------------------------ */
function extractDriveId(url) {

    // Pattern 1
    let match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];

    // Pattern 2
    match = url.match(/id=([a-zA-Z0-9_-]+)/);
    if (match) return match[1];

    // Pattern 3
    match = url.match(/uc\?export=download&id=([a-zA-Z0-9_-]+)/);
    if (match) return match[1];

    // Pattern 4
    match = url.match(/open\?id=([a-zA-Z0-9_-]+)/);
    if (match) return match[1];

    return null;
}

/* ------------------------------
   Secure File Open (Embed Preview)
------------------------------ */
function openSecureLink(encodedLink) {
    try {
        const decoded = decodeURIComponent(escape(atob(encodedLink)));

        const fileId = extractDriveId(decoded);
        if (!fileId) {
            alert("Invalid Google Drive Link!");
            return;
        }

        const embedURL = `https://drive.google.com/uc?export=preview&id=${fileId}`;

        document.getElementById("filePreviewBox").classList.remove("hidden");
        document.getElementById("filePreviewFrame").src = embedURL;

    } catch (err) {
        alert("Failed to load preview.");
    }
}
window.openSecureLink = openSecureLink;

/* ------------------------------
   Default Login Prompt
------------------------------ */
window.onload = function () {

    document.getElementById("homeTitle").innerText = "স্বাগতম আমার ভাবনাগুলোতে";

    // Show password prompt automatically
    document.getElementById("homePage").classList.add("hidden");
    document.getElementById("userLoginPage").classList.remove("hidden");

    // Footer update
    document.getElementById("footerDev").innerHTML =
        `<a href="https://wa.me/8801XXXXXXXXX" target="_blank">Developer By Iftikhar</a>`;
};

/* ------------------------------
   User Login (Simple Password)
------------------------------ */
document.getElementById("userLoginBtn").onclick = () => {
    const pass = document.getElementById("userPassword").value;

    if (pass === "") return alert("Please enter password");

    // Your password here
    if (pass === "12345") {

        document.getElementById("userLoginPage").classList.add("hidden");
        document.getElementById("fileListPage").classList.remove("hidden");

    } else {
        alert("Wrong password!");
    }
};

/* ------------------------------
   Admin Login Page (small text under login)
------------------------------ */
document.getElementById("adminLoginSmall").onclick = () => {
    document.getElementById("userLoginPage").classList.add("hidden");
    document.getElementById("adminLoginPage").classList.remove("hidden");
};

/* ------------------------------
   Admin Login (Firebase Auth)
------------------------------ */
document.getElementById("adminLoginBtn").onclick = () => {

    const email = document.getElementById("adminEmail").value;
    const password = document.getElementById("adminPassword").value;

    firebase.auth()
        .signInWithEmailAndPassword(email, password)
        .then(() => {
            document.getElementById("adminLoginPage").classList.add("hidden");
            document.getElementById("adminPanelPage").classList.remove("hidden");
        })
        .catch(err => alert(err.message));
};

/* ------------------------------
   Load File List (Realtime DB)
------------------------------ */
function loadFileList() {
    const fileList = document.getElementById("fileList");
    fileList.innerHTML = "";

    firebase.database().ref("/files").on("value", snapshot => {
        fileList.innerHTML = "";

        snapshot.forEach(child => {
            const data = child.val();

            let div = document.createElement("div");
            div.className = "fileItem";
            div.innerHTML = `
                <p>${data.name}</p>
                <button onclick="openSecureLink('${data.secure}')">Open</button>
            `;

            fileList.appendChild(div);
        });
    });
}
loadFileList();

/* ------------------------------
   Logout (Always Return to Home)
------------------------------ */
function logout() {

    firebase.auth().signOut().finally(() => {

        document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));

        document.getElementById("homePage").classList.remove("hidden");
        currentPage = "home";
    });

    document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
    document.getElementById("homePage").classList.remove("hidden");
    currentPage = "home";
}
window.logout = logout;
