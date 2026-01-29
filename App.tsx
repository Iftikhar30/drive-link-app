import React, { useState, useEffect, useMemo } from 'react';
import { 
  Folder as FolderIcon, 
  Plus, 
  Menu, 
  Search, 
  X, 
  LogOut, 
  Lock, 
  Edit2, 
  Trash2, 
  Save,
  PlusCircle,
  ChevronRight,
  LayoutDashboard,
  Settings,
  ArrowLeft,
  Mail,
  GripVertical
} from 'lucide-react';
import { ItemType, AuthStatus, ViewState, Folder, FolderItem } from './types';

// Safe access to global firebase
const getFirebase = () => (window as any).firebase;
const generateId = () => Math.random().toString(36).substring(2, 9);

// --- Circular Gauge Background ---
const GaugeBackground: React.FC = () => {
  const tickCount = 72; // Total dashes in the circle
  const activeCount = 10; // Number of dashes in the rotating highlight
  
  return (
    <div className="gauge-container">
      {/* Static idle ticks */}
      <div className="gauge-static">
        {Array.from({ length: tickCount }).map((_, i) => (
          <div 
            key={`static-${i}`} 
            className="tick"
            style={{ 
              transform: `translate(-50%, -50%) rotate(${i * (360 / tickCount)}deg) translateY(-235px)` 
            }}
          />
        ))}
      </div>
      
      {/* Rotating highlight ticks */}
      <div className="gauge-rotating">
        {Array.from({ length: activeCount }).map((_, i) => (
          <div 
            key={`active-${i}`} 
            className="active-tick"
            style={{ 
              transform: `translate(-50%, -50%) rotate(${i * (360 / tickCount)}deg) translateY(-235px)`,
              opacity: (i + 1) / activeCount // Fade trail effect
            }}
          />
        ))}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const firebase = getFirebase();

  // --- Auth & Navigation State ---
  const [authStatus, setAuthStatus] = useState<AuthStatus>('logged-out');
  const [view, setView] = useState<ViewState>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  // User Navigation State
  const [activeFolder, setActiveFolder] = useState<Folder | null>(null);

  // --- Data State ---
  const [folders, setFolders] = useState<Folder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // --- Form States (Login) ---
  const [userPasswordInput, setUserPasswordInput] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [loginMsg, setLoginMsg] = useState({ text: '', type: '' });
  
  // --- Form States (Folder Management) ---
  const [folderForm, setFolderForm] = useState<{name: string, mainLink: string, mainLinkName: string, items: FolderItem[]}>({
    name: '',
    mainLink: '',
    mainLinkName: '',
    items: []
  });
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [newPassInput, setNewPassInput] = useState('');
  const [passUpdateMsg, setPassUpdateMsg] = useState({ text: '', type: '' });

  // --- Helpers ---
  const extractDriveFileId = (url: string) => {
    if (!url) return null;
    let match0 = url.match(/embeddedfolderview\?id=([a-zA-Z0-9_-]+)/);
    if (match0) return match0[1];
    let match1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match1) return match1[1];
    let match2 = url.match(/open\?id=([a-zA-Z0-9_-]+)/);
    if (match2) return match2[1];
    let match3 = url.match(/uc\?id=([a-zA-Z0-9_-]+)/);
    if (match3) return match3[1];
    return null;
  };

  const getThumbnailUrl = (url: string) => {
    if (!url) return "https://cdn-icons-png.flaticon.com/512/716/716784.png";
    let decodedUrl = url;
    try {
        if (!url.startsWith('http') && !url.startsWith('/')) decodedUrl = atob(url);
    } catch(e) {}
    
    if (decodedUrl.includes("embeddedfolderview") || decodedUrl.includes("folders")) {
      return "https://cdn-icons-png.flaticon.com/512/716/716784.png"; 
    }
    const id = extractDriveFileId(decodedUrl);
    if (!id) return "https://cdn-icons-png.flaticon.com/512/716/716784.png";
    return `https://drive.google.com/thumbnail?id=${id}`;
  };

  const openSecureLink = (encoded: string) => {
    try {
      const url = (!encoded.startsWith('http') && !encoded.startsWith('/')) ? atob(encoded) : encoded;
      window.open(url, "_blank");
    } catch (e) {
      window.open(encoded, "_blank");
    }
  };

  // --- Firebase Sync ---
  useEffect(() => {
    if (!firebase) return;
    if (!firebase.apps.length) {
      const config = {
        apiKey: "AIzaSyDMLkQa5ZtsezKD9BLMpQt1cmZcYThUjPs",
        authDomain: "family-photo-b81a9.firebaseapp.com",
        databaseURL: "https://family-photo-b81a9-default-rtdb.firebaseio.com",
        projectId: "family-photo-b81a9",
        storageBucket: "family-photo-b81a9.firebasestorage.app",
        messagingSenderId: "638306894478",
        appId: "1:638306894478:web:63e2a8600e5ffdb396ffdf"
      };
      firebase.initializeApp(config);
    }

    const db = firebase.database();
    const foldersRef = db.ref("files");
    foldersRef.on("value", (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => {
          const item = data[key];
          return {
            ...item,
            id: key,
            name: item.name || item.title || "Untitled Folder",
            mainLink: item.mainLink || item.link || "",
            mainLinkName: item.mainLinkName || "DOCUMENT",
            items: item.items || [],
            createdAt: item.createdAt || 0,
            order: item.order !== undefined ? item.order : 999
          };
        });
        setFolders(list.sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || b.createdAt - a.createdAt));
      } else {
        setFolders([]);
      }
    });
    return () => foldersRef.off();
  }, [firebase]);

  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => setDraggedItemIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => e.preventDefault();
  const handleDrop = (index: number) => {
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    const newFolders = [...folders];
    const [movedItem] = newFolders.splice(draggedItemIndex, 1);
    newFolders.splice(index, 0, movedItem);
    setFolders(newFolders);
    setDraggedItemIndex(null);
    newFolders.forEach((folder, idx) => {
      firebase.database().ref(`files/${folder.id}`).update({ order: idx });
    });
  };

  const handleUserLogin = () => {
    firebase.database().ref("settings/userPassword").once("value", (snap: any) => {
      if (snap.val() === userPasswordInput) {
        setAuthStatus('user');
        setLoginMsg({ text: '', type: '' });
      } else {
        setLoginMsg({ text: 'ভুল পাসওয়ার্ড!', type: 'error' });
      }
    });
  };

  const handleAdminLogin = () => {
    firebase.auth().signInWithEmailAndPassword(adminEmail, adminPass)
      .then(() => {
        setAuthStatus('admin');
        setView('dashboard');
        setLoginMsg({ text: '', type: '' });
      })
      .catch((err: any) => setLoginMsg({ text: err.message, type: 'error' }));
  };

  const handleLogout = () => {
    firebase.auth().signOut();
    setAuthStatus('logged-out');
    setUserPasswordInput('');
    setAdminPass('');
    setIsSidebarOpen(false);
    setActiveFolder(null);
  };

  const handleUpdatePassword = () => {
    if (!newPassInput.trim() || newPassInput.length < 4) {
      setPassUpdateMsg({ text: 'পাসওয়ার্ড ন্যূনতম ৪ অক্ষরের হতে হবে', type: 'error' });
      return;
    }
    firebase.database().ref("settings/userPassword").set(newPassInput)
      .then(() => {
        setPassUpdateMsg({ text: 'পাসওয়ার্ড আপডেট সফল!', type: 'success' });
        setNewPassInput('');
      })
      .catch((err: any) => setPassUpdateMsg({ text: err.message, type: 'error' }));
  };

  const handleOpenCreateModal = () => {
    setEditingFolderId(null);
    setFolderForm({ name: '', mainLink: '', mainLinkName: '', items: [] });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (folder: any) => {
    setEditingFolderId(folder.id);
    let linkToEdit = folder.mainLink || "";
    try { if (linkToEdit && !linkToEdit.startsWith('http')) linkToEdit = atob(linkToEdit); } catch(e) {}
    setFolderForm({ 
      name: folder.name, 
      mainLink: linkToEdit, 
      mainLinkName: folder.mainLinkName || 'DOCUMENT',
      items: [...(folder.items || [])] 
    });
    setIsModalOpen(true);
  };

  const handleSaveFolder = () => {
    if (!folderForm.name.trim()) return alert("ফোল্ডার নাম আবশ্যক");
    const db = firebase.database();
    const encodedMainLink = folderForm.mainLink ? btoa(folderForm.mainLink) : "";
    const folderData = {
      name: folderForm.name,
      title: folderForm.name,
      mainLink: encodedMainLink,
      mainLinkName: folderForm.mainLinkName || "DOCUMENT",
      items: folderForm.items || [],
      createdAt: editingFolderId ? (folders.find(f => f.id === editingFolderId)?.createdAt || Date.now()) : Date.now()
    };
    if (editingFolderId) {
      db.ref(`files/${editingFolderId}`).update(folderData).then(() => setIsModalOpen(false));
    } else {
      db.ref("files").push({ ...folderData, order: folders.length }).then(() => setIsModalOpen(false));
    }
  };

  const filteredFolders = useMemo(() => {
    const lower = searchTerm.toLowerCase();
    return folders.filter(f => f.name.toLowerCase().includes(lower));
  }, [folders, searchTerm]);

  const sortedSubItems = useMemo(() => {
    if (!activeFolder) return [];
    const itemsList: FolderItem[] = [...(activeFolder.items || [])];
    if (activeFolder.mainLink) {
        itemsList.push({ id: 'virtual-main', name: activeFolder.mainLinkName || 'DOCUMENT', type: 'folder', link: activeFolder.mainLink });
    }
    return itemsList.sort((a, b) => (a.type === 'folder' ? -1 : 1));
  }, [activeFolder]);

  // --- Auth Pages ---
  if (authStatus === 'logged-out' || authStatus === 'admin-login') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0f172a] p-4 relative overflow-hidden">
        {/* Animated Gauge Effect around the card */}
        <GaugeBackground />
        
        <div className="login-card w-full max-w-[340px] sm:max-w-[400px] border border-white/5 p-10 rounded-[2.5rem] shadow-2xl relative z-10 text-center animate-in zoom-in-95 duration-500">
          {authStatus === 'logged-out' ? (
            <>
              <h2 className="text-orange-500 font-bold uppercase tracking-widest text-[10px] mb-2">Welcome</h2>
              <h1 className="text-2xl font-bold text-white mb-8 tracking-tight">আমার ভাবনাগুলোতে</h1>
              
              <div className="space-y-6">
                <div className="relative">
                  <Lock className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input 
                    type="password" 
                    placeholder="পাসওয়ার্ড দিন..." 
                    className="w-full bg-[#0f172a] border border-white/10 rounded-full py-4 px-6 text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm"
                    value={userPasswordInput}
                    onChange={(e) => setUserPasswordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUserLogin()}
                  />
                </div>

                <button onClick={handleUserLogin} className="w-full py-4 bg-orange-600 text-white rounded-full font-black shadow-lg shadow-orange-900/20 hover:bg-orange-700 active:scale-95 transition-all text-sm uppercase tracking-widest">
                  Enter
                </button>
                
                {loginMsg.text && <p className="text-rose-400 text-xs font-bold">{loginMsg.text}</p>}
                
                <div className="pt-6 border-t border-white/5">
                  <button onClick={() => setAuthStatus('admin-login')} className="text-slate-500 hover:text-orange-500 text-xs font-bold transition-colors uppercase tracking-widest">Admin Login</button>
                </div>
              </div>
            </>
          ) : (
            <div className="animate-in fade-in duration-300">
               <h1 className="text-xl font-bold text-orange-500 mb-8 uppercase tracking-widest">Admin Access</h1>
               <div className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input type="email" placeholder="Email" className="w-full bg-[#0f172a] border border-white/10 rounded-full py-3.5 px-6 text-white outline-none focus:ring-2 focus:ring-orange-500 text-sm" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
                  </div>
                  <div className="relative">
                    <Lock className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input type="password" placeholder="Password" className="w-full bg-[#0f172a] border border-white/10 rounded-full py-3.5 px-6 text-white outline-none focus:ring-2 focus:ring-orange-500 text-sm" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()} />
                  </div>
                  <button onClick={handleAdminLogin} className="w-full py-4 bg-orange-600 text-white rounded-full font-black shadow-lg hover:bg-orange-700 active:scale-95 text-sm uppercase tracking-widest">Login</button>
                  {loginMsg.text && <p className="text-rose-400 text-center text-[10px] mt-2 font-bold uppercase">{loginMsg.text}</p>}
                  <button onClick={() => { setAuthStatus('logged-out'); setLoginMsg({text:'',type:''}); }} className="w-full text-slate-500 text-[11px] font-black pt-6 text-center hover:text-white uppercase tracking-widest">Back</button>
               </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Main App Content ---
  if (authStatus === 'user') {
    return (
      <div className="min-h-screen w-full bg-[#f6f8fb] flex flex-col font-sans page-enter overflow-hidden">
        <header className="bg-white px-4 py-4 sm:px-6 flex items-center justify-between shadow-sm sticky top-0 z-20">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600 rounded-lg active:bg-slate-100 transition-colors"><Menu size={24} /></button>
          <h3 className="font-bold text-base sm:text-lg text-slate-800 tracking-tight truncate max-w-[60%]">{activeFolder ? activeFolder.name : 'My Drive'}</h3>
          <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="p-2 text-slate-600 rounded-lg active:bg-slate-100 transition-colors"><Search size={22} /></button>
        </header>

        {isSidebarOpen && (
          <div className="fixed inset-0 z-[60]">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
            <div className="absolute top-0 left-0 h-full w-64 sm:w-72 bg-white p-6 shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
              <div className="flex justify-between items-center mb-10"><h2 className="text-xl font-bold">Options</h2><X onClick={() => setIsSidebarOpen(false)} className="text-slate-400 cursor-pointer" /></div>
              <button onClick={handleLogout} className="w-full py-4 bg-rose-500 text-white rounded-2xl font-bold mt-auto flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"><LogOut size={20} /> Logout</button>
            </div>
          </div>
        )}

        {isSearchOpen && (
          <div className="px-4 py-3 bg-white border-t border-slate-100 animate-in slide-in-from-top duration-200">
            <input type="text" placeholder="Search..." className="w-full bg-slate-50 py-3 px-5 rounded-xl outline-none text-slate-800 border focus:border-blue-300" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} autoFocus />
          </div>
        )}

        <main className="p-4 sm:p-6 flex-1 overflow-y-auto max-w-7xl mx-auto w-full custom-scrollbar">
          {activeFolder ? (
            <div className="animate-in fade-in duration-300">
              <button onClick={() => setActiveFolder(null)} className="mb-6 flex items-center gap-2 text-blue-600 font-bold px-3 py-2 hover:bg-blue-50 rounded-xl transition-all text-sm"><ArrowLeft size={18} /> Back</button>
              <div className="folder-grid">
                {sortedSubItems.map(item => (
                    <div key={item.id} onClick={() => item.link && openSecureLink(item.link)} className="bg-white rounded-[2rem] p-4 sm:p-6 flex flex-col items-center text-center cursor-pointer shadow-sm hover:shadow-md transition-all active:scale-95 border border-slate-100">
                        <img src={getThumbnailUrl(item.link)} className="w-16 h-16 sm:w-20 sm:h-20 mb-3 object-cover rounded-xl shadow-sm" alt="item" />
                        <span className="text-xs sm:text-sm font-bold text-slate-800 truncate block w-full">{item.name}</span>
                    </div>
                ))}
                {sortedSubItems.length === 0 && <div className="col-span-full text-center py-20 text-slate-300 font-bold uppercase tracking-widest text-xs">No items</div>}
              </div>
            </div>
          ) : (
            <div className="folder-grid">
              {filteredFolders.map(folder => (
                  <div key={folder.id} onClick={() => (folder.items?.length ? setActiveFolder(folder) : openSecureLink(folder.mainLink || ''))} className="bg-white rounded-[2rem] p-4 sm:p-6 flex flex-col items-center text-center cursor-pointer shadow-sm hover:shadow-md transition-all active:scale-95 border border-slate-100 relative group overflow-hidden">
                      {folder.items?.length > 0 && <span className="absolute top-3 right-3 bg-blue-50 text-blue-600 text-[8px] font-black px-2 py-0.5 rounded-full">{folder.items.length} ITM</span>}
                      <img src={getThumbnailUrl(folder.mainLink || '')} className="w-16 h-16 sm:w-20 sm:h-20 mb-3 object-cover rounded-xl shadow-sm" alt="folder" />
                      <span className="text-xs sm:text-sm font-bold text-slate-800 truncate w-full">{folder.name}</span>
                  </div>
              ))}
              {filteredFolders.length === 0 && <div className="col-span-full text-center py-20 text-slate-300 font-bold uppercase text-xs">Empty Drive</div>}
            </div>
          )}
        </main>
        <footer className="py-6 text-center text-slate-300 text-[10px] font-black tracking-widest uppercase">Developer By Iftikhar</footer>
      </div>
    );
  }

  if (authStatus === 'admin') {
    return (
      <div className="min-h-screen w-full bg-[#f8fafc] flex flex-col font-sans page-enter overflow-hidden">
        <header className="h-16 sm:h-20 bg-white border-b border-slate-100 flex items-center justify-between px-4 sm:px-10 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-all"><Menu size={22} /></button>
            <h2 className="font-black text-lg sm:text-xl text-slate-800 tracking-tighter">ADMIN</h2>
          </div>
          <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><Search size={22} /></button>
        </header>

        {isSearchOpen && (
          <div className="bg-white px-4 sm:px-10 py-3 border-b border-slate-100 animate-in slide-in-from-top duration-300">
            <input type="text" placeholder="Search collections..." className="w-full bg-slate-50 py-3 px-4 rounded-xl outline-none border focus:border-blue-400 text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} autoFocus />
          </div>
        )}

        <main className="p-4 sm:p-10 flex-1 overflow-y-auto max-w-7xl mx-auto w-full custom-scrollbar">
          {view === 'dashboard' ? (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                 <div><h1 className="text-2xl font-bold text-slate-800">Collections</h1><p className="text-slate-400 text-xs sm:text-sm">Manage folder contents</p></div>
                 <button onClick={handleOpenCreateModal} className="w-full sm:w-auto bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100 transition-all active:scale-95 text-sm"><Plus size={20} /> Create Folder</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {filteredFolders.map((folder, index) => (
                  <div key={folder.id} draggable onDragStart={() => handleDragStart(index)} onDragOver={(e) => handleDragOver(e, index)} onDrop={() => handleDrop(index)} className={`bg-white border border-slate-100 rounded-[2rem] p-6 hover:shadow-xl transition-all group overflow-hidden relative ${draggedItemIndex === index ? 'opacity-20 scale-95' : 'opacity-100'}`}>
                     <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-xl flex items-center justify-center cursor-grab active:cursor-grabbing"><GripVertical size={20} /></div>
                        <div className="flex gap-2">
                          <button onClick={() => handleOpenEditModal(folder)} className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-all"><Edit2 size={16} /></button>
                          <button onClick={() => firebase.database().ref(`files/${folder.id}`).remove()} className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-all"><Trash2 size={16} /></button>
                        </div>
                     </div>
                     <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-1 truncate">{folder.name}</h3>
                     <p className="text-[10px] font-black text-slate-300 mb-8 uppercase tracking-widest">{folder.items?.length || 0} Sub-Items</p>
                     <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                       <span className="text-[9px] font-black text-slate-200 uppercase tracking-widest">{new Date(folder.createdAt).toLocaleDateString()}</span>
                       <button onClick={() => handleOpenEditModal(folder)} className="text-blue-600 font-bold text-[10px] flex items-center gap-1">EDIT <ChevronRight size={14} /></button>
                     </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-md mx-auto py-10 w-full">
               <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 sm:p-10 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600"></div>
                  <div className="flex items-center gap-4 mb-10"><div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><Settings size={24} /></div><div><h2 className="text-xl font-bold text-slate-800">Password</h2><p className="text-slate-400 text-xs">Update user entry password</p></div></div>
                  <div className="space-y-6">
                     <input type="password" placeholder="New password" className="w-full bg-slate-50 py-4 px-6 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold border text-sm" value={newPassInput} onChange={(e) => setNewPassInput(e.target.value)} />
                     {passUpdateMsg.text && <div className={`p-4 rounded-xl text-xs font-bold ${passUpdateMsg.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{passUpdateMsg.text}</div>}
                     <button onClick={handleUpdatePassword} className="w-full py-4 bg-blue-600 text-white rounded-[1.25rem] font-black hover:bg-blue-700 transition-all text-sm uppercase tracking-widest">Update</button>
                     <button onClick={() => setView('dashboard')} className="w-full text-slate-400 text-xs font-bold py-2 uppercase tracking-widest">Cancel</button>
                  </div>
               </div>
            </div>
          )}
        </main>

        {isSidebarOpen && (
          <>
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[80]" onClick={() => setIsSidebarOpen(false)} />
            <div className="fixed top-0 left-0 h-full w-72 bg-white z-[100] p-8 flex flex-col shadow-2xl rounded-r-[2.5rem] animate-in slide-in-from-left duration-300">
               <div className="flex justify-between items-center mb-16"><div className="flex items-center gap-3 font-black text-xl text-slate-800 tracking-tighter">SDFM</div><X onClick={() => setIsSidebarOpen(false)} className="text-slate-400" /></div>
               <nav className="flex-1 space-y-3">
                  <button onClick={() => { setView('dashboard'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl font-bold text-sm ${view === 'dashboard' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-400'}`}><LayoutDashboard size={20} /> Dashboard</button>
                  <button onClick={() => { setView('update-password'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl font-bold text-sm ${view === 'update-password' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-400'}`}><Settings size={20} /> Update Password</button>
                  <button onClick={handleLogout} className="w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl font-bold text-rose-500 mt-auto hover:bg-rose-50 text-sm"><LogOut size={20} /> Logout</button>
               </nav>
            </div>
          </>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
             <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
             <div className="relative bg-white w-full max-w-4xl h-full max-h-[90vh] rounded-[2rem] sm:rounded-[3rem] shadow-2xl flex flex-col animate-in zoom-in-95 duration-400 overflow-hidden border border-slate-100">
                <div className="p-6 sm:p-10 border-b border-slate-100 flex items-center justify-between bg-white z-20"><h3 className="text-lg sm:text-xl font-bold text-slate-800">{editingFolderId ? 'Edit Folder' : 'New Folder'}</h3><X onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 cursor-pointer" /></div>
                <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-10 custom-scrollbar modal-content-container">
                   <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Name *</label><input type="text" placeholder="Folder Name" className="w-full bg-slate-50 border rounded-2xl px-5 py-3.5 text-slate-800 outline-none font-bold focus:ring-2 focus:ring-blue-500 text-sm" value={folderForm.name} onChange={(e) => setFolderForm(prev => ({ ...prev, name: e.target.value }))} /></div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 bg-blue-50/50 rounded-3xl border border-blue-100/50">
                      <div className="space-y-2"><label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Link Name</label><input type="text" className="w-full bg-white border border-blue-100 rounded-xl px-4 py-3 text-slate-800 outline-none font-bold text-sm" value={folderForm.mainLinkName} onChange={(e) => setFolderForm(prev => ({ ...prev, mainLinkName: e.target.value }))} /></div>
                      <div className="space-y-2"><label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Link URL</label><input type="text" className="w-full bg-white border border-blue-100 rounded-xl px-4 py-3 text-slate-800 outline-none font-bold text-sm" value={folderForm.mainLink} onChange={(e) => setFolderForm(prev => ({ ...prev, mainLink: e.target.value }))} /></div>
                   </div>
                   <div className="space-y-6">
                      <div className="flex items-center justify-between border-b pb-4"><h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Sub-Items ({folderForm.items.length})</h4><button onClick={() => setFolderForm(prev => ({ ...prev, items: [...prev.items, { id: generateId(), name: '', type: 'other', link: '' }] }))} className="text-blue-600 font-bold text-xs bg-blue-50 px-4 py-2 rounded-xl flex items-center gap-1.5 uppercase"><PlusCircle size={16} /> Add</button></div>
                      <div className="space-y-4">
                         {folderForm.items.map((item) => (
                           <div key={item.id} className="bg-slate-50 rounded-2xl p-5 flex flex-col lg:flex-row gap-5 border border-slate-100 group">
                              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                 <input type="text" placeholder="Item Name" className="w-full bg-white border rounded-xl py-2.5 px-4 text-xs font-bold outline-none" value={item.name} onChange={(e) => setFolderForm(prev => ({ ...prev, items: prev.items.map(it => it.id === item.id ? {...it, name: e.target.value} : it) }))} />
                                 <select className="w-full bg-white border rounded-xl py-2.5 px-4 text-xs font-bold outline-none" value={item.type} onChange={(e) => setFolderForm(prev => ({ ...prev, items: prev.items.map(it => it.id === item.id ? {...it, type: e.target.value as ItemType} : it) }))}>
                                     <option value="image">Image</option><option value="video">Video</option><option value="document">Document</option><option value="folder">Folder</option><option value="other">Other</option>
                                 </select>
                                 <input type="text" placeholder="URL" className="w-full bg-white border rounded-xl py-2.5 px-4 text-xs font-bold outline-none" value={item.link} onChange={(e) => setFolderForm(prev => ({ ...prev, items: prev.items.map(it => it.id === item.id ? {...it, link: e.target.value} : it) }))} />
                              </div>
                              <button onClick={() => setFolderForm(prev => ({ ...prev, items: prev.items.filter(it => it.id !== item.id) }))} className="p-2.5 text-rose-300 hover:text-rose-500 transition-colors self-center bg-rose-50 rounded-xl"><Trash2 size={20} /></button>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>
                <div className="p-6 sm:p-10 border-t bg-slate-50 flex justify-end gap-4"><button onClick={() => setIsModalOpen(false)} className="px-8 py-3 text-slate-500 font-bold text-xs uppercase">Discard</button><button onClick={handleSaveFolder} className="px-10 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest"><Save size={18} /> Save</button></div>
             </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default App;