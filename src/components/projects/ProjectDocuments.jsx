import { useState, useEffect, useRef } from 'react';
import {
  UploadCloud, FileText, Paperclip, Trash2, ExternalLink,
  Search, Loader2, FolderOpen, Image, Film, File, Plus,
  Download, Eye, Filter, X, Link2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../firebase';
import useStore from '../../store/useStore';
import { format } from 'date-fns';

// ── File type icon resolver ─────────────────────────────────────────────────
function getFileIcon(name = '', url = '') {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const u = url.toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return { icon: <Image size={18} />, color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' };
  if (['mp4', 'mov', 'webm', 'avi'].includes(ext)) return { icon: <Film size={18} />, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' };
  if (['pdf'].includes(ext)) return { icon: <FileText size={18} />, color: 'text-red-400 bg-red-500/10 border-red-500/20' };
  if (['doc', 'docx'].includes(ext) || u.includes('docs.google.com')) return { icon: <FileText size={18} />, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
  if (u.includes('figma.com')) return { icon: <span className="text-sm">🎨</span>, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' };
  if (u.includes('notion.so')) return { icon: <span className="text-sm">📝</span>, color: 'text-slate-300 bg-white/5 border-white/10' };
  if (u.includes('github.com')) return { icon: <span className="text-sm">💻</span>, color: 'text-slate-300 bg-slate-500/10 border-slate-500/20' };
  if (u.includes('drive.google.com')) return { icon: <span className="text-sm">☁️</span>, color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' };
  return { icon: <File size={18} />, color: 'text-slate-400 bg-white/5 border-white/10' };
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function ProjectDocuments({ projectId }) {
  const { user, activeCompany } = useStore();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | files | links
  const [linkUrl, setLinkUrl] = useState('');
  const [linkName, setLinkName] = useState('');
  const [addingLink, setAddingLink] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const fileInputRef = useRef(null);

  const docsPath = activeCompany?.id && projectId
    ? `companies/${activeCompany.id}/projects/${projectId}/documents`
    : null;

  // Subscribe to documents
  useEffect(() => {
    if (!docsPath) { setLoading(false); return; }
    const q = query(collection(db, docsPath), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, err => {
      console.error('Documents subscription error:', err);
      setLoading(false);
    });
    return unsub;
  }, [docsPath]);

  // File upload
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !docsPath) return;
    setUploading(true);

    for (const file of files) {
      try {
        const storagePath = `companies/${activeCompany.id}/projects/${projectId}/docs/${Date.now()}_${file.name}`;
        const storageReference = ref(storage, storagePath);
        const uploadTask = uploadBytesResumable(storageReference, file);

        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => {
              setUploadProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
            },
            reject,
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              await addDoc(collection(db, docsPath), {
                name: file.name,
                url: downloadURL,
                storagePath,
                type: 'file',
                fileType: file.type,
                size: file.size,
                uploadedBy: user.uid,
                uploadedByName: user.name || user.email,
                createdAt: serverTimestamp(),
              });
              resolve();
            }
          );
        });
      } catch (err) {
        console.error('Upload error:', err);
      }
    }
    setUploading(false);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Add link
  const handleAddLink = async () => {
    if (!linkUrl.trim() || !docsPath) return;
    setAddingLink(true);
    try {
      await addDoc(collection(db, docsPath), {
        name: linkName.trim() || linkUrl.trim(),
        url: linkUrl.trim(),
        type: 'link',
        uploadedBy: user.uid,
        uploadedByName: user.name || user.email,
        createdAt: serverTimestamp(),
      });
      setLinkUrl('');
      setLinkName('');
      setShowLinkForm(false);
    } catch (err) {
      console.error('Add link error:', err);
    }
    setAddingLink(false);
  };

  // Delete document
  const handleDelete = async (docItem) => {
    if (!docsPath) return;
    if (!window.confirm(`Delete "${docItem.name}"?`)) return;
    try {
      await deleteDoc(doc(db, docsPath, docItem.id));
      if (docItem.storagePath) {
        try { await deleteObject(ref(storage, docItem.storagePath)); } catch {}
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Filtered documents
  const filtered = documents.filter(d => {
    if (filter === 'files' && d.type !== 'file') return false;
    if (filter === 'links' && d.type !== 'link') return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return d.name?.toLowerCase().includes(q) || d.url?.toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center py-20 text-slate-500 gap-3">
        <Loader2 className="animate-spin text-primary-500" size={28} />
        <span className="text-sm font-medium">Loading documents…</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
            <div className="p-2 bg-pink-500/10 rounded-xl border border-pink-500/20">
              <FolderOpen size={20} className="text-pink-400" />
            </div>
            Documents
          </h2>
          <p className="text-xs text-slate-500 mt-1 ml-12">
            {documents.length} document{documents.length !== 1 ? 's' : ''} in this project
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Upload button */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-pink-600/20 uppercase tracking-widest disabled:opacity-50">
            {uploading ? (
              <><Loader2 size={14} className="animate-spin" /> {uploadProgress}%</>
            ) : (
              <><UploadCloud size={14} /> Upload</>
            )}
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => setShowLinkForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 bg-dark-800 hover:bg-dark-700 border border-white/10 text-white text-xs font-bold rounded-xl transition-all">
            <Link2 size={14} /> Add Link
          </motion.button>
        </div>
      </div>

      {/* Add link form */}
      <AnimatePresence>
        {showLinkForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-dark-800 border border-white/5 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Add External Link</h3>
              <button onClick={() => setShowLinkForm(false)} className="text-slate-500 hover:text-white transition-colors"><X size={14} /></button>
            </div>
            <input
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddLink(); }}
              placeholder="Paste URL — Figma, Notion, GitHub, Google Docs…"
              className="w-full bg-dark-900 border border-white/5 focus:border-pink-500/50 rounded-xl px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 transition-all"
            />
            <div className="flex gap-2">
              <input
                value={linkName}
                onChange={e => setLinkName(e.target.value)}
                placeholder="Label (optional)"
                className="flex-1 bg-dark-900 border border-white/5 focus:border-pink-500/50 rounded-xl px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 transition-all"
              />
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={handleAddLink}
                disabled={!linkUrl.trim() || addingLink}
                className="px-5 py-2.5 bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0">
                {addingLink ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Add
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search & Filter */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 bg-dark-800 border border-white/5 rounded-xl px-4 py-2.5 focus-within:border-primary-500/50 transition-all">
          <Search size={14} className="text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
          />
        </div>
        <div className="flex items-center bg-dark-800 border border-white/5 rounded-xl p-1 gap-0.5">
          {[
            { id: 'all', label: 'All' },
            { id: 'files', label: 'Files' },
            { id: 'links', label: 'Links' },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === f.id ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white hover:bg-dark-700'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="w-full bg-dark-800 rounded-full overflow-hidden border border-white/5">
          <motion.div animate={{ width: `${uploadProgress}%` }}
            className="h-2 bg-gradient-to-r from-pink-600 to-pink-400 rounded-full transition-all" />
        </div>
      )}

      {/* Documents grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 bg-dark-800 rounded-2xl border border-dashed border-white/10 mb-4">
            <FolderOpen size={40} className="text-slate-600" />
          </div>
          <p className="text-slate-500 text-sm font-medium">
            {documents.length === 0 ? 'No documents yet' : 'No documents match your search'}
          </p>
          <p className="text-slate-600 text-xs mt-1">
            Upload files or add links to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence>
            {filtered.map((docItem, i) => {
              const fileInfo = getFileIcon(docItem.name, docItem.url);
              const time = docItem.createdAt?.toDate
                ? format(docItem.createdAt.toDate(), 'MMM d, yyyy')
                : '…';
              return (
                <motion.div
                  key={docItem.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03 }}
                  className={`group relative bg-dark-800/60 backdrop-blur border rounded-2xl p-4 hover:bg-dark-700/60 transition-all cursor-pointer ${fileInfo.color.split(' ').slice(2).join(' ') || 'border-white/5'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl border shrink-0 ${fileInfo.color}`}>
                      {fileInfo.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{docItem.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                          {docItem.type === 'link' ? 'Link' : 'File'}
                        </span>
                        {docItem.size && (
                          <>
                            <span className="text-[8px] text-slate-700">•</span>
                            <span className="text-[10px] text-slate-500">{formatFileSize(docItem.size)}</span>
                          </>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-600 mt-1.5">
                        {docItem.uploadedByName} · {time}
                      </p>
                    </div>
                  </div>

                  {/* Hover actions */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a href={docItem.url} target="_blank" rel="noreferrer"
                      className="p-1.5 text-slate-400 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-all"
                      title="Open">
                      <ExternalLink size={12} />
                    </a>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(docItem); }}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      title="Delete">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
