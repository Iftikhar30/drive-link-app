// app.js - modular script
// NOTE: Fill firebaseConfig object with your Firebase project config (instructions below)

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js';
import { getAuth, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth-compat.js';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, addDoc, deleteDoc, updateDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore-compat.js';

// ----- Firebase config: replace with YOUR values -----
const firebaseConfig = {
  apiKey: "AIzaSyCFQErfyzr2oiap8epvdkiImSoWCyLdjb0",
  authDomain: "my-family-pic.firebaseapp.com",
  databaseURL: "https://my-family-pic-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "my-family-pic",
  storageBucket: "my-family-pic.firebasestorage.app",
  messagingSenderId: "1016445913558",
  appId: "1:1016445913558:web:b4b8e620494e5cc4f23c77"
};


// initialize
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM elements
const btnAdminLogin = document.getElementById('btn-admin-login');
const btnUserLogin = document.getElementById('btn-user-login');
const adminLoginCard = document.getElementById('admin-login');
const userLoginCard = document.getElementById('user-login');
const adminPanel = document.getElementById('admin-panel');
const userPanel = document.getElementById('user-panel');
const appArea = document.getElementById('app-area');
const adminFilesDiv = document.getElementById('admin-files');
const fileListDiv = document.getElementById('file-list');
const searchInput = document.getElementById('search');

// login buttons
btnAdminLogin.addEventListener('click', ()=>{adminLoginCard.classList.remove('hidden'); userLoginCard.classList.add('hidden'); appArea.classList.remove('hidden');});
btnUserLogin.addEventListener('click', ()=>{userLoginCard.classList.remove('hidden'); adminLoginCard.classList.add('hidden'); appArea.classList.remove('hidden');});

// Admin Login flow (Firebase Auth email+password)
document.getElementById('admin-login-btn').addEventListener('click', async ()=>{
  const email = document.getElementById('admin-email').value.trim();
  const pass = document.getElementById('admin-password').value;
  if(!email||!pass){alert('Enter admin email & password');return}
  try{
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    // success
    showAdminPanel(cred.user.uid);
  }catch(e){alert('Admin login error: '+e.message)}
});

// Admin logout
document.getElementById('admin-logout').addEventListener('click', async ()=>{
  await signOut(auth);
  adminPanel.classList.add('hidden');
  appArea.classList.add('hidden');
  alert('Admin logged out');
});

// Add file
document.getElementById('add-file-btn').addEventListener('click', async ()=>{
  const name = document.getElementById('add-name').value.trim();
  const url = document.getElementById('add-url').value.trim();
  if(!name||!url){alert('Name and URL required');return}
  // Save to Firestore collection 'files'
  try{
    await addDoc(collection(db,'files'),{name, url, createdAt: Date.now()});
    document.getElementById('add-name').value='';document.getElementById('add-url').value='';
  }catch(e){alert('Error adding file: '+e.message)}
});

// Delete file (admin)
async function deleteFile(id){ if(!confirm('Delete file?')) return; await deleteDoc(doc(db,'files',id)); }
// Change user password (store SHA256 hash in document 'config/user')
document.getElementById('change-user-pass-btn').addEventListener('click', async ()=>{
  const newPass = document.getElementById('new-user-pass').value;
  if(!newPass){alert('Enter new password');return}
  const hash = await sha256(newPass);
  await setDoc(doc(db,'config','user'), {passwordHash: hash});
  alert('User password updated');
  document.getElementById('new-user-pass').value='';
});

// User login: fetch config/user and compare hashes
document.getElementById('user-login-btn').addEventListener('click', async ()=>{
  const pass = document.getElementById('user-password').value;
  if(!pass){alert('Enter password');return}
  const cfg = await getDoc(doc(db,'config','user'));
  if(!cfg.exists()){alert('User password not set by admin yet');return}
  const storedHash = cfg.data().passwordHash || '';
  const inputHash = await sha256(pass);
  if(inputHash === storedHash){
    // show user panel
    showUserPanel();
  } else alert('Wrong password');
});

// Logout user
document.getElementById('user-logout').addEventListener('click', ()=>{ userPanel.classList.add('hidden'); appArea.classList.add('hidden'); alert('User logged out'); });

// show admin panel: subscribe to files collection
function showAdminPanel(adminUid){ adminLoginCard.classList.add('hidden'); adminPanel.classList.remove('hidden'); userPanel.classList.add('hidden');
  // subscribe to files
  onSnapshot(collection(db,'files'), (snap) =>{
    adminFilesDiv.innerHTML='';
    snap.forEach(docu =>{
      const data = docu.data();
      const div = document.createElement('div'); div.className='file-row';
      div.innerHTML = <div class='meta'>${data.name}</div><div class='actions'><button onclick="window.open('${data.url}','_blank')">Open</button> <button class='btn-delete' onclick="deleteFile('${docu.id}')">Delete</button></div>;
      adminFilesDiv.appendChild(div);
    });
  });
}

// show user panel: fetch files (live) and render names + Open button (link not shown)
function showUserPanel(){ adminLoginCard.classList.add('hidden'); userLoginCard.classList.add('hidden'); adminPanel.classList.add('hidden'); userPanel.classList.remove('hidden');
  appArea.classList.remove('hidden');
  // subscribe
  onSnapshot(collection(db,'files'), (snap) =>{
    const files = [];
    snap.forEach(d=> files.push({id:d.id, ...d.data()}));
    renderFileList(files);
  });
}

// render and search
function renderFileList(files){
  fileListDiv.innerHTML='';
  const q = (searchInput.value||'').toLowerCase();
  const filtered = files.filter(f=> f.name.toLowerCase().includes(q));
  if(filtered.length===0) fileListDiv.innerHTML='<p>No files found</p>';
  filtered.forEach(f=>{
    const row = document.createElement('div'); row.className='file-row';
    row.innerHTML = <div class='meta'>${f.name}</div><div class='actions'><button onclick="openFile('${f.url}')">Open</button></div>;
    fileListDiv.appendChild(row);
  });
}

searchInput.addEventListener('input', async ()=>{
  // snapshot already re-renders; just trigger filtering by re-fetching all
  const snap = await getDocs(collection(db,'files'));
  const files = []; snap.forEach(d=>files.push({id:d.id, ...d.data()}));
  renderFileList(files);
});

// helper: open file (called from dynamic HTML)
window.openFile = function(url){ window.open(url,'_blank'); }
window.deleteFile = deleteFile;

// helper: SHA-256 (returns hex)
async function sha256(message){
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b=>b.toString(16).padStart(2,'0')).join('');
  return hashHex;
}

// Notes: This simple approach stores file URLs in Firestore and shows only name+button in user UI.
// Admin must create initial admin user via Firebase Console > Authentication > Users (create user)

