// ==========================================
// 1. VARIABLES GLOBALES
// ==========================================
const IMAGE_BASE = '';
const THUMB_BASE = '/thumbs';
let allPhotos = [];
let filteredPhotos = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 20;

let selectedCards = new Set();
let selectedTags = new Set();
let tagCountBase = {};
let randomInitialized = false;
let lightboxPhotos = [];
let lightboxIndex = -1;
let timelineYears = [];
let timelineYearIndex = -1;

// ==========================================
// 2. CHARGEMENT DES JSON
// ==========================================
async function loadData() {
    allPhotos = await fetch('data_all.json').then(res => res.json()).catch(() => []);
    
    // Reconstruire les URLs à partir de dossier + fichier
    allPhotos = allPhotos.map(p => {
        if (p.dossier && p.fichier) {
            const [carte, subfolder] = p.dossier.split(' // ');
            if (carte && subfolder) {
                const carteNum = String(parseInt(carte.replace('CARTE_', ''), 10)).padStart(2, '0');
                p.url = `${IMAGE_BASE}/images/carte_${carteNum}/${subfolder}/${p.fichier}`;
                const isVideo = /\.(mp4|mov|avi|webm)$/i.test(p.fichier);
                const thumbFile = p.fichier.replace(/\.[^.]+$/, isVideo ? '.jpg' : m => m.toLowerCase());
                p.thumb = `${THUMB_BASE}/carte_${carteNum}/${subfolder}/${thumbFile}`;
            }
        }
        return p;
    });
    
    filteredPhotos = [...allPhotos];

    // Stats globales dans la nav
    const total = allPhotos.length;
    document.getElementById('stat-total').innerHTML =
        `<span class="stat-accent">${total.toLocaleString('fr-FR')}</span> fichiers`;
    document.getElementById('global-stats-wrapper').classList.add('visible');

    // Stats landing page
    const years = allPhotos.map(p => p.date ? parseInt(p.date.slice(0,4)) : null).filter(Boolean);
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const pays = new Set(allPhotos.map(p => p.ville ? p.ville.trim().split(',').pop().trim() : null).filter(Boolean));
    document.getElementById('landing-stat-files').textContent = `${total.toLocaleString('fr-FR')} fichiers`;
    document.getElementById('landing-stat-years').textContent = `${minYear} — ${maxYear}`;
    document.getElementById('landing-stat-pays').textContent = `${pays.size} pays`;

    // Cacher le loading screen, afficher la landing
    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('landing').style.display = 'flex';
    startLandingCarousel();
}

let landingCarouselInterval = null;
function startLandingCarousel() {
    const img = document.querySelector('.landing-card-img');
    const cards = ['01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18'];
    let last = '02';
    landingCarouselInterval = setInterval(() => {
        let pick;
        do { pick = cards[Math.floor(Math.random() * cards.length)]; } while (pick === last);
        last = pick;
        img.src = `images/cartes_sd/CARTE_${pick}.png`;
    }, 500);
}

function enterArchive() {
    if (landingCarouselInterval) { clearInterval(landingCarouselInterval); landingCarouselInterval = null; }
    document.getElementById('landing').style.display = 'none';
    showView('index', document.querySelector('.nav-btn.active-nav'));
}

// ==========================================
// 3. NAVIGATION
// ==========================================
function showView(viewName, btnElement) {
    closeLightbox();
    // Désactiver toutes les sections
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active-nav'));
    
    // Activer la section demandée
    document.getElementById(viewName).classList.add('active');
    if (btnElement) btnElement.classList.add('active-nav');
    
    // Initialiser le contenu selon la vue
    if (viewName === 'index') {
        displayIndex();
    } else if (viewName === 'tags') {
        displayTags();
    } else if (viewName === 'carte') {
        initMap();
    } else if (viewName === 'timeline') {
        displayTimeline();
    } else if (viewName === 'random') {
        if (!randomInitialized) {
            initRandomCardSelector();
            randomInitialized = true;
        }
        extractRandom();
    }
}

// ==========================================
// 4. INDEX (EXPLORATEUR)
// ==========================================
// Poids des cartes SD
const cardSizes = {
    'CARTE_01': '864 Mo',
    'CARTE_03': '45 Mo',
    'CARTE_05': '13 Go',
    'CARTE_06': '2,2 Go',
    'CARTE_08': '2,4 Go',
    'CARTE_10': '464,6 Mo',
    'CARTE_14': '3,89 Go',
    'CARTE_09': '219,7 Mo',
    'CARTE_13': '490 Ko',
    'CARTE_15': '2,13 Go',
    'CARTE_16': '9,6 Mo',
    'CARTE_17': '278 Mo',
    'CARTE_18': '176,2 Mo'
};

