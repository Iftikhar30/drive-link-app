// Your Firebase Config
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

// UI Elements
const adminBtn = document.getElementById("adminBtn");
const userBtn = document.getElementById("userBtn");
const adminLogin = document.getElementById("adminLogin");
const userLogin = document.getElementById("userLogin");
const adminPanel = document.getElementById("adminPanel");
const userPanel = document.getElementById("userPanel");

// Login Buttons
adminBtn.onclick = () => {
    adminLogin.classList.remove("hidden");
    userLogin.classList.add("hidden");
};

userBtn.onclick = () => {
    userLogin.classList.remove("hidden");
    adminLogin.classList.add("hidden");
};

// Admin Login
document.getElementById("adminLoginBtn").onclick = () => {
    const email = document.getElementById("adminEmail").value;
    const pass = document.getElementById("adminPass").value;

    firebase.auth().signInWithEmailAndPassword(email, pass)
        .then(() => {
            adminPanel.classList.remove("hidden");
            adminLogin.classList.add("hidden");
        })
        .catch(() => alert("Wrong Admin Login!"));
};

// User Login (Simple password)
document.getElementById("userLoginBtn").onclick = () => {
    const pass = document.getElementById("userPass").value;

    if (pass === "1122") {
        userPanel.classList.remove("hidden");
        userLogin.classList.add("hidden");
    } else {
        alert("Wrong Password!");
    }
};

// Add File (Admin)
document.getElementById("addFileBtn").onclick = () => {
    const name = document.getElementById("fileName").value;
    const url = document.getElementById("fileUrl").value;

    if (!name || !url) return alert("Fill both fields!");

    db.ref("files").push({
        name: name,
        url: url
    });

    alert("File Added!");
};

// Show files in Admin Panel
db.ref("files").on("value", snap => {
    document.getElementById("adminFileList").innerHTML = "";
    snap.forEach(data => {
        const file = data.val();
        document.getElementById("adminFileList").innerHTML += `
            <li>${file.name}</li>
        `;
    });
});

// Show files in User Panel (NO URL shown)
db.ref("files").on("value", snap => {
    document.getElementById("userFileList").innerHTML = "";
    snap.forEach(data => {
        const file = data.val();
        document.getElementById("userFileList").innerHTML += `
            <li>${file.name}</li>
        `;
    });
});

// Logout
document.getElementById("logoutBtn").onclick = () => location.reload();
document.getElementById("logoutBtn2").onclick = () => location.reload();
