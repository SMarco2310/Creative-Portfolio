import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Admin() {
  const [session, setSession] = useState(null);
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const navigate = useNavigate();

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login');
      } else {
        setSession(session);
        fetchImages();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/login');
      } else {
        setSession(session);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchImages = async () => {
    const { data, error } = await supabase.storage.from('portfolio').list('', {
      sortBy: { column: 'created_at', order: 'desc' }
    });
    if (error) {
      console.error('Error fetching images:', error);
      return;
    }
    // Filter out potential empty folders or hidden files
    const validFiles = data.filter(file => file.name !== '.emptyFolderPlaceholder');
    
    // Sort starred files to the top
    const sortedFiles = validFiles.sort((a, b) => {
      const aStarred = a.name.startsWith('star_');
      const bStarred = b.name.startsWith('star_');
      if (aStarred && !bStarred) return -1;
      if (!aStarred && bStarred) return 1;
      return 0;
    });
    
    setImages(sortedFiles);
  };

  const toggleStar = async (name) => {
    const isStarred = name.startsWith('star_');
    const newName = isStarred ? name.replace('star_', '') : `star_${name}`;
    
    try {
      showToast(isStarred ? "Un-starring..." : "Starring...");
      const { error } = await supabase.storage.from('portfolio').move(name, newName);
      if (error) throw error;
      fetchImages();
      showToast(isStarred ? "Removed from favorites." : "Added to favorites! It will appear first.");
    } catch (error) {
      showToast("Failed to update: " + error.message);
    }
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;
    
    setSelectedFiles(files);
    const urls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);
  };

  const uploadAll = async () => {
    try {
      setUploading(true);
      showToast("Uploading pictures...");
      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        let { error: uploadError } = await supabase.storage
          .from('portfolio')
          .upload(filePath, file);

        if (uploadError) {
          throw uploadError;
        }
      }

      setSelectedFiles([]);
      setPreviewUrls([]);
      fetchImages();
      showToast("Upload successful!");
    } catch (error) {
      showToast("Upload failed: Check your RLS Policies.");
    } finally {
      setUploading(false);
    }
  };

  const cancelUpload = () => {
    setSelectedFiles([]);
    setPreviewUrls([]);
  };

  const deleteImage = async (name) => {
    try {
      const { error } = await supabase.storage.from('portfolio').remove([name]);
      if (error) throw error;
      fetchImages();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (!session) return null;

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
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              disabled={uploading}
              style={{ display: 'none' }}
            />
          </label>
        ) : (
          <div style={styles.previewContainer}>
            <h3 style={styles.previewTitle}>Selected Files ({selectedFiles.length})</h3>
            <div style={styles.previewGrid}>
              {previewUrls.map((url, i) => (
                <img 
                  key={i} 
                  src={url} 
                  alt="preview" 
                  style={{...styles.previewImage, cursor: 'pointer'}} 
                  onClick={() => setFullscreenImage(url)}
                />
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
              <button onClick={cancelUpload} disabled={uploading} style={styles.cancelBtn}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      <div style={styles.gallery}>
        {images.map((img) => {
          const { data } = supabase.storage.from('portfolio').getPublicUrl(img.name);
          return (
            <div key={img.name} style={styles.card}>
              <img 
                src={data.publicUrl} 
                alt={img.name} 
                style={{...styles.image, cursor: 'pointer'}} 
                onClick={() => setFullscreenImage(data.publicUrl)}
              />
              <div style={styles.cardActions}>
                <button 
                  onClick={() => toggleStar(img.name)} 
                  style={{
                    ...styles.actionBtn, 
                    background: img.name.startsWith('star_') ? '#1a1a1a' : 'transparent', 
                    color: img.name.startsWith('star_') ? '#fff' : '#1a1a1a'
                  }}
                >
                  {img.name.startsWith('star_') ? '★ Starred' : '☆ Star'}
                </button>
                <button onClick={() => deleteImage(img.name)} style={{...styles.actionBtn, background: '#1a1a1a', color: '#fff'}}>
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {fullscreenImage && (
        <div style={styles.lightbox} onClick={() => setFullscreenImage(null)}>
          <img src={fullscreenImage} alt="fullscreen preview" style={styles.lightboxImg} />
        </div>
      )}

      {toastMessage && (
        <div style={styles.toast}>
          {toastMessage}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '2rem',
    fontFamily: '"Courier New", Courier, monospace',
    backgroundColor: '#fbfaf7',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    borderBottom: '1px solid #ddd',
    paddingBottom: '1rem'
  },
  title: {
    margin: 0,
    color: '#1a1a1a',
    fontWeight: '300'
  },
  logoutBtn: {
    padding: '0.5rem 1rem',
    background: 'transparent',
    border: '1px solid #1a1a1a',
    cursor: 'pointer',
    fontFamily: 'inherit'
  },
  uploadSection: {
    marginBottom: '2rem',
  },
  uploadBtn: {
    display: 'inline-block',
    padding: '0.8rem 1.5rem',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    cursor: 'pointer',
    border: 'none',
  },
  gallery: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '1.5rem',
  },
  card: {
    border: '1px solid #ddd',
    padding: '0.5rem',
    background: '#fff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '200px',
    objectFit: 'cover',
    marginBottom: '1rem',
  },
  cardActions: {
    display: 'flex',
    gap: '0.5rem',
    width: '100%'
  },
  actionBtn: {
    flex: 1,
    border: '1px solid #1a1a1a',
    padding: '0.5rem',
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'center'
  },
  deleteBtn: {
    background: '#1a1a1a',
    color: '#fff',
    border: 'none',
    padding: '0.5rem 1rem',
    cursor: 'pointer',
    width: '100%',
    fontFamily: 'inherit'
  },
  previewContainer: {
    padding: '1.5rem',
    background: '#fff',
    border: '1px solid #ddd',
    marginBottom: '2rem'
  },
  previewTitle: {
    margin: '0 0 1rem 0',
    fontSize: '1.2rem',
    color: '#1a1a1a'
  },
  previewGrid: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
    marginBottom: '1.5rem'
  },
  previewImage: {
    width: '100px',
    height: '100px',
    objectFit: 'cover',
    border: '1px solid #eee'
  },
  previewActions: {
    display: 'flex',
    gap: '1rem'
  },
  cancelBtn: {
    display: 'inline-block',
    padding: '0.8rem 1.5rem',
    backgroundColor: '#fff',
    color: '#1a1a1a',
    border: '1px solid #1a1a1a',
    cursor: 'pointer',
    fontFamily: 'inherit'
  },
  lightbox: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    cursor: 'pointer'
  },
  lightboxImg: {
    maxWidth: '90%',
    maxHeight: '90%',
    objectFit: 'contain'
  },
  toast: {
    position: 'fixed',
    bottom: '2rem',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    padding: '1rem 2rem',
    borderRadius: '4px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 2000,
    animation: 'fadeIn 0.3s ease-out'
  }
};