function displayIndex() {
    const sidebar = document.getElementById('sidebar-volumes');
    const grid = document.getElementById('sd-content-grid');
    
    sidebar.innerHTML = '';
    grid.innerHTML = '';
    
    // Organiser par cartes et sous-dossiers
    const folders = {};
    allPhotos.forEach(p => {
        const dossier = p.dossier || 'CARTE_00 // Inconnu';
        const [carte, subfolder] = dossier.split(' // ');
        if (!folders[carte]) folders[carte] = {};
        if (!folders[carte][subfolder]) folders[carte][subfolder] = [];
        folders[carte][subfolder].push(p);
    });
    
    // Créer TOUTES les cartes de 01 à 18 (même vides)
    for (let i = 1; i <= 18; i++) {
        const num = String(i).padStart(2, '0');
        const carteName = `CARTE_${num}`; // CARTE_01, CARTE_02, etc. (2 chiffres)
        
        // Image de la carte SD elle-même
        const cardImgUrl = `images/cartes_sd/CARTE_${num}.png`;
        
        const item = document.createElement('div');
        item.className = 'sidebar-item';
        item.dataset.num = num;

        const sizeText = cardSizes[carteName] || '';
        const cardCount = folders[carteName]
            ? Object.values(folders[carteName]).reduce((sum, arr) => sum + arr.length, 0)
            : 0;

        item.innerHTML = `
            <img src="${cardImgUrl}" alt="${carteName}" onerror="this.style.visibility='hidden'">
            <div>
                <div>${carteName}</div>
                <div class="sidebar-item-meta">
                    ${[sizeText, cardCount > 0 ? `${cardCount} fichier${cardCount > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ')}
                </div>
            </div>
        `;
        
        // Toutes les cartes sont cliquables
        item.onclick = () => {
            document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active-vol'));
            item.classList.add('active-vol');
            
            // Si la carte a du contenu, afficher les sous-dossiers
            if (folders[carteName]) {
                displaySubfolders(carteName, folders[carteName]);
            } else {
                // Sinon, afficher un message vide
                const grid = document.getElementById('sd-content-grid');
                const breadcrumb = document.getElementById('breadcrumb');
                grid.innerHTML = '<div style="grid-column: 1/-1; padding: var(--space-4); text-align: center; font-family: \'Courier New\', monospace; color: var(--text-light);">[ AUCUNE DONNÉE DISPONIBLE ]</div>';
                breadcrumb.textContent = carteName;
                document.getElementById('pagination-controls').style.display = 'none';
            }
        };
        
        sidebar.appendChild(item);
    }
    
    // Auto-sélectionner le premier volume qui a du contenu
    const firstValidItem = Array.from(sidebar.children).find((item, index) => {
        const num = String(index + 1).padStart(2, '0');
        return folders[`CARTE_${num}`] !== undefined;
    });
    if (firstValidItem) {
        firstValidItem.click();
    }
}

function displaySubfolders(carteName, subfolders) {
    const grid = document.getElementById('sd-content-grid');
    const breadcrumb = document.getElementById('breadcrumb');
    
    grid.innerHTML = '';
    
    // Breadcrumb cliquable
    breadcrumb.innerHTML = `
        <span class="breadcrumb-current">${carteName}</span>
    `;
    
    // Afficher les sous-dossiers
    Object.keys(subfolders).sort().forEach(subfolder => {
        const folder = document.createElement('div');
        folder.className = 'sub-folder';
        const count = subfolders[subfolder].length;
        folder.innerHTML = `
            <div class="sub-folder-icon">
                <svg width="36" height="28" viewBox="0 0 36 28" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round">
                    <path d="M1 8 H35 V26 Q35 27 34 27 H2 Q1 27 1 26 V8 Z"/>
                    <path d="M1 8 V6 Q1 5 2 5 H14 L16 8"/>
                </svg>
            </div>
            <div class="sd-id">${subfolder || '(sans nom)'}</div>
            <div class="sub-folder-count">${count} fichier${count > 1 ? 's' : ''}</div>
        `;
        folder.onclick = () => displayPhotosGrid(subfolders[subfolder], carteName, subfolder);
        grid.appendChild(folder);
    });
    
    // Cacher la pagination
    document.getElementById('pagination-controls').style.display = 'none';
}

// Helper pour revenir aux subfolders d'une carte depuis le breadcrumb
function backToCard(carteName) {
    // Reconstruire les folders
    const folders = {};
    allPhotos.forEach(p => {
        const dossier = p.dossier || 'CARTE_00 // Inconnu';
        const [carte, subfolder] = dossier.split(' // ');
        if (!folders[carte]) folders[carte] = {};
        if (!folders[carte][subfolder]) folders[carte][subfolder] = [];
        folders[carte][subfolder].push(p);
    });
    
    if (folders[carteName]) {
        displaySubfolders(carteName, folders[carteName]);
    }
}

function displayPhotosGrid(photos, carteName, subfolder) {
    filteredPhotos = photos;
    currentPage = 1;
    
    const breadcrumb = document.getElementById('breadcrumb');
    
    // Breadcrumb avec navigation
    breadcrumb.innerHTML = `
        <span class="breadcrumb-link" onclick="backToCard('${carteName}')">${carteName}</span>
        <span class="breadcrumb-current"> // ${subfolder}</span>
    `;
    
    renderPhotoGrid();
}

function renderPhotoGrid() {
    const grid = document.getElementById('sd-content-grid');
    grid.innerHTML = '';
    
    // Afficher TOUTES les photos avec lazy loading
    filteredPhotos.forEach(p => {
        const card = document.createElement('div');
        card.className = 'photo-card';
        
        const ext = (p.url || '').toLowerCase();
        if (ext.match(/\.(mp4|mov|avi|webm)$/)) {
            card.classList.add('video-card');
            card.innerHTML = `<img src="${p.thumb || p.url}" alt="${p.fichier || ''}" loading="lazy" decoding="async" onerror="if(this.src!=='${p.url}')this.src='${p.url}';else this.onerror=null;">`;
        }

        card.onclick = () => openLightbox(p, filteredPhotos);
        grid.appendChild(card);
    });

    // Cacher la pagination
    document.getElementById('pagination-controls').style.display = 'none';
}

function updatePagination() {
    const totalPages = Math.ceil(filteredPhotos.length / ITEMS_PER_PAGE);
    const controls = document.getElementById('pagination-controls');
    const pageInfo = document.getElementById('page-info');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    
    if (totalPages <= 1) {
        controls.style.display = 'none';
        return;
    }
    
    controls.style.display = 'flex';
    pageInfo.textContent = `${currentPage} / ${totalPages}`;
    
    btnPrev.disabled = currentPage === 1;
    btnNext.disabled = currentPage === totalPages;
    
    btnPrev.onclick = () => changePage(currentPage - 1);
    btnNext.onclick = () => changePage(currentPage + 1);
}

function changePage(newPage) {
    const totalPages = Math.ceil(filteredPhotos.length / ITEMS_PER_PAGE);
    if (newPage < 1 || newPage > totalPages) return;
    currentPage = newPage;
    renderPhotoGrid();
}

// ==========================================
// 5. TAGS
// ==========================================
const TAG_CATEGORIES = {
    'Animaux':      ['aquarium','canard','chamois','chat','chenilles','chèvre','chien','lion','louve','oiseau','pigeon','poisson','renard'],
    'Personnes':    ['autoportrait','enfant','famille','femme','homme','main','miroir','portrait'],
    'Nature':       ['arbre','cascade','ciel','champs','étang','falaise','feu','fleur','forêt','lière','mer','montagne','neige','paysage','plage','plante','rivière','rivère','roche','terre','vigne','vignes'],
    'Religion':     ['baptistère','basilique','cathédrale','chapelle','clocher','cloître','église','crèche','grande mosquée','sapin','noël'],
    'Architecture': ['bibliothèque','centre ville','château','colombier','escalier','escaliers','fontaine','immeuble','magasin','maison','muret','musée','palais','place','pont','port','rue','statue','vestiges'],
    'Transport':    ['autoroute','avion','bateau','camion','cargo','clio','montgolfière','moto','route','tracteur','train','voiture'],
    'Travaux':      ['béton','benne','cloison','coffre fort','fenêtre','garage','mini pelle','outils','papier peint','travaux','tronçonneuse','tuyaux'],
    'Maison':       ['chambre','cuisine','jardin','meuble','mobile-home','porte','portail','salle de bain','salon','table','toilettes'],
    'Art & Culture':['bas relief','concert','danse','dessin','disney','drapeau','fresque','guitare','maquette','mosaïque','photo','plan','sculpture','signature','tableau'],
    'Repas':        ['apéritif','fruit','fruits','gâteau','glace','légumes','pomme','raisin','repas','restaurant','viande','vin','ustensiles'],
    'Objets':       ['aspirateur','bijoux','bonnet','bougie','bouquet','cadeau','carton','document','facture','journal','lampe','livre','lunettes de soleil','malle','manuscrit','panneau','poubelle','téléphone','télévision'],
};

function displayTags() {
    const cloud = document.getElementById('tags-cloud');
    cloud.innerHTML = '';
    selectedTags.clear();
    updateTagsValidateBar();

    const tagCount = {};
    allPhotos.forEach(p => {
        const tags = typeof p.tags === 'string' ? p.tags.split(',').map(t => t.trim()) : (p.tags || []);
        tags.forEach(tag => {
            if (tag) tagCount[tag] = (tagCount[tag] || 0) + 1;
        });
    });
    tagCountBase = { ...tagCount };

    const categorized = new Set(Object.values(TAG_CATEGORIES).flat());
    const frag = document.createDocumentFragment();

    const makeBlock = (categoryName, tagList) => {
        const block = document.createElement('div');
        block.className = 'tag-category-block';
        const title = document.createElement('div');
        title.className = 'tag-category-name';
        title.textContent = categoryName.toUpperCase();
        block.appendChild(title);
        tagList.forEach(tag => {
            const btn = document.createElement('button');
            btn.className = 'tag-item';
            btn.dataset.tag = tag;
            const words = tag.split(' ');
            const last = words.pop();
            const rest = words.length ? words.join(' ') + ' ' : '';
            btn.innerHTML = `${rest}<span style="white-space:nowrap">${last}<span class="tag-count">(${tagCount[tag]})</span></span>`;
            btn.onclick = () => toggleTag(tag, btn);
            block.appendChild(btn);
        });
        return block;
    };

    Object.entries(TAG_CATEGORIES).forEach(([category, categoryTags]) => {
        const present = categoryTags.filter(t => tagCount[t]).sort((a, b) => a.localeCompare(b));
        if (present.length) frag.appendChild(makeBlock(category, present));
    });

    const uncategorized = Object.keys(tagCount).filter(t => !categorized.has(t)).sort((a, b) => a.localeCompare(b));
    if (uncategorized.length) frag.appendChild(makeBlock('Autres', uncategorized));

    cloud.appendChild(frag);
}

function toggleTag(tag, btn) {
    if (selectedTags.has(tag)) {
        selectedTags.delete(tag);
        btn.classList.remove('active-tag');
    } else {
        selectedTags.add(tag);
        btn.classList.add('active-tag');
    }
    updateTagsValidateBar();
    updateTagCounts();
}

function updateTagCounts() {
    if (selectedTags.size === 0) {
        document.querySelectorAll('.tag-item').forEach(btn => {
            const span = btn.querySelector('.tag-count');
            if (span) span.textContent = `(${tagCountBase[btn.dataset.tag] || 0})`;
            btn.classList.remove('tag-zero');
        });
        document.querySelectorAll('.tag-category-name').forEach(t => t.classList.remove('tag-category-zero'));
        return;
    }

    const baseFiltered = allPhotos.filter(p => {
        const tags = typeof p.tags === 'string' ? p.tags.split(',').map(t => t.trim()) : (p.tags || []);
        return [...selectedTags].every(t => tags.includes(t));
    });

    document.querySelectorAll('.tag-item:not(.active-tag)').forEach(btn => {
        const tag = btn.dataset.tag;
        const span = btn.querySelector('.tag-count');
        if (!span) return;
        const count = baseFiltered.filter(p => {
            const tags = typeof p.tags === 'string' ? p.tags.split(',').map(t => t.trim()) : (p.tags || []);
            return tags.includes(tag);
        }).length;
        span.textContent = `(${count})`;
        btn.classList.toggle('tag-zero', count === 0);
    });

    // Griser les titres de catégories dont tous les tags sont à zéro
    document.querySelectorAll('.tag-category-block').forEach(block => {
        const items = block.querySelectorAll('.tag-item:not(.active-tag)');
        const allZero = items.length > 0 && [...items].every(i => i.classList.contains('tag-zero'));
        block.querySelector('.tag-category-name')?.classList.toggle('tag-category-zero', allZero);
    });
}

function updateTagsValidateBar() {
    const info = document.getElementById('tags-selection-info');
    const btn = document.getElementById('tags-validate-btn');
    const deselectBtn = document.getElementById('tags-deselect-btn');
    if (selectedTags.size === 0) {
        info.textContent = '// AUCUN MOT-CLÉ SÉLECTIONNÉ';
        btn.disabled = true;
        deselectBtn.disabled = true;
    } else {
        const count = allPhotos.filter(p => {
            const tags = typeof p.tags === 'string' ? p.tags.split(',').map(t => t.trim()) : (p.tags || []);
            return [...selectedTags].every(tag => tags.includes(tag));
        }).length;
        const labels = [...selectedTags].join(' + ');
        info.textContent = `// ${labels} — ${count} fichier(s)`;
        btn.disabled = count === 0;
        deselectBtn.disabled = false;
    }
}

function deselectAllTags() {
    selectedTags.clear();
    document.querySelectorAll('.tag-item.active-tag').forEach(b => b.classList.remove('active-tag'));
    updateTagsValidateBar();
    updateTagCounts();
}

function validateTagSelection() {
    if (selectedTags.size === 0) return;

    filteredPhotos = allPhotos.filter(p => {
        const tags = typeof p.tags === 'string' ? p.tags.split(',').map(t => t.trim()) : (p.tags || []);
        return [...selectedTags].every(tag => tags.includes(tag));
    });

    const results = document.getElementById('tags-results');
    const breadcrumb = document.getElementById('tags-results-breadcrumb');
    const panel = document.getElementById('tags-results-panel');

    breadcrumb.textContent = `// FILTRE : ${[...selectedTags].join(' + ')} — ${filteredPhotos.length} fichier(s)`;
    results.innerHTML = '';

    const frag = document.createDocumentFragment();
    filteredPhotos.forEach(p => {
        const card = document.createElement('div');
        card.className = 'photo-card';
        const ext = (p.url || '').toLowerCase();
        if (ext.match(/\.(mp4|mov|avi|webm)$/)) {
            card.classList.add('video-card');
            card.innerHTML = `<img src="${p.thumb || p.url}" alt="${p.fichier || ''}" loading="lazy" decoding="async" onerror="if(this.src!=='${p.url}')this.src='${p.url}';else this.onerror=null;">`;
        }
        card.onclick = () => openLightbox(p, filteredPhotos);
        frag.appendChild(card);
    });
    results.appendChild(frag);

    panel.classList.add('visible');
}

function closeTagResults() {
    document.getElementById('tags-results-panel').classList.remove('visible');
}

// ==========================================
// 6. TIMELINE
// ==========================================
let timelineObserver = null;

function displayTimeline() {
    const container = document.getElementById('timeline-container');
    container.innerHTML = '';

    if (timelineObserver) { timelineObserver.disconnect(); timelineObserver = null; }

    const sorted = [...allPhotos]
        .filter(p => p.date && p.date !== 'Non définie')
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (!sorted.length) return;

    timelineObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            if (el.dataset.src) {
                el.src = el.dataset.src;
                el.removeAttribute('data-src');
                timelineObserver.unobserve(el);
            }
        });
    }, { rootMargin: '400px' });

    const BATCH = 80;
    // Compte par année
    const yearCounts = {};
    sorted.forEach(p => {
        const y = p.date.substring(0, 4);
        yearCounts[y] = (yearCounts[y] || 0) + 1;
    });

    let i = 0;
    let currentYear = null;

    function renderBatch() {
        const frag = document.createDocumentFragment();
        const end = Math.min(i + BATCH, sorted.length);

        while (i < end) {
            const p = sorted[i++];
            const year = p.date.substring(0, 4);

            if (year !== currentYear) {
                currentYear = year;
                const header = document.createElement('div');
                header.className = 'timeline-year-header';
                header.dataset.year = year;
                const count = yearCounts[year];
                header.innerHTML = `<span>// ${year}</span><span class="timeline-year-count">${count} fichier${count > 1 ? 's' : ''}</span>`;
                frag.appendChild(header);
            }

            const cell = document.createElement('div');
            cell.className = 'timeline-photo-cell';
            const ext = (p.url || '').toLowerCase();
            if (ext.match(/\.(mp4|mov|avi|webm)$/)) {
                const video = document.createElement('video');
                video.dataset.src = p.url; video.poster = p.thumb || ''; video.muted = true; video.preload = 'none';
                cell.appendChild(video);
                timelineObserver.observe(video);
            } else {
                const img = document.createElement('img');
                img.src = p.thumb || p.url;
                img.loading = 'lazy';
                img.decoding = 'async';
                img.alt = '';
                img.onerror = function() {
                    if (this.src !== p.url) { this.src = p.url; }
                    else { this.onerror = null; }
                };
                cell.appendChild(img);
            }
            cell.addEventListener('click', () => openLightbox(p, sorted));
            frag.appendChild(cell);
        }

        container.appendChild(frag);
        if (i < sorted.length) setTimeout(renderBatch, 0);
    }

    renderBatch();
}

