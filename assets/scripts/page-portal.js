(() => {
        const {
            buildGoogleCalendarUrl,
            buildMailtoHref,
            buildReadableExcerpt,
            buildTelHref,
            escapeHtml,
            loadJson,
            matchesSearchText,
            normalizeEditorialText,
            normalizePublicHref,
            renderFilterButtons,
            splitEditorialSegments
        } = window.JournalAnnetShared || {};
        const portalPostsContainer = document.getElementById('portal-posts');
        const portalStatus = document.getElementById('portal-status');
        const portalSearchInput = document.getElementById('portal-search');
        const portalFiltersContainer = document.getElementById('portal-filters');
        const portalCount = document.getElementById('portal-count');
        const portalPageKicker = document.getElementById('portal-page-kicker');
        const portalPageTitle = document.getElementById('portal-page-title');
        const portalPageDescription = document.getElementById('portal-page-description');

        if (
            !portalPostsContainer ||
            !portalStatus ||
            !portalSearchInput ||
            !portalFiltersContainer ||
            !portalCount ||
            !portalPageKicker ||
            !portalPageTitle ||
            !portalPageDescription ||
            typeof loadJson !== 'function'
        ) {
            return;
        }

        let portalCopy = {};
        const portalTitleSuffix = document.documentElement.dataset.browserTitleSuffix || "Le Journal d'Annet-sur-Marne";
        const initialSearchParams = new URLSearchParams(window.location.search);
        const initialHash = window.location.hash || '';
        const initialHashTarget = initialHash.startsWith('#post-') ? decodeURIComponent(initialHash.slice('#post-'.length)) : '';
        const initialRubrique = initialSearchParams.get('rubrique');
        const initialSlug = initialSearchParams.get('slug') || initialHashTarget;
        const initialPostId = initialSearchParams.get('post');
        const initialQuery = initialSearchParams.get('q') || '';
        let portalIntroConfig = {};
        const portalTypeVisuals = {
            cantine: { theme: 'border-vintage-green', accent: 'text-vintage-green', icon: '🍽️', iconClass: 'portal-icon-box--cantine' },
            evenement: { theme: 'border-vintage-blue', accent: 'text-vintage-blue', icon: '🗓️', iconClass: 'portal-icon-box--evenement' },
            alerte: { theme: 'border-vintage-red', accent: 'text-vintage-red', icon: '📢', iconClass: 'portal-icon-box--alerte' },
            info: { theme: 'border-ink', accent: 'text-ink', icon: 'ℹ️', iconClass: 'portal-icon-box--info' },
            coup_de_coeur: { theme: 'border-vintage-red', accent: 'text-vintage-red', icon: '📚', iconClass: 'portal-icon-box--coup-de-coeur' }
        };
        let portalTypeConfig = {};
        let portalContact = {};
        let portalCantineCopy = {};
        const portalRubriqueOrder = [
            'all',
            'Événements',
            'Scolaire',
            'Travaux et mobilité',
            'Vie associative',
            'Coup de cœur littéraire',
            'Vie locale'
        ];
        const portalState = {
            posts: [],
            activeFilter: initialRubrique || 'all',
            searchTerm: initialQuery,
            favoriteItems: new Set(),
            targetSlug: initialSlug || '',
            targetPostId: initialPostId || ''
        };

        portalSearchInput.value = portalState.searchTerm;

        function refreshPortalCopyState() {
            const portalTypeText = Object.fromEntries((portalCopy.typeMeta || []).map((item) => [item.key, item]));
            portalIntroConfig = Object.fromEntries((portalCopy.introVariants || []).map((item) => [item.key, item]));
            portalTypeConfig = Object.fromEntries(Object.entries(portalTypeVisuals).map(([key, visual]) => [
                key,
                {
                    ...visual,
                    label: portalTypeText[key]?.label || 'Information',
                    stamp: portalTypeText[key]?.stamp || '',
                }
            ]));
            portalContact = portalCopy.contact || {};
            portalCantineCopy = portalCopy.cantineMicrocopy || {};
        }

        function formatTemplate(template, replacements = {}) {
            return String(template || '').replace(/\{(\w+)\}/g, (_, key) => String(replacements[key] ?? ''));
        }

        function renderPlainTextBody(text) {
            const normalized = normalizeEditorialText(text);
            if (!normalized) {
                return '';
            }

            const paragraphs = normalized.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
            if (paragraphs.length > 1) {
                return paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('');
            }

            const segments = splitEditorialSegments(normalized);
            if (segments.length >= 3) {
                return `
                    <ul class="portal-plain-list">
                        ${segments.map((segment) => `<li>${escapeHtml(segment)}</li>`).join('')}
                    </ul>
                `;
            }

            return `<p>${escapeHtml(normalized)}</p>`;
        }

        function resolveAssetUrl(assetPath = '') {
            const normalizedAssetPath = normalizePublicHref(assetPath);
            if (!normalizedAssetPath) {
                return '';
            }

            if (/^https?:\/\//i.test(normalizedAssetPath)) {
                return normalizedAssetPath;
            }

            return new URL(normalizedAssetPath.replace(/^\.\//, ''), window.location.href).href;
        }

        function getBadgeLabel(type) {
            const labels = {
                bio: 'Bio',
                france: 'France',
                regional: 'Régional',
                msc: 'MSC',
                ce2: 'Qualité',
                'certifié': 'Qualité'
            };
            return labels[type] || type;
        }

        function getBadgeIcon(type) {
            const icons = {
                bio: '🌿',
                france: '🇫🇷',
                regional: '📍',
                msc: '🐟',
                ce2: '🏅',
                'certifié': '🏅'
            };
            return icons[type] || '•';
        }

        function renderBadge(type) {
            const normalizedType = String(type || '').toLowerCase();
            return `
                <span class="portal-badge portal-badge--${escapeHtml(normalizedType)}">
                    <span aria-hidden="true">${escapeHtml(getBadgeIcon(normalizedType))}</span>
                    <span>${escapeHtml(getBadgeLabel(normalizedType))}</span>
                </span>
            `;
        }

        function renderMetaBadge(label, icon, extraClass = '') {
            return `
                <span class="portal-badge ${extraClass}">
                    <span aria-hidden="true">${escapeHtml(icon)}</span>
                    <span>${escapeHtml(label)}</span>
                </span>
            `;
        }

        function slugifyToken(value = '') {
            return String(value || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
        }

        function getCantineThemeClass(dayLabel = '') {
            const daySlug = slugifyToken(dayLabel);
            return ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'].includes(daySlug)
                ? `portal-cantine-day--${daySlug}`
                : '';
        }

        function getCantineItemKey(postId, dayIndex, itemIndex) {
            return `${postId || 'post'}-${dayIndex}-${itemIndex}`;
        }

        function setPortalStatus(message, tone = 'info') {
            if (!message) {
                portalStatus.textContent = '';
                portalStatus.className = 'hidden';
                return;
            }
            portalStatus.className = `portal-status-box ${tone === 'error' ? 'portal-status-box--error' : ''}`;
            portalStatus.textContent = message;
        }

        function getGoogleCalendarUrl(post) {
            return buildGoogleCalendarUrl({
                title: post.titre || '',
                details: post.contenu_texte || post.resume || '',
                location: post.lieu || 'Annet-sur-Marne',
                start: post.date_debut_iso || '',
                end: post.date_fin_iso || post.date_debut_iso || ''
            });
        }

        function getGoogleCalendarUrlForEntry(post, entry) {
            return buildGoogleCalendarUrl({
                title: entry.title || post.titre || '',
                details: entry.details || post.contenu_texte || post.resume || '',
                location: entry.location || post.lieu || 'Annet-sur-Marne',
                start: entry.date_debut_iso || '',
                end: entry.date_fin_iso || entry.date_debut_iso || ''
            });
        }

        function getPortalAnchorId(postOrSlug) {
            if (!postOrSlug) {
                return '';
            }

            if (typeof postOrSlug === 'string') {
                return `post-${postOrSlug}`;
            }

            return `post-${postOrSlug.slug || postOrSlug.id || 'publication'}`;
        }

        function parsePortalIsoDate(value = '') {
            if (!value) {
                return null;
            }

            const normalized = String(value).replace(
                /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
                '$1-$2-$3T$4:$5:$6Z'
            );
            const parsed = new Date(normalized);
            return Number.isNaN(parsed.getTime()) ? null : parsed;
        }

        function getStartOfToday(referenceDate = new Date()) {
            return new Date(
                referenceDate.getFullYear(),
                referenceDate.getMonth(),
                referenceDate.getDate()
            );
        }

        function getUpcomingAgendaEntries(entries = [], referenceDate = new Date()) {
            const startOfToday = getStartOfToday(referenceDate);

            return entries
                .filter((entry) => {
                    const entryDate = parsePortalIsoDate(entry?.date_debut_iso);
                    return entryDate && entryDate >= startOfToday;
                })
                .sort((left, right) => String(left?.date_debut_iso || '').localeCompare(String(right?.date_debut_iso || '')));
        }

        function renderCantineDays(post) {
            const days = post.cantine_jours || [];
            return `
                <div class="portal-cantine-board">
                    ${days.map((day, dayIndex) => `
                        <section class="portal-cantine-day ${escapeHtml(getCantineThemeClass(day.day || ''))}">
                            <div class="portal-cantine-rail">
                                <span class="portal-cantine-rail-label">${escapeHtml(day.day || '')}</span>
                            </div>
                            <div class="portal-cantine-sheet">
                            ${day.isSpecial ? `
                                <div class="portal-cantine-note">
                                    <span class="portal-cantine-note-icon" aria-hidden="true">i</span>
                                    <p class="portal-cantine-note-copy">${escapeHtml(day.message || portalCantineCopy.emptyMessage || 'Aucune information cantine communiquée.')}</p>
                                </div>
                            ` : `
                                <ul class="portal-cantine-list">
                                    ${(day.items || []).map((item, itemIndex) => {
                                        const itemKey = getCantineItemKey(post.id, dayIndex, itemIndex);
                                        const isFavorite = portalState.favoriteItems.has(itemKey);
                                        return `
                                        <li class="portal-cantine-item">
                                            <div class="portal-cantine-item-main">
                                                <div class="portal-cantine-item-top">
                                                    <span class="portal-cantine-item-title">${escapeHtml(item.name || '')}</span>
                                                    ${(item.badges || []).map((badge) => renderBadge(badge)).join('')}
                                                </div>
                                                ${item.description ? `
                                                    <p class="portal-cantine-item-description">
                                                        <span class="portal-cantine-item-description-icon" aria-hidden="true">🍴</span>
                                                        <span>${escapeHtml(item.description)}</span>
                                                    </p>
                                                ` : ''}
                                            </div>
                                            <button
                                                type="button"
                                                class="portal-favorite-button"
                                                data-favorite-item="${escapeHtml(itemKey)}"
                                                aria-pressed="${isFavorite ? 'true' : 'false'}"
                                                aria-label="${escapeHtml(portalCantineCopy.favoriteAria || 'Marquer comme coup de cœur')}"
                                                title="${escapeHtml(portalCantineCopy.favoriteTitle || 'Coup de cœur')}"
                                            >${isFavorite ? '♥' : '♡'}</button>
                                        </li>
                                        `;
                                    }).join('')}
                                </ul>
                            `}
                            </div>
                        </section>
                    `).join('')}
                </div>
            `;
        }

        function renderSupportSection(cards = []) {
            const items = cards.filter(Boolean);
            if (!items.length) {
                return '';
            }

            return `
                <aside class="portal-support-grid" aria-label="Repères liés à cette publication">
                    ${items.join('')}
                </aside>
            `;
        }

        function renderArticleLayout(mainMarkup, supportCards = [], extraMainClasses = '') {
            const items = supportCards.filter(Boolean);
            const mainClass = ['paper-card', 'portal-article-main', 'p-5', 'md:p-6', 'bg-white/80', extraMainClasses]
                .filter(Boolean)
                .join(' ');

            if (!items.length) {
                return `
                    <div class="mt-6">
                        <div class="${mainClass}">${mainMarkup}</div>
                    </div>
                `;
            }

            return `
                <div class="portal-article-grid mt-6">
                    <div class="${mainClass}">${mainMarkup}</div>
                    ${renderSupportSection(items)}
                </div>
            `;
        }

        function getPostImages(post) {
            const rawImages = Array.isArray(post.images) ? post.images : [];
            const images = rawImages
                .map((image) => ({
                    alt: image?.alt || `Visuel de ${post.titre || 'la publication'}`,
                    caption: image?.caption || '',
                    src: image?.src || ''
                }))
                .filter((image) => image.src);

            if (!images.length && (post.image || post.cover_image)) {
                images.push({
                    alt: post.type === 'coup_de_coeur'
                        ? `Couverture du livre ${post.titre || ''}`
                        : `Visuel de ${post.titre || 'la publication'}`,
                    caption: post.image_caption || '',
                    src: post.image || post.cover_image
                });
            }

            const seen = new Set();
            return images.filter((image) => {
                const key = image.src;
                if (seen.has(key)) {
                    return false;
                }
                seen.add(key);
                return true;
            });
        }

        function renderVisualCard(post) {
            const images = getPostImages(post);
            if (!images.length) {
                return '';
            }

            const defaultCaption = post.type === 'coup_de_coeur'
                ? 'Sélection de la semaine'
                : '';

            if (images.length === 1) {
                const image = images[0];
                return `
                    <div class="portal-book-cover-card">
                        <img
                            src="${escapeHtml(resolveAssetUrl(image.src))}"
                            alt="${escapeHtml(image.alt)}"
                            class="portal-book-cover portal-visual-image"
                            loading="eager"
                            decoding="async"
                            fetchpriority="high"
                        >
                        ${(post.image_caption || image.caption || defaultCaption) ? `<p class="portal-book-cover-caption">${escapeHtml(post.image_caption || image.caption || defaultCaption)}</p>` : ''}
                    </div>
                `;
            }

            return `
                <div class="portal-book-cover-card portal-image-carousel" data-portal-image-carousel>
                    <div class="portal-image-carousel-viewport">
                        <div class="portal-image-carousel-track" data-carousel-track>
                            ${images.map((image, index) => `
                                <figure class="portal-image-carousel-slide">
                                    <img
                                        src="${escapeHtml(resolveAssetUrl(image.src))}"
                                        alt="${escapeHtml(image.alt)}"
                                        class="portal-book-cover portal-visual-image"
                                        loading="${index === 0 ? 'eager' : 'lazy'}"
                                        decoding="async"
                                        ${index === 0 ? 'fetchpriority="high"' : ''}
                                    >
                                    ${(image.caption || (index === 0 ? post.image_caption : '')) ? `<figcaption class="portal-book-cover-caption">${escapeHtml(image.caption || post.image_caption)}</figcaption>` : ''}
                                </figure>
                            `).join('')}
                        </div>
                    </div>
                    <div class="portal-image-carousel-controls">
                        <button type="button" class="portal-image-carousel-button" data-carousel-prev aria-label="${escapeHtml(portalCopy.previousImageLabel || 'Image précédente')}">‹</button>
                        <div class="portal-image-carousel-dots">
                            ${images.map((_, index) => `
                                <button type="button" class="portal-image-carousel-dot" data-carousel-dot aria-label="${escapeHtml(formatTemplate(portalCopy.imageDotLabel || 'Voir l’image {index}', { index: index + 1 }))}" aria-pressed="${index === 0 ? 'true' : 'false'}"></button>
                            `).join('')}
                        </div>
                        <button type="button" class="portal-image-carousel-button" data-carousel-next aria-label="${escapeHtml(portalCopy.nextImageLabel || 'Image suivante')}">›</button>
                    </div>
                    <p class="portal-image-carousel-counter" data-carousel-counter>1 / ${images.length}</p>
                </div>
            `;
        }

        function renderPostBody(post) {
            if (post.type === 'cantine') {
                return renderCantineDays(post);
            }

            const visualCard = renderVisualCard(post);
            const hasVisualCard = Boolean(visualCard);
            const visualMainClass = hasVisualCard ? 'portal-article-main--has-visual' : '';

            const summaryExcerpt = buildReadableExcerpt(post.resume || post.contenu_texte || '', post.titre, {
                maxLength: 220,
                minBoundary: 120
            });
            const fullSummary = normalizeEditorialText(post.resume || post.contenu_texte || '');
            const summaryIsTruncated = Boolean(fullSummary && summaryExcerpt && fullSummary !== summaryExcerpt);
            const summaryCard = summaryExcerpt ? `
                <div class="portal-excerpt-card">
                    <p class="portal-excerpt-label">${escapeHtml(portalCopy.summaryLabel || 'Résumé rapide')}</p>
                    <p class="portal-excerpt-text">${escapeHtml(summaryExcerpt)}</p>
                    ${summaryIsTruncated ? `<p class="portal-excerpt-note">${escapeHtml(portalCopy.summaryNote || 'Le détail complet est visible dans l’article ci-dessous.')}</p>` : ''}
                </div>
            ` : '';
            const fullTextSource = post.contenu_texte || post.resume || '';
            const agendaEntries = getUpcomingAgendaEntries(
                Array.isArray(post.event_dates) ? post.event_dates : []
            );
            const agendaCard = agendaEntries.length ? `
                <div class="portal-fact-card">
                    <p class="portal-fact-title">🗓️ ${escapeHtml(portalCopy.agendaDatesTitle || "Dates à l'agenda")}</p>
                    <div class="portal-agenda-list">
                        ${agendaEntries.map((entry) => `
                            <div class="portal-agenda-item">
                                <div class="portal-agenda-meta">
                                    <span class="portal-agenda-date">${escapeHtml(entry.label || '')}</span>
                                    <span class="portal-agenda-hours">${escapeHtml(entry.hours || portalCopy.defaultHoursLabel || 'Horaire communiqué')}</span>
                                </div>
                                <a class="portal-agenda-link" href="${escapeHtml(getGoogleCalendarUrlForEntry(post, entry))}" target="_blank" rel="noopener noreferrer">
                                    <span aria-hidden="true">↗</span>
                                    <span>${escapeHtml(portalCopy.agendaLinkLabel || 'Agenda')}</span>
                                </a>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : '';
            const textBlock = `
                <div class="space-y-5">
                    ${summaryCard}
                    ${agendaCard ? `
                        <div class="portal-inline-facts">
                            ${agendaCard}
                        </div>
                    ` : ''}
                    <div class="portal-note text-sm md:text-base leading-relaxed">
                        ${post.contenu_html || renderPlainTextBody(fullTextSource)}
                    </div>
                </div>
            `;
            const locationCard = post.lieu ? `
                <div class="portal-fact-card">
                    <p class="portal-fact-title">📍 ${escapeHtml(portalCopy.locationTitle || 'Localisation')}</p>
                    <p class="text-sm leading-relaxed">${escapeHtml(post.lieu)}</p>
                </div>
            ` : '';

            const highlightsCard = Array.isArray(post.highlights) && post.highlights.length ? `
                <div class="portal-fact-card">
                    <p class="portal-fact-title">${escapeHtml(portalCopy.highlightsTitle || 'À retenir')}</p>
                    <ul class="portal-feature-list">
                        ${post.highlights.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
                    </ul>
                </div>
            ` : '';

            if (post.type === 'evenement') {
                const calendarCard = post.date_debut_iso ? `
                    <div class="portal-fact-card">
                        <p class="portal-fact-title">🗓️ ${escapeHtml(portalCopy.calendarTitle || 'Calendrier')}</p>
                        <a class="portal-link text-sm" href="${escapeHtml(getGoogleCalendarUrl(post))}" target="_blank" rel="noopener noreferrer">
                            <span aria-hidden="true">🗓️</span>
                            <span>${escapeHtml(portalCopy.addToCalendarLabel || "Ajouter à l'agenda")} ↗</span>
                        </a>
                    </div>
                ` : '';

                return renderArticleLayout(textBlock, [visualCard, locationCard, calendarCard], visualMainClass);
            }

            if (post.type === 'coup_de_coeur') {
                const safePhoneHref = buildTelHref(portalContact.phone || '');
                const safeEmailHref = buildMailtoHref(portalContact.email || '');
                const safeExternalHref = normalizePublicHref(post.lien_externe || '');
                const mediathequeCard = `
                    <div class="portal-fact-card">
                        <p class="portal-fact-title">ℹ️ ${escapeHtml(portalCopy.mediathequeTitle || "Médi'Annet")}</p>
                        <p class="text-sm mb-2 font-semibold">${escapeHtml(portalCopy.mediathequeContactTitle || (portalContact.name ? `Contactez ${portalContact.name}` : 'Contact'))}</p>
                        ${safePhoneHref ? `<p class="text-sm">📞 <a class="underline" href="${escapeHtml(safePhoneHref)}">${escapeHtml(portalContact.phone || '')}</a></p>` : ''}
                        ${safeEmailHref ? `<p class="text-sm break-all">✉️ <a class="underline" href="${escapeHtml(safeEmailHref)}">${escapeHtml(portalContact.email || '')}</a></p>` : ''}
                    </div>
                `;
                const externalLinkCard = safeExternalHref ? `
                    <div class="portal-fact-card">
                        <p class="portal-fact-title">↗ ${escapeHtml(portalCopy.resourceTitle || 'Ressource')}</p>
                        <a class="portal-link text-sm" href="${escapeHtml(safeExternalHref)}" target="_blank" rel="noopener noreferrer">
                            <span aria-hidden="true">↗</span>
                            <span>${escapeHtml(portalCopy.learnMoreLabel || 'En savoir plus')}</span>
                        </a>
                    </div>
                ` : '';

                const metadataBlock = (post.auteur || post.edition) ? `
                    <div class="flex flex-wrap gap-2">
                        ${post.auteur ? renderMetaBadge(post.auteur, '✍️', 'portal-badge--certifié') : ''}
                        ${post.edition ? renderMetaBadge(post.edition, '📘') : ''}
                    </div>
                ` : '';

                return renderArticleLayout(`
                    <div class="space-y-5">
                        ${metadataBlock}
                        ${textBlock}
                    </div>
                `, [visualCard, externalLinkCard, mediathequeCard], visualMainClass);
            }

            return renderArticleLayout(textBlock, [visualCard, locationCard, highlightsCard], visualMainClass);
        }

        function getPortalSearchableParts(post) {
            const dayParts = (post.cantine_jours || []).flatMap((day) => [
                day.day,
                day.message,
                ...(day.items || []).flatMap((item) => [item.name, item.description, item.badges || []])
            ]);
            return [
                post.rubrique,
                post.titre,
                post.resume,
                post.lieu,
                post.auteur,
                post.edition,
                post.contenu_texte,
                dayParts
            ];
        }

        function getFilteredPortalPosts() {
            return portalState.posts.filter((post) => {
                const matchesFilter = portalState.activeFilter === 'all' || post.rubrique === portalState.activeFilter;
                const matchesSearch = matchesSearchText(getPortalSearchableParts(post), portalState.searchTerm);
                return matchesFilter && matchesSearch;
            });
        }

        function getPortalFilterOptions() {
            const availableRubriques = new Set(portalState.posts.map((post) => post.rubrique).filter(Boolean));
            return portalRubriqueOrder
                .filter((rubrique) => rubrique === 'all' || availableRubriques.has(rubrique))
                .map((rubrique) => ({
                    value: rubrique,
                    label: rubrique === 'all' ? 'Toutes' : rubrique
                }));
        }

        function getPortalIntro(filterValue) {
            if (!filterValue || filterValue === 'all') {
                return portalIntroConfig.all || {
                    description: portalCopy.description || '',
                    kicker: portalCopy.kicker || '',
                    title: portalCopy.title || '',
                };
            }

            return portalIntroConfig[filterValue] || {
                description: formatTemplate(
                    portalCopy.filteredRubriqueDescriptionTemplate ||
                        'Les publications de la rubrique {rubrique} regroupées dans une seule vue avec filtres et accès direct aux articles.',
                    { rubrique: filterValue.toLowerCase() },
                ),
                kicker: portalCopy.filteredRubriqueKicker || 'Rubrique filtrée',
                title: filterValue,
            };
        }

        function renderPortalIntro() {
            const intro = getPortalIntro(portalState.activeFilter);
            portalPageKicker.textContent = intro.kicker;
            portalPageTitle.textContent = intro.title;
            portalPageDescription.textContent = intro.description;
            document.title = `${intro.title} - ${portalTitleSuffix}`;
        }

        function getTargetPortalPost() {
            if (portalState.targetSlug) {
                const postBySlug = portalState.posts.find((post) => post.slug === portalState.targetSlug);
                if (postBySlug) {
                    return postBySlug;
                }
            }

            if (portalState.targetPostId) {
                const postById = portalState.posts.find((post) => post.id === portalState.targetPostId);
                if (postById) {
                    return postById;
                }
            }

            return null;
        }

        function renderPortalFilters() {
            renderFilterButtons({
                container: portalFiltersContainer,
                options: getPortalFilterOptions().map((option) => ({
                    value: option.value,
                    label: option.value === 'all' ? (portalCopy.allFilterLabel || option.label) : option.label
                })),
                activeValue: portalState.activeFilter,
                className: 'portal-filter',
                onSelect: (filterValue) => applyPortalFilter(filterValue, { scroll: false })
            });
        }

        function renderPortalPosts(posts) {
            portalCount.textContent = `${posts.length} ${posts.length > 1 ? (portalCopy.countPlural || 'publications') : (portalCopy.countSingular || 'publication')}`;
            if (!Array.isArray(posts) || posts.length === 0) {
                portalPostsContainer.innerHTML = `
                    <div class="paper-card p-8 text-center">
                        <p class="font-heading font-bold uppercase tracking-widest text-sm">${escapeHtml(portalCopy.emptyTitle || 'Aucune publication disponible.')}</p>
                        <p class="mt-3 text-sm text-[color:var(--muted)]">${escapeHtml(portalCopy.emptyDescription || 'Essayez un autre filtre ou une autre recherche.')}</p>
                    </div>
                `;
                return;
            }

            portalPostsContainer.innerHTML = posts.map((post) => {
                const config = portalTypeConfig[post.type] || portalTypeConfig.info;
                return `
                    <article id="${escapeHtml(getPortalAnchorId(post))}" class="portal-card p-6 md:p-8 ${config.theme}" data-post-id="${escapeHtml(post.id || '')}" data-post-slug="${escapeHtml(post.slug || '')}">
                        <div class="portal-stamp">${escapeHtml(config.stamp)}</div>
                        <div class="portal-card-header">
                            <div>
                                <div class="portal-meta-stack">
                                    <div class="portal-type-pill ${config.accent}">
                                        <span class="portal-icon-box ${config.iconClass}">${escapeHtml(config.icon)}</span>
                                        <span>${escapeHtml(config.label)}</span>
                                    </div>
                                    <div class="portal-ribbon ${config.accent}">${escapeHtml(post.rubrique || config.label)}</div>
                                </div>
                                <h3 class="text-3xl font-heading font-black leading-tight mt-4">${escapeHtml(post.titre || '')}</h3>
                            </div>
                            <div class="portal-date-pill">
                                <span aria-hidden="true">🕒</span>
                                <span>${escapeHtml(post.date || portalCopy.dateFallbackLabel || 'Publication')}</span>
                            </div>
                        </div>
                        ${renderPostBody(post)}
                    </article>
                `;
            }).join('');

            portalPostsContainer.querySelectorAll('[data-favorite-item]').forEach((button) => {
                button.addEventListener('click', () => {
                    const favoriteId = button.getAttribute('data-favorite-item');
                    if (portalState.favoriteItems.has(favoriteId)) {
                        portalState.favoriteItems.delete(favoriteId);
                    } else {
                        portalState.favoriteItems.add(favoriteId);
                    }
                    renderPortalPosts(getFilteredPortalPosts());
                });
            });

            portalPostsContainer.querySelectorAll('.portal-visual-image').forEach((image) => {
                image.addEventListener('error', () => {
                    image.removeAttribute('src');
                    image.classList.add('is-fallback');
                    image.alt = portalCopy.missingCoverLabel || 'Couverture indisponible';
                    image.replaceWith(Object.assign(document.createElement('div'), {
                        className: `${image.className} is-fallback`,
                        textContent: portalCopy.missingCoverLabel || 'Couverture indisponible'
                    }));
                }, { once: true });
            });

            portalPostsContainer.querySelectorAll('[data-portal-image-carousel]').forEach((carousel) => {
                const track = carousel.querySelector('[data-carousel-track]');
                const slides = Array.from(carousel.querySelectorAll('.portal-image-carousel-slide'));
                const dots = Array.from(carousel.querySelectorAll('[data-carousel-dot]'));
                const previousButton = carousel.querySelector('[data-carousel-prev]');
                const nextButton = carousel.querySelector('[data-carousel-next]');
                const counter = carousel.querySelector('[data-carousel-counter]');
                let activeIndex = 0;

                if (!track || slides.length <= 1) {
                    return;
                }

                const updateCarousel = (nextIndex) => {
                    activeIndex = (nextIndex + slides.length) % slides.length;
                    track.style.transform = `translateX(-${activeIndex * 100}%)`;
                    dots.forEach((dot, index) => {
                        dot.setAttribute('aria-pressed', index === activeIndex ? 'true' : 'false');
                    });
                    if (counter) {
                        counter.textContent = `${activeIndex + 1} / ${slides.length}`;
                    }
                };

                previousButton?.addEventListener('click', () => updateCarousel(activeIndex - 1));
                nextButton?.addEventListener('click', () => updateCarousel(activeIndex + 1));
                dots.forEach((dot, index) => {
                    dot.addEventListener('click', () => updateCarousel(index));
                });
                updateCarousel(0);
            });

            if (portalState.targetSlug || portalState.targetPostId) {
                requestAnimationFrame(() => {
                    scrollToPortalPost();
                    window.setTimeout(scrollToPortalPost, 180);
                });
            }
        }

        function syncPortalUrl() {
            const url = new URL(window.location.href);

            if (portalState.activeFilter === 'all') {
                url.searchParams.delete('rubrique');
            } else {
                url.searchParams.set('rubrique', portalState.activeFilter);
            }

            const normalizedQuery = portalState.searchTerm.trim();
            if (normalizedQuery) {
                url.searchParams.set('q', normalizedQuery);
            } else {
                url.searchParams.delete('q');
            }

            if (portalState.targetPostId) {
                url.searchParams.set('post', portalState.targetPostId);
            } else {
                url.searchParams.delete('post');
            }

            if (portalState.targetSlug) {
                url.searchParams.set('slug', portalState.targetSlug);
                url.hash = getPortalAnchorId(portalState.targetSlug);
            } else {
                url.searchParams.delete('slug');
                url.hash = '';
            }

            window.history.replaceState({}, '', url);
        }

        function applyPortalFilter(filterValue, options = {}) {
            const { scroll = true, preserveTargetPost = false } = options;
            portalState.activeFilter = filterValue || 'all';
            if (!preserveTargetPost) {
                portalState.targetSlug = '';
                portalState.targetPostId = '';
            }
            rerenderPortal();

            if (scroll) {
                portalPostsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            syncPortalUrl();
        }

        function scrollToPortalPost() {
            let targetCard = null;

            if (portalState.targetSlug) {
                targetCard =
                    document.getElementById(getPortalAnchorId(portalState.targetSlug)) ||
                    portalPostsContainer.querySelector(`[data-post-slug="${CSS.escape(portalState.targetSlug)}"]`);
            }

            if (!targetCard && portalState.targetPostId) {
                targetCard = portalPostsContainer.querySelector(`[data-post-id="${CSS.escape(portalState.targetPostId)}"]`);
            }

            if (!targetCard) {
                return;
            }
            targetCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        function rerenderPortal() {
            const filteredPosts = getFilteredPortalPosts();
            renderPortalIntro();
            renderPortalFilters();
            renderPortalPosts(filteredPosts);
        }

        async function loadPortalPosts() {
            try {
                const [loadedCopy, loadedPosts] = await Promise.all([
                    loadJson('data/ui/portal-page.json', { fallback: {} }),
                    loadJson('data/ui/portal-posts.json', { fallback: [] }),
                ]);

                portalCopy = loadedCopy && typeof loadedCopy === 'object' ? loadedCopy : {};
                refreshPortalCopyState();

                if (!Array.isArray(loadedPosts) || loadedPosts.length === 0) {
                    throw new Error(portalCopy.snapshotErrorMessage || 'Le snapshot de publications est introuvable.');
                }

                portalState.posts = loadedPosts;
                const targetPost = getTargetPortalPost();
                if (targetPost) {
                    portalState.activeFilter = targetPost.rubrique || 'all';
                }
                const availableRubriques = new Set(getPortalFilterOptions().map((option) => option.value));
                if (!availableRubriques.has(portalState.activeFilter)) {
                    portalState.activeFilter = 'all';
                }
                rerenderPortal();
                setPortalStatus('');
            } catch (error) {
                portalPostsContainer.innerHTML = `
                    <div class="paper-card p-8 text-center bg-white">
                        <p class="font-heading font-bold uppercase tracking-widest text-sm text-vintage-red">${escapeHtml(portalCopy.loadErrorTitle || 'Impossible de charger les publications.')}</p>
                        <p class="mt-3 text-sm">${escapeHtml(error.message)}</p>
                    </div>
                `;
                setPortalStatus(portalCopy.loadErrorStatus || 'Le portail n’a pas pu charger les contenus.', 'error');
            }
        }

        portalSearchInput.addEventListener('input', (event) => {
            portalState.searchTerm = event.target.value || '';
            portalState.targetSlug = '';
            portalState.targetPostId = '';
            rerenderPortal();
            syncPortalUrl();
        });

        renderPortalFilters();
        loadPortalPosts().catch(() => {});
})();
