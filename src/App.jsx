import { useEffect, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import { supabase } from "./supabaseClient";

function toPaleRgb(red, green, blue) {
  const mix = 0.78;
  return `rgb(${Math.round(red + (255 - red) * mix)}, ${Math.round(
    green + (255 - green) * mix,
  )}, ${Math.round(blue + (255 - blue) * mix)})`;
}

function getDominantPlaceholder(imageSource) {
  return new Promise((resolve, reject) => {
    const probe = new Image();
    probe.decoding = "async";
    probe.onload = () => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });

      if (!context) {
        resolve(null);
        return;
      }

      const sampleSize = 24;
      canvas.width = sampleSize;
      canvas.height = sampleSize;
      context.drawImage(probe, 0, 0, sampleSize, sampleSize);

      const { data } = context.getImageData(0, 0, sampleSize, sampleSize);
      const buckets = new Map();

      for (let index = 0; index < data.length; index += 4) {
        const alpha = data[index + 3];
        if (alpha < 128) {
          continue;
        }

        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];

        // Reduce color noise before counting dominant tones.
        const key = [
          Math.round(red / 32) * 32,
          Math.round(green / 32) * 32,
          Math.round(blue / 32) * 32,
        ].join(",");

        const current = buckets.get(key);
        if (current) {
          current.count += 1;
          current.red += red;
          current.green += green;
          current.blue += blue;
        } else {
          buckets.set(key, {
            count: 1,
            red,
            green,
            blue,
          });
        }
      }

      const dominant = [...buckets.values()].sort((left, right) => right.count - left.count)[0];
      if (!dominant) {
        resolve(null);
        return;
      }

      resolve(
        toPaleRgb(
          dominant.red / dominant.count,
          dominant.green / dominant.count,
          dominant.blue / dominant.count,
        ),
      );
    };
    probe.onerror = reject;
    probe.src = imageSource;
  });
}

const images = {
  top: {
    src: "/images/portrait-01.jpg",
    alt: "Editorial still life",
    position: "50% 46%",
    placeholder: "#d9dbe0",
  },
  bottom: {
    src: "/images/portrait-06.jpg",
    alt: "Minimal studio detail",
    position: "50% 50%",
    placeholder: "#d9d3d1",
  },
  right: {
    src: "/images/portrait-05.jpg",
    alt: "Soft portrait in natural light",
    position: "50% 26%",
    placeholder: "#d7d7d0",
  },
  archiveA: {
    src: "/images/portrait-02.jpg",
    alt: "Portrait study",
    position: "50% 32%",
    placeholder: "#d8ddd9",
  },
  archiveB: {
    src: "/images/portrait-03.jpg",
    alt: "Close portrait",
    position: "50% 36%",
    placeholder: "#ddd4cf",
  },
  archiveC: {
    src: "/images/portrait-04.jpg",
    alt: "Editorial movement",
    position: "52% 38%",
    placeholder: "#d8d4d0",
  },
  archiveD: {
    src: "/images/portrait-07.jpg",
    alt: "Quiet fashion frame",
    position: "50% 40%",
    placeholder: "#d6dfdc",
  },
  moreA: {
    src: "/images/portrait-08.jpg",
    alt: "Additional portrait study",
    position: "50% 34%",
    placeholder: "#dad8cf",
  },
  moreB: {
    src: "/images/portrait-09.jpg",
    alt: "Additional editorial frame",
    position: "50% 35%",
    placeholder: "#dad5cf",
  },
};

function ImageCard({ image, className, onOpen }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [placeholderColor, setPlaceholderColor] = useState(image.placeholder ?? "#ece7df");

  useEffect(() => {
    let isActive = true;

    getDominantPlaceholder(image.src)
      .then((color) => {
        if (isActive && color) {
          setPlaceholderColor(color);
        }
      })
      .catch(() => {});

    return () => {
      isActive = false;
    };
  }, [image.placeholder, image.src]);

  return (
    <button
      type="button"
      className={`frame image-card ${className} ${isLoaded ? "is-loaded" : ""}`}
      onClick={() => onOpen(image)}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={`Open ${image.alt}`}
      style={{ backgroundColor: placeholderColor }}
    >
      <img
        src={image.src}
        alt={image.alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        style={{ 
          objectPosition: image.position ?? "50% 50%",
          userSelect: 'none', 
          WebkitUserDrag: 'none'
        }}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      />
    </button>
  );
}

function NavLink({ href, className, onNavigate, children }) {
  return (
    <a
      href={href}
      className={className}
      onClick={(event) => {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) {
          return;
        }

        event.preventDefault();
        window.history.pushState({}, "", url.pathname + url.hash);
        window.dispatchEvent(new PopStateEvent("popstate"));

        if (url.hash) {
          window.requestAnimationFrame(() => {
            document.querySelector(url.hash)?.scrollIntoView({ behavior: "smooth" });
          });
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }

        onNavigate?.();
      }}
    >
      {children}
    </a>
  );
}