// ==========================================
// 7. EXTRACTION ALÉATOIRE
// ==========================================
function initRandomCardSelector() {
    const availableCards = [...new Set(
        allPhotos.map(p => p.dossier?.split(' // ')[0]).filter(Boolean)
    )].sort();

    selectedCards = new Set(availableCards);

    const selector = document.getElementById('random-card-selector');
    selector.innerHTML = '';

    let group = null;
    availableCards.forEach((card, i) => {
        if (i % 3 === 0) {
            group = document.createElement('div');
            group.className = 'random-card-group';
            selector.appendChild(group);
        }
        const btn = document.createElement('button');
        btn.className = 'random-card-btn active';
        btn.textContent = 'carte_' + String(parseInt(card.replace('CARTE_', ''), 10)).padStart(2, '0');
        btn.onclick = () => {
            if (selectedCards.has(card)) {
                if (selectedCards.size === 1) return;
                selectedCards.delete(card);
                btn.classList.remove('active');
            } else {
                selectedCards.add(card);
                btn.classList.add('active');
            }
        };
        group.appendChild(btn);
    });
}

function extractRandom() {
    const mediaWrapper = document.getElementById('random-media');
    const metaContent = document.getElementById('random-meta-content');
    
    const pool = selectedCards.size > 0
        ? allPhotos.filter(p => selectedCards.has(p.dossier?.split(' // ')[0]))
        : allPhotos;
    if (pool.length === 0) return;
    const randomPhoto = pool[Math.floor(Math.random() * pool.length)];
    
    const ext = (randomPhoto.url || '').toLowerCase();
    if (ext.match(/\.(mp4|mov|avi|webm)$/)) {
        mediaWrapper.innerHTML = `<video src="${randomPhoto.url}" controls autoplay></video>`;
    } else {
        mediaWrapper.innerHTML = `<img src="${randomPhoto.url}" alt="${randomPhoto.fichier || ''}">`;
    }
    
    const tags = typeof randomPhoto.tags === 'string' ? randomPhoto.tags : '';
    
    // Construire le texte de localisation (même logique que lightbox)
    let locationText = 'Inconnu';
    if (randomPhoto.lieu && randomPhoto.ville) {
        locationText = `${randomPhoto.lieu}, ${randomPhoto.ville}`;
    } else if (randomPhoto.ville) {
        locationText = randomPhoto.ville;
    } else if (randomPhoto.lieu) {
        locationText = randomPhoto.lieu;
    }
    
    const [randomCarte, randomSousDossier] = (randomPhoto.dossier || '').split(' // ');
    const randomChemin = randomSousDossier ? `${randomCarte} // ${randomSousDossier}` : (randomCarte || 'Inconnu');

    metaContent.innerHTML = `
        <div><span class="data-label">DOSSIER:</span> ${randomChemin}</div>
        <div><span class="data-label">FICHIER:</span> ${randomPhoto.fichier || randomPhoto.file || 'Inconnu'}</div>
        <div><span class="data-label">DATE:</span> ${randomPhoto.date || 'Inconnue'}</div>
        <div><span class="data-label">LIEU:</span> ${locationText}</div>
        <div><span class="data-label">TAGS:</span> ${tags || 'Aucun'}</div>
    `;
}

