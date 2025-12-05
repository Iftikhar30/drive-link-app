// 🔥 Firebase Config (তোমারটাই বসানো আছে)
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

// UI FUNCTIONS
function hideAll(){
document.querySelectorAll(".container > div").forEach(div=>{
div.classList.add("hidden")
});
document.getElementById("home").classList.add("hidden")
}

function back(){
hideAll()
document.getElementById("home").classList.remove("hidden")
}

// BUTTON FIX
document.getElementById("adminBtn").onclick = ()=>{
hideAll()
document.getElementById("adminLogin").classList.remove("hidden")
}

document.getElementById("userBtn").onclick = ()=>{
hideAll()
document.getElementById("userLogin").classList.remove("hidden")
}

// ADMIN LOGIN
document.getElementById("adminLoginBtn").onclick = ()=>{
let email = document.getElementById("adminEmail").value;
let pass = document.getElementById("adminPass").value;

auth.signInWithEmailAndPassword(email, pass)
.then(()=>{
hideAll()
document.getElementById("adminPanel").classList.remove("hidden")
loadAdminFiles()
})
.catch(err=>alert(err.message))
}

// SAVE USER PASSWORD
document.getElementById("saveUserPass").onclick = ()=>{
let pass = document.getElementById("newUserPass").value
db.ref("userPass").set(pass)
alert("User Password Saved")
}

// USER LOGIN
document.getElementById("userLoginBtn").onclick = ()=>{
let pass = document.getElementById("userPass").value

db.ref("userPass").once("value", snap=>{
if(pass === snap.val()){
hideAll()
document.getElementById("userPanel").classList.remove("hidden")
loadUserFiles()
}else{
alert("Wrong Password")
}
})
}

// ADD FILE
document.getElementById("addFileBtn").onclick = ()=>{
let title = document.getElementById("fileTitle").value
let link = document.getElementById("fileLink").value

let id = db.ref("files").push().key
db.ref("files/"+id).set({title, link})
loadAdminFiles()
}

// DELETE FILE
function deleteFile(id){
db.ref("files/"+id).remove()
loadAdminFiles()
}

// LOAD ADMIN FILES
function loadAdminFiles(){
db.ref("files").once("value", snap=>{
let data = snap.val()
let box = document.getElementById("adminFiles")
box.innerHTML = ""

for(let id in data){
box.innerHTML += 
<div class="file">
<b>${data[id].title}</b><br>
<button onclick="deleteFile('${id}')">Delete</button>
</div>
}
})
}

// LOAD USER FILES
function loadUserFiles(){
db.ref("files").once("value", snap=>{
let data = snap.val()
let box = document.getElementById("userFiles")
box.innerHTML = ""

for(let id in data){
box.innerHTML += 
<div class="file">
<b>${data[id].title}</b><br>
<a href="${data[id].link}" target="_blank">Open</a>
</div>
}
})
}

// SEARCH
document.getElementById("search").onkeyup = ()=>{
let input = document.getElementById("search").value.toLowerCase()

db.ref("files").once("value", snap=>{
let data = snap.val()
let box = document.getElementById("userFiles")
box.innerHTML = ""

for(let id in data){
if(data[id].title.toLowerCase().includes(input)){
box.innerHTML += 
<div class="file">
<b>${data[id].title}</b><br>
<a href="${data[id].link}" target="_blank">Open</a>
</div>
}
}
})
}

// LOGOUT
function logout(){
auth.signOut()
location.reload()
}