function MenuToggleIcon({ open = false }) {
  return (
    <span className={`menu-toggle-lines ${open ? "is-open" : ""}`} aria-hidden="true">
      <span />
      <span />
    </span>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="4.25" />
      <circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="18" cy="5" r="2.2" />
      <circle cx="6" cy="12" r="2.2" />
      <circle cx="18" cy="19" r="2.2" />
      <path d="M8 11l7.6-4.2M8 13l7.6 4.2" />
    </svg>
  );
}

function HomePage({ onOpen }) {
  const [visibleCount, setVisibleCount] = useState(6);
  const [supabaseImages, setSupabaseImages] = useState([]);
  const [isSingleColumn, setIsSingleColumn] = useState(window.innerWidth <= 1024);

  useEffect(() => {
    const handleResize = () => setIsSingleColumn(window.innerWidth <= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    async function loadImages() {
      try {
        const { data, error } = await supabase.storage.from("portfolio").list('', {
          sortBy: { column: 'created_at', order: 'desc' }
        });
        if (data && !error) {
          let validFiles = data.filter((file) => file.name !== ".emptyFolderPlaceholder" && file.name !== "order.json");
          
          const { data: orderData } = await supabase.storage.from('portfolio').download('order.json');
          if (orderData) {
            try {
              const orderText = await orderData.text();
              const orderArray = JSON.parse(orderText);
              
              validFiles.sort((a, b) => {
                const aIndex = orderArray.indexOf(a.name);
                const bIndex = orderArray.indexOf(b.name);
                
                if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                if (aIndex === -1 && bIndex !== -1) return -1;
                if (bIndex === -1 && aIndex !== -1) return 1;
                
                const aStarred = a.name.startsWith('star_');
                const bStarred = b.name.startsWith('star_');
                if (aStarred && !bStarred) return -1;
                if (!aStarred && bStarred) return 1;
                return 0;
              });
            } catch (e) {
              console.error('Error parsing order.json', e);
            }
          } else {
            validFiles.sort((a, b) => {
              const aStarred = a.name.startsWith('star_');
              const bStarred = b.name.startsWith('star_');
              if (aStarred && !bStarred) return -1;
              if (!aStarred && bStarred) return 1;
              return 0;
            });
          }
          
          const classes = ["card-square", "card-tall", "card-vertical", "card-landscape", "card-portrait"];
          const newImages = validFiles.map((file, i) => {
            const {
              data: { publicUrl },
            } = supabase.storage.from("portfolio").getPublicUrl(file.name);
            return {
              src: publicUrl,
              alt: file.name,
              position: "50% 50%",
              className: classes[i % classes.length],
              placeholder: "#ece7df",
            };
          });
          setSupabaseImages(newImages);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadImages();
  }, []);

  const visibleImages = supabaseImages.slice(0, visibleCount);
  const canLoadMore = visibleCount < supabaseImages.length;
  const leftColumnImages = visibleImages.filter((_, index) => index % 2 === 0);
  const rightColumnImages = visibleImages.filter((_, index) => index % 2 === 1);

  return (
    <main className="layout" id="work">
      <section className="portfolio-masonry">
        {isSingleColumn ? (
          <div className="masonry-column" style={{ width: '100%' }}>
            {visibleImages.map((image) => (
              <ImageCard
                key={image.src}
                image={image}
                className={image.className}
                onOpen={onOpen}
              />
            ))}
          </div>
        ) : (
          <>
            <div className="masonry-column">
              {leftColumnImages.map((image) => (
                <ImageCard
                  key={image.src}
                  image={image}
                  className={image.className}
                  onOpen={onOpen}
                />
              ))}
            </div>
            <div className="masonry-column">
              {rightColumnImages.map((image) => (
                <ImageCard
                  key={image.src}
                  image={image}
                  className={image.className}
                  onOpen={onOpen}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {canLoadMore ? (
        <div className="load-more-wrap">
          <button
            type="button"
            className="load-more-button"
            onClick={() =>
              setVisibleCount((currentCount) =>
                Math.min(currentCount + 6, supabaseImages.length),
              )
            }
          >
            Load more
          </button>
        </div>
      ) : null}

      <footer className="footer" id="contact">
        <div className="footer-contact">
          <p>smarcoeam2310@gmail.com</p>
          <p>Accra, Ghana</p>
        </div>
        <div className="portfolio-copyright">
          <p>Copyright © Ammes Art 2026 All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}

function ContactPage() {
  return (
    <main className="contact-page">
      <section className="contact-profile">
        <figure className="contact-portrait">
          <img src="/images/contact-profile.png" alt="Portrait of Ammes Art" />
        </figure>

        <div className="contact-copy">
          <p>
            Ammes Art is a Ghana based photographer and visual artist.
          </p>
          <p>
            Within his work, he creates a platform to explore everyday
            objects, portraiture, and sculptural compositions, evoking emotion
            from the otherwise familiar. He enjoys reframing ordinary scenes
            into images that feel quiet, tactile, and slightly surreal.
          </p>
          <p>
            He is open to commissions, exhibitions, collaborations, and select
            travel projects.
          </p>
          <p>
            Email here:{" "}
            <a href="mailto:smarcoeam2310@gmail.com">smarcoeam2310@gmail.com</a>
          </p>
          <p>
            Follow on insta:{" "}
            <a href="https://instagram.com/ammes_art" target="_blank" rel="noreferrer">
              @ammes_art
            </a>
          </p>
        </div>
      </section>

      <footer className="contact-footer">
        <p>Copyright © Ammes Art 2026 All rights reserved.</p>
      </footer>
    </main>
  );
}

export function PortfolioApp() {
  const [activeImage, setActiveImage] = useState(null);
  const [pathname, setPathname] = useState(window.location.pathname);
  const [shareFeedback, setShareFeedback] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!activeImage) {
      document.body.style.overflow = "";
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setActiveImage(null);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeImage]);

  useEffect(() => {
    const syncPath = () => setPathname(window.location.pathname);

    window.addEventListener("popstate", syncPath);
    return () => window.removeEventListener("popstate", syncPath);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!shareFeedback) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setShareFeedback(""), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [shareFeedback]);

  const isContactPage = pathname === "/contact";

  const handleShare = async () => {
    const shareUrl = window.location.origin;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Ammes Art",
          text: "Take a look at the Ammes Art portfolio.",
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      setShareFeedback("Link copied");
    } catch {
      setShareFeedback("Share unavailable");
    }
  };

  const handleMenuShare = async () => {
    await handleShare();
    setMenuOpen(false);
  };

  return (
    <>
      <div className={`site-shell ${activeImage ? "site-shell-muted" : ""}`}>
        <header className={`page-header ${menuOpen ? "is-menu-open" : ""}`}>
          <nav className="topbar">
            <button
              type="button"
              className="menu-toggle"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <MenuToggleIcon open={menuOpen} />
            </button>
            <NavLink href="/" className="brand">
              Ammes Art
            </NavLink>
            <div className="topbar-links">
              <NavLink href="/">portfolio</NavLink>
              <NavLink href="/contact">contact</NavLink>
              <a 
                href="https://paystack.com/pay/your_payment_link_here" 
                target="_blank" 
                rel="noreferrer" 
                className="support-btn"
                style={{ marginLeft: '1rem' }}
              >
                support me
              </a>
            </div>
            <div className="topbar-actions">
              <a
                className="icon-button"
                href="https://instagram.com/ammes_art"
                target="_blank"
                rel="noreferrer"
                aria-label="Open Instagram profile"
                title="Instagram"
              >
                <InstagramIcon />
              </a>
              <button
                type="button"
                className="icon-button"
                onClick={handleShare}
                aria-label="Share portfolio"
                title="Share"
              >
                <ShareIcon />
              </button>
              {shareFeedback ? (
                <span className="share-feedback" aria-live="polite">
                  {shareFeedback}
                </span>
              ) : null}
            </div>
          </nav>
        </header>

        {isContactPage ? <ContactPage /> : <HomePage onOpen={setActiveImage} />}
      </div>

      {menuOpen ? (
        <div
          className="menu-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          onClick={() => setMenuOpen(false)}
        >
          <div className="menu-backdrop" />
          <div className="menu-panel" onClick={(event) => event.stopPropagation()}>
            <div className="menu-panel-inner">
              <div className="menu-links">
                <NavLink href="/" className="menu-link" onNavigate={() => setMenuOpen(false)}>
                  portfolio
                </NavLink>
                <NavLink
                  href="/contact"
                  className="menu-link"
                  onNavigate={() => setMenuOpen(false)}
                >
                  contact
                </NavLink>
                <a 
                  href="https://paystack.com/pay/your_payment_link_here" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="menu-link"
                  onClick={() => setMenuOpen(false)}
                >
                  support me
                </a>
                <div className="menu-actions" style={{ alignSelf: 'start', paddingTop: '1rem' }}>
                  <a
                    className="menu-icon-button"
                    href="https://instagram.com/ammes_art"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Open Instagram profile"
                    title="Instagram"
                  >
                    <InstagramIcon />
                  </a>
                  <button
                    type="button"
                    className="menu-icon-button"
                    onClick={handleMenuShare}
                    aria-label="Share portfolio"
                    title="Share"
                  >
                    <ShareIcon />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeImage ? (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Expanded image view"
          onClick={() => setActiveImage(null)}
        >
          <div className="lightbox-backdrop" />
          <div
            className="lightbox-panel"
            onClick={(event) => event.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            <button
              type="button"
              className="lightbox-close"
              onClick={() => setActiveImage(null)}
              aria-label="Close image view"
            >
              ×
            </button>
            <img 
              src={activeImage.src} 
              alt={activeImage.alt} 
              style={{
                userSelect: 'none', 
                WebkitUserDrag: 'none'
              }}
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

export default function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin") || location.pathname === "/login";

  if (isAdminRoute) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    );
  }

  return <PortfolioApp />;
}