// ==========================================
// 8. LIGHTBOX
// ==========================================
function navigateLightbox(dir) {
    if (!lightboxPhotos.length) return;
    lightboxIndex = (lightboxIndex + dir + lightboxPhotos.length) % lightboxPhotos.length;
    openLightbox(lightboxPhotos[lightboxIndex]);
}

function openLightbox(photo, photoList) {
    if (photoList) {
        lightboxPhotos = photoList;
        lightboxIndex = photoList.indexOf(photo);
    }
    const lightbox = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-image');
    const video = document.getElementById('lightbox-video');
    const audioContainer = document.getElementById('lightbox-audio-container');
    const audio = document.getElementById('lightbox-audio');
    const meta = document.getElementById('lightbox-metadata');
    
    // Reset
    img.style.display = 'none';
    video.style.display = 'none';
    audioContainer.style.display = 'none';
    
    const ext = (photo.url || '').toLowerCase();
    
    if (ext.match(/\.(mp4|mov|avi|webm)$/)) {
        video.src = photo.url;
        video.style.display = 'block';
    } else if (ext.match(/\.(mp3|wav|ogg)$/)) {
        audio.src = photo.url;
        audioContainer.style.display = 'flex';
    } else {
        img.src = photo.url;
        img.style.display = 'block';
    }
    
    const tags = typeof photo.tags === 'string' ? photo.tags : '';
    
    // Construire le texte de localisation
    const [carteName, sousDossierName] = (photo.dossier || '').split(' // ');
    const chemin = sousDossierName ? `${carteName} // ${sousDossierName}` : (carteName || 'Inconnu');

    let locationText = 'Inconnu';
    if (photo.lieu && photo.ville) {
        locationText = `${photo.lieu}, ${photo.ville}`;
    } else if (photo.ville) {
        locationText = photo.ville;
    } else if (photo.lieu) {
        locationText = photo.lieu;
    }

    meta.innerHTML = `
        <div><span class="data-label">DOSSIER:</span> ${chemin}</div>
        <div><span class="data-label">FICHIER:</span> ${photo.fichier || photo.file || 'Inconnu'}</div>
        <div><span class="data-label">DATE:</span> ${photo.date || 'Inconnue'}</div>
        <div><span class="data-label">LIEU:</span> ${locationText}</div>
        <div><span class="data-label">TAGS:</span> ${tags || 'Aucun'}</div>
    `;
    
    lightbox.classList.add('active');

    // Construire le fil d'ariane contextuel
    const activeView = document.querySelector('.view-section.active')?.id;
    let crumbParts = [];
    if (activeView === 'carte' && (photo.ville || photo.lieu)) {
        if (photo.ville) crumbParts.push(photo.ville);
        if (photo.lieu)  crumbParts.push(photo.lieu);
        crumbParts.push(photo.fichier || '');
    } else {
        const [carte, dossier] = (photo.dossier || '').split(' // ');
        if (carte)   crumbParts.push(carte);
        if (dossier) crumbParts.push(dossier);
        crumbParts.push(photo.fichier || '');
    }
    const crumbHTML = crumbParts.map((p, i) => {
        const isLast = i === crumbParts.length - 1;
        const cls = isLast ? 'breadcrumb-current' : 'breadcrumb-link';
        const label = i === 0 ? p : `// ${p}`;
        return `<span class="${cls}">${i > 0 ? '&nbsp;' : ''}${label}</span>`;
    }).join('');
    document.getElementById('lightbox-crumb-path').innerHTML = crumbHTML;
    document.getElementById('lightbox-crumb-bar').classList.add('visible');

    if (img.style.display === 'block') {
        const applyFit = () => {
            const media = img.closest('.lightbox-media');
            if (!media || !img.naturalWidth) return;
            const diff = Math.abs(media.clientWidth / media.clientHeight - img.naturalWidth / img.naturalHeight) / (media.clientWidth / media.clientHeight);
            img.classList.toggle('is-cover', diff < 0.12);
        };
        requestAnimationFrame(() => img.naturalWidth ? applyFit() : img.addEventListener('load', applyFit, { once: true }));
    }
}

