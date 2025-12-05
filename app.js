/* app.js
   Secure Drive File Manager (SDFM)
   - Uses Firebase v8 (CDN scripts loaded in index.html)
   - Functions required by spec are defined globally
*/

/* --------- Firebase config ---------
 Replace the following config with your project's config.
 (Get it from Firebase Console -> Project settings -> SDK snippet)
*/
var firebaseConfig = {
  apiKey: "AIzaSyDMLkQa5ZtsezKD9BLMpQt1cmZcYThUjPs",
  authDomain: "family-photo-b81a9.firebaseapp.com",
  projectId: "family-photo-b81a9",
  storageBucket: "family-photo-b81a9.firebasestorage.app",
  messagingSenderId: "638306894478",
  appId: "1:638306894478:web:63e2a8600e5ffdb396ffdf"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
var auth = firebase.auth();
var db = firebase.database();

/* ----------------- Global state ----------------- */
let currentPage = 'home';
let filesData = {}; // cache files by id: { id: { title, linkEncoded } }
let currentUser = null; // Firebase auth user when admin logged in

/* ---------- Helper DOM refs ---------- */
const homePage = document.getElementById('homePage');
const adminLoginPage = document.getElementById('adminLoginPage');
const userLoginPage = document.getElementById('userLoginPage');
const adminPanel = document.getElementById('adminPanel');
const userPanel = document.getElementById('userPanel');

const adminLoginMsg = document.getElementById('adminLoginMsg');
const userLoginMsg = document.getElementById('userLoginMsg');
const updatePasswordMsg = document.getElementById('updatePasswordMsg');
const addFileMsg = document.getElementById('addFileMsg');

const adminFileList = document.getElementById('adminFileList');
const userFileList = document.getElementById('userFileList');
const searchInput = document.getElementById('searchInput');

/* ---------- Navigation helpers ---------- */
function showSection(section) {
  // hide all
  [homePage, adminLoginPage, userLoginPage, adminPanel, userPanel].forEach(s => {
    if (!s) return;
    s.classList.add('hidden');
  });
  // show target
  section.classList.remove('hidden');
  window.scrollTo(0,0);
}

function showHome(){ showSection(homePage); currentPage='home' }
function showAdminLogin(){ showSection(adminLoginPage); currentPage='adminLogin' }
function showUserLogin(){ showSection(userLoginPage); currentPage='userLogin' }

/* Expose these navigation functions if needed by UI (not strictly required) */
window.showHome = showHome;
window.showAdminLogin = showAdminLogin;
window.showUserLogin = showUserLogin;

/* ---------- Required function names (global) ---------- */

/* adminLogin()
   Uses Firebase Authentication (email + password)
*/
function adminLogin(){
  const email = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPassword').value;
  adminLoginMsg.textContent = ''; adminLoginMsg.className = 'message';

  if(!email || !password){
    adminLoginMsg.textContent = 'Enter email and password.';
    adminLoginMsg.classList.add('error');
    return;
  }
  auth.signInWithEmailAndPassword(email, password)
    .then(userCred => {
      currentUser = userCred.user;
      adminLoginMsg.textContent = 'Login successful. Redirecting to Admin Panel...';
      adminLoginMsg.classList.add('success');
      // Show admin panel
      loadFilesForAdmin();
      showSection(adminPanel);
      currentPage = 'adminPanel';
    })
    .catch(err => {
      adminLoginMsg.textContent = 'Login failed: ' + err.message;
      adminLoginMsg.classList.add('error');
    });
}
window.adminLogin = adminLogin;

/* userLogin()
   Compare entered password with settings/userPassword in DB */
function userLogin(){
  const val = document.getElementById('userPasswordInput').value;
  userLoginMsg.textContent = ''; userLoginMsg.className = 'message';
  if(!val){ userLoginMsg.textContent='Enter password.'; userLoginMsg.classList.add('error'); return; }

  db.ref('settings/userPassword').once('value')
    .then(snap=>{
      const stored = snap.val();
      if(stored === null){
        userLoginMsg.textContent = 'No user password set. Contact admin.';
        userLoginMsg.classList.add('error');
        return;
      }
      if(val === stored){
        userLoginMsg.textContent = 'Access granted.';
        userLoginMsg.classList.add('success');
        // load user panel
        loadFilesForUser();
        showSection(userPanel);
        currentPage='userPanel';
      } else {
        userLoginMsg.textContent = 'Incorrect password.';
        userLoginMsg.classList.add('error');
      }
    }).catch(err=>{
      userLoginMsg.textContent = 'Error checking password: ' + err.message;
      userLoginMsg.classList.add('error');
    });
}
window.userLogin = userLogin;

/* updateUserPassword()
   Admin sets settings/userPassword (only allowed if admin authenticated) */
function updateUserPassword(){
  updatePasswordMsg.textContent = ''; updatePasswordMsg.className = 'message';
  const newPass = document.getElementById('newUserPassword').value;
  if(!newPass){ updatePasswordMsg.textContent='Enter a new user password.'; updatePasswordMsg.classList.add('error'); return; }
  if(!auth.currentUser){
    updatePasswordMsg.textContent = 'Admin not authenticated.';
    updatePasswordMsg.classList.add('error');
    return;
  }
  db.ref('settings/userPassword').set(newPass)
    .then(()=>{
      updatePasswordMsg.textContent = 'User password updated.';
      updatePasswordMsg.classList.add('success');
    }).catch(err=>{
      updatePasswordMsg.textContent = 'Failed to update: ' + err.message;
      updatePasswordMsg.classList.add('error');
    });
}
window.updateUserPassword = updateUserPassword;

/* addFile()
   Admin adds file: store title and base64-encoded link
   Stored path: files/{autoID}/title and link
*/
function addFile(){
  addFileMsg.textContent = ''; addFileMsg.className = 'message';
  const title = document.getElementById('fileTitle').value.trim();
  const link = document.getElementById('fileLink').value.trim();
  if(!title || !link){ addFileMsg.textContent='Enter title and link.'; addFileMsg.classList.add('error'); return; }
  if(!auth.currentUser){
    addFileMsg.textContent='Admin not authenticated.';
    addFileMsg.classList.add('error');
    return;
  }

  // encode link (base64)
  const encoded = btoa(unescape(encodeURIComponent(link)));

  const newRef = db.ref('files').push();
  newRef.set({
    title: title,
    link: encoded
  }).then(()=>{
    addFileMsg.textContent = 'File added.';
    addFileMsg.classList.add('success');
    document.getElementById('fileTitle').value = '';
    document.getElementById('fileLink').value = '';
  }).catch(err=>{
    addFileMsg.textContent = 'Error: ' + err.message;
    addFileMsg.classList.add('error');
  });
}
window.addFile = addFile;

/* deleteFile()
   Admin only: remove file by id
*/
function deleteFile(id){
  if(!confirm('Delete this file?')) return;
  if(!auth.currentUser){ alert('Admin not authenticated'); return; }
  db.ref('files/'+id).remove()
    .then(()=>{ loadFilesForAdmin(); })
    .catch(err=>{ alert('Delete failed: ' + err.message); });
}
window.deleteFile = deleteFile;

/* searchFiles()
   Real-time filtering on the client side (as user types).
   Reads from cached filesData and re-renders user list.
*/
function searchFiles(){
  const q = (searchInput.value || '').trim().toLowerCase();
  renderUserList(q);
}
window.searchFiles = searchFiles;

/* logout()
   Signs out admin or returns to home for user
*/
function logout(){
  if(auth.currentUser){
    auth.signOut().catch(()=>{});
  }
  // clear caches
  filesData = {};
  currentUser = null;
  document.getElementById('adminEmail').value='';
  document.getElementById('adminPassword').value='';
  document.getElementById('userPasswordInput').value='';
  adminLoginMsg.textContent = '';
  userLoginMsg.textContent = '';
  updatePasswordMsg.textContent = '';
  addFileMsg.textContent = '';
  showHome();
}
window.logout = logout;

/* loadFilesForAdmin()
   Loads all files from DB and renders admin file list with Open & Delete
*/
function loadFilesForAdmin(){
  if(!auth.currentUser){
    // require admin
    showAdminLogin();
    return;
  }
  db.ref('files').off();
  db.ref('files').on('value', snap=>{
    const val = snap.val() || {};
    filesData = {};
    adminFileList.innerHTML = '';
    Object.keys(val).forEach(id=>{
      const item = val[id];
      const title = item.title || '(no title)';
      const linkEncoded = item.link || '';
      filesData[id] = { title, linkEncoded };

      // create li
      const li = document.createElement('li');

      const left = document.createElement('div');
      left.style.display='flex'; left.style.alignItems='center';
      const titleSpan = document.createElement('div');
      titleSpan.className='title';
      titleSpan.textContent = title;
      left.appendChild(titleSpan);

      const actions = document.createElement('div');
      actions.className = 'actions';
      // Open button (admin only)
      const openBtn = document.createElement('button');
      openBtn.className = 'btn';
      openBtn.textContent = 'Open';
      openBtn.onclick = function(){
        // decode and open actual link in a new tab (admin)
        try{
          const decoded = decodeURIComponent(escape(atob(linkEncoded)));
          window.open(decoded, '_blank');
        }catch(e){
          alert('Failed to open link.');
        }
      };
      const delBtn = document.createElement('button');
      delBtn.className = 'btn danger';
      delBtn.textContent = 'Delete';
      delBtn.onclick = function(){ deleteFile(id); };

      actions.appendChild(openBtn);
      actions.appendChild(delBtn);

      li.appendChild(left);
      li.appendChild(actions);
      adminFileList.appendChild(li);
    });
  }, err=>{
    adminFileList.innerHTML = '<li class="muted">Failed to load files: '+err.message+'</li>';
  });
}
window.loadFilesForAdmin = loadFilesForAdmin;

/* loadFilesForUser()
   Loads titles only (links are stored in filesData cache)
   Titles are visible; clicking title opens a secure blob redirect to the decoded link
*/
function loadFilesForUser(){
  db.ref('files').off();
  db.ref('files').on('value', snap=>{
    const val = snap.val() || {};
    filesData = {};
    Object.keys(val).forEach(id=>{
      filesData[id] = { title: val[id].title || '(no title)', linkEncoded: val[id].link || '' };
    });
    renderUserList();
  }, err=>{
    userFileList.innerHTML = '<li class="muted">Failed to load files: '+err.message+'</li>';
  });
}
window.loadFilesForUser = loadFilesForUser;

/* renderUserList(filter)
   Renders userFileList from filesData; clicking a title opens secure blob redirect.
   IMPORTANT: Do NOT inject raw links into DOM attributes or text.
*/
function renderUserList(filter){
  filter = (filter || '').toLowerCase();
  userFileList.innerHTML = '';
  const ids = Object.keys(filesData || {});
  if(ids.length === 0){
    userFileList.innerHTML = '<li class="muted">No files available.</li>';
    return;
  }
  ids.forEach(id=>{
    const obj = filesData[id];
    if(!obj) return;
    const title = obj.title || '(no title)';
    if(filter && title.toLowerCase().indexOf(filter) === -1) return;

    const li = document.createElement('li');
    const titleDiv = document.createElement('div');
    titleDiv.className = 'title';
    titleDiv.textContent = title;
    // When clicking, open a blob page that decodes and redirects.
    titleDiv.onclick = function(){
      openSecureLink(obj.linkEncoded);
    };
    li.appendChild(titleDiv);
    userFileList.appendChild(li);
  });
}

/* openSecureLink(encodedLink)
   Creates an HTML blob (no server) that decodes the base64 link and redirects.
   The blob is opened in a new tab, so the main page never contains the raw link.
   This addresses the "no raw links in HTML/attributes/source" requirement.
*/
function openSecureLink(encodedLink){
  try {
    const decoded = decodeURIComponent(escape(atob(encodedLink)));

    // Extract Google Drive File ID
    const match = decoded.match(/\/d\/(.*?)\//);
    if(!match){
      alert("Invalid Google Drive link.");
      return;
    }
    const fileId = match[1];

    // Build preview link
    const previewURL = "https://drive.google.com/file/d/" + fileId + "/preview";

    // Show inside iframe
    document.getElementById("filePreviewBox").classList.remove("hidden");
    document.getElementById("filePreviewFrame").src = previewURL;

  } catch (e) {
    alert("Failed to load preview.");
  }
}
window.openSecureLink = openSecureLink;

/* ---------- Auth state listener ---------- */
auth.onAuthStateChanged(user=>{
  currentUser = user;
  if(user){
    // If admin signed in and currently not on admin panel, load admin view
    if(currentPage === 'adminLogin' || currentPage === 'home'){
      loadFilesForAdmin();
      showSection(adminPanel);
      currentPage = 'adminPanel';
    }
  } else {
    // logged out - if currently admin panel, send to home
    if(currentPage === 'adminPanel'){
      showHome();
    }
  }
});

/* ---------- Initial load: just show home ---------- */
showUserLogin();


