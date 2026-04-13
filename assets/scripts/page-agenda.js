(() => {
        const {
            buildGoogleCalendarUrl,
            buildReadableExcerpt,
            escapeHtml,
            loadJson,
            matchesSearchText,
            normalizeEditorialText,
            renderFilterButtons
        } = window.JournalAnnetShared || {};
        const agendaResults = document.getElementById('agenda-results');
        const agendaSearchInput = document.getElementById('agenda-search');
        const agendaFiltersContainer = document.getElementById('agenda-filters');
        const agendaCount = document.getElementById('agenda-count');
        const agendaStatus = document.getElementById('agenda-status');
        const agendaViewButtons = Array.from(document.querySelectorAll('.agenda-view-button'));
        if (!agendaResults || !agendaSearchInput || !agendaFiltersContainer || !agendaCount || !agendaStatus || typeof loadJson !== 'function') {
            return;
        }

        const searchParams = new URLSearchParams(window.location.search);
        const oneDayMs = 24 * 60 * 60 * 1000;
        let agendaCopy = {};
        let weekDayLabels = [];
        let agendaPhaseConfig = {};

        const rubriqueOrder = [
            'all',
            'Événements',
            'Scolaire',
            'Travaux et mobilité',
            'Vie associative',
            'Vie locale'
        ];

        const agendaState = {
            events: [],
            activeFilter: rubriqueOrder.includes(searchParams.get('rubrique')) ? searchParams.get('rubrique') : 'all',
            searchTerm: searchParams.get('q') || '',
            view: searchParams.get('view') === 'calendar' ? 'calendar' : 'list',
            calendarMonth: searchParams.get('month') || ''
        };

        function parseIsoDate(isoString) {
            const normalized = isoString?.replace(
                /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
                '$1-$2-$3T$4:$5:$6Z'
            );
            return normalized ? new Date(normalized) : new Date(NaN);
        }

        function isValidDate(date) {
            return date instanceof Date && !Number.isNaN(date.getTime());
        }

        function compareAgendaEntriesAsc(a = {}, b = {}) {
            return String(a.start_iso || '').localeCompare(String(b.start_iso || ''));
        }

        function compareAgendaEntriesDesc(a = {}, b = {}) {
            return String(b.start_iso || '').localeCompare(String(a.start_iso || ''));
        }

        function getArticleUrl(eventItem) {
            return `portail.html?rubrique=${encodeURIComponent(eventItem.rubrique || '')}&slug=${encodeURIComponent(eventItem.post_slug || '')}`;
        }

        function getMonthLabel(date) {
            if (!isValidDate(date)) {
                return agendaCopy.undatedMonthLabel || 'Autres dates';
            }
            return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
        }

        function getMonthKey(date) {
            if (!isValidDate(date)) {
                return '';
            }
            return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
        }

        function parseMonthKey(monthKey) {
            const match = String(monthKey || '').match(/^(\d{4})-(\d{2})$/);
            if (!match) {
                return null;
            }
            return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
        }

        function getDayKey(date) {
            if (!isValidDate(date)) {
                return '';
            }
            return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
        }

        function startOfUtcDay(value = new Date()) {
            return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
        }

        function startOfUtcMonth(date) {
            return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
        }

        function addUtcDays(date, days) {
            return new Date(date.getTime() + (days * oneDayMs));
        }

        function isSameUtcMonth(left, right) {
            return isValidDate(left) && isValidDate(right) &&
                left.getUTCFullYear() === right.getUTCFullYear() &&
                left.getUTCMonth() === right.getUTCMonth();
        }

        function getEventBounds(eventItem) {
            const start = parseIsoDate(eventItem?.start_iso);
            const end = parseIsoDate(eventItem?.end_iso || eventItem?.start_iso);
            return {
                start,
                end: isValidDate(end) ? end : start
            };
        }

        function getDayParts(date) {
            if (!isValidDate(date)) {
                return { weekday: '', day: '–', month: '' };
            }
            const weekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' }).format(date).replace('.', '');
            const day = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', timeZone: 'UTC' }).format(date);
            const month = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' }).format(date).replace('.', '');
            return { weekday, day, month };
        }

        function getFilteredEvents() {
            return agendaState.events.filter((eventItem) => {
                const matchesFilter = agendaState.activeFilter === 'all' || eventItem.rubrique === agendaState.activeFilter;
                const matchesSearch = matchesSearchText([
                    eventItem.title,
                    eventItem.rubrique,
                    eventItem.location,
                    eventItem.description,
                    eventItem.date_label
                ], agendaState.searchTerm);
                return matchesFilter && matchesSearch;
            });
        }

        function buildEventSections(events) {
            const today = startOfUtcDay(new Date());
            const nearLimit = addUtcDays(today, 30);
            const pastLimit = addUtcDays(today, -30);
            const near = [];
            const later = [];
            const past = [];
            const undated = [];

            events.forEach((eventItem) => {
                const { start, end } = getEventBounds(eventItem);
                if (!isValidDate(start)) {
                    undated.push(eventItem);
                    return;
                }

                if (isValidDate(end) && end < today) {
                    if (end >= pastLimit) {
                        past.push(eventItem);
                    }
                    return;
                }

                if (start <= nearLimit) {
                    near.push(eventItem);
                } else {
                    later.push(eventItem);
                }
            });

            near.sort(compareAgendaEntriesAsc);
            later.sort(compareAgendaEntriesAsc);
            past.sort(compareAgendaEntriesDesc);
            undated.sort(compareAgendaEntriesAsc);

            return [
                {
                    key: 'near',
                    title: agendaPhaseConfig.near?.title || 'Prochainement',
                    description: agendaPhaseConfig.near?.description || 'Les dates prévues entre aujourd’hui et les 30 prochains jours, classées de la plus proche à la plus lointaine.',
                    events: near
                },
                {
                    key: 'later',
                    title: agendaPhaseConfig.later?.title || 'À venir plus loin',
                    description: agendaPhaseConfig.later?.description || 'Les rendez-vous déjà publiés mais situés au-delà des 30 prochains jours.',
                    events: later
                },
                {
                    key: 'past',
                    title: agendaPhaseConfig.past?.title || 'Passés récemment',
                    description: agendaPhaseConfig.past?.description || 'Les événements terminés dans les 30 derniers jours, classés du plus récent au plus ancien.',
                    events: past
                },
                {
                    key: 'undated',
                    title: agendaPhaseConfig.undated?.title || 'Dates à préciser',
                    description: agendaPhaseConfig.undated?.description || 'Les entrées sans date exploitable restent visibles ici le temps de compléter la fiche agenda.',
                    events: undated
                }
            ].filter((section) => section.events.length);
        }

        function renderCount(filteredEvents, sections) {
            const totalLabel = `${filteredEvents.length} ${filteredEvents.length > 1 ? (agendaCopy.countPlural || 'dates') : (agendaCopy.countSingular || 'date')}`;
            if (agendaState.view !== 'list' || !sections.length) {
                agendaCount.textContent = totalLabel;
                return;
            }

            const detailBySection = {
                later: agendaCopy.detailLaterLabel || 'plus loin',
                near: agendaCopy.detailNearLabel || 'proches',
                past: agendaCopy.detailPastLabel || 'passées',
                undated: agendaCopy.detailUndatedLabel || 'à préciser'
            };
            const details = sections
                .map((section) => `${section.events.length} ${detailBySection[section.key] || 'dates'}`)
                .join(' • ');

            agendaCount.textContent = details ? `${totalLabel} • ${details}` : totalLabel;
        }

        function groupEventsByMonth(events) {
            const grouped = new Map();

            events.forEach((eventItem) => {
                const { start } = getEventBounds(eventItem);
                const monthLabel = isValidDate(start) ? getMonthLabel(start) : (agendaCopy.undatedMonthLabel || 'Autres dates');
                if (!grouped.has(monthLabel)) {
                    grouped.set(monthLabel, []);
                }
                grouped.get(monthLabel).push(eventItem);
            });

            return grouped;
        }

        function renderEventCard(eventItem) {
            const { start } = getEventBounds(eventItem);
            const dayParts = getDayParts(start);
            const articleUrl = getArticleUrl(eventItem);
            const fullDescription = normalizeEditorialText(eventItem.description || '');
            const summary = buildReadableExcerpt(fullDescription, eventItem.title, {
                maxLength: 220,
                minBoundary: 100
            });
            const isTruncatedSummary = Boolean(fullDescription && summary && fullDescription !== summary);

            return `
                <article class="agenda-card">
                    <div class="agenda-date-box">
                        <div class="agenda-day">${escapeHtml(dayParts.weekday)}</div>
                        <div class="agenda-day-num">${escapeHtml(dayParts.day)}</div>
                        <div class="agenda-month">${escapeHtml(dayParts.month)}</div>
                    </div>
                    <div class="agenda-content">
                        <div class="agenda-meta-line">
                            <span class="agenda-rubrique">${escapeHtml(eventItem.rubrique || agendaCopy.defaultRubriqueLabel || 'Agenda')}</span>
                            ${eventItem.time_label ? `
                                <span class="agenda-time-pill">
                                    <span aria-hidden="true">🕒</span>
                                    <span>${escapeHtml(eventItem.time_label)}</span>
                                </span>
                            ` : ''}
                        </div>
                        <h3 class="text-2xl font-heading font-black leading-tight">${escapeHtml(eventItem.title || '')}</h3>
                        ${summary ? `
                            <div class="agenda-summary-card">
                                <p class="agenda-summary-label">${escapeHtml(agendaCopy.summaryLabel || 'Résumé rapide')}</p>
                                <p class="agenda-summary">${escapeHtml(summary)}</p>
                                ${isTruncatedSummary ? `<p class="agenda-summary-note">${escapeHtml(agendaCopy.summaryNote || 'La suite est détaillée dans l’article.')}</p>` : ''}
                            </div>
                        ` : ''}
                        ${eventItem.location ? `
                            <p class="agenda-location-line">
                                <span aria-hidden="true">📍</span>
                                <span>${escapeHtml(eventItem.location)}</span>
                            </p>
                        ` : ''}
                        <div class="agenda-actions">
                            <a class="agenda-link agenda-link--primary" href="${escapeHtml(buildGoogleCalendarUrl({
                                title: eventItem.title,
                                details: eventItem.description,
                                location: eventItem.location || 'Annet-sur-Marne',
                                start: eventItem.start_iso || '',
                                end: eventItem.end_iso || eventItem.start_iso || ''
                            }))}" target="_blank" rel="noopener noreferrer">
                                <span aria-hidden="true">🗓️</span>
                                <span>${escapeHtml(agendaCopy.addToCalendarLabel || "Ajouter à l'agenda")}</span>
                            </a>
                            <a class="agenda-link" href="${escapeHtml(articleUrl)}">
                                <span aria-hidden="true">↗</span>
                                <span>${escapeHtml(agendaCopy.viewArticleLabel || "Voir l'article")}</span>
                            </a>
                        </div>
                    </div>
                </article>
            `;
        }

        function renderMonthBlocks(events) {
            return Array.from(groupEventsByMonth(events).entries()).map(([monthLabel, monthEvents]) => `
                <section class="month-block">
                    <h2 class="month-title">${escapeHtml(monthLabel)}</h2>
                    <div class="agenda-list">
                        ${monthEvents.map(renderEventCard).join('')}
                    </div>
                </section>
            `).join('');
        }

        function renderAgendaList(sections) {
            agendaResults.innerHTML = sections.map((section) => `
                <section class="agenda-phase">
                    <div class="agenda-phase-header">
                        <div>
                            <p class="agenda-phase-kicker">${escapeHtml(section.title)}</p>
                            <p class="agenda-phase-description">${escapeHtml(section.description)}</p>
                        </div>
                        <span class="agenda-phase-count">${section.events.length} ${section.events.length > 1 ? (agendaCopy.countPlural || 'dates') : (agendaCopy.countSingular || 'date')}</span>
                    </div>
                    ${renderMonthBlocks(section.events)}
                </section>
            `).join('');
        }

        function getAvailableMonthKeys(events) {
            return Array.from(new Set(events
                .map((eventItem) => getMonthKey(getEventBounds(eventItem).start))
                .filter(Boolean)))
                .sort((left, right) => left.localeCompare(right));
        }

        function getDefaultCalendarMonth(events) {
            const today = startOfUtcDay(new Date());
            const upcomingEvent = events
                .slice()
                .sort(compareAgendaEntriesAsc)
                .find((eventItem) => {
                    const { end } = getEventBounds(eventItem);
                    return isValidDate(end) && end >= today;
                });

            const upcomingDate = getEventBounds(upcomingEvent).start;
            if (isValidDate(upcomingDate)) {
                return getMonthKey(startOfUtcMonth(upcomingDate));
            }

            const firstEventDate = getEventBounds(events[0]).start;
            if (isValidDate(firstEventDate)) {
                return getMonthKey(startOfUtcMonth(firstEventDate));
            }

            return getMonthKey(startOfUtcMonth(today));
        }

        function resolveCalendarMonth(events) {
            const availableMonths = getAvailableMonthKeys(events);

            if (!availableMonths.length) {
                const fallbackMonth = parseMonthKey(agendaState.calendarMonth) || startOfUtcMonth(new Date());
                agendaState.calendarMonth = agendaState.calendarMonth || getMonthKey(fallbackMonth);
                return {
                    availableMonths,
                    monthDate: fallbackMonth
                };
            }

            if (!agendaState.calendarMonth || !availableMonths.includes(agendaState.calendarMonth)) {
                agendaState.calendarMonth = getDefaultCalendarMonth(events);
            }

            const resolvedMonth = parseMonthKey(agendaState.calendarMonth) || parseMonthKey(availableMonths[0]) || startOfUtcMonth(new Date());
            agendaState.calendarMonth = getMonthKey(resolvedMonth);

            return {
                availableMonths,
                monthDate: resolvedMonth
            };
        }

        function buildCalendarCells(monthDate, events) {
            const eventsByDay = new Map();
            events.forEach((eventItem) => {
                const { start } = getEventBounds(eventItem);
                const dayKey = getDayKey(start);
                if (!dayKey) {
                    return;
                }
                if (!eventsByDay.has(dayKey)) {
                    eventsByDay.set(dayKey, []);
                }
                eventsByDay.get(dayKey).push(eventItem);
            });

            const monthStart = startOfUtcMonth(monthDate);
            const gridStart = addUtcDays(monthStart, -((monthStart.getUTCDay() + 6) % 7));
            const todayKey = getDayKey(startOfUtcDay(new Date()));

            return Array.from({ length: 42 }, (_, index) => {
                const cellDate = addUtcDays(gridStart, index);
                const dayKey = getDayKey(cellDate);
                return {
                    date: cellDate,
                    dayKey,
                    events: (eventsByDay.get(dayKey) || []).slice().sort(compareAgendaEntriesAsc),
                    inMonth: isSameUtcMonth(cellDate, monthDate),
                    isToday: dayKey === todayKey
                };
            });
        }

        function renderCalendarView(filteredEvents) {
            const { availableMonths, monthDate } = resolveCalendarMonth(filteredEvents);
            const currentMonthKey = getMonthKey(monthDate);
            const currentMonthIndex = availableMonths.indexOf(currentMonthKey);
            const previousMonth = currentMonthIndex > 0 ? availableMonths[currentMonthIndex - 1] : '';
            const nextMonth = currentMonthIndex >= 0 && currentMonthIndex < availableMonths.length - 1
                ? availableMonths[currentMonthIndex + 1]
                : '';
            const monthEvents = filteredEvents
                .filter((eventItem) => isSameUtcMonth(getEventBounds(eventItem).start, monthDate))
                .sort(compareAgendaEntriesAsc);
            const calendarCells = buildCalendarCells(monthDate, filteredEvents);

            agendaResults.innerHTML = `
                <section class="agenda-calendar-shell">
                    <div class="agenda-calendar-nav">
                        <div>
                            <p class="agenda-phase-kicker">${escapeHtml(agendaCopy.calendarKicker || 'Vue calendrier')}</p>
                            <h2 class="agenda-calendar-title">${escapeHtml(getMonthLabel(monthDate))}</h2>
                            <p class="agenda-phase-description">${escapeHtml(agendaCopy.calendarDescription || 'Retrouve les rendez-vous du mois, avec accès direct aux articles et aux ajouts Google Calendar.')}</p>
                        </div>
                        <div class="agenda-calendar-nav-buttons">
                            <button id="agenda-month-prev" type="button" class="agenda-calendar-button" ${previousMonth ? '' : 'disabled'}>${escapeHtml(agendaCopy.prevMonthLabel || 'Mois précédent')}</button>
                            <button id="agenda-month-next" type="button" class="agenda-calendar-button" ${nextMonth ? '' : 'disabled'}>${escapeHtml(agendaCopy.nextMonthLabel || 'Mois suivant')}</button>
                        </div>
                    </div>

                    <div>
                        <div class="agenda-calendar-weekdays">
                            ${(weekDayLabels.length ? weekDayLabels : ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']).map((label) => `<div class="agenda-calendar-dayname">${escapeHtml(label)}</div>`).join('')}
                        </div>
                        <div class="agenda-calendar-grid">
                            ${calendarCells.map((cell) => `
                                <article class="agenda-calendar-cell${cell.inMonth ? '' : ' agenda-calendar-cell--outside'}${cell.isToday ? ' agenda-calendar-cell--today' : ''}">
                                    <div class="agenda-calendar-cell-head">
                                        <span class="agenda-calendar-date">${escapeHtml(String(cell.date.getUTCDate()))}</span>
                                        ${cell.isToday ? `<span class="agenda-calendar-today">${escapeHtml(agendaCopy.todayLabel || 'Aujourd’hui')}</span>` : ''}
                                    </div>
                                    <div class="agenda-calendar-events">
                                        ${cell.events.slice(0, 2).map((eventItem) => `
                                            <a class="agenda-calendar-chip" href="${escapeHtml(getArticleUrl(eventItem))}">
                                                <span class="agenda-calendar-chip-title">${escapeHtml(eventItem.title || '')}</span>
                                                <span class="agenda-calendar-chip-meta">${escapeHtml([eventItem.rubrique, eventItem.time_label].filter(Boolean).join(' • '))}</span>
                                            </a>
                                        `).join('')}
                                        ${cell.events.length > 2 ? `<div class="agenda-calendar-more">+${cell.events.length - 2} autre${cell.events.length - 2 > 1 ? 's' : ''}</div>` : ''}
                                    </div>
                                </article>
                            `).join('')}
                        </div>
                    </div>

                    <section class="month-block">
                        <h2 class="month-title">${escapeHtml(agendaCopy.monthEventsTitle || 'Rendez-vous du mois')}</h2>
                        ${monthEvents.length ? `
                            <div class="agenda-list">
                                ${monthEvents.map(renderEventCard).join('')}
                            </div>
                        ` : `
                            <div class="agenda-empty">
                                <p class="font-heading font-bold uppercase tracking-widest text-sm">${escapeHtml(agendaCopy.monthEmptyTitle || 'Aucune date ce mois-ci.')}</p>
                                <p class="mt-3 text-sm text-[color:var(--muted)]">${escapeHtml(agendaCopy.monthEmptyDescription || 'Change de mois ou ajuste les filtres pour afficher d’autres rendez-vous.')}</p>
                            </div>
                        `}
                    </section>
                </section>
            `;

            const previousButton = document.getElementById('agenda-month-prev');
            const nextButton = document.getElementById('agenda-month-next');

            if (previousButton && previousMonth) {
                previousButton.addEventListener('click', () => {
                    agendaState.calendarMonth = previousMonth;
                    updateUrl();
                    renderAgenda();
                });
            }

            if (nextButton && nextMonth) {
                nextButton.addEventListener('click', () => {
                    agendaState.calendarMonth = nextMonth;
                    updateUrl();
                    renderAgenda();
                });
            }
        }

        function renderViewSwitch() {
            agendaViewButtons.forEach((button) => {
                const isActive = button.dataset.view === agendaState.view;
                button.setAttribute('aria-pressed', String(isActive));
            });
        }

        function renderFilters() {
            renderFilterButtons({
                container: agendaFiltersContainer,
                options: rubriqueOrder.map((rubrique) => ({
                    value: rubrique,
                    label: rubrique === 'all' ? (agendaCopy.allFilterLabel || 'Toutes') : rubrique
                })),
                activeValue: agendaState.activeFilter,
                className: 'agenda-filter',
                onSelect: (rubrique) => {
                    agendaState.activeFilter = rubrique;
                    updateUrl();
                    renderAgenda();
                }
            });
        }

        function renderAgenda() {
            const filteredEvents = getFilteredEvents();
            const sections = buildEventSections(filteredEvents);

            renderViewSwitch();
            renderCount(filteredEvents, sections);

            if (!filteredEvents.length) {
                agendaResults.innerHTML = `
                    <div class="agenda-empty">
                        <p class="font-heading font-bold uppercase tracking-widest text-sm">${escapeHtml(agendaCopy.emptyFilterTitle || 'Aucune date pour ce filtre.')}</p>
                        <p class="mt-3 text-sm text-[color:var(--muted)]">${escapeHtml(agendaCopy.emptyFilterDescription || 'Essaie une autre rubrique ou élargis la recherche.')}</p>
                    </div>
                `;
                return;
            }

            if (agendaState.view === 'calendar') {
                renderCalendarView(filteredEvents);
                return;
            }

            renderAgendaList(sections);
        }

        function updateUrl() {
            const url = new URL(window.location.href);
            if (agendaState.activeFilter === 'all') {
                url.searchParams.delete('rubrique');
            } else {
                url.searchParams.set('rubrique', agendaState.activeFilter);
            }
            if (agendaState.searchTerm) {
                url.searchParams.set('q', agendaState.searchTerm);
            } else {
                url.searchParams.delete('q');
            }
            if (agendaState.view === 'calendar') {
                url.searchParams.set('view', 'calendar');
                if (agendaState.calendarMonth) {
                    url.searchParams.set('month', agendaState.calendarMonth);
                } else {
                    url.searchParams.delete('month');
                }
            } else {
                url.searchParams.delete('view');
                url.searchParams.delete('month');
            }
            window.history.replaceState({}, '', url);
        }

        async function loadAgenda() {
            try {
                const [loadedCopy, loadedEvents] = await Promise.all([
                    loadJson('data/ui/agenda-page.json', { fallback: {} }),
                    loadJson('data/ui/agenda-events.json', { fallback: [] }),
                ]);

                agendaCopy = loadedCopy && typeof loadedCopy === 'object' ? loadedCopy : {};
                weekDayLabels = Array.isArray(agendaCopy.weekdays)
                    ? agendaCopy.weekdays.map((item) => item.label).filter(Boolean)
                    : [];
                agendaPhaseConfig = Object.fromEntries(
                    (Array.isArray(agendaCopy.phases) ? agendaCopy.phases : [])
                        .map((item) => [item.key, item]),
                );

                if (!Array.isArray(loadedEvents)) {
                    throw new Error(agendaCopy.snapshotErrorMessage || 'Le snapshot agenda est invalide.');
                }
                agendaState.events = loadedEvents
                    .slice()
                    .sort(compareAgendaEntriesAsc);
                agendaSearchInput.value = agendaState.searchTerm;
                renderFilters();
                renderAgenda();
                agendaStatus.className = 'hidden';
                agendaStatus.textContent = '';
            } catch (error) {
                agendaResults.innerHTML = `
                    <div class="agenda-empty">
                        <p class="font-heading font-bold uppercase tracking-widest text-sm text-vintage-red">${escapeHtml(agendaCopy.loadErrorTitle || "Impossible de charger l'agenda.")}</p>
                        <p class="mt-3 text-sm">${escapeHtml(error.message)}</p>
                    </div>
                `;
            }
        }

        agendaSearchInput.addEventListener('input', (event) => {
            agendaState.searchTerm = event.target.value || '';
            updateUrl();
            renderAgenda();
        });

        agendaViewButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const nextView = button.dataset.view === 'calendar' ? 'calendar' : 'list';
                if (agendaState.view === nextView) {
                    return;
                }
                agendaState.view = nextView;
                if (nextView === 'calendar') {
                    resolveCalendarMonth(getFilteredEvents());
                }
                updateUrl();
                renderAgenda();
            });
        });

        loadAgenda().catch(() => {});
})();