function closeLightbox(event) {
    if (event) event.stopPropagation();
    const lightbox = document.getElementById('lightbox');
    const video = document.getElementById('lightbox-video');
    const audio = document.getElementById('lightbox-audio');
    
    video.pause();
    video.src = '';
    audio.pause();
    audio.src = '';
    
    lightbox.classList.remove('active');
    document.getElementById('lightbox-crumb-bar').classList.remove('visible');
}

// ==========================================
// 9. CARTE
// ==========================================
let mapInstance = null;
const geocodeCache = {};
const locationGroups = {}; // clé "lat,lng" → { marker, photos[] }

// DICTIONNAIRE DE GÉOLOCALISATION (COORDONNÉES PRÉCISES)
const geoDB = {
    // ITALIE - CAMPANIE
    "Vésuve": [40.8224, 14.4289],
    "Volcan Vésuve": [40.8224, 14.4289],
    "Naples": [40.8518, 14.2681],
    "Herculanum": [40.8060, 14.3508],
    "Pompéi": [40.7492, 14.4899],
    "Ravello": [40.6493, 14.6111],
    "Amalfi": [40.6333, 14.6029],
    "Cathédrale Saint-André": [40.6336, 14.6027],
    "Sorrente": [40.6263, 14.3758],
    "Capri": [40.5507, 14.2426],
    "Positano": [40.6281, 14.4850],
    "Villa Rufolo": [40.6475, 14.6122],
    "Lettere": [40.7011, 14.5456],
    
    // ITALIE - TOSCANE
    "Sienne": [43.3188, 11.3308],
    "Florence": [43.7696, 11.2558],
    "San Gimignano": [43.4674, 11.0433],
    "Pise": [43.7228, 10.4017],
    
    // FRANCE
    "Toulouse": [43.6047, 1.4442],
    "Cité de l'espace": [43.5866, 1.4933],
    "Vence": [43.7225, 7.1077],
    "Milizac": [48.4705, -4.5687],
    "Plounéventer": [48.4910, -4.1678],
    "Saumur": [47.2593, -0.0769],
    "Corse": [42.0396, 9.0129],
    "Paris": [48.8566, 2.3522],
    "Disneyland": [48.8673, 2.7835],
    
    // PAYS-BAS
    "Amsterdam": [52.3676, 4.9041]
};

