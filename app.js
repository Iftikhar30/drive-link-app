// ✅ Your Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCFQErfyzr2oiap8epvdkiImSoWCyLdjb0",
  authDomain: "my-family-pic.firebaseapp.com",
  databaseURL: "https://my-family-pic-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "my-family-pic",
  storageBucket: "my-family-pic.appspot.com",
  messagingSenderId: "1016445913558",
  appId: "1:1016445913558:web:b4b8e620494e5cc4f23c77"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ✅ UI CONTROL
function hideAll() {
    loginPage.classList.add("hidden");
    adminLogin.classList.add("hidden");
    userLogin.classList.add("hidden");
    adminPanel.classList.add("hidden");
    userPanel.classList.add("hidden");
}

function showAdminLogin() {
    hideAll();
    adminLogin.classList.remove("hidden");
}

function showUserLogin() {
    hideAll();
    userLogin.classList.remove("hidden");
}

function backHome() {
    hideAll();
    loginPage.classList.remove("hidden");
}

// ✅ ADMIN LOGIN SYSTEM
function adminLogin() {
    let email = adminEmail.value;
    let pass = adminPass.value;

    firebase.auth().signInWithEmailAndPassword(email, pass)
    .then(() => {
        hideAll();
        adminPanel.classList.remove("hidden");
        loadAdminFiles();
    })
    .catch(() => alert("Wrong Admin Login"));
}

// ✅ USER LOGIN SYSTEM
function userLogin() {
    db.ref("userPassword").once("value", snapshot => {
        if (snapshot.val() === userPassLogin.value) {
            hideAll();
            userPanel.classList.remove("hidden");
            loadUserFiles();
        } else {
            alert("Wrong User Password");
        }
    });
}

// ✅ UPDATE USER PASSWORD
function updateUserPassword() {
    db.ref("userPassword").set(newUserPass.value);
    alert("User Password Updated");
}

// ✅ ADD FILE
function addFile() {
    let title = fileTitle.value;
    let link = fileLink.value;

    let key = db.ref("files").push().key;

    db.ref("files/" + key).set({
        title: title,
        link: link
    });

    loadAdminFiles();
}

// ✅ DELETE FILE
function deleteFile(id) {
    db.ref("files/" + id).remove();
    loadAdminFiles();
}

// ✅ LOAD FILES IN ADMIN
function loadAdminFiles() {
    db.ref("files").on("value", snap => {
        adminFiles.innerHTML = "";
        snap.forEach(child => {
            let file = child.val();
            adminFiles.innerHTML += 
                <div class="file">
                    ${file.title}
                    <button onclick="deleteFile('${child.key}')">Delete</button>
                </div>
            ;
        });
    });
}

// ✅ LOAD FILES IN USER
function loadUserFiles() {
    db.ref("files").on("value", snap => {
        userFiles.innerHTML = "";
        snap.forEach(child => {
            let file = child.val();
            userFiles.innerHTML += 
                <div class="file">
                    ${file.title}
                    <a href="${file.link}" target="_blank">Open</a>
                </div>
            ;
        });
    });
}

// ✅ SEARCH SYSTEM
function searchFiles() {
    let text = searchBox.value.toLowerCase();
    document.querySelectorAll(".file").forEach(file => {
        file.style.display = file.innerText.toLowerCase().includes(text) ? "block" : "none";
    });
}

// ✅ LOGOUT
function logout() {
    firebase.auth().signOut();
    hideAll();
    loginPage.classList.remove("hidden");
}
