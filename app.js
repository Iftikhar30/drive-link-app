// ---------------- Firebase Config ----------------
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
const auth = firebase.auth();
const db = firebase.database();


// ---------------- UI Functions ----------------
function hideAll() {
    document.getElementById("home").classList.add("hidden");
    document.getElementById("adminLogin").classList.add("hidden");
    document.getElementById("userLogin").classList.add("hidden");
    document.getElementById("adminPanel").classList.add("hidden");
    document.getElementById("userPanel").classList.add("hidden");
}

function back() {
    hideAll();
    document.getElementById("home").classList.remove("hidden");
}


// ---------------- Button Events ----------------
document.getElementById("adminBtn").onclick = () => {
    hideAll();
    document.getElementById("adminLogin").classList.remove("hidden");
};

document.getElementById("userBtn").onclick = () => {
    hideAll();
    document.getElementById("userLogin").classList.remove("hidden");
};


// ---------------- Admin Login ----------------
document.getElementById("adminLoginBtn").onclick = () => {
    let email = document.getElementById("adminEmail").value;
    let pass = document.getElementById("adminPass").value;

    auth.signInWithEmailAndPassword(email, pass)
        .then(() => {
            hideAll();
            document.getElementById("adminPanel").classList.remove("hidden");
            loadAdminFiles();
        })
        .catch(err => alert(err.message));
};


// ---------------- Save User Password ----------------
document.getElementById("saveUserPass").onclick = () => {
    let pass = document.getElementById("newUserPass").value;
    db.ref("userPass").set(pass);
    alert("User password saved");
};


// ---------------- User Login ----------------
document.getElementById("userLoginBtn").onclick = () => {
    let pass = document.getElementById("userPass").value;

    db.ref("userPass").once("value", snap => {
        if (snap.val() === pass) {
            hideAll();
            document.getElementById("userPanel").classList.remove("hidden");
            loadUserFiles();
        } else {
            alert("Wrong password");
        }
    });
};


// ---------------- Add File ----------------
document.getElementById("addFileBtn").onclick = () => {
    let title = document.getElementById("fileTitle").value;
    let link = document.getElementById("fileLink").value;

    let id = db.ref("files").push().key;
    db.ref("files/" + id).set({ title, link });

    loadAdminFiles();
};


// ---------------- Delete File ----------------
function deleteFile(id) {
    db.ref("files/" + id).remove();
    loadAdminFiles();
}


// ---------------- Load Admin List ----------------
function loadAdminFiles() {
    db.ref("files").once("value", snap => {
        let box = document.getElementById("adminFiles");
        box.innerHTML = "";

        snap.forEach(child => {
            let data = child.val();
            box.innerHTML += 
            <div class="file">
                <b>${data.title}</b><br>
                <button onclick="deleteFile('${child.key}')">Delete</button>
            </div>;
        });
    });
}


// ---------------- Load User List ----------------
function loadUserFiles() {
    db.ref("files").once("value", snap => {
        let box = document.getElementById("userFiles");
        box.innerHTML = "";

        snap.forEach(child => {
            let data = child.val();
            box.innerHTML += 
            <div class="file">
                <b>${data.title}</b><br>
                <a href="${data.link}" target="_blank">Open</a>
            </div>;
        });
    });
}
// ---------------- Logout ----------------
function logout() {
    auth.signOut();
    location.reload();
}