// Normaliser un nom de lieu pour le cache et le dictionnaire
function normalizeLocation(str) {
    return str.toLowerCase()
        .replace(/[,\s]+/g, ' ')
        .trim();
}

// Chercher dans le dictionnaire
function searchInGeoDB(lieu, ville) {
    // Essayer d'abord avec le lieu précis
    if (lieu) {
        const normalized = lieu.split(',')[0].trim();
        if (geoDB[normalized]) {
            return { lat: geoDB[normalized][0], lng: geoDB[normalized][1] };
        }
    }
    
    // Essayer avec la ville
    if (ville) {
        const normalized = ville.split(',')[0].trim();
        if (geoDB[normalized]) {
            return { lat: geoDB[normalized][0], lng: geoDB[normalized][1] };
        }
    }
    
    return null;
}

function geocodeLocation(lieu, ville) {
    return searchInGeoDB(lieu, ville);
}

async function initMap() {
    const mapDiv = document.getElementById('map-container');
    if (!mapDiv || typeof L === 'undefined') return;

    if (!mapInstance) {
        mapInstance = L.map('map-container').setView([46.5, 2.3], 5);
        L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap France',
            maxZoom: 20
        }).addTo(mapInstance);
        
        // Séparer les photos : celles avec coordonnées et celles à geocoder
        const photosWithCoords = allPhotos.filter(p => p.lat && p.lng);
        const photosToGeocode = allPhotos.filter(p => !p.lat && (p.lieu || p.ville));
        
        // Afficher les photos qui ont déjà des coordonnées
        photosWithCoords.forEach(p => {
            addMarkerToMap(p, p.lat, p.lng);
        });
        
        // Geocoder les autres (avec limitation pour pas surcharger l'API)
        const toProcess = photosToGeocode.slice(0, 10000); // Augmenté à 10000
        
        for (const photo of toProcess) {
            // Combiner lieu + ville pour un geocoding précis
            const coords = await geocodeLocation(photo.lieu, photo.ville);
            if (coords) {
                addMarkerToMap(photo, coords.lat, coords.lng);
            }
            
            // Petit délai pour ne pas spammer l'API
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // Centrer la carte sur tous les marqueurs
        const allMarkers = [...photosWithCoords];
        if (allMarkers.length > 0) {
            const bounds = L.latLngBounds(allMarkers.map(p => [p.lat, p.lng]));
            mapInstance.fitBounds(bounds, { padding: [50, 50] });
        }
    }

    setTimeout(() => mapInstance.invalidateSize(), 150);
}

