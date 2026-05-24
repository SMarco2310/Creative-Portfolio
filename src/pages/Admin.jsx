import { useEffect, useState, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useNavigate } from 'react-router-dom';

export default function Admin() {
  const navigate = useNavigate();
  const token = localStorage.getItem('admin_token') ?? '';

  const isAuthenticated = useQuery(api.auth.validateSession, { token });
  const logout = useMutation(api.auth.logout);

  const images = useQuery(api.images.listImages) ?? [];
  const generateUploadUrl = useMutation(api.images.generateUploadUrl);
  const saveImage = useMutation(api.images.saveImage);
  const deleteImage = useMutation(api.images.deleteImage);
  const toggleStar = useMutation(api.images.toggleStar);
  const reorderImages = useMutation(api.images.reorderImages);

  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [localOrder, setLocalOrder] = useState(null);

  const dragItem = useRef();
  const dragOverItem = useRef();

  // Redirect if session is invalid (null = still loading, false = not authed)
  useEffect(() => {
    if (isAuthenticated === false) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (images.length > 0) {
      setLocalOrder([...images].sort((a, b) => a.sortOrder - b.sortOrder));
    }
  }, [images]);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const dragStart = (e, position) => { dragItem.current = position; };
  const dragEnter = (e, position) => { dragOverItem.current = position; };

  const drop = async () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const copy = [...(localOrder ?? images)];
    const dragged = copy[dragItem.current];
    copy.splice(dragItem.current, 1);
    copy.splice(dragOverItem.current, 0, dragged);
    dragItem.current = null;
    dragOverItem.current = null;
    setLocalOrder(copy);
    try {
      await reorderImages({ orderedIds: copy.map((img) => img._id), token });
      showToast('Order saved!');
    } catch (err) {
      showToast('Failed to save order.');
    }
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;
    setSelectedFiles(files);
    setPreviewUrls(files.map((f) => URL.createObjectURL(f)));
  };

  const uploadAll = async () => {
    try {
      setUploading(true);
      showToast('Uploading pictures...');
      for (const file of selectedFiles) {
        const postUrl = await generateUploadUrl({ token });
        const response = await fetch(postUrl, {
          method: 'POST',
          headers: { 'Content-Type': file.type },
          body: file,
        });
        if (!response.ok) throw new Error('Upload failed: ' + response.statusText);
        const { storageId } = await response.json();
        await saveImage({ storageId, fileName: file.name, token });
      }
      setSelectedFiles([]);
      setPreviewUrls([]);
      showToast('Upload successful!');
    } catch (error) {
      showToast('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const cancelUpload = () => { setSelectedFiles([]); setPreviewUrls([]); };

  const handleDelete = async (id) => {
    try { await deleteImage({ id, token }); }
    catch (error) { alert(error.message); }
  };

  const handleToggleStar = async (img) => {
    try {
      showToast(img.starred ? 'Un-starring...' : 'Starring...');
      await toggleStar({ id: img._id, token });
      showToast(img.starred ? 'Removed from favorites.' : 'Added to favorites! It will appear first.');
    } catch (error) { showToast('Failed to update: ' + error.message); }
  };

  const handleLogout = async () => {
    await logout({ token });
    localStorage.removeItem('admin_token');
    navigate('/login');
  };

  const displayImages = localOrder ?? [...images].sort((a, b) => a.sortOrder - b.sortOrder);

  // Show nothing while session check is in-flight
  if (isAuthenticated === undefined || isAuthenticated === false) return null;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Portfolio Admin</h1>
        <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
      </header>

      <section style={styles.uploadSection}>
        {selectedFiles.length === 0 ? (
          <label style={styles.uploadBtn}>
            Select Pictures
            <input type="file" accept="image/*" multiple onChange={handleFileSelect} disabled={uploading} style={{ display: 'none' }} />
          </label>
        ) : (
          <div style={styles.previewContainer}>
            <h3 style={styles.previewTitle}>Selected Files ({selectedFiles.length})</h3>
            <div style={styles.previewGrid}>
              {previewUrls.map((url, i) => (
                <img key={i} src={url} alt="preview" style={{ ...styles.previewImage, cursor: 'pointer' }} onClick={() => setFullscreenImage(url)} />
              ))}
            </div>
            <div style={styles.previewActions}>
              <button onClick={uploadAll} disabled={uploading} style={styles.uploadBtn}>
                {uploading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ animation: 'spin 1s linear infinite' }}>
                      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                      <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z" fill="currentColor" />
                    </svg>
                    Uploading...
                  </span>
                ) : 'Confirm Upload'}
              </button>
              <button onClick={cancelUpload} disabled={uploading} style={styles.cancelBtn}>Cancel</button>
            </div>
          </div>
        )}
      </section>

      <div style={styles.gallery}>
        {displayImages.map((img, index) => (
          <div key={img._id} style={{ ...styles.card, cursor: 'grab' }}
            draggable
            onDragStart={(e) => dragStart(e, index)}
            onDragEnter={(e) => dragEnter(e, index)}
            onDragEnd={drop}
            onDragOver={(e) => e.preventDefault()}
          >
            <img src={img.url} alt={img.fileName} style={{ ...styles.image, cursor: 'pointer' }} onClick={() => setFullscreenImage(img.url)} />
            <div style={styles.cardActions}>
              <button onClick={() => handleToggleStar(img)} style={{ ...styles.actionBtn, background: img.starred ? '#1a1a1a' : 'transparent', color: img.starred ? '#fff' : '#1a1a1a' }}>
                {img.starred ? '★ Starred' : '☆ Star'}
              </button>
              <button onClick={() => handleDelete(img._id)} style={{ ...styles.actionBtn, background: '#1a1a1a', color: '#fff' }}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {fullscreenImage && (
        <div style={styles.lightbox} onClick={() => setFullscreenImage(null)}>
          <img src={fullscreenImage} alt="fullscreen preview" style={styles.lightboxImg} />
        </div>
      )}
      {toastMessage && <div style={styles.toast}>{toastMessage}</div>}
    </div>
  );
}

const styles = {
  container: { padding: '2rem', fontFamily: '"Courier New", Courier, monospace', backgroundColor: '#fbfaf7', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #ddd', paddingBottom: '1rem' },
  title: { margin: 0, color: '#1a1a1a', fontWeight: '300' },
  logoutBtn: { padding: '0.5rem 1rem', background: 'transparent', border: '1px solid #1a1a1a', cursor: 'pointer', fontFamily: 'inherit' },
  uploadSection: { marginBottom: '2rem' },
  uploadBtn: { display: 'inline-block', padding: '0.8rem 1.5rem', backgroundColor: '#1a1a1a', color: '#fff', cursor: 'pointer', border: 'none' },
  gallery: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' },
  card: { border: '1px solid #ddd', padding: '0.5rem', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  image: { width: '100%', height: '200px', objectFit: 'cover', marginBottom: '1rem' },
  cardActions: { display: 'flex', gap: '0.5rem', width: '100%' },
  actionBtn: { flex: 1, border: '1px solid #1a1a1a', padding: '0.5rem', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center' },
  previewContainer: { padding: '1.5rem', background: '#fff', border: '1px solid #ddd', marginBottom: '2rem' },
  previewTitle: { margin: '0 0 1rem 0', fontSize: '1.2rem', color: '#1a1a1a' },
  previewGrid: { display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' },
  previewImage: { width: '100px', height: '100px', objectFit: 'cover', border: '1px solid #eee' },
  previewActions: { display: 'flex', gap: '1rem' },
  cancelBtn: { display: 'inline-block', padding: '0.8rem 1.5rem', backgroundColor: '#fff', color: '#1a1a1a', border: '1px solid #1a1a1a', cursor: 'pointer', fontFamily: 'inherit' },
  lightbox: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(26, 26, 26, 0.95)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, cursor: 'pointer' },
  lightboxImg: { maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' },
  toast: { position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#1a1a1a', color: '#fff', padding: '1rem 2rem', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 2000 },
};
