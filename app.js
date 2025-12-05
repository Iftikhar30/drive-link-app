// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCFQErfyzr2oiap8epvdkiImSoWCyLdjb0",
  authDomain: "my-family-pic.firebaseapp.com",
  databaseURL: "https://my-family-pic-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "my-family-pic",
  storageBucket: "my-family-pic.firebasestorage.app",
  messagingSenderId: "1016445913558",
  appId: "1:1016445913558:web:b4b8e620494e5cc4f23c77"
};

firebase.initializeApp(firebaseConfig);

// Shortcuts
const db = firebase.database();

function showAdminLogin() {
    hideAll();
    adminLogin.style.display = "block";
}

function showUserLogin() {
    hideAll();
    userLogin.style.display = "block";
}

function backHome() {
    hideAll();
    loginPage.style.display = "block";
}

function hideAll() {
    loginPage.style.display = "none";
    adminLogin.style.display = "none";
    userLogin.style.display = "none";
    adminPanel.style.display = "none";
    userPanel.style.display = "none";
}

// ADMIN LOGIN
function adminLogin() {
    let email = adminEmail.value;
    let pass = adminPass.value;

    firebase.auth().signInWithEmailAndPassword(email, pass)
        .then(() => {
            loadAdminFiles();
            hideAll();
            adminPanel.style.display = "block";
        })
        .catch(() => alert("Wrong admin login!"));
}

// USER LOGIN
function userLogin() {
    db.ref("userPassword").once("value", snapshot => {
        let saved = snapshot.val();
        if (saved === userPassLogin.value) {
            loadUserFiles();
            hideAll();
            userPanel.style.display = "block";
        } else {
            alert("Wrong password!");
        }
    });
}

// USER PASSWORD UPDATE (ADMIN)
function updateUserPassword() {
    db.ref("userPassword").set(newUserPass.value);
    alert("User password updated");
}

// ADD FILE
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

// DELETE FILE
function deleteFile(id) {
    db.ref("files/" + id).remove();
    loadAdminFiles();
}

// LOAD ADMIN FILES
function loadAdminFiles() {
    db.ref("files").on("value", snapshot => {
        adminFiles.innerHTML = "";
        snapshot.forEach(child => {
            let data = child.val();
            adminFiles.innerHTML += `
                <div class="fileBox">
                    <b>${data.title}</b>  
                    <br>
                    <button onclick="deleteFile('${child.key}')">Delete</button>
                </div>
            `;
        });
    });
}

// LOAD USER FILES
function loadUserFiles() {
    db.ref("files").on("value", snapshot => {
        userFiles.innerHTML = "";
        snapshot.forEach(child => {
            let data = child.val();
            userFiles.innerHTML += `
                <div class="fileBox">
                    <b>${data.title}</b><br>
                    <a href="${data.link}" target="_blank">Open</a>
                </div>
            `;
        });
    });
}

// SEARCH
function searchFiles() {
    let text = searchBox.value.toLowerCase();
    document.querySelectorAll("#userFiles .fileBox").forEach(box => {
        box.style.display = 
            box.innerText.toLowerCase().includes(text) ? "block" : "none";
    });
}

// LOGOUT
function logout() {
    firebase.auth().signOut();
    hideAll();
    loginPage.style.display = "block";
}