function addMarkerToMap(photo, lat, lng) {
    if (!mapInstance) return;

    const key = `${lat},${lng}`;

    if (locationGroups[key]) {
        locationGroups[key].photos.push(photo);
        refreshMarkerPopup(key);
        return;
    }

    const marker = L.circleMarker([lat, lng], {
        radius: 6,
        fillColor: '#ff0000',
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
    }).addTo(mapInstance);

    locationGroups[key] = { marker, photos: [photo] };
    refreshMarkerPopup(key);

    marker.on('mouseover', function() { this.openPopup(); });
    marker.on('mouseout', function() { this.closePopup(); });
    marker.on('click', function() {
        this.closePopup();
        const { photos } = locationGroups[key];
        if (photos.length === 1) {
            setTimeout(() => openLightbox(photos[0]), 100);
        } else {
            openMapGallery(photos);
        }
    });
}

function refreshMarkerPopup(key) {
    const { marker, photos } = locationGroups[key];
    const p = photos[0];
    const [carteName, sousDossier] = (p.dossier || '').split(' // ');
    const chemin = sousDossier ? `${carteName} // ${sousDossier}` : (carteName || 'Inconnu');
    const countHTML = photos.length > 1
        ? `<span class="popup-count-multi">${photos.length} fichiers</span>`
        : `<span class="popup-count-single">${p.fichier}</span>`;
    const lieuHTML  = p.lieu  ? `<div class="popup-lieu">${p.lieu}</div>` : `<div class="popup-lieu">—</div>`;
    const villeHTML = p.ville ? `<div class="popup-ville">${p.ville}</div>` : '';
    marker.bindPopup(`
        <div class="popup-dossier">${chemin}</div>
        ${lieuHTML}
        ${villeHTML}
        <div class="popup-footer">
            ${countHTML}
            ${p.date ? `<span class="popup-date">${p.date}</span>` : ''}
        </div>
    `, { className: 'popup-sd', maxWidth: 420 });
}

function openMapGallery(photos) {
    const panel  = document.getElementById('map-gallery-panel');
    const grid   = document.getElementById('map-gallery-grid');
    const title  = document.getElementById('map-gallery-title');
    const p      = photos[0];
    const label  = p.lieu || p.ville || 'Sans localisation';

    title.textContent = `// ${label} — ${photos.length} fichier(s)`;
    grid.innerHTML = '';

    const frag = document.createDocumentFragment();
    photos.forEach(photo => {
        const card = document.createElement('div');
        card.className = 'photo-card';
        const ext = (photo.url || '').toLowerCase();
        if (ext.match(/\.(mp4|mov|avi|webm)$/)) {
            card.classList.add('video-card');
            card.innerHTML = `<img src="${photo.thumb || photo.url}" alt="${photo.fichier || ''}" loading="lazy" decoding="async" onerror="if(this.src!=='${photo.url}')this.src='${photo.url}';else this.onerror=null;">`;
        }
        card.onclick = () => openLightbox(photo, photos);
        frag.appendChild(card);
    });
    grid.appendChild(frag);
    panel.classList.add('visible');
    grid.scrollTop = 0;
    setTimeout(() => mapInstance && mapInstance.invalidateSize(), 50);
}

function closeMapGallery() {
    document.getElementById('map-gallery-panel').classList.remove('visible');
    setTimeout(() => mapInstance && mapInstance.invalidateSize(), 50);
}

// ==========================================
// 10. INITIALISATION
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
    await loadData();
});